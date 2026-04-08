import 'dart:convert';

import '../../../core/network/api_client.dart';

class TelemetryApi {
  Future<Map<String, dynamic>> sendBatch({
    required String courierId,
    String? rideId,
    required List<Map<String, dynamic>> points,
  }) async {
    final response = await ApiClient.dio.post(
      '/telemetry/batch',
      data: {
        'userId': courierId,
        'rideId': rideId,
        'points': points,
      },
    );

    return _decode(response.data);
  }

  Map<String, dynamic> _decode(dynamic response) {
    if (response is Map<String, dynamic>) return response;

    if (response is Map) {
      return Map<String, dynamic>.from(response);
    }

    if (response is String && response.isNotEmpty) {
      final parsed = jsonDecode(response);
      if (parsed is Map<String, dynamic>) return parsed;
      if (parsed is Map) return Map<String, dynamic>.from(parsed);
    }

    return <String, dynamic>{};
  }
}