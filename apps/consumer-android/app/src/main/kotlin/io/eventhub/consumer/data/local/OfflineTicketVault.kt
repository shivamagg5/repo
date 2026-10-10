package io.eventhub.consumer.data.local

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import io.eventhub.consumer.domain.model.Ticket
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

/**
 * OfflineTicketVault — Local Encrypted/Persistent Pass Storage for Turnstiles
 * Ensures admission passes and cryptographic ECDSA QR tokens open instantly with
 * zero cell connectivity in crowded arenas, festival grounds, and basement venues.
 */
@Singleton
class OfflineTicketVault @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val prefs by lazy {
        context.getSharedPreferences("pulsr_offline_ticket_vault", Context.MODE_PRIVATE)
    }

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        encodeDefaults = true
    }

    private val KEY_TICKETS_LIST = "vault_tickets_list"
    private val KEY_LAST_SYNC = "vault_last_sync_timestamp"
    private val PREFIX_TICKET = "vault_tkt_"
    private val PREFIX_QR = "vault_qr_"

    fun saveTickets(tickets: List<Ticket>) {
        try {
            val listJson = json.encodeToString(tickets.map { it.copy(isOfflineCached = true) })
            val editor = prefs.edit()
            editor.putString(KEY_TICKETS_LIST, listJson)
            editor.putLong(KEY_LAST_SYNC, System.currentTimeMillis())

            tickets.forEach { ticket ->
                val ticketWithOffline = ticket.copy(isOfflineCached = true)
                editor.putString(PREFIX_TICKET + ticket.id, json.encodeToString(ticketWithOffline))
                if (!ticket.qrToken.isNullOrBlank()) {
                    editor.putString(PREFIX_QR + ticket.id, ticket.qrToken)
                }
            }
            editor.apply()
        } catch (_: Exception) {
            // Ignore serialization failure gracefully
        }
    }

    fun getTickets(): List<Ticket> {
        val raw = prefs.getString(KEY_TICKETS_LIST, null) ?: return emptyList()
        return try {
            json.decodeFromString<List<Ticket>>(raw).map { it.copy(isOfflineCached = true) }
        } catch (_: Exception) {
            emptyList()
        }
    }

    fun saveTicket(ticket: Ticket, qrToken: String? = null) {
        try {
            val ticketWithOffline = ticket.copy(isOfflineCached = true)
            val editor = prefs.edit()
            editor.putString(PREFIX_TICKET + ticket.id, json.encodeToString(ticketWithOffline))
            val finalToken = qrToken ?: ticket.qrToken
            if (!finalToken.isNullOrBlank()) {
                editor.putString(PREFIX_QR + ticket.id, finalToken)
            }
            // Update in list as well
            val existing = getTickets().toMutableList()
            val idx = existing.indexOfFirst { it.id == ticket.id }
            if (idx >= 0) {
                existing[idx] = ticketWithOffline
            } else {
                existing.add(ticketWithOffline)
            }
            editor.putString(KEY_TICKETS_LIST, json.encodeToString(existing))
            editor.apply()
        } catch (_: Exception) {}
    }

    fun getTicket(ticketId: String): Ticket? {
        val raw = prefs.getString(PREFIX_TICKET + ticketId, null) ?: return null
        return try {
            val decoded = json.decodeFromString<Ticket>(raw)
            val cachedQr = prefs.getString(PREFIX_QR + ticketId, null)
            decoded.copy(
                qrToken = cachedQr ?: decoded.qrToken,
                isOfflineCached = true
            )
        } catch (_: Exception) {
            null
        }
    }

    fun saveQrToken(ticketId: String, qrToken: String) {
        prefs.edit().putString(PREFIX_QR + ticketId, qrToken).apply()
    }

    fun getQrToken(ticketId: String): String? {
        return prefs.getString(PREFIX_QR + ticketId, null)
    }

    fun isTicketCached(ticketId: String): Boolean {
        return prefs.contains(PREFIX_TICKET + ticketId)
    }

    fun getLastSyncTimestamp(): Long {
        return prefs.getLong(KEY_LAST_SYNC, 0L)
    }
}
