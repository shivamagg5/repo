// =============================================================================
// consumer-mobile — Order Confirmation Screen
// Phase 15.1A: Handles both 'paid' (webhook confirmed) and 'pending' states.
//
// Receives:
//   orderId  — path param
//   pending  — optional query param ('true') when webhook hasn't confirmed yet
//
// When pending=true: shows "Payment Processing" state with a retry-poll button.
// When pending=false/absent: shows success celebration (webhook has confirmed).
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/ticketing_provider.dart';
import '../../theme/app_colors.dart';
import '../../widgets/lime_button.dart';

class OrderConfirmationScreen extends ConsumerStatefulWidget {
  final String orderId;
  /// true when the 30-second polling loop timed out before seeing 'paid'.
  final bool isPending;

  const OrderConfirmationScreen({
    super.key,
    required this.orderId,
    this.isPending = false,
  });

  @override
  ConsumerState<OrderConfirmationScreen> createState() =>
      _OrderConfirmationScreenState();
}

class _OrderConfirmationScreenState
    extends ConsumerState<OrderConfirmationScreen> {
  bool _isPollingAgain = false;
  bool _confirmedPaid = false;
  String? _retryError;

  // ── If screen opened with pending=true, auto-poll once more ──────────────
  @override
  void initState() {
    super.initState();
    if (widget.isPending) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _retryPoll());
    }
  }

  Future<void> _retryPoll() async {
    setState(() {
      _isPollingAgain = true;
      _retryError = null;
    });

    final notifier = ref.read(ticketingProvider.notifier);

    for (int i = 0; i < 10; i++) {
      await Future<void>.delayed(const Duration(seconds: 3));
      if (!mounted) return;

      final order = await notifier.refreshOrder(widget.orderId);
      // null = network error — do not infer paid from stale state
      if (order == null) continue;

      if (order.status == 'paid' || order.status == 'completed') {
        if (!mounted) return;
        setState(() {
          _isPollingAgain = false;
          _confirmedPaid = true;
        });
        return;
      }
    }

    // Still pending after another 30 s.
    if (!mounted) return;
    setState(() {
      _isPollingAgain = false;
      _retryError =
          'Payment is still processing. Your tickets will appear in the wallet once confirmed.';
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final showSuccess = !widget.isPending || _confirmedPaid;

    // Auto-polling overlay
    if (_isPollingAgain) {
      return Scaffold(
        backgroundColor: AppColors.background,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const SizedBox(
                width: 56,
                height: 56,
                child: CircularProgressIndicator(
                    color: AppColors.electricPurple, strokeWidth: 3),
              ),
              const SizedBox(height: 24),
              Text('Verifying payment…',
                  style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              const Text(
                'Checking with our server. This usually takes a few seconds.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),

              // ── Status Icon ───────────────────────────────────────────
              Center(
                child: Container(
                  width: 90,
                  height: 90,
                  decoration: BoxDecoration(
                    color: showSuccess
                        ? AppColors.electricPurple
                        : AppColors.warningSubtle,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: (showSuccess
                                ? AppColors.electricPurple
                                : AppColors.warning)
                            .withValues(alpha: 0.35),
                        blurRadius: 30,
                        spreadRadius: 6,
                      ),
                    ],
                  ),
                  child: Icon(
                    showSuccess
                        ? Icons.check_rounded
                        : Icons.hourglass_top_rounded,
                    color: showSuccess
                        ? AppColors.textOnAccent
                        : AppColors.warning,
                    size: 50,
                  ),
                ),
              ),
              const SizedBox(height: 28),

              // ── Headline ──────────────────────────────────────────────
              Text(
                showSuccess ? 'Payment Confirmed!' : 'Payment Processing',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.displaySmall,
              ),
              const SizedBox(height: 10),

              Text(
                showSuccess
                    ? 'Your ticket reservation has been converted into cryptographically verified digital tickets.'
                    : 'Your payment was received by Razorpay. We\'re waiting for final confirmation. Your tickets will appear automatically once verified.',
                textAlign: TextAlign.center,
                style: const TextStyle(
                    color: AppColors.textSecondary, fontSize: 14, height: 1.4),
              ),
              const SizedBox(height: 32),

              // ── Order Reference Card ───────────────────────────────────
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: AppColors.card,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border, width: 0.5),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Order Reference',
                            style: TextStyle(
                                color: AppColors.textTertiary, fontSize: 13)),
                        Text(
                          '#${widget.orderId.length > 8 ? widget.orderId.substring(0, 8) : widget.orderId}',
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontFamily: 'monospace',
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                    const Divider(color: AppColors.divider, height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Status',
                            style: TextStyle(
                                color: AppColors.textTertiary, fontSize: 13)),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: showSuccess
                                ? AppColors.electricPurpleSubtle
                                : AppColors.warningSubtle,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            showSuccess ? 'PAID & ISSUED' : 'PROCESSING',
                            style: TextStyle(
                              color: showSuccess
                                  ? AppColors.electricPurple
                                  : AppColors.warning,
                              fontWeight: FontWeight.bold,
                              fontSize: 11,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // ── Retry error message ───────────────────────────────────
              if (_retryError != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.warningSubtle,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.warning),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline,
                          color: AppColors.warning, size: 16),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _retryError!,
                          style: const TextStyle(
                              color: AppColors.warning, fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              const Spacer(),

              // ── Action Buttons ────────────────────────────────────────
              if (showSuccess)
                LimeButton(
                  label: 'View My Tickets & QR',
                  icon: Icons.confirmation_num_rounded,
                  onPressed: () => context.go('/tickets'),
                ),
              if (!showSuccess && _retryError != null)
                LimeButton(
                  label: 'Check Again',
                  icon: Icons.refresh_rounded,
                  onPressed: _retryPoll,
                ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () => context.go('/'),
                child: const Text('Back to Home'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
