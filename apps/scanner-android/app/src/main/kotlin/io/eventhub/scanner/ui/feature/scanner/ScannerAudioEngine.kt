package io.eventhub.scanner.ui.feature.scanner

import android.content.Context
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.core.content.ContextCompat
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ScannerAudioEngine @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private var toneGenerator: ToneGenerator? = null
    private var isMuted: Boolean = false

    init {
        try {
            toneGenerator = ToneGenerator(AudioManager.STREAM_MUSIC, 100)
        } catch (e: Exception) {
            // Audio manager tone generator fallback
            try {
                toneGenerator = ToneGenerator(AudioManager.STREAM_NOTIFICATION, 90)
            } catch (e2: Exception) {
                toneGenerator = null
            }
        }
    }

    fun setMuted(muted: Boolean) {
        isMuted = muted
    }

    fun isMuted(): Boolean = isMuted

    fun playSuccessFeedback() {
        if (!isMuted) {
            try {
                // High frequency crisp turnstile entry chime (120ms)
                toneGenerator?.startTone(ToneGenerator.TONE_PROP_BEEP, 120)
            } catch (e: Exception) {
                // Ignore tone error
            }
        }

        // Tactile single positive confirmation pulse
        val vibrator = ContextCompat.getSystemService(context, Vibrator::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator?.vibrate(VibrationEffect.createOneShot(100, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION")
            vibrator?.vibrate(100)
        }
    }

    fun playDuplicateWarningFeedback() {
        if (!isMuted) {
            try {
                // Double alert chirp for already used / duplicate credential
                toneGenerator?.startTone(ToneGenerator.TONE_CDMA_ALERT_CALL_GUARD, 250)
            } catch (e: Exception) {
                // Ignore
            }
        }

        val vibrator = ContextCompat.getSystemService(context, Vibrator::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator?.vibrate(
                VibrationEffect.createWaveform(longArrayOf(0, 120, 80, 180), -1)
            )
        } else {
            @Suppress("DEPRECATION")
            vibrator?.vibrate(300)
        }
    }

    fun playErrorFeedback() {
        if (!isMuted) {
            try {
                // Low frequency error tone for invalid / tampered credentials
                toneGenerator?.startTone(ToneGenerator.TONE_PROP_NACK, 350)
            } catch (e: Exception) {
                // Ignore
            }
        }

        val vibrator = ContextCompat.getSystemService(context, Vibrator::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator?.vibrate(
                VibrationEffect.createWaveform(longArrayOf(0, 200, 100, 250), -1)
            )
        } else {
            @Suppress("DEPRECATION")
            vibrator?.vibrate(450)
        }
    }
}
