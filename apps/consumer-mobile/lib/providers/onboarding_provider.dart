import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

final onboardingCompletedProvider = StateNotifierProvider<OnboardingNotifier, AsyncValue<bool>>((ref) {
  return OnboardingNotifier();
});

class OnboardingNotifier extends StateNotifier<AsyncValue<bool>> {
  OnboardingNotifier() : super(const AsyncValue.loading()) {
    _loadState();
  }

  Future<void> _loadState() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final isCompleted = prefs.getBool('onboarding_completed') ?? false;
      state = AsyncValue.data(isCompleted);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> completeOnboarding() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('onboarding_completed', true);
      state = const AsyncValue.data(true);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}
