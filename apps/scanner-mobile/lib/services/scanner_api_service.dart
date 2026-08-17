// =============================================================================
// Scanner Mobile — HTTP API Client Service
// Integrates with DeviceKeyService to sign all device requests with DeviceAuthGuard headers.
// =============================================================================

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'device_key_service.dart';

class ScannerApiService {
  final String baseUrl;
  final DeviceKeyService _deviceKeyService;

  ScannerApiService({
    this.baseUrl = 'http://localhost:3001/api/v1',
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
        if (authToken != null) 'Authorization': 'Bearer $authToken',
      },
      body: jsonEncode({
        'deviceIdentifier': deviceIdentifier,
        'publicKeyPem': publicKeyPem,
        'deviceModel': ?deviceModel,
      }),
    );
    return jsonDecode(res.body);
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
    return jsonDecode(res.body);
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
    return jsonDecode(res.body);
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
    return jsonDecode(res.body);
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
    return jsonDecode(res.body);
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
    final data = jsonDecode(res.body);
    return data is List ? data : (data['data'] ?? []);
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
    return jsonDecode(res.body);
  }
}
