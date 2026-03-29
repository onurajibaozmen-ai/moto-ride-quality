import 'package:dio/dio.dart';
import '../../../core/constants/api_constants.dart';

class AuthApi {
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

  Future<Map<String, dynamic>> login({
    required String phone,
    required String password,
  }) async {
    final response = await _dio.post(
      '/auth/login',
      data: {
        'phone': phone,
        'password': password,
      },
    );

    return Map<String, dynamic>.from(response.data as Map);
  }
}