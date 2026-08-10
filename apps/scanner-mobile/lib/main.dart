// =============================================================================
// EventPlatform — Scanner Mobile App
// Entry point
//
// SECURITY:
// - Only SUPABASE_ANON_KEY is used here (for scanner staff login)
// - Device credentials are stored in flutter_secure_storage
// - Offline scan queue stored in SQLite (sqflite)
// - All check-in validation happens server-side
// =============================================================================
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const String _supabaseUrl = String.fromEnvironment('SUPABASE_URL');
const String _supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');
const String _apiBaseUrl =
    String.fromEnvironment('API_BASE_URL', defaultValue: 'http://localhost:3001');

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  if (_supabaseUrl.isNotEmpty && _supabaseAnonKey.isNotEmpty) {
    await Supabase.initialize(
      url: _supabaseUrl,
      anonKey: _supabaseAnonKey,
    );
  }

  runApp(const ScannerApp());
}

class ScannerApp extends StatelessWidget {
  const ScannerApp({super.key});

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
      ),
      themeMode: ThemeMode.dark,
      home: const _PlaceholderScreen(),
    );
  }
}

/// Placeholder screen — replaced with full scanner UI in Task 7.x
class _PlaceholderScreen extends StatelessWidget {
  const _PlaceholderScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F1117),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: const Color(0xFF059669), // green for scanner
                borderRadius: BorderRadius.circular(24),
              ),
              child: const Icon(Icons.qr_code_scanner, color: Colors.white, size: 40),
            ),
            const SizedBox(height: 24),
            const Text(
              'Event Scanner',
              style: TextStyle(
                color: Colors.white,
                fontSize: 28,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Scanner Mobile — Foundation Scaffold',
              style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 14),
            ),
            const SizedBox(height: 4),
            const Text(
              'Full scanner implemented in Task 7.x',
              style: TextStyle(color: Color(0xFF6B7280), fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}
