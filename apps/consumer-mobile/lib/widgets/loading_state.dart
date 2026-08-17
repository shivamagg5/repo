// =============================================================================
// Reusable — Loading State (shimmer placeholder)
// =============================================================================

import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';

class LoadingState extends StatelessWidget {
  final String? message;

  const LoadingState({super.key, this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(
              width: 40,
              height: 40,
              child: CircularProgressIndicator(
                strokeWidth: 3,
                color: AppColors.electricPurple,
              ),
            ),
            if (message != null) ...[
              const SizedBox(height: 16),
              Text(
                message!,
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 14),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Shimmer-style placeholder for cards while loading.
class ShimmerCard extends StatelessWidget {
  final double height;
  final double? width;
  final double borderRadius;

  const ShimmerCard({
    super.key,
    this.height = 200,
    this.width,
    this.borderRadius = 16,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      width: width ?? double.infinity,
      decoration: BoxDecoration(
        color: AppColors.shimmerBase,
        borderRadius: BorderRadius.circular(borderRadius),
      ),
    );
  }
}
