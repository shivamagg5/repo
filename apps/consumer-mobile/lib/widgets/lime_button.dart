// =============================================================================
// Reusable — Primary CTA Button  (Phase 15 — replaces LimeButton)
// Kept as "LimeButton" class name to avoid breaking all callers.
// Now uses Electric Purple (solid) instead of lime.
// For hero/premium moments, use GradientButton instead.
// =============================================================================

import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class LimeButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final bool isExpanded;
  final IconData? icon;

  const LimeButton({
    super.key,
    required this.label,
    this.onPressed,
    this.isLoading = false,
    this.isExpanded = true,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final button = ElevatedButton(
      onPressed: isLoading ? null : onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.electricPurple,
        foregroundColor: AppColors.textOnAccent,
        disabledBackgroundColor: AppColors.electricPurple.withValues(alpha: 0.4),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
        ),
        elevation: 0,
        shadowColor: AppColors.electricPurple.withValues(alpha: 0.4),
      ),
      child: isLoading
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Colors.white,
              ),
            )
          : Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (icon != null) ...[
                  Icon(icon, size: 20),
                  const SizedBox(width: 8),
                ],
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
    );

    return isExpanded
        ? SizedBox(width: double.infinity, child: button)
        : button;
  }
}
