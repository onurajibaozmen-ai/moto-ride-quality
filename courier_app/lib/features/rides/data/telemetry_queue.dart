import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import 'telemetry_api.dart';

class TelemetryQueue {
  static const String _storageKey = 'telemetry_queue_v1';

  final TelemetryApi telemetryApi;

  TelemetryQueue(this.telemetryApi);

  Future<List<Map<String, dynamic>>> readQueue() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_storageKey);

    if (raw == null || raw.isEmpty) {
      return <Map<String, dynamic>>[];
    }

    try {
      final parsed = jsonDecode(raw);
      if (parsed is List) {
        return parsed
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
      }
    } catch (_) {}

    return <Map<String, dynamic>>[];
  }

  Future<void> writeQueue(List<Map<String, dynamic>> items) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_storageKey, jsonEncode(items));
  }

  Future<void> enqueue(Map<String, dynamic> point) async {
    final queue = await readQueue();
    queue.add(point);
    await writeQueue(queue);
  }

  Future<void> trackPoint({
    required String courierId,
    String? rideId,
    required Map<String, dynamic> point,
  }) async {
    try {
      await telemetryApi.sendBatch(
        courierId: courierId,
        rideId: rideId,
        points: [point],
      );

      await flush(
        courierId: courierId,
        rideId: rideId,
      );
    } catch (_) {
      await enqueue(point);
    }
  }

  Future<int> flush({
    required String courierId,
    String? rideId,
  }) async {
    final queue = await readQueue();

    if (queue.isEmpty) return 0;

    final batch = queue.take(50).toList();

    try {
      await telemetryApi.sendBatch(
        courierId: courierId,
        rideId: rideId,
        points: batch,
      );

      final remaining = queue.skip(batch.length).toList();
      await writeQueue(remaining);

      return batch.length;
    } catch (_) {
      return 0;
    }
  }
}