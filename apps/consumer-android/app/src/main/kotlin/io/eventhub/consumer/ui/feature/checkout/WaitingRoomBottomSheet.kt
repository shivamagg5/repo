package io.eventhub.consumer.ui.feature.checkout

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.eventhub.consumer.ui.theme.*
import kotlinx.coroutines.delay

/**
 * WaitingRoomBottomSheet — High-Traffic Festival Drop Virtual Waiting Room
 * Prevents server crashes and bot scalpings during massive demand drops in Jetpack Compose.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WaitingRoomBottomSheet(
    eventName: String,
    isOpen: Boolean,
    onAdmitted: () -> Unit,
    onDismiss: () -> Unit,
) {
    if (!isOpen) return

    var position by remember { mutableIntStateOf(142) }
    var estimatedWaitSec by remember { mutableIntStateOf(75) }
    var isAdmitted by remember { mutableStateOf(false) }

    // Queue progression countdown ticker
    LaunchedEffect(isOpen) {
        while (position > 0) {
            delay(2000)
            val drop = (4..9).random()
            val next = (position - drop).coerceAtLeast(0)
            position = next
            estimatedWaitSec = (next * 0.75).toInt().coerceAtLeast(3)
            if (next == 0) {
                isAdmitted = true
                delay(800)
                onAdmitted()
                break
            }
        }
    }

    // Animated Radar Sweeping Ring
    val infiniteTransition = rememberInfiniteTransition(label = "radarRotation")
    val rotationAngle by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(2400, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "radarAngle"
    )

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF0F0D1A),
        dragHandle = {
            BottomSheetDefaults.DragHandle(color = SurfaceBorder)
        },
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 36.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Security badge
            Surface(
                shape = RoundedCornerShape(100.dp),
                color = PulsrAcid.copy(alpha = 0.12f),
                border = androidx.compose.foundation.BorderStroke(1.dp, PulsrAcid.copy(alpha = 0.35f)),
                modifier = Modifier.padding(bottom = 16.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(7.dp)
                            .clip(CircleShape)
                            .background(PulsrAcid)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "FAIR QUEUE ACTIVE • BOT DEFENSE ON",
                        style = MaterialTheme.typography.labelSmall,
                        color = PulsrAcid,
                        fontWeight = FontWeight.Black,
                        fontSize = 10.sp,
                        letterSpacing = 0.5.sp
                    )
                }
            }

            Text(
                text = eventName,
                style = MaterialTheme.typography.titleLarge,
                color = OnSurface,
                fontWeight = FontWeight.Black,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "High demand ticket drop in progress. Your spot in line is secured.",
                style = MaterialTheme.typography.bodySmall,
                color = OnSurfaceMedium,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(28.dp))

            // Circular Radar Queue Position Ring
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier.size(190.dp)
            ) {
                Canvas(modifier = Modifier.fillMaxSize()) {
                    // Outer track
                    drawCircle(
                        color = Color(0xFF26213D),
                        radius = size.minDimension / 2f - 12f,
                        style = Stroke(width = 8.dp.toPx())
                    )

                    // Progress Arc with Pulsr neon gradient
                    drawArc(
                        brush = Brush.sweepGradient(
                            listOf(PulsrPink, PulsrFlame, PulsrAcid, PulsrNeon, PulsrPink)
                        ),
                        startAngle = rotationAngle,
                        sweepAngle = 280f,
                        useCenter = false,
                        style = Stroke(width = 8.dp.toPx(), cap = StrokeCap.Round)
                    )
                }

                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "POSITION",
                        style = MaterialTheme.typography.labelSmall,
                        color = OnSurfaceMedium,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                    Text(
                        text = if (isAdmitted) "GO!" else "#$position",
                        fontSize = 42.sp,
                        fontWeight = FontWeight.Black,
                        color = if (isAdmitted) PulsrAcid else OnSurface,
                        fontFamily = FontFamily.Monospace,
                        lineHeight = 44.sp
                    )
                    Text(
                        text = if (isAdmitted) "Unlocked" else "In Fair Queue",
                        style = MaterialTheme.typography.labelSmall,
                        color = if (isAdmitted) PulsrAcid else PulsrPink,
                        fontWeight = FontWeight.Bold,
                        fontSize = 10.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(28.dp))

            // Metric Summary HUD
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF181428), RoundedCornerShape(16.dp))
                    .border(1.dp, SurfaceBorder, RoundedCornerShape(16.dp))
                    .padding(14.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        text = "ESTIMATED WAIT",
                        style = MaterialTheme.typography.labelSmall,
                        color = OnSurfaceMedium,
                        fontSize = 9.sp
                    )
                    Text(
                        text = "~${estimatedWaitSec / 60}m ${estimatedWaitSec % 60}s",
                        style = MaterialTheme.typography.titleMedium,
                        color = PulsrNeon,
                        fontWeight = FontWeight.Black
                    )
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "FANS AHEAD",
                        style = MaterialTheme.typography.labelSmall,
                        color = OnSurfaceMedium,
                        fontSize = 9.sp
                    )
                    Text(
                        text = "${(position - 1).coerceAtLeast(0)} fans",
                        style = MaterialTheme.typography.titleMedium,
                        color = OnSurface,
                        fontWeight = FontWeight.Black
                    )
                }
            }

            Spacer(modifier = Modifier.height(18.dp))

            Text(
                text = "⚠️ Do not close the app. Once you reach the front, your 10-minute pass reservation window will start immediately.",
                style = MaterialTheme.typography.labelSmall,
                color = OnSurfaceMedium,
                textAlign = TextAlign.Center,
                fontSize = 11.sp,
                lineHeight = 15.sp
            )

            Spacer(modifier = Modifier.height(20.dp))

            OutlinedButton(
                onClick = onDismiss,
                shape = RoundedCornerShape(12.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceBorder),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(44.dp)
            ) {
                Text(text = "Leave Queue & Return", color = OnSurfaceMedium, style = MaterialTheme.typography.labelMedium)
            }
        }
    }
}
