class ApiConstants {
  static const bool useLocal = true;

  static const String localIp = '172.20.10.10';
  static const String localPort = '3001';

  static const String productionBaseUrl =
      'https://moto-ride-quality-production.up.railway.app';

  static String get baseUrl {
    if (useLocal) {
      return 'http://$localIp:$localPort';
    }
    return productionBaseUrl;
  }
}