// =============================================================================
// consumer-mobile — Checkout Screen
// Server-authoritative checkout with 10-minute reservation countdown timer,
// price breakdown, and Razorpay payment execution.
// Preserves all existing business logic & analytics tracking.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/ticketing_provider.dart';
import '../../services/analytics_service.dart';
import '../../theme/app_colors.dart';
import '../../widgets/lime_button.dart';

class CheckoutScreen extends ConsumerWidget {
  const CheckoutScreen({super.key});

  String _formatPrice(int minor, String currency) {
    final symbol = currency == 'INR' ? '₹' : '$currency ';
    return '$symbol${(minor / 100).toStringAsFixed(0)}';
  }

  String _formatTimer(int seconds) {
    final mins = seconds ~/ 60;
    final secs = seconds % 60;
    return '${mins.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
  }

  Future<void> _handlePayment(BuildContext context, WidgetRef ref) async {
    final notifier = ref.read(ticketingProvider.notifier);
    final analytics = ref.read(analyticsServiceProvider);
    final state = ref.read(ticketingProvider);
    final eventId = state.reservation?.eventId;

    analytics.track('payment_started', eventId: eventId);
    final intent = await notifier.createPaymentIntent();

    if (intent != null && context.mounted) {
      // Trigger order confirmation / server reconciliation
      final confirmedOrder = await notifier.confirmOrder();
      if (confirmedOrder != null && context.mounted) {
        analytics.track('payment_success', eventId: eventId, properties: {'totalMinor': confirmedOrder.totalMinor});
        context.pushReplacement('/confirmation/${confirmedOrder.id}');
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(ticketingProvider);
    final reservation = state.reservation;

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
            // Live Countdown Timer Banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.electricPurpleSubtle, width: 1.5),
              ),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppColors.electricPurpleSubtle,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.timer_outlined, color: AppColors.electricPurple, size: 22),
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
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Text(
                      _formatTimer(state.remainingSeconds),
                      style: const TextStyle(
                        color: AppColors.electricPurple,
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

            // Order Summary & Server Authoritative Pricing
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

            if (state.errorMessage != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.dangerSubtle,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.danger),
                ),
                child: Text(
                  state.errorMessage!,
                  style: const TextStyle(color: AppColors.danger, fontSize: 12),
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Razorpay Payment Action
            LimeButton(
              label: 'Pay ${_formatPrice(reservation.totalMinor, reservation.currency)} with Razorpay',
              icon: Icons.lock_outline_rounded,
              isLoading: state.isPaying || state.isLoading,
              onPressed: state.isPaying || state.isLoading
                  ? null
                  : () => _handlePayment(context, ref),
            ),
            const SizedBox(height: 14),

            // Cancel Action
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
