// =============================================================================
// Consumer Mobile — Onboarding Screen
// 3-step PageView carousel inspired by CultVibe + HYPERACTIVE onboarding.
// Stores seen status in SharedPreferences.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';
import '../../theme/app_colors.dart';
import '../../widgets/gradient_button.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _pageController = PageController();
  int _currentPage = 0;

  static const _slides = [
    _OnboardingSlide(
      title: 'Discover Live Experiences',
      subtitle: 'Find concerts, festivals, comedy shows, and exclusive performances happening around you.',
      icon: Icons.explore_rounded,
      badge: 'EXPLORE',
    ),
    _OnboardingSlide(
      title: 'Instant Ticket Booking',
      subtitle: 'Lock your seats with guaranteed 10-minute hold and frictionless digital checkout.',
      icon: Icons.confirmation_num_rounded,
      badge: 'FAST & SECURE',
    ),
    _OnboardingSlide(
      title: 'Digital Gate Entry Pass',
      subtitle: 'Signed offline QR passes that scan instantly at the turnstile even with zero network.',
      icon: Icons.qr_code_scanner_rounded,
      badge: 'OFFLINE PASS',
    ),
  ];

  Future<void> _completeOnboarding() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('onboarding_completed', true);
    if (mounted) {
      context.go('/');
    }
  }

  @override
  Widget build(BuildContext context) {
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
                child: TextButton(
                  onPressed: _completeOnboarding,
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
                        // Central Visual Icon Box
                        Container(
                          width: 140,
                          height: 140,
                          decoration: BoxDecoration(
                            color: AppColors.card,
                            borderRadius: BorderRadius.circular(36),
                            border: Border.all(color: AppColors.border, width: 1),
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.electricPurple.withValues(alpha: 0.1),
                                blurRadius: 40,
                                spreadRadius: 10,
                              ),
                            ],
                          ),
                          child: Center(
                            child: Icon(slide.icon, size: 64, color: AppColors.electricPurple),
                          ),
                        ),
                        const SizedBox(height: 36),

                        // Badge
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                          decoration: BoxDecoration(
                            color: AppColors.electricPurpleSubtle,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            slide.badge,
                            style: const TextStyle(
                              color: AppColors.electricPurple,
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1,
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Title
                        Text(
                          slide.title,
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.displayMedium,
                        ),
                        const SizedBox(height: 12),

                        // Subtitle
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16.0),
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
              const SizedBox(height: 36),

              // Bottom CTA
              GradientButton(
                label: _currentPage == _slides.length - 1 ? 'Get Started ✦' : 'Continue',
                onPressed: () {
                  if (_currentPage == _slides.length - 1) {
                    _completeOnboarding();
                  } else {
                    _pageController.nextPage(
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeInOut,
                    );
                  }
                },
              ),
              const SizedBox(height: 16),
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

  const _OnboardingSlide({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.badge,
  });
}
