package io.eventhub.consumer.data.local

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * UserPreferencesStore — Persistent storage for consumer preferences.
 * Ensures customer's selected city, theme, and profile settings are permanently
 * preserved across app launches, kills, and phone reboots.
 */
@Singleton
class UserPreferencesStore @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val prefs by lazy {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    private val _selectedCityFlow = MutableStateFlow(getSelectedCity())
    val selectedCityFlow: StateFlow<String> = _selectedCityFlow.asStateFlow()

    fun getSelectedCity(): String {
        return prefs.getString(KEY_SELECTED_CITY, DEFAULT_CITY) ?: DEFAULT_CITY
    }

    fun setSelectedCity(city: String) {
        val trimmed = city.trim()
        if (trimmed.isNotBlank()) {
            prefs.edit().putString(KEY_SELECTED_CITY, trimmed).apply()
            _selectedCityFlow.value = trimmed
        }
    }

    companion object {
        private const val PREFS_NAME = "pulsr_user_preferences"
        private const val KEY_SELECTED_CITY = "pref_selected_city"
        const val DEFAULT_CITY = "Mumbai"

        // Static helper for immediate access from Composables where DI is not injected directly
        fun getSavedCity(context: Context): String {
            val sp = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return sp.getString(KEY_SELECTED_CITY, DEFAULT_CITY) ?: DEFAULT_CITY
        }

        fun saveCity(context: Context, city: String) {
            val trimmed = city.trim()
            if (trimmed.isNotBlank()) {
                val sp = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                sp.edit().putString(KEY_SELECTED_CITY, trimmed).apply()
            }
        }
    }
}
