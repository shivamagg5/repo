package io.eventhub.scanner.worker

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.*
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import io.eventhub.scanner.data.local.db.ScannerDatabase
import io.eventhub.scanner.data.remote.ScannerApiService
import io.eventhub.scanner.data.remote.dto.BatchSyncRequestDto
import io.eventhub.scanner.data.remote.dto.SyncRecordDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

@HiltWorker
class CheckInSyncWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted workerParams: WorkerParameters,
    private val db: ScannerDatabase,
    private val api: ScannerApiService,
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val pendingCheckIns = db.scannerDatabaseQueries.getPendingCheckIns(50).executeAsList()
        if (pendingCheckIns.isEmpty()) {
            return@withContext Result.success()
        }

        val deviceId = pendingCheckIns.first().deviceId
        val eventId = pendingCheckIns.first().eventId

        val records = pendingCheckIns.map { checkIn ->
            SyncRecordDto(
                syncId = checkIn.syncId,
                ticketId = checkIn.ticketId,
                localTimestamp = checkIn.localTimestamp,
                datasetVersion = checkIn.datasetVersion,
                result = checkIn.result
            )
        }

        try {
            val response = api.syncBatch(
                BatchSyncRequestDto(
                    deviceId = deviceId,
                    eventId = eventId,
                    records = records
                )
            )

            // Mark successfully synced records
            response.syncedIds.forEach { syncId ->
                db.scannerDatabaseQueries.markCheckInSynced(syncId)
            }

            // Flag conflicts (Section 9: never silently delete evidence, mark CONFLICT)
            response.conflicts.forEach { conflict ->
                db.scannerDatabaseQueries.markCheckInConflict(conflict.syncId)
            }

            // Check if there are still pending records to sync
            val remaining = db.scannerDatabaseQueries.getPendingQueueCount().executeAsOne()
            if (remaining > 0) {
                Result.retry()
            } else {
                Result.success()
            }
        } catch (e: Exception) {
            Result.retry()
        }
    }

    companion object {
        const val WORK_NAME = "CheckInSyncWork"

        fun schedulePeriodic(workManager: WorkManager) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val request = PeriodicWorkRequestBuilder<CheckInSyncWorker>(15, TimeUnit.MINUTES)
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build()

            workManager.enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request
            )
        }

        fun triggerImmediate(workManager: WorkManager) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val request = OneTimeWorkRequestBuilder<CheckInSyncWorker>()
                .setConstraints(constraints)
                .build()

            workManager.enqueue(request)
        }
    }
}
