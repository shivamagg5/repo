package io.eventhub.scanner.data.remote

import io.github.jan.supabase.auth.Auth
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ScannerAuthTokenProvider @Inject constructor(
    private val supabaseAuth: Auth,
) {
    suspend fun getAccessToken(): String? =
        supabaseAuth.currentSessionOrNull()?.accessToken

    suspend fun refreshAndGetToken(): String? = try {
        supabaseAuth.refreshCurrentSession()
        supabaseAuth.currentSessionOrNull()?.accessToken
    } catch (e: Exception) {
        null
    }

    val isAuthenticated: Boolean
        get() = supabaseAuth.currentSessionOrNull() != null
}
