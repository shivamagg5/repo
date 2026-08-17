import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:scanner_mobile/screens/login_screen.dart';
import 'package:scanner_mobile/services/scanner_auth_service.dart';

void main() {
  testWidgets('ScannerLoginScreen renders login form for staff', (WidgetTester tester) async {
    final authService = _MockScannerAuthService();

    await tester.pumpWidget(
      MaterialApp(
        home: ScannerLoginScreen(authService: authService),
      ),
    );

    expect(find.text('Scanner Staff Access'), findsOneWidget);
    expect(find.text('Authorize Scanner'), findsOneWidget);
    expect(find.byType(TextFormField), findsNWidgets(2));
  });
}

class _MockScannerAuthService implements ScannerAuthService {
  @override
  bool get isAuthenticated => false;

  @override
  Session? get currentSession => null;

  @override
  Future<bool> signIn(String email, String password) async => true;

  @override
  Future<void> signOut() async {}

  @override
  Future<String?> getAuthorizationHeader() async => null;

  @override
  Future<String?> getDeviceCredential() async => null;

  @override
  Future<void> persistSession() async {}

  @override
  Future<void> restoreSession() async {}
}
