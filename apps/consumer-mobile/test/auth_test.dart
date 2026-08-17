import 'package:flutter_test/flutter_test.dart';
import 'package:consumer_mobile/models/user_profile.dart';
import 'package:consumer_mobile/providers/auth_provider.dart';

void main() {
  group('Consumer Mobile Auth Models & State Tests', () {
    test('UserProfile deserializes from backend API JSON correctly', () {
      final json = {
        'id': 'usr_123',
        'email': 'jane@example.com',
        'name': 'Jane Doe',
        'phone': '+1234567890',
        'status': 'active',
        'createdAt': '2026-08-13T00:00:00.000Z',
      };

      final profile = UserProfile.fromJson(json);

      expect(profile.id, 'usr_123');
      expect(profile.email, 'jane@example.com');
      expect(profile.name, 'Jane Doe');
      expect(profile.phone, '+1234567890');
      expect(profile.status, 'active');
    });

    test('UserProfile handles nested data envelope from backend response', () {
      final envelope = {
        'data': {
          'id': 'usr_456',
          'email': 'alex@example.com',
          'name': 'Alex Smith',
          'status': 'active',
          'createdAt': '2026-08-13T00:00:00.000Z',
        }
      };

      final profile = UserProfile.fromJson(envelope);
      expect(profile.id, 'usr_456');
      expect(profile.name, 'Alex Smith');
    });

    test('AuthState initial state is unauthenticated or initial', () {
      const state = AuthState();
      expect(state.status, AuthStatus.initial);
      expect(state.isAuthenticated, false);
      expect(state.isLoading, false);
      expect(state.user, null);
      expect(state.profile, null);
    });

    test('AuthState copyWith transitions state accurately', () {
      const initial = AuthState(status: AuthStatus.initial);
      final loading = initial.copyWith(status: AuthStatus.loading);
      expect(loading.isLoading, true);

      final errorState = loading.copyWith(
        status: AuthStatus.unauthenticated,
        error: 'Invalid credentials',
      );
      expect(errorState.error, 'Invalid credentials');
      expect(errorState.isAuthenticated, false);

      final cleared = errorState.copyWith(clearError: true);
      expect(cleared.error, null);
    });
  });
}
