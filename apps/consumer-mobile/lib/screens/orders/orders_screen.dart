// =============================================================================
// consumer-mobile — Orders History Screen
// List of all user orders and purchase receipts
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../models/order_model.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_colors.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_state.dart';
import '../../widgets/loading_state.dart';

final ordersListProvider = FutureProvider<List<OrderModel>>((ref) async {
  final apiService = ref.watch(apiServiceProvider);
  return apiService.listUserOrders();
});

class OrdersScreen extends ConsumerWidget {
  const OrdersScreen({super.key});

  String _formatPrice(int minor, String currency) {
    final symbol = currency == 'INR' ? '₹' : '$currency ';
    return '$symbol${(minor / 100).toStringAsFixed(0)}';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersAsync = ref.watch(ordersListProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => context.pop(),
        ),
        title: Text('My Orders', style: Theme.of(context).textTheme.titleLarge),
      ),
      body: ordersAsync.when(
        loading: () => const LoadingState(message: 'Loading orders...'),
        error: (err, _) => ErrorState(
          message: 'Failed to load orders',
          onRetry: () => ref.refresh(ordersListProvider),
        ),
        data: (orders) {
          if (orders.isEmpty) {
            return EmptyState(
              icon: Icons.receipt_long_outlined,
              title: 'No Orders Found',
              subtitle: 'Your ticket purchase receipts will appear here.',
              actionLabel: 'Explore Events',
              onAction: () => context.go('/'),
            );
          }

          return RefreshIndicator(
            color: AppColors.electricPurple,
            backgroundColor: AppColors.surface,
            onRefresh: () async => ref.refresh(ordersListProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(20),
              itemCount: orders.length,
              separatorBuilder: (context, index) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final ord = orders[index];
                final isPaid = ord.isPaid;

                return GestureDetector(
                  onTap: () => context.push('/orders/${ord.id}'),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.card,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.border, width: 0.5),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  '#${ord.id.length > 8 ? ord.id.substring(0, 8) : ord.id}',
                                  style: const TextStyle(
                                    color: AppColors.textPrimary,
                                    fontFamily: 'monospace',
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: isPaid ? AppColors.successSubtle : AppColors.dangerSubtle,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    ord.status.toUpperCase(),
                                    style: TextStyle(
                                      color: isPaid ? AppColors.success : AppColors.danger,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 10,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Placed on ${ord.createdAt.day}/${ord.createdAt.month}/${ord.createdAt.year}',
                              style: const TextStyle(color: AppColors.textTertiary, fontSize: 12),
                            ),
                          ],
                        ),
                        Row(
                          children: [
                            Text(
                              _formatPrice(ord.totalMinor, ord.currency),
                              style: const TextStyle(
                                color: AppColors.electricPurple,
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Icon(Icons.chevron_right_rounded, color: AppColors.textTertiary, size: 20),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
