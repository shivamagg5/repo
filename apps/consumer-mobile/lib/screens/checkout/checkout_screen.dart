// =============================================================================
// consumer-mobile — Checkout Screen
// Phase 15.1A: Real Razorpay SDK integration.
//
// Payment flow:
//   1. POST /payments/intent  → receive Razorpay providerOrderId + checkoutPayload
//   2. Open razorpay_flutter SDK (user pays inside Razorpay UI)
//   3. On Razorpay success callback → poll GET /orders/:id (backend is authoritative)
//   4. Webhook path: Razorpay → POST /payments/webhooks/razorpay (HMAC verified,
//      atomic ticket issuance) → order.status = 'paid'
//   5. Once polling sees 'paid' → navigate to /confirmation/:id
//   6. On Razorpay error/failure → show error, allow retry
//
// Security rules:
//   - confirmOrder() is NOT called on the primary payment path.
//   - Success is ONLY inferred from backend order.status = 'paid'.
//   - Network error during polling → "Unable to verify" state (never false success).
//   - Public RAZORPAY_KEY_ID is safe in Flutter. Secret/webhook keys stay backend-only.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import '../../providers/ticketing_provider.dart';
import '../../services/analytics_service.dart';
import '../../theme/app_colors.dart';
import '../../widgets/lime_button.dart';

// ---------------------------------------------------------------------------
// Razorpay public key — KEY_ID is safe in Flutter (not the secret key).
// Pass via --dart-define=RAZORPAY_KEY_ID=rzp_test_xxx at build time.
// ---------------------------------------------------------------------------
const _razorpayKeyId = String.fromEnvironment(
  'RAZORPAY_KEY_ID',
  defaultValue: 'rzp_test_TRAzvU0SEyAz0K',
);

// ---------------------------------------------------------------------------
// Polling config — 10 attempts × 3 s = 30 s max wait for webhook.
// ---------------------------------------------------------------------------
const _pollMaxAttempts = 10;
const _pollIntervalMs = 3000;

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  Razorpay? _razorpay;

  // Tracks whether we are in the post-payment polling phase.
  bool _isPolling = false;
  String? _paymentError;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  @override
  void initState() {
    super.initState();
    _initRazorpay();
  }

  void _initRazorpay() {
    _razorpay = Razorpay();
    _razorpay!.on(Razorpay.EVENT_PAYMENT_SUCCESS, _onPaymentSuccess);
    _razorpay!.on(Razorpay.EVENT_PAYMENT_ERROR, _onPaymentError);
    _razorpay!.on(Razorpay.EVENT_EXTERNAL_WALLET, _onExternalWallet);
  }

  @override
  void dispose() {
    _razorpay?.clear();
    super.dispose();
  }

  // ---------------------------------------------------------------------------
  // Step 1 — Create payment intent, then open Razorpay SDK
  // ---------------------------------------------------------------------------

  Future<void> _handlePayment() async {
    final notifier = ref.read(ticketingProvider.notifier);
    final analytics = ref.read(analyticsServiceProvider);
    final state = ref.read(ticketingProvider);
    final eventId = state.reservation?.eventId;

    setState(() {
      _paymentError = null;
    });

    analytics.track('payment_started', eventId: eventId);

    // 1. Create Razorpay order on backend (server-authoritative amount).
    final intent = await notifier.createPaymentIntent();

    if (intent == null) {
      // createPaymentIntent() already set errorMessage on the provider state.
      return;
    }

    if (!mounted) return;

    // 2. Build Razorpay checkout options.
    //    amount and currency come from the server-verified intent, not client.
    final providerOrderId =
        intent['providerOrderId'] as String? ??
        (intent['checkoutPayload'] as Map<String, dynamic>?)?['order_id'] as String?;

    if (providerOrderId == null || providerOrderId.isEmpty) {
      setState(() => _paymentError = 'Payment initialization failed: missing provider order ID.');
      return;
    }

    final options = <String, dynamic>{
      'key': _razorpayKeyId,
      'order_id': providerOrderId,
      'amount': intent['amountMinor'],   // Minor units (paise), set by server
      'currency': intent['currency'] ?? 'INR',
      'name': 'EventPulse',
      'description': 'Ticket Purchase',
      'theme': {'color': '#7C3AED'},
    };

    analytics.track('razorpay_checkout_opened', eventId: eventId);

    // 3. Open Razorpay checkout UI — user completes payment here.
    _razorpay!.open(options);
  }

  // ---------------------------------------------------------------------------
  // Step 2 — Razorpay callbacks
  // ---------------------------------------------------------------------------

  /// Called when Razorpay reports a successful payment on the client side.
  /// NOTE: This is NOT payment authority. We must poll the backend to confirm
  /// the webhook has processed and the order is actually marked 'paid'.
  void _onPaymentSuccess(PaymentSuccessResponse response) {
    final analytics = ref.read(analyticsServiceProvider);
    final orderId = ref.read(ticketingProvider).order?.id;

    analytics.track('razorpay_client_success', properties: {
      'razorpayPaymentId': response.paymentId,
      'razorpayOrderId': response.orderId,
    });

    if (orderId == null) {
      setState(() => _paymentError = 'Order not found after payment. Please check your tickets.');
      return;
    }

    // Poll backend for authoritative paid status (webhook may be slightly delayed).
    _pollForPaidStatus(orderId);
  }

  /// Called when Razorpay reports a payment failure.
  void _onPaymentError(PaymentFailureResponse response) {
    if (!mounted) return;

    final analytics = ref.read(analyticsServiceProvider);
    analytics.track('razorpay_payment_error', properties: {
      'code': response.code,
      'message': response.message,
    });

    // Check if user simply dismissed the modal (code 0 with no real failure).
    // Do NOT classify modal dismissal as payment_failed.
    final isDismissal = response.code == 0 && (response.message?.isEmpty ?? true);

    setState(() {
      _paymentError = isDismissal
          ? null  // User cancelled — allow retry silently
          : 'Payment failed: ${response.message ?? 'Unknown error'}. Please try again.';
    });
  }

  /// Called when user selects an external wallet (UPI app, etc.).
  void _onExternalWallet(ExternalWalletResponse response) {
    if (!mounted) return;
    // External wallet selected — inform user payment is processing async.
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Processing via ${response.walletName}. Your ticket will appear shortly.'),
        backgroundColor: AppColors.electricPurple,
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Step 3 — Poll backend until authoritative 'paid' status or timeout
  // ---------------------------------------------------------------------------

  Future<void> _pollForPaidStatus(String orderId) async {
    if (!mounted) return;
    setState(() {
      _isPolling = true;
      _paymentError = null;
    });

    final notifier = ref.read(ticketingProvider.notifier);
    final analytics = ref.read(analyticsServiceProvider);

    for (int attempt = 0; attempt < _pollMaxAttempts; attempt++) {
      await Future<void>.delayed(const Duration(milliseconds: _pollIntervalMs));

      if (!mounted) return;

      final order = await notifier.refreshOrder(orderId);

      if (order == null) {
        // Network error during poll — do NOT infer success from stale state.
        continue;
      }

      if (order.status == 'paid' || order.status == 'completed') {
        analytics.track('payment_confirmed_by_backend', properties: {
          'orderId': orderId,
          'attempt': attempt + 1,
        });

        if (!mounted) return;
        setState(() => _isPolling = false);
        context.pushReplacement('/confirmation/$orderId');
        return;
      }
    }

    // Polling timed out — webhook may still arrive (delayed network).
    // Show "Payment Processing" state — do NOT show success.
    if (!mounted) return;
    setState(() {
      _isPolling = false;
    });

    analytics.track('payment_poll_timeout', properties: {'orderId': orderId});

    // Navigate to confirmation with pending=true so the screen shows
    // "processing" state instead of a success celebration.
    context.pushReplacement('/confirmation/$orderId?pending=true');
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  String _formatPrice(int minor, String currency) {
    final symbol = currency == 'INR' ? '₹' : '$currency ';
    return '$symbol${(minor / 100).toStringAsFixed(0)}';
  }

  String _formatTimer(int seconds) {
    final mins = seconds ~/ 60;
    final secs = seconds % 60;
    return '${mins.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(ticketingProvider);
    final reservation = state.reservation;

    // No reservation — show guidance.
    if (reservation == null) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          title: const Text('Checkout', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold)),
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('No active ticket reservation found.', style: TextStyle(color: AppColors.textSecondary)),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => context.go('/'),
                child: const Text('Browse Events'),
              ),
            ],
          ),
        ),
      );
    }

    // Reservation expired.
    if (state.isExpired) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(backgroundColor: Colors.transparent, elevation: 0),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 72,
                  height: 72,
                  decoration: const BoxDecoration(
                    color: AppColors.dangerSubtle,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.timer_off_outlined, color: AppColors.danger, size: 36),
                ),
                const SizedBox(height: 20),
                Text(
                  'Reservation Hold Expired',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: 8),
                const Text(
                  'Your 10-minute ticket hold has expired and the inventory was released back to availability.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                ),
                const SizedBox(height: 24),
                LimeButton(
                  label: 'Select New Tickets',
                  onPressed: () {
                    ref.read(ticketingProvider.notifier).cancelReservation();
                    context.go('/');
                  },
                ),
              ],
            ),
          ),
        ),
      );
    }

    // Polling overlay — user already paid, waiting for webhook confirmation.
    if (_isPolling) {
      return Scaffold(
        backgroundColor: AppColors.background,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const SizedBox(
                width: 56,
                height: 56,
                child: CircularProgressIndicator(color: AppColors.electricPurple, strokeWidth: 3),
              ),
              const SizedBox(height: 24),
              Text('Confirming your payment…', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              const Text(
                'Verifying with our payment provider.\nThis usually takes a few seconds.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
              ),
            ],
          ),
        ),
      );
    }

    // Normal checkout UI.
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Checkout',
          style: Theme.of(context).textTheme.titleLarge,
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Live Countdown Timer ──────────────────────────────────
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: state.remainingSeconds < 60
                      ? AppColors.danger
                      : AppColors.electricPurpleSubtle,
                  width: 1.5,
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: state.remainingSeconds < 60
                          ? AppColors.dangerSubtle
                          : AppColors.electricPurpleSubtle,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      Icons.timer_outlined,
                      color: state.remainingSeconds < 60
                          ? AppColors.danger
                          : AppColors.electricPurple,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Tickets Locked',
                          style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 14),
                        ),
                        Text(
                          'Complete payment before expiry',
                          style: TextStyle(color: AppColors.textTertiary, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: state.remainingSeconds < 60 ? AppColors.danger : AppColors.border,
                      ),
                    ),
                    child: Text(
                      _formatTimer(state.remainingSeconds),
                      style: TextStyle(
                        color: state.remainingSeconds < 60
                            ? AppColors.danger
                            : AppColors.electricPurple,
                        fontSize: 16,
                        fontFamily: 'monospace',
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // ── Order Summary ─────────────────────────────────────────
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.border, width: 0.5),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Order Summary',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Reserved Tickets (${reservation.quantity}x)',
                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 14),
                      ),
                      Text(
                        _formatPrice(reservation.subtotalMinor, reservation.currency),
                        style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 14),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Convenience Fee', style: TextStyle(color: AppColors.textTertiary, fontSize: 13)),
                      Text(
                        _formatPrice(reservation.feesMinor, reservation.currency),
                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Taxes (GST)', style: TextStyle(color: AppColors.textTertiary, fontSize: 13)),
                      Text('₹0', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                    ],
                  ),
                  const Divider(color: AppColors.divider, height: 28),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Total Payable',
                        style: TextStyle(color: AppColors.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        _formatPrice(reservation.totalMinor, reservation.currency),
                        style: const TextStyle(
                          color: AppColors.electricPurple,
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // ── Provider error from state ─────────────────────────────
            if (state.errorMessage != null) ...[
              _ErrorBanner(message: state.errorMessage!),
              const SizedBox(height: 16),
            ],

            // ── Local payment error ───────────────────────────────────
            if (_paymentError != null) ...[
              _ErrorBanner(message: _paymentError!),
              const SizedBox(height: 16),
            ],

            // ── Pay CTA ───────────────────────────────────────────────
            LimeButton(
              label: 'Pay ${_formatPrice(reservation.totalMinor, reservation.currency)} with Razorpay',
              icon: Icons.lock_outline_rounded,
              isLoading: state.isPaying || state.isLoading,
              onPressed: state.isPaying || state.isLoading
                  ? null
                  : _handlePayment,
            ),
            const SizedBox(height: 8),

            // Security trust badge
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: const [
                Icon(Icons.verified_user_outlined, size: 13, color: AppColors.textTertiary),
                SizedBox(width: 5),
                Text(
                  'Secured by Razorpay · 256-bit SSL',
                  style: TextStyle(color: AppColors.textTertiary, fontSize: 11),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // ── Cancel hold ───────────────────────────────────────────
            Center(
              child: TextButton(
                onPressed: () {
                  ref.read(ticketingProvider.notifier).cancelReservation();
                  context.pop();
                },
                child: const Text(
                  'Cancel Hold & Release Tickets',
                  style: TextStyle(color: AppColors.danger, fontSize: 13),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Error banner widget
// ---------------------------------------------------------------------------
class _ErrorBanner extends StatelessWidget {
  final String message;
  const _ErrorBanner({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.dangerSubtle,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.danger),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: AppColors.danger, size: 16),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(color: AppColors.danger, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}
