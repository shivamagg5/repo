package io.eventhub.scanner.ui.feature.manual

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.slack.circuit.runtime.CircuitContext
import com.slack.circuit.runtime.screen.Screen
import com.slack.circuit.runtime.ui.Ui
import com.slack.circuit.runtime.ui.ui
import io.eventhub.scanner.data.remote.dto.AttendeeDto
import io.eventhub.scanner.domain.engine.ScanResult
import io.eventhub.scanner.ui.navigation.ManualEntryRoute
import io.eventhub.scanner.ui.theme.*

class ManualEntryUiFactory : Ui.Factory {
    override fun create(screen: Screen, context: CircuitContext): Ui<*>? =
        if (screen is ManualEntryRoute) ui<ManualEntryState> { state, modifier ->
            ManualEntryScreen(state, modifier)
        } else null
}

@Composable
fun ManualEntryScreen(state: ManualEntryState, modifier: Modifier = Modifier) {
    Scaffold(
        modifier = modifier,
        containerColor = ScannerBackground,
        topBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(ScannerSurface)
                    .statusBarsPadding()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = { state.eventSink(ManualEntryEvent.BackClicked) }) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Outlined.ArrowBack,
                            contentDescription = "Back",
                            tint = ScannerOnSurface
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Door & Attendee Lookup",
                        style = MaterialTheme.typography.titleLarge,
                        color = ScannerOnSurface,
                        fontWeight = FontWeight.Bold
                    )
                }

                TabRow(
                    selectedTabIndex = state.selectedTab,
                    containerColor = ScannerSurface,
                    contentColor = ScannerPrimary,
                    divider = { HorizontalDivider(color = ScannerSurface2) }
                ) {
                    Tab(
                        selected = state.selectedTab == 0,
                        onClick = { state.eventSink(ManualEntryEvent.TabSelected(0)) },
                        text = {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Icon(Icons.Outlined.Search, contentDescription = null, modifier = Modifier.size(16.dp))
                                Text("Attendee Search", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            }
                        }
                    )
                    Tab(
                        selected = state.selectedTab == 1,
                        onClick = { state.eventSink(ManualEntryEvent.TabSelected(1)) },
                        text = {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Icon(Icons.Outlined.ConfirmationNumber, contentDescription = null, modifier = Modifier.size(16.dp))
                                Text("Direct Pass Code", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            }
                        }
                    )
                }
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (state.selectedTab == 0) {
                AttendeeLookupTab(state = state)
            } else {
                DirectCodeEntryTab(state = state)
            }

            // Result Sheet Overlay
            AnimatedVisibility(
                visible = state.result != null,
                enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
                exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
                modifier = Modifier.align(Alignment.BottomCenter)
            ) {
                state.result?.let { res ->
                    ManualResultBanner(
                        result = res,
                        onDismiss = { state.eventSink(ManualEntryEvent.DismissResult) }
                    )
                }
            }
        }
    }
}

@Composable
private fun AttendeeLookupTab(state: ManualEntryState) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Search Input Field
        OutlinedTextField(
            value = state.searchQuery,
            onValueChange = { state.eventSink(ManualEntryEvent.QueryChanged(it)) },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Search Attendee") },
            placeholder = { Text("Name, email, phone, or order ID...", color = ScannerOnSurfaceMed.copy(alpha = 0.6f)) },
            leadingIcon = {
                Icon(Icons.Outlined.Search, contentDescription = null, tint = ScannerPrimary)
            },
            trailingIcon = {
                if (state.isSearching) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = ScannerPrimary)
                } else if (state.searchQuery.isNotEmpty()) {
                    IconButton(onClick = { state.eventSink(ManualEntryEvent.QueryChanged("")) }) {
                        Icon(Icons.Outlined.Clear, contentDescription = "Clear", tint = ScannerOnSurfaceMed)
                    }
                }
            },
            singleLine = true,
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = ScannerPrimary,
                unfocusedBorderColor = ScannerSurface2,
                focusedTextColor = ScannerOnSurface,
                unfocusedTextColor = ScannerOnSurface,
                focusedContainerColor = ScannerSurface,
                unfocusedContainerColor = ScannerSurface
            )
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Search Results List
        if (state.searchResults.isEmpty() && state.searchQuery.length >= 2 && !state.isSearching) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Outlined.PersonOff, contentDescription = null, tint = ScannerOnSurfaceMed, modifier = Modifier.size(48.dp))
                    Text("No matching attendees found", color = ScannerOnSurface, fontWeight = FontWeight.Bold)
                    Text("Try searching by partial name or 8-digit ticket code", fontSize = 12.sp, color = ScannerOnSurfaceMed)
                }
            }
        } else if (state.searchResults.isEmpty() && state.searchQuery.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.padding(horizontal = 32.dp)
                ) {
                    Icon(Icons.Outlined.Badge, contentDescription = null, tint = ScannerPrimary, modifier = Modifier.size(52.dp))
                    Text("Turnstile Attendee Lookup", style = MaterialTheme.typography.titleMedium, color = ScannerOnSurface, fontWeight = FontWeight.Bold)
                    Text(
                        "Search attendees by name, phone, email, or seat number to admit guests when barcodes are unreadable.",
                        style = MaterialTheme.typography.bodySmall,
                        color = ScannerOnSurfaceMed,
                        textAlign = TextAlign.Center
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(state.searchResults, key = { it.ticketId }) { attendee ->
                    AttendeeResultCard(
                        attendee = attendee,
                        isAdmitting = state.admittingTicketId == attendee.ticketId,
                        onAdmit = { state.eventSink(ManualEntryEvent.AdmitAttendee(attendee.ticketId)) }
                    )
                }
            }
        }
    }
}

@Composable
private fun AttendeeResultCard(
    attendee: AttendeeDto,
    isAdmitting: Boolean,
    onAdmit: () -> Unit
) {
    val isCheckedIn = attendee.status == "checked_in"
    val isCancelled = attendee.status == "cancelled" || attendee.status == "refunded"

    Surface(
        shape = RoundedCornerShape(14.dp),
        color = ScannerSurface,
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (isCheckedIn) ScanDuplicateAmber.copy(alpha = 0.3f) else ScannerSurface2
        ),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = attendee.purchaserName ?: "Guest",
                    style = MaterialTheme.typography.titleMedium,
                    color = ScannerOnSurface,
                    fontWeight = FontWeight.Bold
                )
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = ScannerPrimary.copy(alpha = 0.15f)
                    ) {
                        Text(
                            text = attendee.ticketTypeName ?: "GENERAL",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = ScannerPrimary,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }

                    Text(
                        text = "#${attendee.ticketNumber ?: attendee.ticketId.takeLast(8).uppercase()}",
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        color = ScannerOnSurfaceMed
                    )
                }

                if (isCheckedIn) {
                    Text(
                        text = "● Already Admitted",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = ScanDuplicateAmber
                    )
                }
            }

            // Action Button
            if (isCancelled) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = ScanInvalidRed.copy(alpha = 0.15f)
                ) {
                    Text(
                        text = "VOID / CANCELLED",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = ScanInvalidRed,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp)
                    )
                }
            } else if (isCheckedIn) {
                OutlinedButton(
                    onClick = onAdmit,
                    enabled = !isAdmitting,
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = ScanDuplicateAmber)
                ) {
                    if (isAdmitting) {
                        CircularProgressIndicator(modifier = Modifier.size(14.dp), strokeWidth = 2.dp, color = ScanDuplicateAmber)
                    } else {
                        Text("Re-Admit", fontSize = 11.sp)
                    }
                }
            } else {
                Button(
                    onClick = onAdmit,
                    enabled = !isAdmitting,
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = ScanValidGreen)
                ) {
                    if (isAdmitting) {
                        CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp, color = Color.Black)
                    } else {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Icon(Icons.Outlined.Check, contentDescription = null, tint = Color.Black, modifier = Modifier.size(16.dp))
                            Text("Admit", color = Color.Black, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DirectCodeEntryTab(state: ManualEntryState) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = ScannerSurface,
            border = androidx.compose.foundation.BorderStroke(1.dp, ScannerSurface2),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier.padding(14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Icon(Icons.Outlined.ConfirmationNumber, contentDescription = null, tint = ScannerPrimary)
                Column {
                    Text(
                        text = "DIRECT CREDENTIAL ENTRY",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 0.8.sp,
                        color = ScannerPrimary
                    )
                    Text(
                        text = "Enter 8-digit Ticket Code (e.g. TKT-9A4B) or pass UUID.",
                        fontSize = 12.sp,
                        color = ScannerOnSurfaceMed
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        OutlinedTextField(
            value = state.ticketCode,
            onValueChange = { state.eventSink(ManualEntryEvent.CodeChanged(it)) },
            label = { Text("Ticket Code / Order Pass ID") },
            placeholder = { Text("e.g. TKT-8F92 or UUID", color = ScannerOnSurfaceMed.copy(alpha = 0.6f)) },
            leadingIcon = {
                Icon(Icons.Outlined.ConfirmationNumber, contentDescription = null, tint = ScannerPrimary)
            },
            trailingIcon = {
                if (state.ticketCode.isNotEmpty()) {
                    IconButton(onClick = { state.eventSink(ManualEntryEvent.CodeChanged("")) }) {
                        Icon(Icons.Outlined.Clear, contentDescription = "Clear", tint = ScannerOnSurfaceMed)
                    }
                }
            },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            keyboardOptions = KeyboardOptions(
                capitalization = KeyboardCapitalization.Characters,
                imeAction = ImeAction.Done
            ),
            keyboardActions = KeyboardActions(
                onDone = { state.eventSink(ManualEntryEvent.SubmitCode) }
            ),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = ScannerPrimary,
                unfocusedBorderColor = ScannerSurface2,
                focusedTextColor = ScannerOnSurface,
                unfocusedTextColor = ScannerOnSurface,
                focusedContainerColor = ScannerSurface,
                unfocusedContainerColor = ScannerSurface
            )
        )

        Spacer(modifier = Modifier.height(20.dp))

        Button(
            onClick = { state.eventSink(ManualEntryEvent.SubmitCode) },
            enabled = state.ticketCode.isNotBlank() && !state.isSubmitting,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = ScannerPrimary,
                disabledContainerColor = ScannerSurface2
            )
        ) {
            if (state.isSubmitting) {
                CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.Black, strokeWidth = 2.dp)
            } else {
                Text(
                    text = "Verify & Check-In",
                    color = if (state.ticketCode.isNotBlank()) Color.Black else ScannerOnSurfaceMed,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp
                )
            }
        }
    }
}

private data class ManualBannerData(
    val color: Color,
    val icon: androidx.compose.ui.graphics.vector.ImageVector,
    val title: String,
    val subtitle: String
)

@Composable
private fun ManualResultBanner(
    result: ScanResult,
    onDismiss: () -> Unit
) {
    val banner = when (result) {
        is ScanResult.Success -> ManualBannerData(
            color = ScanValidGreen,
            icon = Icons.Outlined.CheckCircle,
            title = "ADMIT: ${result.accessTier}",
            subtitle = "${result.holderName ?: "Guest"} • ${result.seat ?: "General Entry"}"
        )
        is ScanResult.AlreadyCheckedIn -> ManualBannerData(
            color = ScanDuplicateAmber,
            icon = Icons.Outlined.Warning,
            title = "ALREADY CHECKED IN",
            subtitle = "Credential has previously entered turnstile"
        )
        is ScanResult.Invalid -> ManualBannerData(
            color = ScanInvalidRed,
            icon = Icons.Outlined.ErrorOutline,
            title = "CHECK-IN REJECTED",
            subtitle = result.reason
        )
        is ScanResult.DatasetExpired -> ManualBannerData(
            color = ScanInvalidRed,
            icon = Icons.Outlined.TimerOff,
            title = "DATASET EXPIRED",
            subtitle = "Please sync terminal data with server"
        )
    }

    Surface(
        color = banner.color,
        shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onDismiss)
    ) {
        Column(
            modifier = Modifier
                .navigationBarsPadding()
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(imageVector = banner.icon, contentDescription = null, tint = Color.Black, modifier = Modifier.size(48.dp))
            Spacer(modifier = Modifier.height(6.dp))
            Text(text = banner.title, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = Color.Black)
            Spacer(modifier = Modifier.height(2.dp))
            Text(text = banner.subtitle, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Color.Black.copy(alpha = 0.85f))
            Spacer(modifier = Modifier.height(10.dp))
            Text(text = "Tap to dismiss", fontSize = 11.sp, color = Color.Black.copy(alpha = 0.6f))
        }
    }
}

