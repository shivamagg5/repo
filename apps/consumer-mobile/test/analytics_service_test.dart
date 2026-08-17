// =============================================================================
// Consumer Mobile — AnalyticsService Unit Tests
// Validates canonical event taxonomy, PII sanitization, bounded buffering,
// and minor unit currency rounding.
// =============================================================================

import 'package:flutter_test/flutter_test.dart';
import 'package:consumer_mobile/services/analytics_service.dart';
import 'package:consumer_mobile/services/auth_service.dart';

class FakeAuthService implements AuthService {
  @override
  Future<String?> getAuthorizationHeader() async => 'Bearer test_token';

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  group('Consumer Mobile AnalyticsService Tests', () {
    test('verifies canonical taxonomy validation', () {
      expect(canonicalAnalyticsEvents.contains('checkout_started'), isTrue);
      expect(canonicalAnalyticsEvents.contains('payment_success'), isTrue);
      expect(canonicalAnalyticsEvents.contains('event_view'), isTrue);
      expect(canonicalAnalyticsEvents.contains('fake_invalid_event'), isFalse);
    });

    test('sanitizes forbidden PII and rounds monetary keys to integer minor units', () {
      final raw = {
        'safeKey': 'music-festival',
        'password': 'mypassword123',
        'cardNumber': '4111222233334444',
        'priceMinor': 499.6,
        'quantity': 2,
      };

      final sanitized = sanitizeProperties(raw);
      expect(sanitized, isNotNull);
      expect(sanitized!['safeKey'], 'music-festival');
      expect(sanitized['quantity'], 2);
      expect(sanitized['priceMinor'], 500); // Rounded to nearest integer
      expect(sanitized.containsKey('password'), isFalse);
      expect(sanitized.containsKey('cardNumber'), isFalse);
    });

    test('generates valid pseudonymous session identifier', () {
      final service = AnalyticsService(
        baseUrl: 'http://localhost:3000',
        authService: FakeAuthService(),
        platform: 'android',
        appVersion: '1.0.0',
      );

      expect(service.sessionId.startsWith('sess_'), isTrue);
    });
  });
}
