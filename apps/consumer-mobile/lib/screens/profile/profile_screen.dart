// =============================================================================
// consumer-mobile — Consumer Profile & Settings Screen  (Phase 15)
// Purple gradient header band, dark surface cards, real auth data only.
// Guardrail: Exposes only features with verified backend support.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_colors.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authNotifierProvider);
    final user = authState.user;
    final profile = authState.profile;

    final displayName = profile?.name ?? user?.email?.split('@').first ?? 'Consumer User';
    final initial = displayName.isNotEmpty ? displayName[0].toUpperCase() : 'U';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: Text(
          'Profile',
          style: Theme.of(context).textTheme.headlineMedium,
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Purple Gradient Header Band — replaces flat lime card
            Container(
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Color(0xFF3D1080),
                    Color(0xFF7B2FFF),
                    Color(0xFFB830A0),
                  ],
                  stops: [0.0, 0.55, 1.0],
                ),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.electricPurple.withValues(alpha: 0.3),
                    blurRadius: 20,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              padding: const EdgeInsets.fromLTRB(20, 28, 20, 24),
              child: Column(
                children: [
                  // Avatar
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white.withValues(alpha: 0.2),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.4),
                        width: 2,
                      ),
                    ),
                    child: Center(
                      child: Text(
                        initial,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 28,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    displayName,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    user?.email ?? '—',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.75),
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.successSubtle,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
                    ),
                    child: const Text(
                      'ACTIVE ACCOUNT',
                      style: TextStyle(
                        color: AppColors.success,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 28),

            // Attendee Hub Section
            const Text(
              'ACCOUNT & ORDERS',
              style: TextStyle(
                color: AppColors.textTertiary,
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.2,
              ),
            ),
            const SizedBox(height: 12),

            _buildMenuItem(
              icon: Icons.confirmation_number_outlined,
              color: AppColors.electricPurple,
              title: 'My Ticket Wallet',
              subtitle: 'Digital passes & gate entry QR codes',
              onTap: () => context.push('/tickets'),
            ),
            const SizedBox(height: 10),

            _buildMenuItem(
              icon: Icons.receipt_long_outlined,
              color: AppColors.info,
              title: 'Order History',
              subtitle: 'View receipts & confirmed purchases',
              onTap: () => context.push('/orders'),
            ),
            const SizedBox(height: 10),

            _buildMenuItem(
              icon: Icons.notifications_none_outlined,
              color: AppColors.chipFestival,
              title: 'Notifications',
              subtitle: 'Gate announcements & updates',
              onTap: () => context.push('/notifications'),
            ),
            const SizedBox(height: 28),

            // App & Support Section
            const Text(
              'HELP & LEGAL',
              style: TextStyle(
                color: AppColors.textTertiary,
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.2,
              ),
            ),
            const SizedBox(height: 12),

            _buildMenuItem(
              icon: Icons.help_outline_rounded,
              color: AppColors.chipFood,
              title: 'Support & Help',
              subtitle: 'Contact support team',
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Support: support@eventplatform.io')),
                );
              },
            ),
            const SizedBox(height: 10),

            _buildMenuItem(
              icon: Icons.info_outline_rounded,
              color: AppColors.textSecondary,
              title: 'About EventPlatform',
              subtitle: 'Version 1.0.0 (Build 2026)',
              onTap: () {
                showAboutDialog(
                  context: context,
                  applicationName: 'EventPlatform',
                  applicationVersion: '1.0.0+1',
                  applicationLegalese: '© 2026 EventPlatform Inc. All rights reserved.',
                );
              },
            ),
            const SizedBox(height: 32),

            // Sign Out Button
            SizedBox(
              width: double.infinity,
              height: 50,
              child: OutlinedButton.icon(
                icon: const Icon(Icons.logout_rounded, color: AppColors.danger, size: 18),
                label: const Text(
                  'Sign Out',
                  style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.w600, fontSize: 14),
                ),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppColors.danger, width: 0.5),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  backgroundColor: AppColors.dangerSubtle,
                ),
                onPressed: () async {
                  await ref.read(authNotifierProvider.notifier).signOut();
                  if (context.mounted) {
                    context.go('/');
                  }
                },
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required Color color,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border, width: 0.5),
        ),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(color: AppColors.textTertiary, fontSize: 12),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppColors.textTertiary, size: 20),
          ],
        ),
      ),
    );
  }
}
