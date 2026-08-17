// =============================================================================
// Scanner Mobile — Main Entry Point
// Implements staff authentication guard, session persistence, and Riverpod scope.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'services/scanner_auth_service.dart';
import 'screens/login_screen.dart';
import 'screens/scan_screen.dart';

const String _supabaseUrl = String.fromEnvironment(
  'SUPABASE_URL',
  defaultValue: 'https://bthpeqgafgxomaqhjfrc.supabase.co',
);
const String _supabaseAnonKey = String.fromEnvironment(
  'SUPABASE_ANON_KEY',
  defaultValue: 'sb_publishable_n8txh3BqiMKQXt9KM1AnXQ_Re4yr4Fl',
);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: _supabaseUrl,
    // ignore: deprecated_member_use
    anonKey: _supabaseAnonKey,
  );

  runApp(
    const ProviderScope(
      child: ScannerApp(),
    ),
  );
}

class ScannerApp extends StatefulWidget {
  const ScannerApp({super.key});

  @override
  State<ScannerApp> createState() => _ScannerAppState();
}

class _ScannerAppState extends State<ScannerApp> {
  final ScannerAuthService _authService = BasicScannerAuthService();
  bool _initializing = true;

  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    try {
      await _authService.restoreSession();
    } catch (_) {}
    if (mounted) {
      setState(() {
        _initializing = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'EventPlatform Scanner',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF7C3AED),
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
        fontFamily: 'Inter',
      ),
      themeMode: ThemeMode.dark,
      home: _initializing
          ? const Scaffold(
              backgroundColor: Color(0xFF0F1117),
              body: Center(
                child: CircularProgressIndicator(color: Color(0xFF7C3AED)),
              ),
            )
          : _authService.isAuthenticated
              ? const ScanScreen()
              : ScannerLoginScreen(authService: _authService),
    );
  }
}
