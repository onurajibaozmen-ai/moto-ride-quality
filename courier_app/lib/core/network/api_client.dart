import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:courier_app/core/auth/auth_manager.dart';
import 'package:courier_app/core/network/api_constants.dart';

class ApiClient {
  ApiClient._();

  static final Dio dio = Dio(
    BaseOptions(
      baseUrl: ApiConstants.baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      sendTimeout: const Duration(seconds: 15),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ),
  )..interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final token = AuthManager.instance.token;

          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }

          debugPrint('➡️ [${options.method}] ${options.baseUrl}${options.path}');
          debugPrint('➡️ headers: ${options.headers}');
          debugPrint('➡️ data: ${options.data}');
          handler.next(options);
        },
        onResponse: (response, handler) {
          debugPrint('✅ [${response.statusCode}] ${response.requestOptions.path}');
          handler.next(response);
        },
        onError: (error, handler) async {
          debugPrint('❌ [${error.response?.statusCode}] ${error.requestOptions.path}');
          debugPrint('❌ response: ${error.response?.data}');
          debugPrint('❌ message: ${error.message}');

          if (error.response?.statusCode == 401) {
            debugPrint('🔐 Token expired → logging out');
            await AuthManager.instance.logout();
          }

          handler.next(error);
        },
      ),
    );
}