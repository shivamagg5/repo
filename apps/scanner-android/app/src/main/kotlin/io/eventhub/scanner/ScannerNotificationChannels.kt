package io.eventhub.scanner

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build

object ScannerNotificationChannels {
    const val CHANNEL_FOREGROUND = "scanner_foreground_channel"
    const val CHANNEL_SYNC = "scanner_sync_channel"

    fun createAll(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val fgChannel = NotificationChannel(
                CHANNEL_FOREGROUND,
                "Scanner Gate Terminal Active",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps camera and validation queue active during event operations"
            }

            val syncChannel = NotificationChannel(
                CHANNEL_SYNC,
                "Sync & Reconcile Alerts",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Notifies staff on sync completion and conflict resolution"
            }

            manager.createNotificationChannels(listOf(fgChannel, syncChannel))
        }
    }
}
