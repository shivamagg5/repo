// =============================================================================
// Scanner Mobile — HTTP API Client Service
// Integrates with DeviceKeyService to sign all device requests with DeviceAuthGuard headers.
// FIX-007A: Integrated with shared ApiEnvelope for uniform response decoding
// =============================================================================

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'device_key_service.dart';
import '../core/api_envelope.dart';

export '../core/api_envelope.dart' show ApiException;

class ScannerApiService {
  final String baseUrl;
  final DeviceKeyService _deviceKeyService;

  ScannerApiService({
    this.baseUrl = const String.fromEnvironment(
      'API_URL',
      defaultValue: 'https://event-platform-api-r4og.onrender.com/api/v1',
    ),
    DeviceKeyService? deviceKeyService,
  }) : _deviceKeyService = deviceKeyService ?? DeviceKeyService();

  Future<Map<String, String>> _buildHeaders({
    required String method,
    required String path,
    String? authToken,
  }) async {
    final deviceHeaders = await _deviceKeyService.generateAuthHeaders(
      method: method,
      path: path,
    );

    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (authToken != null && authToken.isNotEmpty) 'Authorization': 'Bearer $authToken',
      ...deviceHeaders,
    };
  }

  /// Step 1 of registration: Staff login registers public key (device does not have deviceId yet)
  Future<Map<String, dynamic>> registerDevice({
    required String deviceIdentifier,
    required String publicKeyPem,
    String? deviceModel,
    String? authToken,
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl/scanner/register'),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        if (authToken != null) 'Authorization': 'Bearer $authToken',
      },
      body: jsonEncode({
        'deviceIdentifier': deviceIdentifier,
        'publicKeyPem': publicKeyPem,
        if (deviceModel != null) 'deviceModel': deviceModel,
      }),
    );
    return ApiEnvelope.unwrapMap(res);
  }

  /// Pair device to Event and Gate, retrieving signed Authorization Package
  Future<Map<String, dynamic>> pairDevice({
    required String eventId,
    required String deviceId,
    required String gateId,
    required String authToken,
  }) async {
    final path = '/scanner/pair';
    final headers = await _buildHeaders(method: 'POST', path: path, authToken: authToken);

    final res = await http.post(
      Uri.parse('$baseUrl$path'),
      headers: headers,
      body: jsonEncode({
        'deviceId': deviceId,
        'eventId': eventId,
        'gateId': gateId,
      }),
    );
    return ApiEnvelope.unwrapMap(res);
  }

  /// Download Event Authorization Package
  Future<Map<String, dynamic>> getEventAuthPackage({
    required String eventId,
    required String deviceId,
    required String gateId,
    required String authToken,
  }) async {
    final path = '/scanner/events/$eventId/package';
    final headers = await _buildHeaders(method: 'GET', path: path, authToken: authToken);

    final uri = Uri.parse('$baseUrl$path?deviceId=$deviceId&gateId=$gateId');
    final res = await http.get(uri, headers: headers);
    return ApiEnvelope.unwrapMap(res);
  }

  /// Perform Online Atomic Ticket Scan
  Future<Map<String, dynamic>> scanTicketOnline({
    required String qrPayload,
    required String eventId,
    required String gateId,
    required String deviceId,
    required String authToken,
  }) async {
    final path = '/scanner/scan';
    final headers = await _buildHeaders(method: 'POST', path: path, authToken: authToken);

    final res = await http.post(
      Uri.parse('$baseUrl$path'),
      headers: headers,
      body: jsonEncode({
        'qrPayload': qrPayload,
        'eventId': eventId,
        'gateId': gateId,
        'deviceId': deviceId,
      }),
    );
    return ApiEnvelope.unwrapMap(res);
  }

  /// Batch Sync Offline Scans
  Future<Map<String, dynamic>> syncOfflineScans({
    required String deviceId,
    required String eventId,
    required List<Map<String, dynamic>> records,
    required String authToken,
  }) async {
    final path = '/scanner/sync';
    final headers = await _buildHeaders(method: 'POST', path: path, authToken: authToken);

    final res = await http.post(
      Uri.parse('$baseUrl$path'),
      headers: headers,
      body: jsonEncode({
        'deviceId': deviceId,
        'eventId': eventId,
        'records': records,
      }),
    );
    return ApiEnvelope.unwrapMap(res);
  }

  /// Search Attendees within assigned event scope (PII-minimized)
  Future<List<dynamic>> searchAttendees({
    required String eventId,
    required String query,
    required String authToken,
  }) async {
    final path = '/scanner/attendees';
    final headers = await _buildHeaders(method: 'GET', path: path, authToken: authToken);

    final uri = Uri.parse('$baseUrl$path?eventId=$eventId&query=${Uri.encodeComponent(query)}');
    final res = await http.get(uri, headers: headers);
    return ApiEnvelope.unwrapList(res);
  }

  /// Perform Manual Checkin using unified backend transaction
  Future<Map<String, dynamic>> manualCheckin({
    required String ticketId,
    required String eventId,
    required String gateId,
    required String deviceId,
    required String authToken,
  }) async {
    final path = '/scanner/manual-checkin';
    final headers = await _buildHeaders(method: 'POST', path: path, authToken: authToken);

    final res = await http.post(
      Uri.parse('$baseUrl$path'),
      headers: headers,
      body: jsonEncode({
        'ticketId': ticketId,
        'eventId': eventId,
        'gateId': gateId,
        'deviceId': deviceId,
      }),
    );
    return ApiEnvelope.unwrapMap(res);
  }
}
