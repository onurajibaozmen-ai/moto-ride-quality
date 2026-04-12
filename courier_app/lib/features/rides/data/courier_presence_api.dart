import '../../../core/network/api_client.dart';

class CourierPresenceApi {
  Future<void> heartbeat(String courierId) async {
    await ApiClient.dio.post('/orders/couriers/$courierId/heartbeat');
  }

  Future<void> setOffline(String courierId) async {
    await ApiClient.dio.post(
      '/orders/couriers/$courierId/presence',
      data: {'state': 'OFFLINE'},
    );
  }

  Future<void> setReady(String courierId) async {
    await ApiClient.dio.post(
      '/orders/couriers/$courierId/presence',
      data: {'state': 'READY'},
    );
  }

  Future<void> setBusy(String courierId) async {
    await ApiClient.dio.post(
      '/orders/couriers/$courierId/presence',
      data: {'state': 'BUSY'},
    );
  }
}