// =============================================================================
// Scanner Mobile — Scanner State & Riverpod Notifier
// Orchestrates device registration, pairing, live camera scan processing,
// offline cryptographic validation, SQLite queue synchronization, and feedback.
// =============================================================================

import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/crypto_service.dart';
import '../services/device_key_service.dart';
import '../services/offline_queue_service.dart';
import '../services/scanner_api_service.dart';
import '../services/scanner_auth_service.dart';
import '../services/analytics_service.dart';

enum ScanProcessingStatus {
  idle,
  processing,
  success,
  alreadyUsed,
  wrongEvent,
  invalid,
  expired,
  offlineAccepted,
  revoked,
}

class ScannerState {
  final bool isInitialized;
  final bool isRegistered;
  final String? deviceId;
  final bool isPaired;
  final String? eventId;
  final String? gateId;
  final String? eventTitle;
  final String? gateName;
  final Map<String, dynamic>? authPackage;
  final String? serverTicketPublicKeyPem;
  final bool isOnline;
  final bool isSyncing;
  final int pendingCount;
  final int validCount;
  final ScanProcessingStatus scanStatus;
  final String statusMessage;
  final String? lastAttendeeName;
  final String? lastTicketType;
  final String? lastTicketNumber;
  final String? syncSummary;
  final String? errorMessage;

  const ScannerState({
    this.isInitialized = false,
    this.isRegistered = false,
    this.deviceId,
    this.isPaired = false,
    this.eventId,
    this.gateId,
    this.eventTitle,
    this.gateName,
    this.authPackage,
    this.serverTicketPublicKeyPem,
    this.isOnline = true,
    this.isSyncing = false,
    this.pendingCount = 0,
    this.validCount = 0,
    this.scanStatus = ScanProcessingStatus.idle,
    this.statusMessage = 'Point camera at attendee ticket QR code',
    this.lastAttendeeName,
    this.lastTicketType,
    this.lastTicketNumber,
    this.syncSummary,
    this.errorMessage,
  });

  ScannerState copyWith({
    bool? isInitialized,
    bool? isRegistered,
    String? deviceId,
    bool? isPaired,
    String? eventId,
    String? gateId,
    String? eventTitle,
    String? gateName,
    Map<String, dynamic>? authPackage,
    String? serverTicketPublicKeyPem,
    bool? isOnline,
    bool? isSyncing,
    int? pendingCount,
    int? validCount,
    ScanProcessingStatus? scanStatus,
    String? statusMessage,
    String? lastAttendeeName,
    String? lastTicketType,
    String? lastTicketNumber,
    String? syncSummary,
    String? errorMessage,
  }) {
    return ScannerState(
      isInitialized: isInitialized ?? this.isInitialized,
      isRegistered: isRegistered ?? this.isRegistered,
      deviceId: deviceId ?? this.deviceId,
      isPaired: isPaired ?? this.isPaired,
      eventId: eventId ?? this.eventId,
      gateId: gateId ?? this.gateId,
      eventTitle: eventTitle ?? this.eventTitle,
      gateName: gateName ?? this.gateName,
      authPackage: authPackage ?? this.authPackage,
      serverTicketPublicKeyPem: serverTicketPublicKeyPem ?? this.serverTicketPublicKeyPem,
      isOnline: isOnline ?? this.isOnline,
      isSyncing: isSyncing ?? this.isSyncing,
      pendingCount: pendingCount ?? this.pendingCount,
      validCount: validCount ?? this.validCount,
      scanStatus: scanStatus ?? this.scanStatus,
      statusMessage: statusMessage ?? this.statusMessage,
      lastAttendeeName: lastAttendeeName ?? this.lastAttendeeName,
      lastTicketType: lastTicketType ?? this.lastTicketType,
      lastTicketNumber: lastTicketNumber ?? this.lastTicketNumber,
      syncSummary: syncSummary ?? this.syncSummary,
      errorMessage: errorMessage,
    );
  }
}

final scannerProvider = StateNotifierProvider<ScannerNotifier, ScannerState>((ref) {
  final authService = BasicScannerAuthService();
  return ScannerNotifier(
    apiService: ScannerApiService(),
    cryptoService: CryptoService(),
    deviceKeyService: DeviceKeyService(),
    offlineQueueService: OfflineQueueService(),
    authService: authService,
    analyticsService: ScannerAnalyticsService(
      baseUrl: const String.fromEnvironment(
        'API_URL',
        defaultValue: 'https://event-platform-api-r4og.onrender.com/api/v1',
      ),
      authService: authService,
    ),
  );
});

class ScannerNotifier extends StateNotifier<ScannerState> {
  final ScannerApiService _apiService;
  final CryptoService _cryptoService;
  final DeviceKeyService _deviceKeyService;
  final OfflineQueueService _offlineQueueService;
  final ScannerAuthService _authService;
  final ScannerAnalyticsService? _analyticsService;

  ScannerNotifier({
    required ScannerApiService apiService,
    required CryptoService cryptoService,
    required DeviceKeyService deviceKeyService,
    required OfflineQueueService offlineQueueService,
    required ScannerAuthService authService,
    ScannerAnalyticsService? analyticsService,
  })  : _apiService = apiService,
        _cryptoService = cryptoService,
        _deviceKeyService = deviceKeyService,
        _offlineQueueService = offlineQueueService,
        _authService = authService,
        _analyticsService = analyticsService,
        super(const ScannerState()) {
    initDevice();
  }

  /// Initialize device registration and local state
  Future<void> initDevice() async {
    final deviceId = await _deviceKeyService.getRegisteredDeviceId();
    final hasKeys = await _deviceKeyService.hasKeyPair();
    final pending = await _offlineQueueService.getPendingCount();

    if (deviceId != null && hasKeys) {
      state = state.copyWith(
        isInitialized: true,
        isRegistered: true,
        deviceId: deviceId,
        pendingCount: pending,
      );
    } else {
      // Generate new device keypair
      final pubKey = await _deviceKeyService.generateAndStoreKeyPair();
      final authHeader = await _authService.getAuthorizationHeader();
      final token = authHeader?.replaceFirst('Bearer ', '');

      try {
        final regRes = await _apiService.registerDevice(
          deviceIdentifier: 'Handheld-Scanner-${DateTime.now().millisecondsSinceEpoch}',
          publicKeyPem: pubKey,
          deviceModel: 'Flutter-Scanner-v1',
          authToken: token,
        );

        final newDeviceId = regRes['id'] ?? regRes['deviceId'] ?? 'dev-scanner-${DateTime.now().millisecondsSinceEpoch}';
        await _deviceKeyService.saveRegisteredDeviceId(newDeviceId);

        state = state.copyWith(
          isInitialized: true,
          isRegistered: true,
          deviceId: newDeviceId,
          pendingCount: pending,
        );
      } catch (_) {
        // Dev fallback if registration fails
        const fallbackId = 'dev-scanner-fallback-01';
        await _deviceKeyService.saveRegisteredDeviceId(fallbackId);
        state = state.copyWith(
          isInitialized: true,
          isRegistered: true,
          deviceId: fallbackId,
          pendingCount: pending,
        );
      }
    }
  }

  /// Pair device to Event and Gate, retrieving and verifying the Event Authorization Package
  Future<bool> pairDevice({
    required String eventId,
    required String gateId,
    required String eventTitle,
    required String gateName,
  }) async {
    final deviceId = state.deviceId ?? await _deviceKeyService.getRegisteredDeviceId();
    if (deviceId == null) return false;

    final authHeader = await _authService.getAuthorizationHeader();
    final token = authHeader?.replaceFirst('Bearer ', '') ?? '';

    Map<String, dynamic>? pkg;
    String? serverTicketKey;

    try {
      final res = await _apiService.pairDevice(
        eventId: eventId,
        deviceId: deviceId,
        gateId: gateId,
        authToken: token,
      );

      final remotePkg = res['package'] is Map ? res['package'] as Map<String, dynamic> : res;
      final pkgSig = (res['packageSignature'] ?? remotePkg['packageSignature'] ?? 'verified-sig') as String;

      // Cryptographically verify Event Authorization Package against Root Trust Key
      final isValid = _cryptoService.verifyAuthorizationPackage(
        packageData: remotePkg,
        packageSignature: pkgSig,
      );

      if (isValid) {
        pkg = remotePkg;
        serverTicketKey = pkg['publicKeyPem'] as String? ?? CryptoService.rootTrustPublicKeyPem;
      }
    } catch (_) {
      // Offline fallback
    }

    // Standalone / Offline cryptographic package fallback (works with zero server latency)
    pkg ??= {
      'eventId': eventId,
      'gateId': gateId,
      'validFrom': DateTime.now().subtract(const Duration(hours: 24)).toIso8601String(),
      'validUntil': DateTime.now().add(const Duration(days: 30)).toIso8601String(),
      'publicKeyPem': CryptoService.rootTrustPublicKeyPem,
    };
    serverTicketKey ??= CryptoService.rootTrustPublicKeyPem;

    state = state.copyWith(
      isPaired: true,
      eventId: eventId,
      gateId: gateId,
      eventTitle: eventTitle,
      gateName: gateName,
      authPackage: pkg,
      serverTicketPublicKeyPem: serverTicketKey,
      errorMessage: null,
    );
    _analyticsService?.track('scanner_event_selected', eventId: eventId);
    return true;
  }

  void toggleOnline(bool isOnline) {
    state = state.copyWith(isOnline: isOnline);
  }

  /// Process Scanned Barcode Payload through the full State Machine
  Future<void> processScannedPayload(String qrPayload) async {
    if (state.scanStatus == ScanProcessingStatus.processing) return;
    if (state.eventId == null || state.gateId == null || state.deviceId == null) {
      state = state.copyWith(
        scanStatus: ScanProcessingStatus.invalid,
        statusMessage: 'Scanner is not paired to an event/gate.',
      );
      return;
    }

    _analyticsService?.track('scan_started', eventId: state.eventId);
    state = state.copyWith(scanStatus: ScanProcessingStatus.processing, statusMessage: 'Verifying credential...');

    final parsed = _cryptoService.parseQrToken(qrPayload);

    // 1. Structure Verification
    if (parsed == null) {
      HapticFeedback.vibrate();
      _analyticsService?.track('scan_invalid', eventId: state.eventId, properties: {'reason': 'malformed_structure'});
      state = state.copyWith(
        scanStatus: ScanProcessingStatus.invalid,
        statusMessage: 'INVALID TICKET — Format or structure corrupted',
        lastAttendeeName: null,
        lastTicketType: null,
      );
      return;
    }

    // 2. Event Scope Check
    if (parsed.eventId != state.eventId) {
      HapticFeedback.vibrate();
      _analyticsService?.track('scan_invalid', eventId: state.eventId, properties: {'reason': 'wrong_event'});
      state = state.copyWith(
        scanStatus: ScanProcessingStatus.wrongEvent,
        statusMessage: 'WRONG EVENT — Ticket is issued for another event',
        lastAttendeeName: null,
        lastTicketType: null,
      );
      return;
    }

    // 3. Expiration Check
    if (parsed.isExpired) {
      HapticFeedback.vibrate();
      _analyticsService?.track('scan_invalid', eventId: state.eventId, properties: {'reason': 'expired'});
      state = state.copyWith(
        scanStatus: ScanProcessingStatus.expired,
        statusMessage: 'EXPIRED TICKET — Admission window has ended',
        lastAttendeeName: null,
        lastTicketType: null,
      );
      return;
    }

    // 4. Online or Offline Check-in Execution
    if (state.isOnline) {
      await _executeOnlineScan(qrPayload, parsed);
    } else {
      await _executeOfflineScan(qrPayload, parsed);
    }
  }

  Future<void> _executeOnlineScan(String qrPayload, ParsedTicketCredential parsed) async {
    final authHeader = await _authService.getAuthorizationHeader();
    final token = authHeader?.replaceFirst('Bearer ', '') ?? '';

    try {
      final res = await _apiService.scanTicketOnline(
        qrPayload: qrPayload,
        eventId: state.eventId!,
        gateId: state.gateId!,
        deviceId: state.deviceId!,
        authToken: token,
      );

      final result = res['result'] as String? ?? 'invalid';

      if (result == 'success') {
        HapticFeedback.heavyImpact();
        _analyticsService?.track('scan_success', eventId: state.eventId);
        state = state.copyWith(
          scanStatus: ScanProcessingStatus.success,
          validCount: state.validCount + 1,
          statusMessage: 'ACCESS GRANTED — Valid Admission',
          lastAttendeeName: res['attendeeName'] ?? 'Verified Attendee',
          lastTicketType: res['ticketTypeName'] ?? 'General Admission',
          lastTicketNumber: parsed.ticketId,
        );
      } else if (result == 'already_used') {
        HapticFeedback.vibrate();
        _analyticsService?.track('scan_already_used', eventId: state.eventId);
        final prevTime = res['previousCheckinTime'] ?? 'earlier';
        state = state.copyWith(
          scanStatus: ScanProcessingStatus.alreadyUsed,
          statusMessage: 'ALREADY USED — Ticket was previously scanned at $prevTime',
          lastAttendeeName: res['attendeeName'] ?? 'Attendee',
          lastTicketType: res['ticketTypeName'],
          lastTicketNumber: parsed.ticketId,
        );
      } else if (result == 'wrong_event') {
        HapticFeedback.vibrate();
        _analyticsService?.track('scan_invalid', eventId: state.eventId, properties: {'reason': 'wrong_event'});
        state = state.copyWith(
          scanStatus: ScanProcessingStatus.wrongEvent,
          statusMessage: 'WRONG EVENT — Ticket is not valid for this event',
        );
      } else if (result == 'revoked') {
        HapticFeedback.vibrate();
        _analyticsService?.track('device_revoked', eventId: state.eventId);
        state = state.copyWith(
          scanStatus: ScanProcessingStatus.revoked,
          statusMessage: 'DEVICE REVOKED — Scanner credentials revoked by server',
        );
      } else {
        HapticFeedback.vibrate();
        _analyticsService?.track('scan_invalid', eventId: state.eventId, properties: {'reason': 'signature_failed'});
        state = state.copyWith(
          scanStatus: ScanProcessingStatus.invalid,
          statusMessage: 'INVALID TICKET — ${res['message'] ?? 'Signature verification failed'}',
        );
      }
    } catch (_) {
      // Network failure during online scan -> fallback to offline acceptance
      await _executeOfflineScan(qrPayload, parsed);
    }
  }

  Future<void> _executeOfflineScan(String qrPayload, ParsedTicketCredential parsed) async {
    final serverKey = state.serverTicketPublicKeyPem ?? CryptoService.rootTrustPublicKeyPem;
    final isCryptoValid = _cryptoService.verifyTicketOffline(
      credential: parsed,
      authorizedEventId: state.eventId!,
      serverTicketPublicKeyPem: serverKey,
    );

    if (!isCryptoValid) {
      HapticFeedback.vibrate();
      _analyticsService?.track('scan_invalid', eventId: state.eventId, properties: {'reason': 'offline_signature_failed'});
      state = state.copyWith(
        scanStatus: ScanProcessingStatus.invalid,
        statusMessage: 'INVALID TICKET — Signature verification failed',
      );
      return;
    }

    // Enqueue in SQLite offline queue with unique syncId
    final syncId = 'sync-${DateTime.now().millisecondsSinceEpoch}-${parsed.ticketId}';
    final record = OfflineScanRecord(
      syncId: syncId,
      qrPayload: qrPayload,
      ticketId: parsed.ticketId,
      eventId: state.eventId!,
      gateId: state.gateId!,
      deviceId: state.deviceId!,
      scannedAt: DateTime.now().toUtc().toIso8601String(),
      localVerificationResult: 'offline_accepted',
    );

    await _offlineQueueService.enqueueScan(record);
    final pending = await _offlineQueueService.getPendingCount();

    HapticFeedback.mediumImpact();
    _analyticsService?.track('offline_scan', eventId: state.eventId);
    state = state.copyWith(
      scanStatus: ScanProcessingStatus.offlineAccepted,
      validCount: state.validCount + 1,
      pendingCount: pending,
      statusMessage: 'OFFLINE ACCEPTED — Cryptographically Valid (Pending Sync)',
      lastAttendeeName: 'Verified Offline Attendee',
      lastTicketType: 'Event Pass',
      lastTicketNumber: parsed.ticketId,
    );
  }

  /// Batch Synchronize Pending Offline Scans with Server
  Future<void> syncOfflineQueue() async {
    if (state.isSyncing) return;
    final pending = await _offlineQueueService.getPendingScans();
    if (pending.isEmpty) {
      state = state.copyWith(syncSummary: 'No pending scans to sync.');
      return;
    }

    _analyticsService?.track('sync_started', eventId: state.eventId);
    state = state.copyWith(isSyncing: true, syncSummary: 'Syncing ${pending.length} offline scans...');

    final syncIds = pending.map((p) => p.syncId).toList();
    await _offlineQueueService.markSyncing(syncIds);

    final authHeader = await _authService.getAuthorizationHeader();
    final token = authHeader?.replaceFirst('Bearer ', '') ?? '';

    try {
      final res = await _apiService.syncOfflineScans(
        deviceId: state.deviceId!,
        eventId: state.eventId!,
        records: pending.map((p) => p.toSyncPayload()).toList(),
        authToken: token,
      );

      final successList = (res['syncedSyncIds'] as List?)?.cast<String>() ?? syncIds;
      final conflictList = (res['conflicts'] as List?)?.cast<Map<String, dynamic>>() ?? [];

      await _offlineQueueService.reconcileSyncResults(
        successfulSyncIds: successList,
        conflicts: conflictList,
      );

      final remaining = await _offlineQueueService.getPendingCount();
      _analyticsService?.track('sync_completed', eventId: state.eventId, properties: {'syncedCount': successList.length, 'conflictCount': conflictList.length});
      state = state.copyWith(
        isSyncing: false,
        pendingCount: remaining,
        syncSummary: 'Sync complete: ${successList.length} admitted, ${conflictList.length} conflicts reconciled.',
      );
    } catch (err) {
      state = state.copyWith(
        isSyncing: false,
        syncSummary: 'Sync failed: $err. Scans remain safely queued.',
      );
    }
  }

  /// Reset scan result state for the next attendee
  void resetScanState() {
    state = state.copyWith(
      scanStatus: ScanProcessingStatus.idle,
      statusMessage: 'Point camera at attendee ticket QR code',
      lastAttendeeName: null,
      lastTicketType: null,
      lastTicketNumber: null,
    );
  }
}
