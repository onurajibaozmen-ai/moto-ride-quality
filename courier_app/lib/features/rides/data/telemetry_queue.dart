import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

class TelemetryQueue {
  static const _storageKey = 'telemetry_batch_queue';

  Future<List<Map<String, dynamic>>> loadQueue() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_storageKey);

    if (raw == null || raw.isEmpty) {
      return [];
    }

    final decoded = jsonDecode(raw);

    if (decoded is! List) {
      return [];
    }

    return decoded
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }

  Future<void> saveQueue(List<Map<String, dynamic>> items) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_storageKey, jsonEncode(items));
  }

  Future<void> enqueue(Map<String, dynamic> item) async {
    final queue = await loadQueue();
    queue.add(item);
    await saveQueue(queue);
  }

  Future<void> removeByBatchId(String clientBatchId) async {
    final queue = await loadQueue();
    queue.removeWhere((item) => item['clientBatchId'] == clientBatchId);
    await saveQueue(queue);
  }

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_storageKey);
  }
}