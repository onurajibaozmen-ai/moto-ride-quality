import '../storage/token_storage.dart';

class AuthManager {
  AuthManager._();

  static final AuthManager instance = AuthManager._();

  final TokenStorage _storage = TokenStorage();

  String? _token;
  Map<String, dynamic>? _user;

  String? get token => _token;
  Map<String, dynamic>? get user => _user;

  bool get isLoggedIn => _token != null && _token!.isNotEmpty;

  Future<void> init() async {
    _token = await _storage.getToken();
  }

  Future<void> setToken(String token, {Map<String, dynamic>? user}) async {
    _token = token;
    _user = user;
    await _storage.saveToken(token);
  }

  Future<void> logout() async {
    _token = null;
    _user = null;
    await _storage.clearToken();
  }
}