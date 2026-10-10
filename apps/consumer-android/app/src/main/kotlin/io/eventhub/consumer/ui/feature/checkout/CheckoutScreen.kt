package io.eventhub.consumer.ui.feature.checkout

import android.app.Activity
import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.ConfirmationNumber
import androidx.compose.material.icons.outlined.LocalOffer
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Remove
import androidx.compose.material.icons.outlined.Shield
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.slack.circuit.runtime.CircuitContext
import com.slack.circuit.runtime.screen.Screen
import com.slack.circuit.runtime.ui.Ui
import com.slack.circuit.runtime.ui.ui
import io.eventhub.consumer.domain.model.Event
import io.eventhub.consumer.domain.model.TicketType
import io.eventhub.consumer.ui.components.ErrorState
import io.eventhub.consumer.ui.components.LoadingState
import io.eventhub.consumer.ui.navigation.CheckoutRoute
import io.eventhub.consumer.ui.theme.*

class CheckoutUiFactory : Ui.Factory {
    override fun create(screen: Screen, context: CircuitContext): Ui<*>? =
        if (screen is CheckoutRoute) ui<CheckoutState> { state, modifier ->
            CheckoutScreen(state, modifier)
        } else null
}

@Composable
fun CheckoutScreen(state: CheckoutState, modifier: Modifier = Modifier) {
    val context = LocalContext.current

    val paymentLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            state.eventSink(CheckoutEvent.PaymentSuccess)
        } else {
            val errorMsg = result.data?.getStringExtra("error") ?: "Payment cancelled"
            state.eventSink(CheckoutEvent.PaymentFailed(errorMsg))
        }
    }

    // Launch PaymentActivity when paymentIntent is received
    LaunchedEffect(state.paymentIntent) {
        state.paymentIntent?.let { intent ->
            val payIntent = Intent(context, PaymentActivity::class.java).apply {
                putExtra("orderId", intent.razorpayOrderId)
                putExtra("amount", intent.amount)
                putExtra("currency", intent.currency)
                putExtra("key", intent.key)
                putExtra("eventName", state.event?.name ?: "Event Ticket")
            }
            paymentLauncher.launch(payIntent)
        }
    }

    Scaffold(
        modifier = modifier,
        containerColor = BackgroundDark,
        topBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = { state.eventSink(CheckoutEvent.BackClicked) }) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Outlined.ArrowBack,
                        contentDescription = "Back",
                        tint = OnSurface
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Column {
                    Text(
                        text = "Checkout & Reserve",
                        style = MaterialTheme.typography.titleLarge,
                        color = OnSurface,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "10-Min Atomic DB Hold Active",
                        style = MaterialTheme.typography.bodySmall,
                        color = PulsrAcid,
                        fontWeight = FontWeight.Bold,
                        fontSize = 10.sp
                    )
                }
            }
        },
        bottomBar = {
            if (state.event != null) {
                CheckoutBottomBar(
                    state = state,
                    onProceed = { state.eventSink(CheckoutEvent.ProceedToPayClicked) }
                )
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                state.isLoading -> LoadingState(message = "Preparing atomic ticket hold...")
                state.error != null && state.event == null -> ErrorState(
                    message = state.error,
                    onRetry = { state.eventSink(CheckoutEvent.BackClicked) }
                )
                state.event != null -> {
                    CheckoutContent(state = state)
                }
            }

            // High-Demand Festival Drop Virtual Waiting Room
            WaitingRoomBottomSheet(
                eventName = state.event?.name ?: "Festival Drop",
                isOpen = state.isWaitingRoomOpen,
                onAdmitted = { state.eventSink(CheckoutEvent.WaitingRoomAdmitted) },
                onDismiss = { state.eventSink(CheckoutEvent.DismissWaitingRoom) }
            )
        }
    }
}

@Composable
private fun CheckoutContent(state: CheckoutState) {
    val event = state.event ?: return

    val isHighDemand = (event.totalCapacity ?: 0) >= 5000 ||
        event.name.contains("indometal", ignoreCase = true) ||
        event.name.contains("coldplay", ignoreCase = true)

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Fair Queue Badge for High Demand Drops
        if (isHighDemand) {
            item {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = if (state.isQueueAdmitted) Color(0xFF14241B) else Color(0xFF261226),
                    border = androidx.compose.foundation.BorderStroke(
                        1.dp,
                        if (state.isQueueAdmitted) PulsrAcid else PulsrPink
                    ),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(if (state.isQueueAdmitted) PulsrAcid else PulsrPink)
                        )
                        Column {
                            Text(
                                text = if (state.isQueueAdmitted) "⚡ Fair Queue Verified • Hold Token Active" else "⚡ Anti-Bot Fair Queue Active",
                                style = MaterialTheme.typography.labelMedium,
                                color = if (state.isQueueAdmitted) PulsrAcid else PulsrPink,
                                fontWeight = FontWeight.Black
                            )
                            Text(
                                text = if (state.isQueueAdmitted) "Your FIFO queue spot was approved. Complete your booking within the 10-minute hold window." else "High demand ticket drop in progress with cryptographic scalper protection.",
                                style = MaterialTheme.typography.bodySmall,
                                color = OnSurfaceMedium,
                                fontSize = 11.sp
                            )
                        }
                    }
                }
            }
        }

        // Guaranteed Hold Notification Banner
        item {
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = PulsrPink.copy(alpha = 0.12f),
                border = androidx.compose.foundation.BorderStroke(1.dp, GlowBorderPink),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Lock,
                        contentDescription = null,
                        tint = PulsrPink,
                        modifier = Modifier.size(20.dp)
                    )
                    Column {
                        Text(
                            text = "Guaranteed 10-Minute Hold",
                            style = MaterialTheme.typography.labelMedium,
                            color = OnSurface,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Selected tickets are temporarily locked so no one else can book them.",
                            style = MaterialTheme.typography.bodySmall,
                            color = OnSurfaceMedium,
                            fontSize = 11.sp
                        )
                    }
                }
            }
        }

        // Event Summary Card
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, SurfaceBorder, RoundedCornerShape(14.dp))
            ) {
                Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = PulsrPink.copy(alpha = 0.15f),
                        modifier = Modifier.size(56.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Outlined.ConfirmationNumber,
                                contentDescription = null,
                                tint = PulsrPink,
                                modifier = Modifier.size(28.dp)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(14.dp))
                    Column {
                        Text(
                            text = event.name,
                            style = MaterialTheme.typography.titleMedium,
                            color = OnSurface,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "${event.startAt.take(10)} • ${event.venue?.city ?: "Venue"}",
                            style = MaterialTheme.typography.bodySmall,
                            color = OnSurfaceMedium
                        )
                    }
                }
            }
        }

        // Tier Quantity Selectors
        item {
            Text(
                text = "Choose Ticket Tiers",
                style = MaterialTheme.typography.titleMedium,
                color = OnSurface,
                fontWeight = FontWeight.Bold
            )
        }

        items(event.ticketTypes, key = { it.id }) { tier ->
            val count = state.quantities[tier.id] ?: 0
            TicketQuantityItem(
                tier = tier,
                count = count,
                onQuantityChanged = { newCount ->
                    state.eventSink(CheckoutEvent.QuantityChanged(tier.id, newCount))
                }
            )
        }

        // Promo Code Entry Card
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, SurfaceBorder, RoundedCornerShape(14.dp))
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text(
                        text = "Promo or Referral Code",
                        style = MaterialTheme.typography.labelMedium,
                        color = OnSurfaceMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = state.promoCode,
                            onValueChange = { state.eventSink(CheckoutEvent.PromoCodeChanged(it)) },
                            placeholder = { Text("e.g. PULSR10", color = OnSurfaceLow, fontSize = 12.sp) },
                            singleLine = true,
                            shape = RoundedCornerShape(10.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = PulsrPink,
                                unfocusedBorderColor = SurfaceBorder,
                                focusedTextColor = OnSurface,
                                unfocusedTextColor = OnSurface
                            ),
                            modifier = Modifier
                                .weight(1f)
                                .height(50.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Button(
                            onClick = { state.eventSink(CheckoutEvent.ApplyPromoClicked) },
                            enabled = state.promoCode.isNotBlank() && !state.isApplyingPromo,
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Surface2Dark),
                            border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceBorder),
                            modifier = Modifier.height(50.dp)
                        ) {
                            if (state.isApplyingPromo) {
                                CircularProgressIndicator(color = PulsrPink, strokeWidth = 2.dp, modifier = Modifier.size(16.dp))
                            } else {
                                Text(
                                    "Apply",
                                    color = if (state.promoCode.isNotBlank()) PulsrPink else OnSurfaceLow,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }

                    if (state.promoError != null) {
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = state.promoError,
                            color = ErrorRed,
                            style = MaterialTheme.typography.bodySmall,
                            fontSize = 11.sp
                        )
                    }

                    if (state.session?.promoDiscount != null && state.session.promoDiscount > 0) {
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(imageVector = Icons.Outlined.Check, contentDescription = null, tint = PulsrAcid, modifier = Modifier.size(14.dp))
                            Text(
                                text = "Code ${state.promoCode.uppercase()} applied! You saved ${formatCurrency(state.session.promoDiscount)}",
                                color = PulsrAcid,
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.sp
                            )
                        }
                    }
                }
            }
        }

        // Price Breakdown
        item {
            PriceSummaryCard(state = state)
        }

        // Error banner if any
        if (state.error != null) {
            item {
                Surface(
                    color = ErrorRed.copy(alpha = 0.15f),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = state.error,
                        style = MaterialTheme.typography.bodySmall,
                        color = ErrorRed,
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun TicketQuantityItem(
    tier: TicketType,
    count: Int,
    onQuantityChanged: (Int) -> Unit
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = SurfaceDark),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, SurfaceBorder, RoundedCornerShape(12.dp))
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = tier.name,
                    style = MaterialTheme.typography.titleMedium,
                    color = OnSurface,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = if (tier.price == 0) "Free" else "${formatCurrency(tier.price)} per ticket",
                    style = MaterialTheme.typography.bodySmall,
                    color = AccentGold
                )
            }
            if (tier.isSoldOut) {
                Text(
                    text = "Sold Out",
                    style = MaterialTheme.typography.labelMedium,
                    color = ErrorRed,
                    fontWeight = FontWeight.Bold
                )
            } else {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    IconButton(
                        onClick = { if (count > 0) onQuantityChanged(count - 1) },
                        enabled = count > 0,
                        modifier = Modifier
                            .size(36.dp)
                            .background(Surface2Dark, CircleShape)
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.Remove,
                            contentDescription = "Decrease",
                            tint = if (count > 0) OnSurface else OnSurfaceLow,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    Text(
                        text = "$count",
                        style = MaterialTheme.typography.titleMedium,
                        color = OnSurface,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.widthIn(min = 20.dp),
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )
                    IconButton(
                        onClick = { if (count < tier.maxPerOrder) onQuantityChanged(count + 1) },
                        enabled = count < tier.maxPerOrder,
                        modifier = Modifier
                            .size(36.dp)
                            .background(Surface2Dark, CircleShape)
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.Add,
                            contentDescription = "Increase",
                            tint = if (count < tier.maxPerOrder) OnSurface else OnSurfaceLow,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun PriceSummaryCard(state: CheckoutState) {
    val totalTickets = state.quantities.values.sum()
    val subtotal = state.quantities.entries.sumOf { (typeId, count) ->
        val price = state.event?.ticketTypes?.find { it.id == typeId }?.price ?: 0
        price * count
    }
    val fees = if (subtotal > 0) (subtotal * 0.05).toInt() else 0 // 5% platform fee
    val promoDiscount = state.session?.promoDiscount ?: 0
    val total = (subtotal + fees - promoDiscount).coerceAtLeast(0)

    Card(
        colors = CardDefaults.cardColors(containerColor = SurfaceDark),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, SurfaceBorder, RoundedCornerShape(12.dp))
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = "Order Summary",
                style = MaterialTheme.typography.titleMedium,
                color = OnSurface,
                fontWeight = FontWeight.Bold
            )
            HorizontalDivider(color = SurfaceBorder)
            SummaryRow(label = "Tickets ($totalTickets)", value = formatCurrency(subtotal))
            SummaryRow(label = "Convenience & GST Fees", value = formatCurrency(fees))
            if (promoDiscount > 0) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Promo Discount (${state.session?.promoCode?.uppercase() ?: "CODE"})",
                        style = MaterialTheme.typography.bodySmall,
                        color = PulsrAcid,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "-${formatCurrency(promoDiscount)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = PulsrAcid,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
            HorizontalDivider(color = SurfaceBorder)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Total Payable",
                    style = MaterialTheme.typography.titleMedium,
                    color = OnSurface,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = formatCurrency(total),
                    style = MaterialTheme.typography.titleLarge,
                    color = AccentGold,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

@Composable
private fun SummaryRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(text = label, style = MaterialTheme.typography.bodySmall, color = OnSurfaceMedium)
        Text(text = value, style = MaterialTheme.typography.bodySmall, color = OnSurface, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun CheckoutBottomBar(
    state: CheckoutState,
    onProceed: () -> Unit
) {
    val totalTickets = state.quantities.values.sum()

    Surface(
        color = Surface2Dark,
        tonalElevation = 12.dp,
        modifier = Modifier
            .fillMaxWidth()
            .border(width = 1.dp, color = SurfaceBorder, shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
    ) {
        Row(
            modifier = Modifier
                .navigationBarsPadding()
                .padding(horizontal = 20.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Icon(
                    imageVector = Icons.Outlined.Lock,
                    contentDescription = null,
                    tint = PulsrAcid,
                    modifier = Modifier.size(16.dp)
                )
                Text(
                    text = "256-bit Encrypted",
                    style = MaterialTheme.typography.labelSmall,
                    color = OnSurfaceMedium
                )
            }
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(14.dp))
                    .then(
                        if (totalTickets > 0 && !state.isSubmitting) {
                            Modifier
                                .background(HotGradient)
                                .clickable(onClick = onProceed)
                        } else {
                            Modifier.background(Surface3Dark)
                        }
                    )
                    .padding(horizontal = 24.dp, vertical = 14.dp),
                contentAlignment = Alignment.Center
            ) {
                if (state.isSubmitting) {
                    CircularProgressIndicator(
                        color = OnPrimary,
                        strokeWidth = 2.dp,
                        modifier = Modifier.size(20.dp)
                    )
                } else {
                    Text(
                        text = if (totalTickets > 0) "Lock & Pay ($totalTickets Passes)" else "Select Tickets",
                        style = MaterialTheme.typography.labelLarge,
                        color = if (totalTickets > 0) OnPrimary else OnSurfaceLow,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.5.sp
                    )
                }
            }
        }
    }
}
