class ApiConstants {
  static const String productionBaseUrl =
      'https://moto-ride-quality-production.up.railway.app';

  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: productionBaseUrl,
  );
}