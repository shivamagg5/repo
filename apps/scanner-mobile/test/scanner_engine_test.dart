// =============================================================================
// Scanner Mobile — Scanner Engine Unit & Security Test Suite
// Verifies QR parsing, offline cryptographic verification, wrong event handling,
// expired credential handling, DeviceAuthGuard signing, and offline queue reconciliation.
// =============================================================================

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:scanner_mobile/core/crypto_service.dart';
import 'package:scanner_mobile/services/device_key_service.dart';
import 'package:scanner_mobile/services/offline_queue_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  FlutterSecureStorage.setMockInitialValues({});

  late CryptoService cryptoService;
  late OfflineQueueService queueService;

  setUp(() {
    cryptoService = CryptoService();
    queueService = OfflineQueueService();
  });

  group('Ticket QR Credential Parsing & Validation', () {
    test('Correctly parses valid TICKET.v1 canonical format', () {
      const validQr = 'TICKET.v1|tk_abc123|evt_fest2026|tier_vip|1770000000|1780000000|v1-2026.MEQCIG3p8sig123';
      final parsed = cryptoService.parseQrToken(validQr);

      expect(parsed, isNotNull);
      expect(parsed!.version, equals('v1'));
      expect(parsed.ticketId, equals('tk_abc123'));
      expect(parsed.eventId, equals('evt_fest2026'));
      expect(parsed.ticketTypeId, equals('tier_vip'));
      expect(parsed.issuedAt, equals('1770000000'));
      expect(parsed.expiresAt, equals('1780000000'));
      expect(parsed.keyVersion, equals('v1-2026'));
      expect(parsed.signature, equals('MEQCIG3p8sig123'));
    });

    test('Rejects malformed QR token missing TICKET header', () {
      const badHeaderQr = 'PASS.v1|tk_123|evt_1|tier_1|1700000000|none|v1.sig';
      final parsed = cryptoService.parseQrToken(badHeaderQr);
      expect(parsed, isNull);
    });

    test('Rejects QR token with insufficient pipe-delimited fields', () {
      const shortQr = 'TICKET.v1|tk_123|evt_1|tier_1.sig';
      final parsed = cryptoService.parseQrToken(shortQr);
      expect(parsed, isNull);
    });

    test('Identifies expired ticket timestamp correctly', () {
      final expiredCred = ParsedTicketCredential(
        version: 'v1',
        ticketId: 'tk_exp',
        eventId: 'evt_1',
        ticketTypeId: 'tier_1',
        issuedAt: '2025-01-01T00:00:00Z',
        expiresAt: '2025-01-02T00:00:00Z', // Expired in the past
        keyVersion: 'v1-2026',
        canonicalPayload: 'v1|tk_exp|evt_1|tier_1|2025-01-01T00:00:00Z|2025-01-02T00:00:00Z|v1-2026',
        signature: 'valid-signature-12345',
      );

      expect(expiredCred.isExpired, isTrue);
    });
  });

  group('Offline Cryptographic Scope & Verification', () {
    test('Rejects ticket when Event ID does not match assigned scanner event', () {
      final credential = ParsedTicketCredential(
        version: 'v1',
        ticketId: 'tk_wrong_event',
        eventId: 'evt_other_concert',
        ticketTypeId: 'tier_ga',
        issuedAt: '2026-08-01T00:00:00Z',
        expiresAt: null,
        keyVersion: 'v1-2026',
        canonicalPayload: 'v1|tk_wrong_event|evt_other_concert|tier_ga|2026-08-01T00:00:00Z|none|v1-2026',
        signature: 'valid-sig-1234567890',
      );

      final isValid = cryptoService.verifyTicketOffline(
        credential: credential,
        authorizedEventId: 'evt_summer_fest_2026', // Different event
        serverTicketPublicKeyPem: CryptoService.rootTrustPublicKeyPem,
      );

      expect(isValid, isFalse);
    });

    test('Validates Event Authorization Package structure against Root Trust Anchor', () {
      final packageData = {
        'deviceId': 'dev_test_01',
        'eventId': 'evt_summer_fest_2026',
        'gateId': 'gate_north_01',
        'keyVersion': 'v1-2026',
        'publicKeyPem': CryptoService.rootTrustPublicKeyPem,
        'authorizationExpiresAt': '2099-01-01T00:00:00Z',
      };

      final isValid = cryptoService.verifyAuthorizationPackage(
        packageData: packageData,
        packageSignature: 'mock-verified-signature-from-server',
      );

      expect(isValid, isTrue);
    });
  });

  group('Offline Queue & Sync Reconciliation', () {
    test('Enqueues offline scan and queries pending status', () async {
      final record = OfflineScanRecord(
        syncId: 'sync-test-uuid-001',
        qrPayload: 'TICKET.v1|tk_off_1|evt_1|tier_1|1700000000|none|v1.sig',
        ticketId: 'tk_off_1',
        eventId: 'evt_1',
        gateId: 'gate_1',
        deviceId: 'dev_1',
        scannedAt: DateTime.now().toUtc().toIso8601String(),
        localVerificationResult: 'offline_accepted',
      );

      await queueService.enqueueScan(record);
      final pending = await queueService.getPendingScans();

      expect(pending.any((r) => r.syncId == 'sync-test-uuid-001'), isTrue);
    });

    test('Reconciles sync results and updates state to synced_success and synced_conflict', () async {
      final recA = OfflineScanRecord(
        syncId: 'sync-reconcile-A',
        qrPayload: 'TICKET.v1|tk_a|evt_1|tier_1|1700000000|none|v1.sig',
        ticketId: 'tk_a',
        eventId: 'evt_1',
        gateId: 'gate_1',
        deviceId: 'dev_1',
        scannedAt: DateTime.now().toUtc().toIso8601String(),
        localVerificationResult: 'offline_accepted',
      );

      final recB = OfflineScanRecord(
        syncId: 'sync-reconcile-B',
        qrPayload: 'TICKET.v1|tk_b|evt_1|tier_1|1700000000|none|v1.sig',
        ticketId: 'tk_b',
        eventId: 'evt_1',
        gateId: 'gate_1',
        deviceId: 'dev_1',
        scannedAt: DateTime.now().toUtc().toIso8601String(),
        localVerificationResult: 'offline_accepted',
      );

      await queueService.enqueueScan(recA);
      await queueService.enqueueScan(recB);

      await queueService.reconcileSyncResults(
        successfulSyncIds: ['sync-reconcile-A'],
        conflicts: [
          {'syncId': 'sync-reconcile-B', 'reason': 'ALREADY_USED', 'conflictGate': 'gate_south'}
        ],
      );

      final history = await queueService.getAuditHistory();
      final recordA = history.firstWhere((r) => r.syncId == 'sync-reconcile-A');
      final recordB = history.firstWhere((r) => r.syncId == 'sync-reconcile-B');

      expect(recordA.syncStatus, equals('synced_success'));
      expect(recordB.syncStatus, equals('synced_conflict'));
      expect(recordB.serverResponse, contains('ALREADY_USED'));
    });
  });

  group('Device Key Management & Request Signing', () {
    test('Generates public key PEM and signs canonical request headers', () async {
      final keyService = DeviceKeyService();
      final pubKeyPem = await keyService.generateAndStoreKeyPair();

      expect(pubKeyPem, contains('-----BEGIN PUBLIC KEY-----'));
      expect(pubKeyPem, contains('-----END PUBLIC KEY-----'));

      await keyService.saveRegisteredDeviceId('dev-unit-test-01');

      final headers = await keyService.generateAuthHeaders(
        method: 'POST',
        path: '/scanner/scan',
        timestampOverride: '2026-08-14T12:00:00.000Z',
      );

      expect(headers['X-Device-Id'], equals('dev-unit-test-01'));
      expect(headers['X-Device-Timestamp'], equals('2026-08-14T12:00:00.000Z'));
      expect(headers['X-Device-Signature'], isNotEmpty);
    });
  });
}
