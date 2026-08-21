import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:consumer_mobile/screens/auth/login_screen.dart';
import 'package:consumer_mobile/providers/auth_provider.dart';

void main() {
  testWidgets('LoginScreen renders email and password form fields',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authNotifierProvider.overrideWith(
            (ref) => _FakeAuthNotifier(const AuthState(status: AuthStatus.unauthenticated)),
          ),
        ],
        child: const MaterialApp(
          home: LoginScreen(),
        ),
      ),
    );

    expect(find.byType(TextFormField), findsNWidgets(2));
    expect(find.text('Log In ✦'), findsOneWidget);
  });
}

class _FakeAuthNotifier extends StateNotifier<AuthState> implements AuthNotifier {
  _FakeAuthNotifier(super.state);

  @override
  Future<bool> signInWithEmail(String email, String password) async => true;

  @override
  Future<bool> signUpWithEmail(String email, String password, String name) async => true;

  @override
  Future<void> signInWithGoogle() async {}

  @override
  Future<void> signInWithApple() async {}

  @override
  Future<bool> signInWithDemoAccount() async => true;

  @override
  Future<void> signOut() async {}

  @override
  Future<void> refreshProfile() async {}
}
