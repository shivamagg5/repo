// =============================================================================
// consumer-mobile — Saved Events Screen (Deferred Platform Feature)
// Guardrail: Saved Events backend API is not yet present.
// Clean "Coming Soon" state without fake local persistence.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../theme/app_colors.dart';
import '../../widgets/empty_state.dart';

class SavedScreen extends StatelessWidget {
  const SavedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: Text(
          'Saved Events',
          style: Theme.of(context).textTheme.headlineMedium,
        ),
      ),
      body: EmptyState(
        icon: Icons.bookmark_border_rounded,
        title: 'Saved Events Coming Soon',
        subtitle: 'You will be able to bookmark events and track updates here once available.',
        actionLabel: 'Discover Events',
        onAction: () => context.go('/'),
      ),
    );
  }
}
