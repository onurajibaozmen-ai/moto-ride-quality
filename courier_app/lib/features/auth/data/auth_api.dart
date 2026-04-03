import 'package:dio/dio.dart';

import '../../../core/network/api_client.dart';

class AuthApi {
  final Dio _dio = ApiClient.dio;

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

  Future<Map<String, dynamic>> register({
    required String name,
    required String phone,
    required String password,
  }) async {
    final response = await _dio.post(
      '/auth/register',
      data: {
        'name': name,
        'phone': phone,
        'password': password,
      },
    );

    return Map<String, dynamic>.from(response.data as Map);
  }

  Future<Map<String, dynamic>> me(String token) async {
    final response = await _dio.get(
      '/auth/me',
      options: ApiClient.authOptions(token),
    );

    return Map<String, dynamic>.from(response.data as Map);
  }
}