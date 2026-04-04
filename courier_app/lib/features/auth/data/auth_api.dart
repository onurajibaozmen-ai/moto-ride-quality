import 'package:dio/dio.dart';
import 'package:courier_app/core/network/api_client.dart';

class AuthApi {
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

    final data = _safeMap(response.data);
    if (data == null) {
      throw Exception('login response is not a JSON object: ${response.data}');
    }

    return data;
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

    final data = _safeMap(response.data);
    if (data == null) {
      throw Exception('register response is not a JSON object: ${response.data}');
    }

    return data;
  }

  Future<Map<String, dynamic>> me() async {
    final response = await _dio.get('/auth/me');

    final data = _safeMap(response.data);
    if (data == null) {
      throw Exception('me response is not a JSON object: ${response.data}');
    }

    return data;
  }
}