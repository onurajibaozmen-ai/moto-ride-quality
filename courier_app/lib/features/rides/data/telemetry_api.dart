import 'package:dio/dio.dart';
import 'package:courier_app/core/network/api_client.dart';

class TelemetryApi {
  final Dio _dio = ApiClient.dio;

  Map<String, dynamic>? _safeMap(dynamic data) {
    if (data == null) return null;

    if (data is Map<String, dynamic>) {
      return data;
    }

    if (data is Map) {
      return Map<String, dynamic>.from(data);
    }

    return null;
  }

  Future<Map<String, dynamic>> sendBatch({
    required String token,
    required String rideId,
    required String clientBatchId,
    required List<Map<String, dynamic>> points,
  }) async {
    final response = await _dio.post(
      '/telemetry/batch',
      data: {
        'rideId': rideId,
        'clientBatchId': clientBatchId,
        'points': points,
      },
    );

    final data = _safeMap(response.data);
    if (data == null) {
      throw Exception(
        'sendBatch response is not a JSON object: ${response.data}',
      );
    }

    return data;
  }
}