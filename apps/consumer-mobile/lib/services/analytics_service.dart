// =============================================================================
// consumer-mobile — AnalyticsService
// Implements canonical telemetry tracking (14_ANALYTICS_EVENTS.md) with
// bounded in-memory buffering, PII sanitization, and fail-silent dispatch.
// =============================================================================

import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'auth_service.dart';
import '../providers/auth_provider.dart';

const Set<String> canonicalAnalyticsEvents = {
  // Consumer
  'app_open',
  'session_start',
  'page_view',
  'search_started',
  'search_completed',
  'filter_applied',
  'event_view',
  'event_share',
  'favorite_added',
  'favorite_removed',
  'checkout_started',
  'checkout_ticket_selected',
  'promo_applied',
  'payment_started',
  'payment_success',
  'payment_failed',
  'order_viewed',
  'ticket_viewed',
  'ticket_shared',
  'refund_requested',
  'notification_opened',

  // Scanner
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

const Set<String> forbiddenPropertyKeys = {
  'password',
  'token',
  'secret',
  'authorization',
  'cardnumber',
  'card_number',
  'cvv',
  'expiry',
  'accountnumber',
  'account_number',
  'ifsc',
  'privatekey',
  'private_key',
  'email',
  'adminemail',
  'phone',
};

Map<String, dynamic>? sanitizeProperties(Map<String, dynamic>? properties) {
  if (properties == null || properties.isEmpty) return null;

  final sanitized = <String, dynamic>{};
  for (final entry in properties.entries) {
    final lowerKey = entry.key.toLowerCase();
    if (forbiddenPropertyKeys.contains(lowerKey) || lowerKey.contains('password') || lowerKey.contains('secret')) {
      continue;
    }

    final value = entry.value;
    if (value is num) {
      if (lowerKey.contains('minor') || lowerKey.contains('price') || lowerKey.contains('amount') || lowerKey.contains('total')) {
        sanitized[entry.key] = value.round();
      } else {
        sanitized[entry.key] = value;
      }
    } else if (value is String || value is bool) {
      sanitized[entry.key] = value;
    }
  }

  return sanitized.isNotEmpty ? sanitized : null;
}

class AnalyticsService {
  final String baseUrl;
  final AuthService _authService;
  final String _platform;
  final String _appVersion;
  late final String sessionId;

  final List<Map<String, dynamic>> _queue = [];
  Timer? _flushTimer;
  static const int maxQueueSize = 50;
  static const int batchSize = 25;
  static const Duration flushInterval = Duration(seconds: 2);

  AnalyticsService({
    required this.baseUrl,
    required AuthService authService,
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
    if (!canonicalAnalyticsEvents.contains(eventName)) {
      if (kDebugMode) {
        print('[Analytics] Dropped non-canonical event: $eventName');
      }
      return;
    }

    final cleanProps = sanitizeProperties(properties);
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
        print('[Analytics] Fail-silent telemetry dispatch error: $e');
      }
    }
  }

  void dispose() {
    _flushTimer?.cancel();
    _flushTimer = null;
  }
}

final analyticsServiceProvider = Provider<AnalyticsService>((ref) {
  final authService = ref.watch(authServiceProvider);
  return AnalyticsService(
    baseUrl: 'http://localhost:3000',
    authService: authService,
    platform: defaultTargetPlatform == TargetPlatform.iOS ? 'ios' : 'android',
    appVersion: '1.0.0',
  );
});
