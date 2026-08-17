// =============================================================================
// Reusable — Category Chips (Horizontal Scrolling Pill Filter)  Phase 15
// Active state: Electric Purple background + white text
// Inactive state: dark card with border
// =============================================================================

import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class CategoryChips extends StatelessWidget {
  final List<String> categories;
  final String? selected;
  final ValueChanged<String?> onSelected;

  const CategoryChips({
    super.key,
    required this.categories,
    this.selected,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 44, // 44px min touch target (accessibility guardrail)
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        itemCount: categories.length,
        separatorBuilder: (context, index) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final cat = categories[index];
          final isSelected =
              cat == selected || (selected == null && index == 0 && cat == 'All');

          return GestureDetector(
            onTap: () => onSelected(cat == 'All' ? null : cat),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              curve: Curves.easeOut,
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.electricPurple : AppColors.card,
                borderRadius: BorderRadius.circular(22),
                border: isSelected
                    ? Border.all(color: AppColors.electricPurple, width: 1.5)
                    : Border.all(color: AppColors.border, width: 0.5),
                boxShadow: isSelected
                    ? [
                        BoxShadow(
                          color: AppColors.electricPurple.withValues(alpha: 0.3),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ]
                    : null,
              ),
              child: Text(
                cat,
                style: TextStyle(
                  color: isSelected
                      ? AppColors.textOnAccent
                      : AppColors.textSecondary,
                  fontSize: 13,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
