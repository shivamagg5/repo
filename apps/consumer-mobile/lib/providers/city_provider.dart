// =============================================================================
// Consumer Mobile — City Selection Provider
// Stores user selected city and persists preference in SharedPreferences.
// =============================================================================

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

const String _cityPrefKey = 'selected_city_v1';
const String defaultCity = 'All India';

final selectedCityProvider = StateNotifierProvider<CityNotifier, String>((ref) {
  return CityNotifier();
});

class CityNotifier extends StateNotifier<String> {
  CityNotifier() : super(defaultCity) {
    _loadPersistedCity();
  }

  Future<void> _loadPersistedCity() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedCity = prefs.getString(_cityPrefKey);
      if (savedCity != null && savedCity.isNotEmpty) {
        state = savedCity;
      }
    } catch (_) {}
  }

  Future<void> setCity(String city) async {
    state = city;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_cityPrefKey, city);
    } catch (_) {}
  }
}
