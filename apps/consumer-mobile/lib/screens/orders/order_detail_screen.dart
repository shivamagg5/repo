// =============================================================================
// consumer-mobile — Order Receipt Detail Screen
// Server-authoritative historical price snapshot and receipt
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../models/order_model.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_colors.dart';
import '../../widgets/error_state.dart';
import '../../widgets/loading_state.dart';
import '../../widgets/lime_button.dart';

final orderDetailProvider = FutureProvider.family<OrderModel, String>((ref, orderId) async {
  final apiService = ref.watch(apiServiceProvider);
  return apiService.getOrder(orderId);
});

class OrderDetailScreen extends ConsumerWidget {
  final String orderId;

  const OrderDetailScreen({
    super.key,
    required this.orderId,
  });

  String _formatPrice(int minor, String currency) {
    final symbol = currency == 'INR' ? '₹' : '$currency ';
    return '$symbol${(minor / 100).toStringAsFixed(0)}';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orderAsync = ref.watch(orderDetailProvider(orderId));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => context.pop(),
        ),
        title: Text('Order Receipt', style: Theme.of(context).textTheme.titleLarge),
      ),
      body: orderAsync.when(
        loading: () => const LoadingState(message: 'Loading receipt...'),
        error: (err, _) => ErrorState(
          message: 'Failed to load order receipt',
          onRetry: () => ref.refresh(orderDetailProvider(orderId)),
        ),
        data: (order) {
          final isPaid = order.isPaid;

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
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
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'OFFICIAL RECEIPT',
                            style: TextStyle(color: AppColors.electricPurple, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: isPaid ? AppColors.successSubtle : AppColors.dangerSubtle,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              order.status.toUpperCase(),
                              style: TextStyle(
                                color: isPaid ? AppColors.success : AppColors.danger,
                                fontWeight: FontWeight.bold,
                                fontSize: 10,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Text(
                        'Order #${order.id}',
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          fontFamily: 'monospace',
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Date: ${order.createdAt.toLocal()}',
                        style: const TextStyle(color: AppColors.textTertiary, fontSize: 12),
                      ),
                      const Divider(color: AppColors.divider, height: 28),

                      // Price Breakdown
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Ticket Subtotal', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                          Text(
                            _formatPrice(order.subtotalMinor, order.currency),
                            style: const TextStyle(color: AppColors.textPrimary, fontSize: 13, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Platform Convenience Fees', style: TextStyle(color: AppColors.textTertiary, fontSize: 13)),
                          Text(
                            _formatPrice(order.feesMinor, order.currency),
                            style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Taxes (GST)', style: TextStyle(color: AppColors.textTertiary, fontSize: 13)),
                          Text(
                            _formatPrice(order.taxMinor, order.currency),
                            style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                          ),
                        ],
                      ),
                      const Divider(color: AppColors.divider, height: 28),

                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Total Amount Paid',
                            style: TextStyle(color: AppColors.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            _formatPrice(order.totalMinor, order.currency),
                            style: const TextStyle(
                              color: AppColors.electricPurple,
                              fontSize: 20,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                if (isPaid)
                  LimeButton(
                    label: 'View Tickets in Wallet',
                    icon: Icons.confirmation_num_rounded,
                    onPressed: () => context.push('/tickets'),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}
