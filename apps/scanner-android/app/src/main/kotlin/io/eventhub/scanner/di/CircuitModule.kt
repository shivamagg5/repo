package io.eventhub.scanner.di

import com.slack.circuit.foundation.Circuit
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import io.eventhub.scanner.ui.feature.auth.ScannerLoginPresenter
import io.eventhub.scanner.ui.feature.auth.ScannerLoginUiFactory
import io.eventhub.scanner.ui.feature.eventselect.EventSelectPresenter
import io.eventhub.scanner.ui.feature.eventselect.EventSelectUiFactory
import io.eventhub.scanner.ui.feature.manual.ManualEntryPresenter
import io.eventhub.scanner.ui.feature.manual.ManualEntryUiFactory
import io.eventhub.scanner.ui.feature.scanner.ScannerPresenter
import io.eventhub.scanner.ui.feature.scanner.ScannerUiFactory
import io.eventhub.scanner.ui.feature.sync.SyncStatusPresenter
import io.eventhub.scanner.ui.feature.sync.SyncStatusUiFactory
import io.eventhub.scanner.ui.navigation.*
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object CircuitModule {

    @Provides
    @Singleton
    fun provideCircuit(
        loginPresenterFactory: ScannerLoginPresenter.Factory,
        eventSelectPresenterFactory: EventSelectPresenter.Factory,
        scannerPresenterFactory: ScannerPresenter.Factory,
        syncStatusPresenterFactory: SyncStatusPresenter.Factory,
        manualEntryPresenterFactory: ManualEntryPresenter.Factory,
    ): Circuit = Circuit.Builder()
        .addPresenterFactory { screen, navigator, _ ->
            when (screen) {
                is LoginRoute -> loginPresenterFactory.create(screen, navigator)
                is EventSelectRoute -> eventSelectPresenterFactory.create(screen, navigator)
                is ScannerRoute -> scannerPresenterFactory.create(screen, navigator)
                is SyncStatusRoute -> syncStatusPresenterFactory.create(screen, navigator)
                is ManualEntryRoute -> manualEntryPresenterFactory.create(screen, navigator)
                else -> null
            }
        }
        .addUiFactories(
            listOf(
                ScannerLoginUiFactory(),
                EventSelectUiFactory(),
                ScannerUiFactory(),
                SyncStatusUiFactory(),
                ManualEntryUiFactory(),
            )
        )
        .build()
}
