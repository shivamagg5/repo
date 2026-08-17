// =============================================================================
// EventPlatform — Consumer Mobile App
// Entry Point with Riverpod ProviderScope, Supabase Auth, and GoRouter
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'router/app_router.dart';
import 'theme/app_theme.dart';

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

  // Initialize Supabase client with live credentials
  await Supabase.initialize(
    url: _supabaseUrl,
    // ignore: deprecated_member_use
    anonKey: _supabaseAnonKey,
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
