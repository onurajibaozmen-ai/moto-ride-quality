import 'package:dio/dio.dart';
import 'package:courier_app/core/network/api_client.dart';

class RidesApi {
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

  Future<Map<String, dynamic>?> getActiveRide(String token) async {
    try {
      final response = await _dio.get('/rides/active');
      return _safeMap(response.data);
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.response?.statusCode == 404 ||
          e.response?.statusCode == 401 ||
          e.response?.statusCode == 500) {
        return null;
      }
      rethrow;
    }
  }

  Future<Map<String, dynamic>> startRide(String token) async {
    final response = await _dio.post('/rides/start');

    final data = _safeMap(response.data);
    if (data == null) {
      throw Exception('startRide response is not a JSON object: ${response.data}');
    }

    return data;
  }

  Future<Map<String, dynamic>> endRide(String token, String rideId) async {
    try {
      final response = await _dio.post('/rides/$rideId/end');

      final data = _safeMap(response.data);
      if (data == null) {
        throw Exception('endRide response is not a JSON object: ${response.data}');
      }

      return data;
    } on DioException catch (e) {
      throw Exception(
        'endRide failed [${e.response?.statusCode}]: ${e.response?.data}',
      );
    }
  }

  Future<Map<String, dynamic>> getRideDetail(String token, String rideId) async {
    final response = await _dio.get('/rides/$rideId/detail');

    final data = _safeMap(response.data);
    if (data == null) {
      throw Exception('getRideDetail response is not a JSON object: ${response.data}');
    }

    return data;
  }
}