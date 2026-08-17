// =============================================================================
// Consumer Mobile — Onboarding Screen
// 3-step PageView carousel inspired by CultVibe + HYPERACTIVE onboarding.
// Stores seen status in SharedPreferences.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';
import '../../providers/onboarding_provider.dart';
import '../../theme/app_colors.dart';
import '../../widgets/gradient_button.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _pageController = PageController();
  int _currentPage = 0;

  static const _slides = [
    _OnboardingSlide(
      title: 'Discover Live Events',
      subtitle: 'Explore the hottest concerts, festivals, nightlife, and exclusive gigs happening near you with real-time updates.',
      icon: Icons.nightlife_rounded,
      badge: 'LIVE EXPERIENCES',
      badgeColor: AppColors.neonPink,
      iconColor: AppColors.electricPurple,
    ),
    _OnboardingSlide(
      title: 'Instant Gate Entry',
      subtitle: 'Dynamic cryptographic QR passes that work 100% offline. Zero network required at turnstile scanners.',
      icon: Icons.qr_code_2_rounded,
      badge: 'OFFLINE TICKET PASS',
      badgeColor: AppColors.electricPurple,
      iconColor: AppColors.neonPink,
    ),
    _OnboardingSlide(
      title: 'VIP & Early Access',
      subtitle: '10-minute cart lock guarantee, backstage passes, and exclusive promoter discounts for unforgettable nights.',
      icon: Icons.stars_rounded,
      badge: 'VIP PERKS',
      badgeColor: AppColors.neonPink,
      iconColor: AppColors.electricPurple,
    ),
  ];

  Future<void> _completeOnboardingAndGo(String path) async {
    await ref.read(onboardingCompletedProvider.notifier).completeOnboarding();
    if (mounted) {
      context.go(path);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLastSlide = _currentPage == _slides.length - 1;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            children: [
              // Skip Header
              Align(
                alignment: Alignment.topRight,
                child: isLastSlide
                    ? const SizedBox(height: 48)
                    : TextButton(
                        onPressed: () => _completeOnboardingAndGo('/login'),
                        child: const Text(
                          'Skip',
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
              ),

              // PageView Content
              Expanded(
                child: PageView.builder(
                  controller: _pageController,
                  onPageChanged: (idx) => setState(() => _currentPage = idx),
                  itemCount: _slides.length,
                  itemBuilder: (context, index) {
                    final slide = _slides[index];
                    return Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Central Visual Icon Box with subtle Glow
                        Container(
                          width: 130,
                          height: 130,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                slide.iconColor.withValues(alpha: 0.18),
                                AppColors.card,
                              ],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(36),
                            border: Border.all(
                              color: slide.iconColor.withValues(alpha: 0.35),
                              width: 1.5,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: slide.iconColor.withValues(alpha: 0.2),
                                blurRadius: 40,
                                spreadRadius: 6,
                              ),
                            ],
                          ),
                          child: Center(
                            child: Icon(
                              slide.icon,
                              size: 58,
                              color: slide.iconColor,
                            ),
                          ),
                        ),
                        const SizedBox(height: 32),

                        // Badge Pill
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                          decoration: BoxDecoration(
                            color: slide.badgeColor.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: slide.badgeColor.withValues(alpha: 0.3),
                              width: 1,
                            ),
                          ),
                          child: Text(
                            slide.badge,
                            style: TextStyle(
                              color: slide.badgeColor,
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1.2,
                            ),
                          ),
                        ),
                        const SizedBox(height: 18),

                        // Title
                        Text(
                          slide.title,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 26,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Subtitle
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12.0),
                          child: Text(
                            slide.subtitle,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 14,
                              height: 1.5,
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),

              // Dots indicator
              SmoothPageIndicator(
                controller: _pageController,
                count: _slides.length,
                effect: const ExpandingDotsEffect(
                  activeDotColor: AppColors.electricPurple,
                  dotColor: AppColors.border,
                  dotHeight: 8,
                  dotWidth: 8,
                  expansionFactor: 3,
                  spacing: 6,
                ),
              ),
              const SizedBox(height: 32),

              // Bottom CTA Section
              if (isLastSlide) ...[
                GradientButton(
                  label: 'Create Account ✦',
                  onPressed: () => _completeOnboardingAndGo('/register'),
                ),
                const SizedBox(height: 12),
                TextButton(
                  onPressed: () => _completeOnboardingAndGo('/login'),
                  child: RichText(
                    text: const TextSpan(
                      text: 'Already have an account? ',
                      style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
                      children: [
                        TextSpan(
                          text: 'Sign In',
                          style: TextStyle(
                            color: AppColors.neonPink,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ] else ...[
                GradientButton(
                  label: 'Continue',
                  onPressed: () {
                    _pageController.nextPage(
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeInOut,
                    );
                  },
                ),
                const SizedBox(height: 12),
                TextButton(
                  onPressed: () => _completeOnboardingAndGo('/login'),
                  child: const Text(
                    'Already have an account? Sign In',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }
}

class _OnboardingSlide {
  final String title;
  final String subtitle;
  final IconData icon;
  final String badge;
  final Color badgeColor;
  final Color iconColor;

  const _OnboardingSlide({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.badge,
    required this.badgeColor,
    required this.iconColor,
  });
}
