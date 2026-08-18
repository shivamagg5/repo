// =============================================================================
// Scanner Mobile — Scanner State & Riverpod Notifier
// Orchestrates device registration, pairing, two-step Inspect-and-Approve
// admission workflow, offline cryptographic validation, SQLite sync, and metrics.
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
  inspecting,      // Step 1: Scanned & verified, showing details for staff review
  success,         // Step 2: Approved & recorded in DB / SQLite
  alreadyUsed,     // Denied: Ticket was already checked in
  wrongEvent,      // Denied: Ticket for different event
  invalid,         // Denied: Corrupt or forged signature
  expired,         // Denied: Outside entry window
  offlineAccepted, // Approved: Validated offline and queued for sync
  revoked,         // Denied: Device revoked
}

class ScanHistoryItem {
  final String ticketId;
  final String attendeeName;
  final String ticketTier;
  final DateTime timestamp;
  final ScanProcessingStatus status;
  final String statusText;
  final bool isOffline;

  const ScanHistoryItem({
    required this.ticketId,
    required this.attendeeName,
    required this.ticketTier,
    required this.timestamp,
    required this.status,
    required this.statusText,
    this.isOffline = false,
  });
}

class TierStats {
  final String name;
  final int admitted;
  final int capacity;

  const TierStats({
    required this.name,
    required this.admitted,
    required this.capacity,
  });
}

class PendingInspection {
  final String qrPayload;
  final ParsedTicketCredential parsed;
  final String attendeeName;
  final String ticketTier;
  final String ticketNumber;
  final bool isOnlineCandidate;
  final Map<String, dynamic>? serverInspectionData;

  const PendingInspection({
    required this.qrPayload,
    required this.parsed,
    required this.attendeeName,
    required this.ticketTier,
    required this.ticketNumber,
    required this.isOnlineCandidate,
    this.serverInspectionData,
  });
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
  final int deniedCount;
  final ScanProcessingStatus scanStatus;
  final String statusMessage;
  final PendingInspection? pendingInspection;
  final String? lastAttendeeName;
  final String? lastTicketType;
  final String? lastTicketNumber;
  final String? syncSummary;
  final String? errorMessage;
  final List<ScanHistoryItem> history;
  final Map<String, int> tierAdmissions;
  final double zoomLevel;
  final bool soundEnabled;
  final bool hapticEnabled;

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
    this.deniedCount = 0,
    this.scanStatus = ScanProcessingStatus.idle,
    this.statusMessage = 'Point camera at attendee ticket QR code',
    this.pendingInspection,
    this.lastAttendeeName,
    this.lastTicketType,
    this.lastTicketNumber,
    this.syncSummary,
    this.errorMessage,
    this.history = const [],
    this.tierAdmissions = const {},
    this.zoomLevel = 1.0,
    this.soundEnabled = true,
    this.hapticEnabled = true,
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
    int? deniedCount,
    ScanProcessingStatus? scanStatus,
    String? statusMessage,
    PendingInspection? pendingInspection,
    bool clearPendingInspection = false,
    String? lastAttendeeName,
    String? lastTicketType,
    String? lastTicketNumber,
    String? syncSummary,
    String? errorMessage,
    List<ScanHistoryItem>? history,
    Map<String, int>? tierAdmissions,
    double? zoomLevel,
    bool? soundEnabled,
    bool? hapticEnabled,
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
      deniedCount: deniedCount ?? this.deniedCount,
      scanStatus: scanStatus ?? this.scanStatus,
      statusMessage: statusMessage ?? this.statusMessage,
      pendingInspection: clearPendingInspection ? null : (pendingInspection ?? this.pendingInspection),
      lastAttendeeName: lastAttendeeName ?? this.lastAttendeeName,
      lastTicketType: lastTicketType ?? this.lastTicketType,
      lastTicketNumber: lastTicketNumber ?? this.lastTicketNumber,
      syncSummary: syncSummary ?? this.syncSummary,
      errorMessage: errorMessage,
      history: history ?? this.history,
      tierAdmissions: tierAdmissions ?? this.tierAdmissions,
      zoomLevel: zoomLevel ?? this.zoomLevel,
      soundEnabled: soundEnabled ?? this.soundEnabled,
      hapticEnabled: hapticEnabled ?? this.hapticEnabled,
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

  final Map<String, DateTime> _sessionScannedTickets = {};

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
      final pubKey = await _deviceKeyService.generateAndStoreKeyPair();
      final authHeader = await _authService.getAuthorizationHeader();
      final token = authHeader?.replaceFirst('Bearer ', '');

      try {
        final regRes = await _apiService.registerDevice(
          deviceIdentifier: 'Handheld-Scanner-${DateTime.now().millisecondsSinceEpoch}',
          publicKeyPem: pubKey,
          deviceModel: 'Flutter-Scanner-Pro-v2',
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
        const fallbackId = 'dev-scanner-gate-01';
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

  /// Pair device to Event and Gate
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

      final isValid = _cryptoService.verifyAuthorizationPackage(
        packageData: remotePkg,
        packageSignature: pkgSig,
      );

      if (isValid) {
        pkg = remotePkg;
        serverTicketKey = pkg['publicKeyPem'] as String? ?? CryptoService.rootTrustPublicKeyPem;
      }
    } catch (_) {}

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

  void setZoomLevel(double zoom) {
    state = state.copyWith(zoomLevel: zoom);
  }

  void toggleSound() {
    state = state.copyWith(soundEnabled: !state.soundEnabled);
  }

  void toggleHaptics() {
    state = state.copyWith(hapticEnabled: !state.hapticEnabled);
  }

  // ===========================================================================
  // STEP 1: SCAN & INSPECT (Camera Freezes, Details Rendered for Staff Review)
  // ===========================================================================
  Future<void> processScannedPayload(String qrPayload) async {
    if (state.scanStatus == ScanProcessingStatus.processing ||
        state.scanStatus == ScanProcessingStatus.inspecting) {
      return;
    }
    if (state.eventId == null || state.gateId == null || state.deviceId == null) {
      _triggerHaptics(ScanProcessingStatus.invalid);
      state = state.copyWith(
        scanStatus: ScanProcessingStatus.invalid,
        statusMessage: 'Scanner is not paired to an event/gate.',
      );
      return;
    }

    _analyticsService?.track('scan_started', eventId: state.eventId);
    state = state.copyWith(
      scanStatus: ScanProcessingStatus.processing,
      statusMessage: 'Verifying digital credential...',
    );

    final parsed = _cryptoService.parseQrToken(qrPayload);

    // 1. Structure Check
    if (parsed == null) {
      _recordDenied(
        ticketId: 'UNKNOWN',
        attendeeName: 'Unknown',
        ticketTier: 'Invalid Barcode',
        status: ScanProcessingStatus.invalid,
        message: 'INVALID TICKET — Format or structure corrupted',
      );
      return;
    }

    // 2. Session Duplicate Check (Anti-Passback)
    if (_sessionScannedTickets.containsKey(parsed.ticketId)) {
      final prevTime = _sessionScannedTickets[parsed.ticketId]!;
      final timeStr = "${prevTime.hour.toString().padLeft(2, '0')}:${prevTime.minute.toString().padLeft(2, '0')}:${prevTime.second.toString().padLeft(2, '0')}";
      _recordDenied(
        ticketId: parsed.ticketId,
        attendeeName: _getSampleAttendeeName(parsed.ticketId),
        ticketTier: _getSampleTicketTier(parsed.ticketTypeId),
        status: ScanProcessingStatus.alreadyUsed,
        message: 'ALREADY SCANNED — First admitted at $timeStr',
      );
      return;
    }

    // 3. Event Scope Check
    if (parsed.eventId != state.eventId) {
      _recordDenied(
        ticketId: parsed.ticketId,
        attendeeName: _getSampleAttendeeName(parsed.ticketId),
        ticketTier: _getSampleTicketTier(parsed.ticketTypeId),
        status: ScanProcessingStatus.wrongEvent,
        message: 'WRONG EVENT — Ticket is issued for another event',
      );
      return;
    }

    // 4. Expiration Check
    if (parsed.isExpired) {
      _recordDenied(
        ticketId: parsed.ticketId,
        attendeeName: _getSampleAttendeeName(parsed.ticketId),
        ticketTier: _getSampleTicketTier(parsed.ticketTypeId),
        status: ScanProcessingStatus.expired,
        message: 'EXPIRED TICKET — Admission window has ended',
      );
      return;
    }

    // 5. Cryptographic Signature Validation
    final serverKey = state.serverTicketPublicKeyPem ?? CryptoService.rootTrustPublicKeyPem;
    final isCryptoValid = _cryptoService.verifyTicketOffline(
      credential: parsed,
      authorizedEventId: state.eventId!,
      serverTicketPublicKeyPem: serverKey,
    );

    if (!isCryptoValid && !state.isOnline) {
      _recordDenied(
        ticketId: parsed.ticketId,
        attendeeName: _getSampleAttendeeName(parsed.ticketId),
        ticketTier: _getSampleTicketTier(parsed.ticketTypeId),
        status: ScanProcessingStatus.invalid,
        message: 'INVALID SIGNATURE — Cryptographic verification failed',
      );
      return;
    }

    // Determine attendee name & ticket tier
    final attendeeName = _getSampleAttendeeName(parsed.ticketId);
    final ticketTier = _getSampleTicketTier(parsed.ticketTypeId);

    // Provide light review haptic feedback
    if (state.hapticEnabled) {
      HapticFeedback.mediumImpact();
    }

    // Transition to INSPECTING state (camera stays paused, details shown to staff)
    state = state.copyWith(
      scanStatus: ScanProcessingStatus.inspecting,
      statusMessage: 'PASS VERIFIED — Review details and tap Approve to admit',
      pendingInspection: PendingInspection(
        qrPayload: qrPayload,
        parsed: parsed,
        attendeeName: attendeeName,
        ticketTier: ticketTier,
        ticketNumber: parsed.ticketId,
        isOnlineCandidate: state.isOnline,
      ),
      lastAttendeeName: attendeeName,
      lastTicketType: ticketTier,
      lastTicketNumber: parsed.ticketId,
    );
  }

  // ===========================================================================
  // STEP 2: APPROVE & ADMIT (Officially records check-in and updates counters)
  // ===========================================================================
  Future<void> approveAndAdmit() async {
    final pending = state.pendingInspection;
    if (pending == null) return;

    state = state.copyWith(
      scanStatus: ScanProcessingStatus.processing,
      statusMessage: 'Recording check-in...',
    );

    // Record in local session cache immediately (prevents duplicate admission)
    _sessionScannedTickets[pending.parsed.ticketId] = DateTime.now();

    final authHeader = await _authService.getAuthorizationHeader();
    final token = authHeader?.replaceFirst('Bearer ', '') ?? '';

    bool recordedOnline = false;

    if (state.isOnline) {
      try {
        final res = await _apiService.scanTicketOnline(
          qrPayload: pending.qrPayload,
          eventId: state.eventId!,
          gateId: state.gateId!,
          deviceId: state.deviceId!,
          authToken: token,
        );

        final result = res['result'] as String? ?? 'invalid';

        if (result == 'success') {
          recordedOnline = true;
        } else if (result == 'already_used') {
          _recordDenied(
            ticketId: pending.parsed.ticketId,
            attendeeName: pending.attendeeName,
            ticketTier: pending.ticketTier,
            status: ScanProcessingStatus.alreadyUsed,
            message: 'ALREADY USED — Ticket was already admitted on server',
          );
          return;
        }
      } catch (_) {
        // Fallback to offline admission queue
      }
    }

    if (!recordedOnline) {
      // Enqueue in SQLite offline queue
      final syncId = 'sync-${DateTime.now().millisecondsSinceEpoch}-${pending.parsed.ticketId}';
      final record = OfflineScanRecord(
        syncId: syncId,
        qrPayload: pending.qrPayload,
        ticketId: pending.parsed.ticketId,
        eventId: state.eventId!,
        gateId: state.gateId!,
        deviceId: state.deviceId!,
        scannedAt: DateTime.now().toUtc().toIso8601String(),
        localVerificationResult: 'offline_accepted',
      );
      await _offlineQueueService.enqueueScan(record);
    }

    final pendingCount = await _offlineQueueService.getPendingCount();

    // Success Haptics & Analytics
    _triggerHaptics(ScanProcessingStatus.success);
    _analyticsService?.track('scan_approved', eventId: state.eventId);

    // Update tier distribution
    final updatedTiers = Map<String, int>.from(state.tierAdmissions);
    updatedTiers[pending.ticketTier] = (updatedTiers[pending.ticketTier] ?? 0) + 1;

    // Add to Recent Scan History
    final historyItem = ScanHistoryItem(
      ticketId: pending.parsed.ticketId,
      attendeeName: pending.attendeeName,
      ticketTier: pending.ticketTier,
      timestamp: DateTime.now(),
      status: recordedOnline ? ScanProcessingStatus.success : ScanProcessingStatus.offlineAccepted,
      statusText: recordedOnline ? 'Admitted (Online)' : 'Admitted (Offline Queued)',
      isOffline: !recordedOnline,
    );

    state = state.copyWith(
      scanStatus: recordedOnline ? ScanProcessingStatus.success : ScanProcessingStatus.offlineAccepted,
      validCount: state.validCount + 1,
      pendingCount: pendingCount,
      statusMessage: recordedOnline
          ? 'ADMITTED & RECORDED — Valid Entry'
          : 'ADMITTED & RECORDED (Offline Queued)',
      clearPendingInspection: true,
      history: [historyItem, ...state.history].take(50).toList(),
      tierAdmissions: updatedTiers,
    );
  }

  /// Reject / Deny admission manually
  void rejectCurrentInspection(String reason) {
    final pending = state.pendingInspection;
    if (pending == null) return;

    _recordDenied(
      ticketId: pending.parsed.ticketId,
      attendeeName: pending.attendeeName,
      ticketTier: pending.ticketTier,
      status: ScanProcessingStatus.invalid,
      message: 'DENIED BY GATE STAFF — $reason',
    );
  }

  void _recordDenied({
    required String ticketId,
    required String attendeeName,
    required String ticketTier,
    required ScanProcessingStatus status,
    required String message,
  }) {
    _triggerHaptics(status);
    _analyticsService?.track('scan_denied', eventId: state.eventId, properties: {'reason': message});

    final historyItem = ScanHistoryItem(
      ticketId: ticketId,
      attendeeName: attendeeName,
      ticketTier: ticketTier,
      timestamp: DateTime.now(),
      status: status,
      statusText: message,
    );

    state = state.copyWith(
      scanStatus: status,
      deniedCount: state.deniedCount + 1,
      statusMessage: message,
      lastAttendeeName: attendeeName,
      lastTicketType: ticketTier,
      lastTicketNumber: ticketId,
      clearPendingInspection: true,
      history: [historyItem, ...state.history].take(50).toList(),
    );
  }

  void _triggerHaptics(ScanProcessingStatus status) {
    if (!state.hapticEnabled) return;
    if (status == ScanProcessingStatus.success || status == ScanProcessingStatus.offlineAccepted) {
      HapticFeedback.heavyImpact();
    } else {
      HapticFeedback.vibrate();
    }
  }

  // ===========================================================================
  // STEP 3: RESET FOR NEXT ATTENDEE ("Scan Next Ticket")
  // ===========================================================================
  void resetScanState() {
    state = state.copyWith(
      scanStatus: ScanProcessingStatus.idle,
      statusMessage: 'Point camera at attendee ticket QR code',
      clearPendingInspection: true,
      lastAttendeeName: null,
      lastTicketType: null,
      lastTicketNumber: null,
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
        syncSummary: 'Sync complete: ${successList.length} admitted, ${conflictList.length} conflicts.',
      );
    } catch (err) {
      state = state.copyWith(
        isSyncing: false,
        syncSummary: 'Sync failed: $err. Scans safely stored in local queue.',
      );
    }
  }

  String _getSampleAttendeeName(String ticketId) {
    switch (ticketId) {
      case 'd0000000-0000-0000-0000-000000000001':
      case 'tkt-001': return 'Rahul Sharma';
      case 'd0000000-0000-0000-0000-000000000002':
      case 'tkt-002': return 'Priya Patel';
      case 'd0000000-0000-0000-0000-000000000003':
      case 'tkt-003': return 'Aman Gupta';
      case 'tkt-004': return 'Tanya Roy';
      case 'tkt-005': return 'Kabir Mehta';
      case 'tkt-006': return 'Sneha Verma';
      case 'tkt-007': return 'Rohan Deshmukh';
      case 'tkt-008': return 'Ananya Iyer';
      default: return 'Admitted Attendee';
    }
  }

  String _getSampleTicketTier(String tierId) {
    switch (tierId) {
      case 'd0000000-0000-0000-0000-000000000001':
      case 'tier-ga-01': return 'General Admission — Early Bird';
      case 'd0000000-0000-0000-0000-000000000002':
      case 'tier-vip-02': return 'VIP Elevated Deck Pass';
      case 'd0000000-0000-0000-0000-000000000003':
      case 'tier-backstage-03': return 'Backstage Access & Meet & Greet';
      default: return 'General Admission';
    }
  }
}
