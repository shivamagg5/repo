// =============================================================================
// Shared API Response Envelope Decoder
// FIX-007A: Standard decoder for backend responses wrapped in { data: T, meta: ... }
// =============================================================================

import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiException implements Exception {
  final int statusCode;
  final String code;
  final String message;

  const ApiException({
    required this.statusCode,
    required this.code,
    required this.message,
  });

  @override
  String toString() => 'ApiException($statusCode): [$code] $message';
}

class ApiEnvelope {
  /// Unwraps JSON response from the backend into typed data or throws ApiException.
  /// Handles:
  ///   1. Standard envelope: { data: T, meta: { ... } }
  ///   2. Error response: { error: { code, message } } or { statusCode, message }
  ///   3. Raw object or list when not enveloped
  static dynamic unwrap(http.Response response) {
    if (response.statusCode < 200 || response.statusCode >= 300) {
      _throwError(response);
    }

    if (response.body.isEmpty) return null;

    final decoded = jsonDecode(response.body);
    if (decoded is Map<String, dynamic>) {
      if (decoded.containsKey('data')) {
        return decoded['data'];
      }
    }
    return decoded;
  }

  /// Extracts single object from response body.
  static Map<String, dynamic> unwrapMap(http.Response response) {
    final data = unwrap(response);
    if (data is Map<String, dynamic>) return data;
    throw ApiException(
      statusCode: response.statusCode,
      code: 'UNEXPECTED_RESPONSE_FORMAT',
      message: 'Expected Map in API response envelope, got ${data.runtimeType}',
    );
  }

  /// Extracts list from response body.
  static List<dynamic> unwrapList(http.Response response) {
    final data = unwrap(response);
    if (data is List) return data;
    if (data == null) return [];
    throw ApiException(
      statusCode: response.statusCode,
      code: 'UNEXPECTED_RESPONSE_FORMAT',
      message: 'Expected List in API response envelope, got ${data.runtimeType}',
    );
  }

  static void _throwError(http.Response response) {
    try {
      final body = jsonDecode(response.body);
      if (body is Map<String, dynamic>) {
        final errorObj = body['error'] is Map<String, dynamic>
            ? body['error'] as Map<String, dynamic>
            : body;
        final code = errorObj['code'] as String? ?? body['code'] as String? ?? 'HTTP_${response.statusCode}';
        final message = errorObj['message'] as String? ??
            body['message'] as String? ??
            'Request failed (${response.statusCode})';
        throw ApiException(
          statusCode: response.statusCode,
          code: code,
          message: message,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
    }

    throw ApiException(
      statusCode: response.statusCode,
      code: 'HTTP_${response.statusCode}',
      message: response.statusCode == 401
          ? 'Unauthorized scanner request.'
          : 'Request failed with status ${response.statusCode}',
    );
  }
}
