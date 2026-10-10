package io.eventhub.consumer

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build

object NotificationChannels {
    const val CHANNEL_TICKETS = "tickets_channel"
    const val CHANNEL_EVENTS = "events_channel"
    const val CHANNEL_UPDATES = "updates_channel"

    fun createAll(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val ticketChannel = NotificationChannel(
                CHANNEL_TICKETS,
                "Ticket & Booking Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Updates on ticket purchases, entry barcodes, and event check-ins"
                enableVibration(true)
            }

            val eventChannel = NotificationChannel(
                CHANNEL_EVENTS,
                "Event Reminders & Updates",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Reminders for upcoming saved and purchased events"
            }

            val updatesChannel = NotificationChannel(
                CHANNEL_UPDATES,
                "General Announcements",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Special promotions, offers, and app updates"
            }

            manager.createNotificationChannels(listOf(ticketChannel, eventChannel, updatesChannel))
        }
    }
}
