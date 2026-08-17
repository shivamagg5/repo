// =============================================================================
// consumer-mobile — Consumer Notifications Screen
// Displays real in-app notifications and delivery updates.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_colors.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_state.dart';
import '../../widgets/loading_state.dart';

final notificationsProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  return api.getInAppNotifications();
});

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notificationsAsync = ref.watch(notificationsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: Text(
          'Notifications',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppColors.textPrimary),
            onPressed: () => ref.refresh(notificationsProvider),
          ),
        ],
      ),
      body: notificationsAsync.when(
        data: (notifications) {
          if (notifications.isEmpty) {
            return const EmptyState(
              icon: Icons.notifications_none_rounded,
              title: 'No Notifications Yet',
              subtitle: 'Order confirmations, ticket delivery, and gate updates will appear here in real time.',
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.all(20),
            itemCount: notifications.length,
            separatorBuilder: (context, index) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final n = notifications[index];
              final type = n['type'] as String? ?? 'general';
              final title = n['title'] as String? ?? 'Platform Notification';
              final body = n['body'] as String? ?? n['message'] as String? ?? '';

              IconData iconData = Icons.notifications_outlined;
              Color iconColor = AppColors.electricPurple;

              if (type == 'ticket') {
                iconData = Icons.confirmation_number_outlined;
                iconColor = AppColors.success;
              } else if (type == 'order') {
                iconData = Icons.receipt_long_outlined;
                iconColor = AppColors.info;
              }

              return Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.card,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border, width: 0.5),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: iconColor.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(iconData, color: iconColor, size: 20),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            style: const TextStyle(color: AppColors.textPrimary, fontSize: 14, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            body,
                            style: const TextStyle(color: AppColors.textSecondary, fontSize: 12, height: 1.4),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          );
        },
        loading: () => const LoadingState(message: 'Loading notifications...'),
        error: (err, _) => ErrorState(
          message: 'Failed to load notifications',
          onRetry: () => ref.refresh(notificationsProvider),
        ),
      ),
    );
  }
}
