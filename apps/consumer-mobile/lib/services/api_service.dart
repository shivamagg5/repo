import 'dart:convert';
import 'package:http/http.dart' as http;
import 'auth_service.dart';

/// ApiService — typed HTTP client for the backend API.
/// Automatically attaches Authorization header from Supabase session.
class ApiService {
  final String baseUrl;
  final AuthService _authService;

  ApiService({
    required this.baseUrl,
    required AuthService authService,
  }) : _authService = authService;

  Future<Map<String, String>> _headers() async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    final authHeader = await _authService.getAuthorizationHeader();
    if (authHeader != null) headers['Authorization'] = authHeader;
    return headers;
  }

  Future<T> get<T>(String path, T Function(Map<String, dynamic>) fromJson) async {
    final res = await http.get(
      Uri.parse('$baseUrl$path'),
      headers: await _headers(),
    );
    _assertSuccess(res);
    return fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  Future<T> post<T>(
    String path,
    Map<String, dynamic>? body,
    T Function(Map<String, dynamic>) fromJson,
  ) async {
    final res = await http.post(
      Uri.parse('$baseUrl$path'),
      headers: await _headers(),
      body: body != null ? jsonEncode(body) : null,
    );
    _assertSuccess(res);
    return fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  Future<T> patch<T>(
    String path,
    Map<String, dynamic>? body,
    T Function(Map<String, dynamic>) fromJson,
  ) async {
    final res = await http.patch(
      Uri.parse('$baseUrl$path'),
      headers: await _headers(),
      body: body != null ? jsonEncode(body) : null,
    );
    _assertSuccess(res);
    return fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  void _assertSuccess(http.Response res) {
    if (res.statusCode >= 200 && res.statusCode < 300) return;
    final body = jsonDecode(res.body);
    throw ApiException(
      statusCode: res.statusCode,
      code: (body as Map<String, dynamic>)['code'] as String? ?? 'UNKNOWN',
      message: body['message'] as String? ?? 'Request failed',
    );
  }
}

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
