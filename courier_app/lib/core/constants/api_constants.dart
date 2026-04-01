class ApiConstants {
  static const bool useLocal = true;

  static const String baseUrl = useLocal
      ? 'http://172.20.10.10:3001'
      : 'https://moto-ride-quality-production.up.railway.app';
}