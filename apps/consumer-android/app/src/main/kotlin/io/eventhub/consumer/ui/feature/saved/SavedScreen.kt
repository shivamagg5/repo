package io.eventhub.consumer.ui.feature.saved

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
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.CalendarToday
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.slack.circuit.runtime.CircuitContext
import com.slack.circuit.runtime.screen.Screen
import com.slack.circuit.runtime.ui.Ui
import com.slack.circuit.runtime.ui.ui
import io.eventhub.consumer.domain.model.Event
import io.eventhub.consumer.ui.components.EmptyState
import io.eventhub.consumer.ui.components.ErrorState
import io.eventhub.consumer.ui.components.LoadingState
import io.eventhub.consumer.ui.navigation.SavedRoute
import io.eventhub.consumer.ui.theme.*

class SavedUiFactory : Ui.Factory {
    override fun create(screen: Screen, context: CircuitContext): Ui<*>? =
        if (screen is SavedRoute) ui<SavedState> { state, modifier ->
            SavedScreen(state, modifier)
        } else null
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SavedScreen(state: SavedState, modifier: Modifier = Modifier) {
    Scaffold(
        modifier = modifier,
        containerColor = BackgroundDark,
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "Saved Events",
                            style = MaterialTheme.typography.titleLarge,
                            color = OnSurface,
                            fontWeight = FontWeight.Bold
                        )
                        if (state.events.isNotEmpty()) {
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = PulsrPink.copy(alpha = 0.15f)
                            ) {
                                Text(
                                    text = "${state.events.size}",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Black,
                                    color = PulsrPink,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = { state.eventSink(SavedEvent.BackClicked) }) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Outlined.ArrowBack,
                            contentDescription = "Back",
                            tint = OnSurface
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = BackgroundDark)
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                state.isLoading -> {
                    LoadingState(message = "Loading your radar bookmarks...")
                }
                state.error != null -> {
                    ErrorState(
                        message = state.error,
                        onRetry = { state.eventSink(SavedEvent.RetryClicked) }
                    )
                }
                state.events.isEmpty() -> {
                    EmptyState(
                        title = "No Saved Events Yet",
                        description = "Tap the heart icon on any event to bookmark it and track ticket drops, line-up releases, and updates.",
                        icon = Icons.Outlined.BookmarkBorder,
                        actionText = "Discover Events",
                        onActionClick = { state.eventSink(SavedEvent.ExploreClicked) }
                    )
                }
                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(start = 20.dp, top = 12.dp, end = 20.dp, bottom = 128.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        item {
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = SurfaceDark,
                                border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceBorder)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 14.dp, vertical = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(8.dp)
                                                .background(PulsrAcid, CircleShape)
                                        )
                                        Text(
                                            text = "LIVE RADAR ACTIVE",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            letterSpacing = 1.sp,
                                            color = PulsrAcid
                                        )
                                    }
                                    Text(
                                        text = "TRACKING PRICE & DROPS",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = OnSurfaceLow
                                    )
                                }
                            }
                        }

                        items(state.events, key = { it.id }) { event ->
                            SavedEventCard(
                                event = event,
                                onClick = { state.eventSink(SavedEvent.EventClicked(event.id)) },
                                onRemove = { state.eventSink(SavedEvent.RemoveFavoriteClicked(event.id)) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SavedEventCard(
    event: Event,
    onClick: () -> Unit,
    onRemove: () -> Unit
) {
    val context = LocalContext.current

    Card(
        colors = CardDefaults.cardColors(containerColor = SurfaceDark),
        shape = RoundedCornerShape(18.dp),
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, SurfaceBorder, RoundedCornerShape(18.dp))
            .clickable(onClick = onClick)
    ) {
        Column {
            // Top Cover Banner Image with Badges
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(130.dp)
            ) {
                AsyncImage(
                    model = event.coverImageUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
                // Gradient overlay
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(HeroCardOverlay)
                )

                // Category Tag
                if (event.categories.isNotEmpty()) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = BackgroundDark.copy(alpha = 0.85f),
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .padding(10.dp)
                    ) {
                        Text(
                            text = event.categories.first().uppercase(),
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 0.8.sp,
                            color = PulsrAcid,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }

                // Heart Icon Button (Remove)
                Surface(
                    shape = CircleShape,
                    color = BackgroundDark.copy(alpha = 0.85f),
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(10.dp)
                        .size(36.dp)
                ) {
                    IconButton(onClick = onRemove, modifier = Modifier.size(36.dp)) {
                        Icon(
                            imageVector = Icons.Filled.Favorite,
                            contentDescription = "Remove from saved",
                            tint = PulsrPink,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }

                // Bottom strip on image: Date and City
                Row(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.CalendarToday,
                            contentDescription = null,
                            tint = OnSurface,
                            modifier = Modifier.size(12.dp)
                        )
                        Text(
                            text = event.startAt.take(10),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = OnSurface
                        )
                    }
                    Text(
                        text = "•",
                        fontSize = 10.sp,
                        color = OnSurfaceMedium
                    )
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(3.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.LocationOn,
                            contentDescription = null,
                            tint = PulsrFlame,
                            modifier = Modifier.size(12.dp)
                        )
                        Text(
                            text = event.venue?.city ?: "India",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = OnSurface
                        )
                    }
                }
            }

            // Bottom Content Section
            Column(modifier = Modifier.padding(14.dp)) {
                Text(
                    text = event.name,
                    style = MaterialTheme.typography.titleMedium,
                    color = OnSurface,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = event.venue?.name ?: "Venue details to be announced",
                    style = MaterialTheme.typography.bodySmall,
                    color = OnSurfaceMedium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Price and Book Action Row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "STARTING FROM",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.5.sp,
                            color = OnSurfaceLow
                        )
                        Text(
                            text = formatCurrency(event.minPrice),
                            style = MaterialTheme.typography.titleMedium,
                            color = if (event.isFree) PulsrAcid else AccentGold,
                            fontWeight = FontWeight.Black
                        )
                    }

                    // Book Pass Gradient Pill CTA
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .clickable(onClick = onClick)
                    ) {
                        Box(
                            modifier = Modifier
                                .background(HotGradient)
                                .padding(horizontal = 14.dp, vertical = 8.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Text(
                                    text = "Book Pass",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = OnPrimary
                                )
                                Icon(
                                    imageVector = Icons.AutoMirrored.Outlined.ArrowForward,
                                    contentDescription = null,
                                    tint = OnPrimary,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
