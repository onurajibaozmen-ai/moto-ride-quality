import 'package:dio/dio.dart';

import '../../../core/network/api_client.dart';

class TelemetryApi {
  final Dio _dio = ApiClient.dio;

  Future<Map<String, dynamic>> sendTelemetryPoint({
    required String token,
    required String rideId,
    required Map<String, dynamic> point,
  }) async {
    final response = await _dio.post(
      '/telemetry',
      data: {
        'rideId': rideId,
        ...point,
      },
      options: ApiClient.authOptions(token),
    );

    return Map<String, dynamic>.from(response.data as Map);
  }

  Future<Map<String, dynamic>> sendTelemetryBatch({
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
      options: ApiClient.authOptions(token),
    );

    return Map<String, dynamic>.from(response.data as Map);
  }
}