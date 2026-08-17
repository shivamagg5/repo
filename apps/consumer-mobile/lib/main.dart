// =============================================================================
// EventPlatform — Consumer Mobile App
// Entry Point with Riverpod ProviderScope, Supabase Auth, and GoRouter
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'router/app_router.dart';
import 'theme/app_theme.dart';

const String _supabaseUrl = String.fromEnvironment('SUPABASE_URL');
const String _supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Supabase client with public anon key or local fallback for preview
  await Supabase.initialize(
    url: _supabaseUrl.isNotEmpty ? _supabaseUrl : 'https://placeholder.supabase.co',
    // ignore: deprecated_member_use
    anonKey: _supabaseAnonKey.isNotEmpty ? _supabaseAnonKey : 'placeholder-anon-key',
  );

  runApp(
    const ProviderScope(
      child: EventPlatformApp(),
    ),
  );
}

class EventPlatformApp extends ConsumerWidget {
  const EventPlatformApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: 'EventPlatform',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark,
      darkTheme: AppTheme.dark,
      themeMode: ThemeMode.dark,
      routerConfig: router,
    );
  }
}
