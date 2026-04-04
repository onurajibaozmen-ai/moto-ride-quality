import '../storage/token_storage.dart';

class AuthManager {
  AuthManager._();

  static final AuthManager instance = AuthManager._();

  final TokenStorage _storage = TokenStorage();

  String? _token;

  String? get token => _token;

  bool get isLoggedIn => _token != null && _token!.isNotEmpty;

  Future<void> init() async {
    _token = await _storage.getToken();
  }

  Future<void> setToken(String token) async {
    _token = token;
    await _storage.saveToken(token);
  }

  Future<void> logout() async {
    _token = null;
    await _storage.clearToken();
  }
}