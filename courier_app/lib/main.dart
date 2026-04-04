import 'package:flutter/material.dart';
import 'core/auth/auth_manager.dart';
import 'features/auth/presentation/login_page.dart';
import 'features/rides/presentation/home_page.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await AuthManager.instance.init();

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    final isLoggedIn = AuthManager.instance.isLoggedIn;

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: isLoggedIn ? const HomePage() : const LoginPage(),
    );
  }
}