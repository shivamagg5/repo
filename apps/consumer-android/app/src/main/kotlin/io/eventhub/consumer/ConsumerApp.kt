package io.eventhub.consumer

import android.app.Application
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import coil3.ImageLoader
import coil3.SingletonImageLoader
import coil3.network.okhttp.OkHttpNetworkFetcherFactory
import coil3.request.crossfade
import dagger.hilt.android.HiltAndroidApp
import okhttp3.OkHttpClient
import javax.inject.Inject

/**
 * Application class — Hilt entry point.
 *
 * Responsibilities:
 *  - Initializes Hilt dependency injection
 *  - Configures Coil singleton image loader (shared OkHttp client for connection pooling)
 *  - Registers notification channels
 *  - Provides custom WorkManager configuration with HiltWorkerFactory
 */
@HiltAndroidApp
class ConsumerApp : Application(), SingletonImageLoader.Factory, Configuration.Provider {

    @Inject
    lateinit var okHttpClient: OkHttpClient

    @Inject
    lateinit var workerFactory: HiltWorkerFactory

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()

    override fun onCreate() {
        super.onCreate()
        NotificationChannels.createAll(this)
    }

    // Share the Hilt-provided OkHttpClient with Coil
    // → single connection pool for API calls AND image loading
    override fun newImageLoader(context: android.content.Context): ImageLoader =
        ImageLoader.Builder(context)
            .components { add(OkHttpNetworkFetcherFactory(callFactory = { okHttpClient })) }
            .crossfade(300)
            .build()
}
