// =============================================================================
// Consumer Mobile — App Shell  (Phase 15)
// 5-tab floating glassmorphism bottom nav.
// Active tab: Electric Purple pill with label.
// Inactive tabs: muted icon.
// Per guardrails: subtle glass, not a glowing purple blob.
// =============================================================================

import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../home_screen.dart';
import '../search/search_screen.dart';
import '../tickets/ticket_wallet_screen.dart';
import '../saved/saved_screen.dart';
import '../profile/profile_screen.dart';
import '../../theme/app_colors.dart';

class AppShell extends StatefulWidget {
  final int initialIndex;

  const AppShell({super.key, this.initialIndex = 0});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
  }

  static const _screens = <Widget>[
    HomeScreen(),
    SearchScreen(),
    TicketWalletScreen(),
    SavedScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true, // let content go under the floating nav
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 80),
        transitionBuilder: (child, animation) => FadeTransition(
          opacity: animation,
          child: child,
        ),
        child: KeyedSubtree(
          key: ValueKey(_currentIndex),
          child: _screens[_currentIndex],
        ),
      ),
      bottomNavigationBar: _FloatingNav(
        currentIndex: _currentIndex,
        onTap: (i) {
          HapticFeedback.selectionClick();
          setState(() => _currentIndex = i);
        },
      ),
    );
  }
}

// ── Floating Glassmorphism Bottom Nav ────────────────────────────────────────

class _FloatingNav extends StatelessWidget {
  const _FloatingNav({required this.currentIndex, required this.onTap});

  final int currentIndex;
  final ValueChanged<int> onTap;

  static const _items = [
    _NavDef(Icons.home_outlined, Icons.home_rounded, 'Home'),
    _NavDef(Icons.search_rounded, Icons.search_rounded, 'Search'),
    _NavDef(Icons.confirmation_num_outlined, Icons.confirmation_num_rounded, 'Tickets'),
    _NavDef(Icons.bookmark_border_rounded, Icons.bookmark_rounded, 'Saved'),
    _NavDef(Icons.person_outline_rounded, Icons.person_rounded, 'Profile'),
  ];

  @override
  Widget build(BuildContext context) {
    final bottomPad = MediaQuery.of(context).padding.bottom;

    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, bottomPad + 12),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(28),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
          child: Container(
            height: 64,
            decoration: BoxDecoration(
              // Subtle dark translucent surface — not a glowing purple blob
              color: AppColors.glassBackground,
              borderRadius: BorderRadius.circular(28),
              border: Border.all(
                color: AppColors.glassBorder,
                width: 0.8,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.35),
                  blurRadius: 20,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: List.generate(_items.length, (i) {
                return _NavItem(
                  def: _items[i],
                  isActive: currentIndex == i,
                  onTap: () => onTap(i),
                );
              }),
            ),
          ),
        ),
      ),
    );
  }
}

// ── Single Nav Item ──────────────────────────────────────────────────────────

class _NavDef {
  const _NavDef(this.icon, this.activeIcon, this.label);
  final IconData icon;
  final IconData activeIcon;
  final String label;
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.def,
    required this.isActive,
    required this.onTap,
  });

  final _NavDef def;
  final bool isActive;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      // 44px+ touch target (accessibility guardrail)
      child: SizedBox(
        height: 64,
        child: Center(
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeOutCubic,
            padding: EdgeInsets.symmetric(
              horizontal: isActive ? 14 : 10,
              vertical: 8,
            ),
            decoration: BoxDecoration(
              color: isActive ? AppColors.electricPurple : Colors.transparent,
              borderRadius: BorderRadius.circular(20),
              boxShadow: isActive
                  ? [
                      BoxShadow(
                        color: AppColors.electricPurple.withValues(alpha: 0.35),
                        blurRadius: 10,
                        offset: const Offset(0, 2),
                      ),
                    ]
                  : null,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  isActive ? def.activeIcon : def.icon,
                  color: isActive ? Colors.white : AppColors.textTertiary,
                  size: 22,
                ),
                if (isActive) ...[
                  const SizedBox(width: 6),
                  Text(
                    def.label,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
