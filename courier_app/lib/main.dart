import 'package:flutter/material.dart';
import 'package:courier_app/core/auth/auth_manager.dart';
import 'package:courier_app/features/auth/presentation/login_page.dart';
import 'package:courier_app/features/rides/presentation/home_page.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AuthManager.instance.init();

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    final token = AuthManager.instance.token;
    final user = AuthManager.instance.user;
    final isLoggedIn = token != null && token.isNotEmpty;

    final courierId = (user?['id'])?.toString() ?? '';

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Courier App',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: isLoggedIn && courierId.isNotEmpty
          ? HomePage(courierId: courierId)
          : const LoginPage(),
    );
  }
}