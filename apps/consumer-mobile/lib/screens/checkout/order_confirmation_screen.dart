// =============================================================================
// consumer-mobile — Order Confirmation Screen
// Confirmed order state with celebration animation and digital wallet link.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../theme/app_colors.dart';
import '../../widgets/lime_button.dart';

class OrderConfirmationScreen extends StatelessWidget {
  final String orderId;

  const OrderConfirmationScreen({
    super.key,
    required this.orderId,
  });

  @override
  Widget build(BuildContext context) {
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

              // Success Icon with Lime Glow
              Center(
                child: Container(
                  width: 90,
                  height: 90,
                  decoration: BoxDecoration(
                    color: AppColors.electricPurple,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.electricPurple.withValues(alpha: 0.35),
                        blurRadius: 30,
                        spreadRadius: 6,
                      ),
                    ],
                  ),
                  child: const Icon(Icons.check_rounded, color: AppColors.textOnAccent, size: 50),
                ),
              ),
              const SizedBox(height: 28),

              Text(
                'Payment Confirmed!',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.displaySmall,
              ),
              const SizedBox(height: 10),

              const Text(
                'Your ticket reservation has been converted into cryptographically verified digital tickets.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textSecondary, fontSize: 14, height: 1.4),
              ),
              const SizedBox(height: 32),

              // Order Reference Card
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
                        const Text('Order Reference', style: TextStyle(color: AppColors.textTertiary, fontSize: 13)),
                        Text(
                          '#${orderId.length > 8 ? orderId.substring(0, 8) : orderId}',
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
                        const Text('Status', style: TextStyle(color: AppColors.textTertiary, fontSize: 13)),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.electricPurpleSubtle,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'PAID & ISSUED',
                            style: TextStyle(color: AppColors.electricPurple, fontWeight: FontWeight.bold, fontSize: 11),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const Spacer(),

              // Action Buttons
              LimeButton(
                label: 'View My Tickets & QR',
                icon: Icons.confirmation_num_rounded,
                onPressed: () => context.go('/tickets'),
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
