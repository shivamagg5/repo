// =============================================================================
// consumer-mobile — ApiService
// Typed HTTP client for the backend API with auth and domain methods
// =============================================================================

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'auth_service.dart';
import '../models/ticket_model.dart';
import '../models/order_model.dart';
import '../models/reservation_model.dart';

/// ApiService — typed HTTP client for the backend API.
/// Automatically attaches Authorization header from Supabase session.
class ApiService {
  final String baseUrl;
  final AuthService _authService;

  ApiService({
    required this.baseUrl,
    required AuthService authService,
  }) : _authService = authService;

  Future<Map<String, String>> _headers([Map<String, String>? customHeaders]) async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    final authHeader = await _authService.getAuthorizationHeader();
    if (authHeader != null) headers['Authorization'] = authHeader;
    if (customHeaders != null) headers.addAll(customHeaders);
    return headers;
  }

  Future<T> get<T>(String path, T Function(Map<String, dynamic>) fromJson) async {
    final res = await http.get(
      Uri.parse('$baseUrl$path'),
      headers: await _headers(),
    );
    _assertSuccess(res);
    final decoded = jsonDecode(res.body);
    final data = decoded is Map<String, dynamic> && decoded.containsKey('data')
        ? decoded['data'] as Map<String, dynamic>
        : decoded as Map<String, dynamic>;
    return fromJson(data);
  }

  Future<List<T>> getList<T>(String path, T Function(Map<String, dynamic>) fromJson) async {
    final res = await http.get(
      Uri.parse('$baseUrl$path'),
      headers: await _headers(),
    );
    _assertSuccess(res);
    final decoded = jsonDecode(res.body);
    final list = decoded is Map<String, dynamic> && decoded.containsKey('data')
        ? decoded['data'] as List<dynamic>
        : decoded as List<dynamic>;
    return list.map((item) => fromJson(item as Map<String, dynamic>)).toList();
  }

  Future<T> post<T>(
    String path,
    Map<String, dynamic>? body,
    T Function(Map<String, dynamic>) fromJson, {
    Map<String, String>? customHeaders,
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl$path'),
      headers: await _headers(customHeaders),
      body: body != null ? jsonEncode(body) : null,
    );
    _assertSuccess(res);
    final decoded = jsonDecode(res.body);
    final data = decoded is Map<String, dynamic> && decoded.containsKey('data')
        ? decoded['data'] as Map<String, dynamic>
        : decoded as Map<String, dynamic>;
    return fromJson(data);
  }

  // --- Domain Methods ---

  Future<ReservationModel> createReservation({
    required String ticketTypeId,
    required int quantity,
    String? idempotencyKey,
  }) async {
    final headers = idempotencyKey != null ? {'Idempotency-Key': idempotencyKey} : null;
    return post<ReservationModel>(
      '/reservations',
      {
        'ticketTypeId': ticketTypeId,
        'quantity': quantity,
        ...?idempotencyKey == null ? null : {'idempotencyKey': idempotencyKey},
      },
      ReservationModel.fromJson,
      customHeaders: headers,
    );
  }

  Future<ReservationModel> getReservation(String reservationId) async {
    return get<ReservationModel>(
      '/reservations/$reservationId',
      ReservationModel.fromJson,
    );
  }

  Future<void> cancelReservation(String reservationId) async {
    await http.post(
      Uri.parse('$baseUrl/reservations/$reservationId/cancel'),
      headers: await _headers(),
    );
  }

  Future<OrderModel> getOrder(String orderId) async {
    final res = await http.get(
      Uri.parse('$baseUrl/orders/$orderId'),
      headers: await _headers(),
    );
    _assertSuccess(res);
    final decoded = jsonDecode(res.body) as Map<String, dynamic>;
    final orderJson = decoded.containsKey('order') ? decoded['order'] as Map<String, dynamic> : decoded;
    return OrderModel.fromJson(orderJson);
  }

  Future<List<OrderModel>> listUserOrders() async {
    return getList<OrderModel>('/orders', OrderModel.fromJson);
  }

  Future<OrderModel> confirmOrderPayment(String orderId) async {
    final res = await http.post(
      Uri.parse('$baseUrl/orders/$orderId/confirm'),
      headers: await _headers(),
    );
    _assertSuccess(res);
    final decoded = jsonDecode(res.body) as Map<String, dynamic>;
    final orderJson = decoded.containsKey('order') ? decoded['order'] as Map<String, dynamic> : decoded;
    return OrderModel.fromJson(orderJson);
  }

  Future<Map<String, dynamic>> createPaymentIntent({
    required String orderId,
    String provider = 'razorpay',
    String? idempotencyKey,
  }) async {
    final headers = idempotencyKey != null ? {'Idempotency-Key': idempotencyKey} : null;
    return post<Map<String, dynamic>>(
      '/payments/intent',
      {
        'orderId': orderId,
        'provider': provider,
        ...?idempotencyKey == null ? null : {'idempotencyKey': idempotencyKey},
      },
      (data) => data,
      customHeaders: headers,
    );
  }

  Future<List<TicketModel>> getUserTickets() async {
    return getList<TicketModel>('/tickets', TicketModel.fromJson);
  }

  Future<TicketModel> getTicketById(String ticketId) async {
    return get<TicketModel>('/tickets/$ticketId', TicketModel.fromJson);
  }

  Future<List<TicketTypeModel>> getEventTicketTypes(String eventId) async {
    return getList<TicketTypeModel>('/events/$eventId/ticket-types', TicketTypeModel.fromJson);
  }

  Future<List<Map<String, dynamic>>> getInAppNotifications() async {
    final res = await http.get(
      Uri.parse('$baseUrl/notifications/in-app'),
      headers: await _headers(),
    );
    _assertSuccess(res);
    final decoded = jsonDecode(res.body);
    final list = decoded is Map<String, dynamic> && decoded.containsKey('data')
        ? decoded['data'] as List<dynamic>
        : (decoded is List ? decoded : []);
    return list.map((item) => item as Map<String, dynamic>).toList();
  }

  void _assertSuccess(http.Response res) {
    if (res.statusCode >= 200 && res.statusCode < 300) return;
    try {
      final body = jsonDecode(res.body);
      throw ApiException(
        statusCode: res.statusCode,
        code: (body as Map<String, dynamic>)['code'] as String? ?? 'UNKNOWN',
        message: body['message'] as String? ?? 'Request failed (${res.statusCode})',
      );
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(
        statusCode: res.statusCode,
        code: 'HTTP_ERROR',
        message: 'Request failed with status ${res.statusCode}',
      );
    }
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
