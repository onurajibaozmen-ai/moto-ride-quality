import 'package:dio/dio.dart';
import 'package:courier_app/core/network/api_client.dart';

class OrdersApi {
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

  List<Map<String, dynamic>> _safeList(dynamic data) {
    if (data is! List) return [];

    return data
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }

  Future<List<Map<String, dynamic>>> getOrders({
    String? courierId,
    String? rideId,
    String? status,
  }) async {
    final response = await _dio.get(
      '/orders',
      queryParameters: {
        if (courierId != null && courierId.isNotEmpty) 'courierId': courierId,
        if (rideId != null && rideId.isNotEmpty) 'rideId': rideId,
        if (status != null && status.isNotEmpty) 'status': status,
      },
    );

    final map = _safeMap(response.data);
    if (map == null) {
      throw Exception('orders response is not a JSON object: ${response.data}');
    }

    return _safeList(map['items']);
  }

  Future<Map<String, dynamic>> getRidePlan(String rideId) async {
    final response = await _dio.get('/orders/ride/$rideId/plan');

    final data = _safeMap(response.data);
    if (data == null) {
      throw Exception(
        'ride plan response is not a JSON object: ${response.data}',
      );
    }

    return data;
  }

  Future<Map<String, dynamic>> markPickedUp(String orderId) async {
    final response = await _dio.patch('/orders/$orderId/pickup');

    final data = _safeMap(response.data);
    if (data == null) {
      throw Exception(
        'pickup response is not a JSON object: ${response.data}',
      );
    }

    return data;
  }

  Future<Map<String, dynamic>> markDelivered(String orderId) async {
    final response = await _dio.patch('/orders/$orderId/deliver');

    final data = _safeMap(response.data);
    if (data == null) {
      throw Exception(
        'deliver response is not a JSON object: ${response.data}',
      );
    }

    return data;
  }
}