import 'dart:convert';

import '../../../core/network/api_client.dart';

class OrdersApi {
  Future<Map<String, dynamic>> getAssignedOrders(String courierId) async {
    final response = await ApiClient.dio.get(
      '/orders?courierId=$courierId',
    );
    return _decode(response.data);
  }

  Future<Map<String, dynamic>?> getNextStop(String courierId) async {
    final response = await ApiClient.dio.get(
      '/orders/couriers/$courierId/next-stop',
    );

    final decoded = _decode(response.data);

    if (decoded.isEmpty) return null;
    return decoded;
  }

  Future<Map<String, dynamic>> getRidePlan(String rideId) async {
    final response = await ApiClient.dio.get(
      '/orders/rides/$rideId/plan',
    );
    return _decode(response.data);
  }

  Future<Map<String, dynamic>> pickupOrder(String orderId) async {
    final response = await ApiClient.dio.patch(
      '/orders/$orderId/pickup-all',
      data: {},
    );
    return _decode(response.data);
  }

  Future<Map<String, dynamic>> deliverOrder(
    String orderId, {
    String? note,
  }) async {
    final response = await ApiClient.dio.patch(
      '/orders/$orderId/deliver',
      data: {
        'note': note ?? '',
      },
    );
    return _decode(response.data);
  }

  Map<String, dynamic> _decode(dynamic response) {
    if (response is Map<String, dynamic>) return response;

    if (response is Map) {
      return Map<String, dynamic>.from(response);
    }

    if (response is String && response.isNotEmpty) {
      final parsed = jsonDecode(response);
      if (parsed is Map<String, dynamic>) return parsed;
      if (parsed is Map) return Map<String, dynamic>.from(parsed);
    }

    return <String, dynamic>{};
  }
}