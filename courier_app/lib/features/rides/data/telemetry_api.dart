import 'package:dio/dio.dart';
import '../../../core/constants/api_constants.dart';

class TelemetryApi {
  final Dio _dio = Dio(
    BaseOptions(
      baseUrl: ApiConstants.baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {
        'Content-Type': 'application/json',
      },
    ),
  );

  Future<Map<String, dynamic>> sendBatch({
    required String token,
    required String rideId,
    required List<Map<String, dynamic>> points,
  }) async {
    final response = await _dio.post(
      '/telemetry/batch',
      data: {
        'rideId': rideId,
        'deviceTime': DateTime.now().toUtc().toIso8601String(),
        'points': points,
      },
      options: Options(
        headers: {
          'Authorization': 'Bearer $token',
        },
      ),
    );

    final data = response.data;

    if (data is Map<String, dynamic>) {
      return data;
    }

    if (data is Map) {
      return Map<String, dynamic>.from(data);
    }

    throw Exception('Invalid telemetry response');
  }
}