import 'package:dio/dio.dart';
import '../../../core/constants/api_constants.dart';

class RidesApi {
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

  Future<Map<String, dynamic>?> getActiveRide(String token) async {
    final response = await _dio.get(
      '/rides/active',
      options: Options(
        headers: {
          'Authorization': 'Bearer $token',
        },
      ),
    );

    if (response.data == null || response.data == '') {
      return null;
    }

    if (response.data is Map<String, dynamic>) {
      return response.data as Map<String, dynamic>;
    }

    return null;
  }

  Future<Map<String, dynamic>> startRide(String token) async {
    final response = await _dio.post(
      '/rides/start',
      data: {},
      options: Options(
        headers: {
          'Authorization': 'Bearer $token',
        },
      ),
    );

    return Map<String, dynamic>.from(response.data as Map);
  }

  Future<Map<String, dynamic>> endRide({
    required String token,
    required String rideId,
    double totalDistanceM = 0,
    int durationS = 0,
  }) async {
    final response = await _dio.post(
      '/rides/$rideId/end',
      data: {
        'totalDistanceM': totalDistanceM,
        'durationS': durationS,
      },
      options: Options(
        headers: {
          'Authorization': 'Bearer $token',
        },
      ),
    );

    return Map<String, dynamic>.from(response.data as Map);
  }
}