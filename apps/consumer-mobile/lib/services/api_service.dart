// =============================================================================
// consumer-mobile — ApiService
// Typed HTTP client for the backend API with auth and domain methods
// FIX-007A: Integrated with shared ApiEnvelope for uniform response decoding
// =============================================================================

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'auth_service.dart';
import '../core/api_envelope.dart';
import '../models/ticket_model.dart';
import '../models/order_model.dart';
import '../models/reservation_model.dart';

export '../core/api_envelope.dart' show ApiException;

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
    final data = ApiEnvelope.unwrapMap(res);
    return fromJson(data);
  }

  Future<List<T>> getList<T>(String path, T Function(Map<String, dynamic>) fromJson) async {
    final res = await http.get(
      Uri.parse('$baseUrl$path'),
      headers: await _headers(),
    );
    final list = ApiEnvelope.unwrapList(res);
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
    final data = ApiEnvelope.unwrapMap(res);
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
        if (idempotencyKey != null) 'idempotencyKey': idempotencyKey,
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
    final res = await http.post(
      Uri.parse('$baseUrl/reservations/$reservationId/cancel'),
      headers: await _headers(),
    );
    ApiEnvelope.unwrap(res);
  }

  /// FIX-007A: Safely unwraps { data: { order: {...}, items: [...] } } or { data: {...} }
  Future<OrderModel> getOrder(String orderId) async {
    final res = await http.get(
      Uri.parse('$baseUrl/orders/$orderId'),
      headers: await _headers(),
    );
    final data = ApiEnvelope.unwrapMap(res);
    final orderJson = data.containsKey('order') && data['order'] is Map<String, dynamic>
        ? data['order'] as Map<String, dynamic>
        : data;
    return OrderModel.fromJson(orderJson);
  }

  Future<List<OrderModel>> listUserOrders() async {
    return getList<OrderModel>('/orders', OrderModel.fromJson);
  }

  /// FIX-007A: Safely unwraps { data: { order: {...}, items: [...] } } or { data: {...} }
  Future<OrderModel> confirmOrderPayment(String orderId) async {
    final res = await http.post(
      Uri.parse('$baseUrl/orders/$orderId/confirm'),
      headers: await _headers(),
    );
    final data = ApiEnvelope.unwrapMap(res);
    final orderJson = data.containsKey('order') && data['order'] is Map<String, dynamic>
        ? data['order'] as Map<String, dynamic>
        : data;
    return OrderModel.fromJson(orderJson);
  }

  Future<Map<String, dynamic>> createPaymentIntent({
    required String orderId,
    String? idempotencyKey,
  }) async {
    final headers = idempotencyKey != null ? {'Idempotency-Key': idempotencyKey} : null;
    return post<Map<String, dynamic>>(
      '/payments/intent',
      {
        'orderId': orderId,
        if (idempotencyKey != null) 'idempotencyKey': idempotencyKey,
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
    final list = ApiEnvelope.unwrapList(res);
    return list.map((item) => item as Map<String, dynamic>).toList();
  }
}
