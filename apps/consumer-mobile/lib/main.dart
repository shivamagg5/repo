// =============================================================================
// EventPlatform — Consumer Mobile App
// Entry point
//
// SECURITY: Only SUPABASE_ANON_KEY is used here.
// The backend API URL and anon key are injected via --dart-define at build time.
// See docs/ENVIRONMENT_VARIABLES.md for Flutter env var conventions.
// =============================================================================
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// These values must be passed at build time via --dart-define:
/// flutter run --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...
const String _supabaseUrl = String.fromEnvironment('SUPABASE_URL');
const String _supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');
const String _apiBaseUrl =
    String.fromEnvironment('API_BASE_URL', defaultValue: 'http://localhost:3001');

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Supabase with the public anon key only.
  // Never use the service role key in Flutter apps.
  if (_supabaseUrl.isNotEmpty && _supabaseAnonKey.isNotEmpty) {
    await Supabase.initialize(
      url: _supabaseUrl,
      anonKey: _supabaseAnonKey,
    );
  }

  runApp(const EventPlatformApp());
}

class EventPlatformApp extends StatelessWidget {
  const EventPlatformApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'EventPlatform',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF7C3AED), // HSL 258 90% 60%
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
        fontFamily: 'Inter',
      ),
      darkTheme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF7C3AED),
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
        fontFamily: 'Inter',
      ),
      themeMode: ThemeMode.dark,
      home: const _PlaceholderScreen(),
    );
  }
}

/// Placeholder screen — replaced with full app shell in Task 3.x
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
                color: const Color(0xFF7C3AED),
                borderRadius: BorderRadius.circular(24),
              ),
              child: const Icon(Icons.event, color: Colors.white, size: 40),
            ),
            const SizedBox(height: 24),
            const Text(
              'EventPlatform',
              style: TextStyle(
                color: Colors.white,
                fontSize: 28,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Consumer Mobile — Foundation Scaffold',
              style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 14),
            ),
            const SizedBox(height: 4),
            const Text(
              'Full app implemented in Task 3.x',
              style: TextStyle(color: Color(0xFF6B7280), fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}
