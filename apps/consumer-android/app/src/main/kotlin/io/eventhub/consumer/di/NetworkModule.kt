package io.eventhub.consumer.di

import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import io.eventhub.consumer.BuildConfig
import io.eventhub.consumer.data.remote.AuthTokenProvider
import io.ktor.client.HttpClient
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.HttpRequestRetry
import io.ktor.client.plugins.auth.Auth
import io.ktor.client.plugins.auth.providers.BearerTokens
import io.ktor.client.plugins.auth.providers.bearer
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.plugins.logging.LogLevel
import io.ktor.client.plugins.logging.Logging
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    /**
     * Shared OkHttp client — used by both Ktor (API calls) and Coil (image loading).
     * Single connection pool = faster, fewer open sockets.
     */
    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient =
        OkHttpClient.Builder()
            .connectTimeout(8, TimeUnit.SECONDS)
            .readTimeout(12, TimeUnit.SECONDS)
            .writeTimeout(12, TimeUnit.SECONDS)
            .build()

    /**
     * Ktor HttpClient — primary API client.
     *
     * Features:
     *  - Auth plugin: auto-attaches Bearer token, auto-refreshes on 401
     *  - ContentNegotiation: Kotlinx JSON serialization
     *  - Logging: body-level in debug, off in release
     *  - Retry: exponential backoff on server errors (max 2 retries)
     *  - DefaultRequest: base URL
     */
    @Provides
    @Singleton
    fun provideHttpClient(
        okHttpClient: OkHttpClient,
        authTokenProvider: AuthTokenProvider,
    ): HttpClient = HttpClient(OkHttp) {
        engine {
            preconfigured = okHttpClient
        }
        install(ContentNegotiation) {
            json(Json {
                ignoreUnknownKeys = true   // Safe for API versioning
                coerceInputValues = true   // Null -> default for missing fields
                isLenient = true
            })
        }
        install(Auth) {
            bearer {
                loadTokens {
                    val token = authTokenProvider.getAccessToken() ?: return@loadTokens null
                    BearerTokens(token, authTokenProvider.getRefreshToken() ?: "")
                }
                refreshTokens {
                    val newToken = authTokenProvider.refreshAndGetToken()
                        ?: return@refreshTokens null
                    BearerTokens(newToken, "")
                }
                sendWithoutRequest { true }
            }
        }
        install(Logging) {
            level = if (BuildConfig.DEBUG) LogLevel.BODY else LogLevel.NONE
        }
        install(HttpRequestRetry) {
            retryOnServerErrors(maxRetries = 2)
            exponentialDelay(base = 2.0, maxDelayMs = 10_000)
        }
        defaultRequest {
            url(BuildConfig.API_BASE_URL + "/")
            contentType(ContentType.Application.Json)
        }
    }
}
