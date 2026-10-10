package io.eventhub.scanner.di

import android.content.Context
import app.cash.sqldelight.db.SqlDriver
import app.cash.sqldelight.driver.android.AndroidSqliteDriver
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import io.eventhub.scanner.data.local.db.ScannerDatabase
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideSqlDriver(@ApplicationContext context: Context): SqlDriver =
        AndroidSqliteDriver(
            schema = ScannerDatabase.Schema,
            context = context,
            name = "eventhub_scanner_encrypted.db"
        )

    @Provides
    @Singleton
    fun provideScannerDatabase(driver: SqlDriver): ScannerDatabase =
        ScannerDatabase(driver)
}
