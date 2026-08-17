// Gradient CTA Button — Purple→Pink gradient, spring-scale on press.
// Used for hero / major CTAs only (not secondary actions).
// Minimum touch target: 48px height (accessibility guardrail).

import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../utils/animations.dart';

class GradientButton extends StatelessWidget {
  const GradientButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.gradient = AppColors.primaryGradient,
    this.width = double.infinity,
    this.height = 52.0,
    this.borderRadius = 14.0,
    this.isLoading = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final LinearGradient gradient;
  final double width;
  final double height;
  final double borderRadius;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    final textStyle = Theme.of(context).textTheme.labelLarge?.copyWith(
          color: Colors.white,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.3,
        );

    return ScaleBounce(
      onTap: onPressed ?? () {},
      child: AnimatedOpacity(
        opacity: onPressed == null ? 0.5 : 1.0,
        duration: const Duration(milliseconds: 200),
        child: Container(
          width: width,
          height: height,
          decoration: BoxDecoration(
            gradient: onPressed == null
                ? const LinearGradient(
                    colors: [Color(0xFF444466), Color(0xFF444466)],
                  )
                : gradient,
            borderRadius: BorderRadius.circular(borderRadius),
            boxShadow: onPressed == null
                ? null
                : [
                    BoxShadow(
                      color: AppColors.electricPurple.withValues(alpha: 0.35),
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    ),
                  ],
          ),
          child: isLoading
              ? const Center(
                  child: SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      color: Colors.white,
                      strokeWidth: 2.5,
                    ),
                  ),
                )
              : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (icon != null) ...[
                      Icon(icon, color: Colors.white, size: 20),
                      const SizedBox(width: 8),
                    ],
                    Text(label, style: textStyle),
                  ],
                ),
        ),
      ),
    );
  }
}
