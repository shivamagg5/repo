// =============================================================================
// scanner-mobile — Scanner AnalyticsService
// Implements canonical telemetry tracking (14_ANALYTICS_EVENTS.md) for gate
// check-in operations, scan success/failure/offline metrics, and sync telemetry.
// =============================================================================

import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'scanner_auth_service.dart';

const Set<String> scannerCanonicalEvents = {
  'scanner_login',
  'scanner_event_selected',
  'scanner_bootstrap',
  'scan_started',
  'scan_success',
  'scan_invalid',
  'scan_already_used',
  'scan_wrong_event',
  'scan_refunded',
  'offline_mode_entered',
  'offline_scan',
  'sync_started',
  'sync_completed',
  'sync_conflict',
  'device_revoked',
};

const Set<String> forbiddenScannerPropertyKeys = {
  'password',
  'token',
  'secret',
  'authorization',
  'privatekey',
  'private_key',
  'publickey',
  'public_key',
  'qrraw',
  'email',
  'adminemail',
};

Map<String, dynamic>? sanitizeScannerProperties(Map<String, dynamic>? properties) {
  if (properties == null || properties.isEmpty) return null;

  final sanitized = <String, dynamic>{};
  for (final entry in properties.entries) {
    final lowerKey = entry.key.toLowerCase();
    if (forbiddenScannerPropertyKeys.contains(lowerKey) || lowerKey.contains('secret') || lowerKey.contains('key')) {
      continue;
    }

    final value = entry.value;
    if (value is num || value is String || value is bool) {
      sanitized[entry.key] = value;
    }
  }

  return sanitized.isNotEmpty ? sanitized : null;
}

class ScannerAnalyticsService {
  final String baseUrl;
  final ScannerAuthService _authService;
  final String _platform;
  final String _appVersion;
  late final String sessionId;

  final List<Map<String, dynamic>> _queue = [];
  Timer? _flushTimer;
  static const int maxQueueSize = 50;
  static const int batchSize = 25;
  static const Duration flushInterval = Duration(seconds: 2);

  ScannerAnalyticsService({
    required this.baseUrl,
    required ScannerAuthService authService,
    String platform = 'android',
    String appVersion = '1.0.0',
  })  : _authService = authService,
        _platform = platform,
        _appVersion = appVersion {
    sessionId = 'sess_${DateTime.now().millisecondsSinceEpoch.toRadixString(36)}';
  }

  void track(
    String eventName, {
    String? eventId,
    Map<String, dynamic>? properties,
  }) {
    if (!scannerCanonicalEvents.contains(eventName)) {
      if (kDebugMode) {
        print('[ScannerAnalytics] Dropped non-canonical event: $eventName');
      }
      return;
    }

    final cleanProps = sanitizeScannerProperties(properties);
    final eventPayload = <String, dynamic>{
      'clientEventId': 'evt_${DateTime.now().millisecondsSinceEpoch.toRadixString(36)}',
      'eventName': eventName,
      if (eventId != null && eventId.length == 36) 'eventId': eventId,
      'sessionId': sessionId,
      'platform': _platform,
      'appVersion': _appVersion,
      'occurredAt': DateTime.now().toUtc().toIso8601String(),
      'properties': ?cleanProps,
    };

    if (_queue.length >= maxQueueSize) {
      _queue.removeAt(0); // drop oldest
    }
    _queue.add(eventPayload);

    _scheduleFlush();
  }

  void _scheduleFlush() {
    _flushTimer ??= Timer(flushInterval, () {
      _flushTimer = null;
      flush();
    });
  }

  Future<void> flush() async {
    _flushTimer?.cancel();
    _flushTimer = null;

    if (_queue.isEmpty) return;

    final batch = _queue.take(batchSize).toList();
    _queue.removeRange(0, batch.length);

    try {
      final headers = <String, String>{
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      final authHeader = await _authService.getAuthorizationHeader();
      if (authHeader != null) headers['Authorization'] = authHeader;

      if (batch.length == 1) {
        await http.post(
          Uri.parse('$baseUrl/analytics/events'),
          headers: headers,
          body: jsonEncode(batch.first),
        );
      } else {
        await http.post(
          Uri.parse('$baseUrl/analytics/events/batch'),
          headers: headers,
          body: jsonEncode({'events': batch}),
        );
      }
    } catch (e) {
      if (kDebugMode) {
        print('[ScannerAnalytics] Fail-silent telemetry dispatch error: $e');
      }
    }
  }

  void dispose() {
    _flushTimer?.cancel();
    _flushTimer = null;
  }
}

final scannerAnalyticsServiceProvider = Provider<ScannerAnalyticsService>((ref) {
  return ScannerAnalyticsService(
    baseUrl: 'http://localhost:3000',
    authService: BasicScannerAuthService(),
    platform: defaultTargetPlatform == TargetPlatform.iOS ? 'ios' : 'android',
    appVersion: '1.0.0',
  );
});
