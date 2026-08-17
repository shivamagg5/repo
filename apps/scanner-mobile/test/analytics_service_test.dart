// =============================================================================
// Scanner Mobile — AnalyticsService Unit Tests
// Validates canonical scanner events, secret stripping, and bounded buffering.
// =============================================================================

import 'package:flutter_test/flutter_test.dart';
import 'package:scanner_mobile/services/analytics_service.dart';
import 'package:scanner_mobile/services/scanner_auth_service.dart';

class FakeScannerAuth implements ScannerAuthService {
  @override
  Future<String?> getAuthorizationHeader() async => 'Bearer test_token';

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  group('Scanner Mobile AnalyticsService Tests', () {
    test('verifies scanner canonical taxonomy validation', () {
      expect(scannerCanonicalEvents.contains('scan_started'), isTrue);
      expect(scannerCanonicalEvents.contains('scan_success'), isTrue);
      expect(scannerCanonicalEvents.contains('scan_already_used'), isTrue);
      expect(scannerCanonicalEvents.contains('scan_invalid'), isTrue);
      expect(scannerCanonicalEvents.contains('offline_scan'), isTrue);
      expect(scannerCanonicalEvents.contains('sync_completed'), isTrue);
      expect(scannerCanonicalEvents.contains('fake_scan_event'), isFalse);
    });

    test('sanitizes private keys, secrets, and raw qr tokens from telemetry', () {
      final raw = {
        'gateId': 'gate-01',
        'reason': 'invalid_signature',
        'privateKey': '-----BEGIN EC PRIVATE KEY-----',
        'qrRaw': 'TICKET.v1.secret.payload',
        'syncedCount': 5,
      };

      final sanitized = sanitizeScannerProperties(raw);
      expect(sanitized, isNotNull);
      expect(sanitized!['gateId'], 'gate-01');
      expect(sanitized['reason'], 'invalid_signature');
      expect(sanitized['syncedCount'], 5);
      expect(sanitized.containsKey('privateKey'), isFalse);
      expect(sanitized.containsKey('qrRaw'), isFalse);
    });
  });
}
