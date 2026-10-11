package io.eventhub.consumer.data.remote

import io.github.jan.supabase.auth.Auth
import javax.inject.Inject
import javax.inject.Singleton

/**
 * AuthTokenProvider — bridges Supabase Kotlin SDK session to Ktor's Auth plugin.
 *
 * This is injected into NetworkModule so Ktor can auto-attach + refresh tokens.
 */
@Singleton
class AuthTokenProvider @Inject constructor(
    private val supabaseAuth: Auth,
) {
    @Volatile
    private var customAccessToken: String? = null

    @Volatile
    private var customRefreshToken: String? = null

    fun setTokens(token: String, refreshToken: String? = null) {
        customAccessToken = token
        customRefreshToken = refreshToken
    }

    fun clearTokens() {
        customAccessToken = null
        customRefreshToken = null
    }

    suspend fun getAccessToken(): String? =
        customAccessToken ?: supabaseAuth.currentSessionOrNull()?.accessToken

    suspend fun getRefreshToken(): String? =
        customRefreshToken ?: supabaseAuth.currentSessionOrNull()?.refreshToken

    suspend fun refreshAndGetToken(): String? = try {
        supabaseAuth.refreshCurrentSession()
        val refreshed = supabaseAuth.currentSessionOrNull()?.accessToken
        if (refreshed != null) {
            customAccessToken = refreshed
        }
        refreshed ?: customAccessToken
    } catch (e: Exception) {
        customAccessToken
    }

    val isAuthenticated: Boolean
        get() = (customAccessToken != null && customAccessToken!!.isNotBlank()) ||
                supabaseAuth.currentSessionOrNull() != null
}
