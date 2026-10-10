package io.eventhub.scanner.di

import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import io.eventhub.scanner.BuildConfig
import io.eventhub.scanner.data.remote.ScannerAuthTokenProvider
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

    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient =
        OkHttpClient.Builder()
            .connectTimeout(6, TimeUnit.SECONDS)  // Scanner needs fast validation
            .readTimeout(10, TimeUnit.SECONDS)
            .writeTimeout(10, TimeUnit.SECONDS)
            .build()

    @Provides
    @Singleton
    fun provideHttpClient(
        okHttpClient: OkHttpClient,
        authTokenProvider: ScannerAuthTokenProvider,
    ): HttpClient = HttpClient(OkHttp) {
        engine { preconfigured = okHttpClient }
        install(ContentNegotiation) {
            json(Json { ignoreUnknownKeys = true; coerceInputValues = true })
        }
        install(Auth) {
            bearer {
                loadTokens {
                    val token = authTokenProvider.getAccessToken() ?: return@loadTokens null
                    BearerTokens(token, "")
                }
                refreshTokens {
                    val newToken = authTokenProvider.refreshAndGetToken() ?: return@refreshTokens null
                    BearerTokens(newToken, "")
                }
                sendWithoutRequest { true }
            }
        }
        install(Logging) {
            level = if (BuildConfig.DEBUG) LogLevel.BODY else LogLevel.NONE
        }
        install(HttpRequestRetry) {
            retryOnServerErrors(maxRetries = 3)
            exponentialDelay(base = 1.5, maxDelayMs = 5_000)
        }
        defaultRequest {
            url(BuildConfig.API_BASE_URL + "/")
            contentType(ContentType.Application.Json)
        }
    }
}
