import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:consumer_mobile/screens/home_screen.dart';
import 'package:consumer_mobile/providers/auth_provider.dart';

void main() {
  testWidgets('HomeScreen renders brand and sign-in action when unauthenticated',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authNotifierProvider.overrideWith(
            (ref) => _FakeAuthNotifier(const AuthState(status: AuthStatus.unauthenticated)),
          ),
        ],
        child: const MaterialApp(
          home: HomeScreen(),
        ),
      ),
    );

    expect(find.text('Discover Events'), findsOneWidget);
    expect(find.text('Find Your Next Adventure'), findsOneWidget);
    expect(find.text('Sign In'), findsOneWidget);
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
  Future<void> signOut() async {
    state = const AuthState(status: AuthStatus.unauthenticated);
  }
}
