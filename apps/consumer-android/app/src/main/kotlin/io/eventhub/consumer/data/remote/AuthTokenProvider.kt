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
    suspend fun getAccessToken(): String? =
        supabaseAuth.currentSessionOrNull()?.accessToken

    suspend fun getRefreshToken(): String? =
        supabaseAuth.currentSessionOrNull()?.refreshToken

    suspend fun refreshAndGetToken(): String? = try {
        supabaseAuth.refreshCurrentSession()
        supabaseAuth.currentSessionOrNull()?.accessToken
    } catch (e: Exception) {
        null
    }

    val isAuthenticated: Boolean
        get() = supabaseAuth.currentSessionOrNull() != null
}
