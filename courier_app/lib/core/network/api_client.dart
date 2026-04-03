import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import 'api_constants.dart';

class ApiClient {
  ApiClient._();

  static final Dio dio = Dio(
    BaseOptions(
      baseUrl: ApiConstants.baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      sendTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ),
  )..interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          debugPrint('➡️ [${options.method}] ${options.baseUrl}${options.path}');
          debugPrint('➡️ headers: ${options.headers}');
          debugPrint('➡️ query: ${options.queryParameters}');
          debugPrint('➡️ data: ${options.data}');
          handler.next(options);
        },
        onResponse: (response, handler) {
          debugPrint(
            '✅ [${response.statusCode}] ${response.requestOptions.baseUrl}${response.requestOptions.path}',
          );
          debugPrint('✅ data: ${response.data}');
          handler.next(response);
        },
        onError: (error, handler) {
          debugPrint(
            '❌ [${error.response?.statusCode}] ${error.requestOptions.baseUrl}${error.requestOptions.path}',
          );
          debugPrint('❌ headers: ${error.requestOptions.headers}');
          debugPrint('❌ query: ${error.requestOptions.queryParameters}');
          debugPrint('❌ data: ${error.requestOptions.data}');
          debugPrint('❌ response: ${error.response?.data}');
          debugPrint('❌ message: ${error.message}');
          handler.next(error);
        },
      ),
    );

  static Options authOptions(String? token) {
    return Options(
      headers: {
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      },
    );
  }
}