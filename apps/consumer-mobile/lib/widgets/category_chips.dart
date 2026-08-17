// =============================================================================
// Reusable — Category Chips  (Phase 16 UI/UX Overhaul)
// Emoji icons per category. Gradient active state. Haptic selection click.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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

  static String _emojiFor(String category) {
    switch (category.toLowerCase()) {
      case 'all':       return '✦';
      case 'music':     return '🎵';
      case 'concert':   return '🎤';
      case 'festival':  return '🎉';
      case 'comedy':    return '😂';
      case 'theatre':   return '🎭';
      case 'art':       return '🎨';
      case 'food':      return '🍕';
      case 'sports':    return '⚽';
      case 'dance':     return '💃';
      case 'tech':      return '💻';
      case 'wellness':  return '🧘';
      case 'kids':      return '🧸';
      case 'nightlife': return '🌙';
      case 'outdoors':  return '🏕️';
      default:          return '🎟️';
    }
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        itemCount: categories.length,
        separatorBuilder: (context, index) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final cat = categories[index];
          final isSelected =
              cat == selected || (selected == null && index == 0 && cat == 'All');
          final emoji = _emojiFor(cat);

          return GestureDetector(
            onTap: () {
              HapticFeedback.selectionClick();
              onSelected(cat == 'All' ? null : cat);
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 220),
              curve: Curves.easeOutCubic,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                gradient: isSelected ? AppColors.primaryGradient : null,
                color: isSelected ? null : AppColors.card,
                borderRadius: BorderRadius.circular(22),
                border: isSelected
                    ? null
                    : Border.all(color: AppColors.border, width: 0.5),
                boxShadow: isSelected
                    ? [
                        BoxShadow(
                          color: AppColors.electricPurple.withValues(alpha: 0.35),
                          blurRadius: 10,
                          offset: const Offset(0, 3),
                        ),
                      ]
                    : null,
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(emoji, style: const TextStyle(fontSize: 13)),
                  const SizedBox(width: 5),
                  Text(
                    cat,
                    style: TextStyle(
                      color: isSelected
                          ? AppColors.textOnAccent
                          : AppColors.textSecondary,
                      fontSize: 13,
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
