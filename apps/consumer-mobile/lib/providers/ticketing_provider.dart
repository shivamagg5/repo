// =============================================================================
// consumer-mobile — Ticketing & Checkout Provider
// Server-authoritative hold lifecycle, timer management, and payment execution
// =============================================================================

import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/reservation_model.dart';
import '../models/order_model.dart';
import '../services/api_service.dart';
import 'auth_provider.dart';

class CheckoutState {
  final ReservationModel? reservation;
  final OrderModel? order;
  final int remainingSeconds;
  final bool isExpired;
  final bool isLoading;
  final bool isPaying;
  final String? errorMessage;

  const CheckoutState({
    this.reservation,
    this.order,
    this.remainingSeconds = 0,
    this.isExpired = false,
    this.isLoading = false,
    this.isPaying = false,
    this.errorMessage,
  });

  CheckoutState copyWith({
    ReservationModel? reservation,
    OrderModel? order,
    int? remainingSeconds,
    bool? isExpired,
    bool? isLoading,
    bool? isPaying,
    String? errorMessage,
    bool clearError = false,
  }) {
    return CheckoutState(
      reservation: reservation ?? this.reservation,
      order: order ?? this.order,
      remainingSeconds: remainingSeconds ?? this.remainingSeconds,
      isExpired: isExpired ?? this.isExpired,
      isLoading: isLoading ?? this.isLoading,
      isPaying: isPaying ?? this.isPaying,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class TicketingNotifier extends StateNotifier<CheckoutState> {
  final ApiService _apiService;
  Timer? _countdownTimer;

  TicketingNotifier(this._apiService) : super(const CheckoutState());

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }

  /// Resets error and loading state — call when re-opening the ticket sheet
  /// to prevent stale error messages from a previous attempt bleeding through.
  void clearError() {
    state = state.copyWith(clearError: true, isLoading: false);
  }

  /// Reserve tickets atomically via backend.
  /// On any failure, sets errorMessage and returns null — no fabricated business objects.
  Future<ReservationModel?> reserveTickets({
    required String ticketTypeId,
    required int quantity,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final idempotencyKey = 'res_mob_${DateTime.now().millisecondsSinceEpoch}';
      final reservation = await _apiService.createReservation(
        ticketTypeId: ticketTypeId,
        quantity: quantity,
        idempotencyKey: idempotencyKey,
      );

      // Fetch the created order details
      OrderModel? order;
      if (reservation.orderId.isNotEmpty) {
        try {
          order = await _apiService.getOrder(reservation.orderId);
        } catch (_) {
          // Order fetch failed — reservation still valid; checkout will retry.
        }
      }

      state = state.copyWith(
        reservation: reservation,
        order: order,
        isLoading: false,
        isExpired: false,
      );

      _startTimer(reservation.expiresAt);
      return reservation;
    } catch (e) {
      // Real failure — surface to user. Never invent a reservation.
      final message = e is ApiException
          ? e.message
          : 'Reservation failed. Please check your connection and try again.';
      state = state.copyWith(isLoading: false, errorMessage: message);
      return null;
    }
  }

  /// Load existing reservation hold
  Future<void> loadReservation(String reservationId) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final reservation = await _apiService.getReservation(reservationId);
      OrderModel? order;
      if (reservation.orderId.isNotEmpty) {
        order = await _apiService.getOrder(reservation.orderId);
      }

      state = state.copyWith(
        reservation: reservation,
        order: order,
        isLoading: false,
        isExpired: reservation.isExpired,
      );

      _startTimer(reservation.expiresAt);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e is ApiException ? e.message : 'Failed to load reservation.',
      );
    }
  }

  /// Synchronized Countdown Timer based on server `expiresAt`
  void _startTimer(DateTime expiresAt) {
    _countdownTimer?.cancel();

    void updateTime() {
      final now = DateTime.now();
      final diff = expiresAt.difference(now).inSeconds;
      if (diff <= 0) {
        _countdownTimer?.cancel();
        state = state.copyWith(remainingSeconds: 0, isExpired: true);
      } else {
        state = state.copyWith(remainingSeconds: diff, isExpired: false);
      }
    }

    updateTime();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) => updateTime());
  }

  /// Cancel reservation hold
  Future<void> cancelReservation() async {
    if (state.reservation == null) return;
    _countdownTimer?.cancel();
    try {
      await _apiService.cancelReservation(state.reservation!.reservationId);
    } catch (_) {}
    state = const CheckoutState();
  }

  /// Initiate Razorpay Payment Intent
  Future<Map<String, dynamic>?> createPaymentIntent() async {
    if (state.order == null || state.isExpired) return null;
    state = state.copyWith(isPaying: true, clearError: true);

    try {
      final idempotencyKey = 'pay_mob_${state.order!.id}_${DateTime.now().millisecondsSinceEpoch}';
      final intent = await _apiService.createPaymentIntent(
        orderId: state.order!.id,
        provider: 'razorpay',
        idempotencyKey: idempotencyKey,
      );
      state = state.copyWith(isPaying: false);
      return intent;
    } catch (e) {
      state = state.copyWith(
        isPaying: false,
        errorMessage: e is ApiException ? e.message : 'Payment initialization failed.',
      );
      return null;
    }
  }

  /// Confirm payment with backend — RECONCILIATION ONLY.
  /// Only succeeds when the webhook has already marked the payment transaction
  /// as paid. Do NOT call this as proof of payment on the primary payment path.
  Future<OrderModel?> confirmOrder() async {
    if (state.order == null) return null;
    state = state.copyWith(isLoading: true);
    try {
      final updatedOrder = await _apiService.confirmOrderPayment(state.order!.id);
      state = state.copyWith(order: updatedOrder, isLoading: false);
      return updatedOrder;
    } catch (e) {
      state = state.copyWith(isLoading: false);
      // Return null so callers can detect failure, not stale state.
      return null;
    }
  }

  /// Poll GET /orders/:id until backend confirms authoritative `paid` status.
  /// Returns null on network error — never returns stale local state as truth.
  Future<OrderModel?> refreshOrder(String orderId) async {
    try {
      final order = await _apiService.getOrder(orderId);
      state = state.copyWith(order: order);
      return order;
    } catch (_) {
      // Return null so the caller shows "unable to verify" rather than
      // accidentally treating the previous local state as current truth.
      return null;
    }
  }
}

final ticketingProvider = StateNotifierProvider<TicketingNotifier, CheckoutState>((ref) {
  final apiService = ref.watch(apiServiceProvider);
  return TicketingNotifier(apiService);
});
