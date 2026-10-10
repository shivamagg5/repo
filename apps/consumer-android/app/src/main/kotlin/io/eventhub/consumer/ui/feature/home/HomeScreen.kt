package io.eventhub.consumer.ui.feature.home

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
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
import io.eventhub.consumer.ui.components.ErrorState
import io.eventhub.consumer.ui.components.HomeShimmerLoading
import io.eventhub.consumer.ui.navigation.HomeRoute
import io.eventhub.consumer.ui.theme.*

// ─── Circuit UI Factory registration ─────────────────────────────────────────

class HomeUiFactory : Ui.Factory {
    override fun create(screen: Screen, context: CircuitContext): Ui<*>? =
        if (screen is HomeRoute) ui<HomeState> { state, modifier -> HomeScreen(state, modifier) }
        else null
}

// ─── Composable UI (PULSR Best-in-Class Experience) ──────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(state: HomeState, modifier: Modifier = Modifier) {
    var selectedCategory by remember { mutableStateOf("All") }
    var selectedCity by remember { mutableStateOf("Mumbai") }
    var showCitySheet by remember { mutableStateOf(false) }

    Scaffold(
        modifier = modifier,
        containerColor = BackgroundDark,
        topBar = {
            PulsrTopBar(
                selectedCity = selectedCity,
                onCityClick = { showCitySheet = true },
                onSearchClick = { state.eventSink(HomeEvent.SearchClicked) },
                onNotificationsClick = { state.eventSink(HomeEvent.NotificationsClicked) },
            )
        }
    ) { paddingValues ->
        PullToRefreshBox(
            isRefreshing = state.isLoading && (state.featuredEvents.isNotEmpty() || state.trendingEvents.isNotEmpty()),
            onRefresh = { state.eventSink(HomeEvent.RetryClicked) },
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                state.isLoading && state.featuredEvents.isEmpty() && state.trendingEvents.isEmpty() -> HomeShimmerLoading()
                state.error != null && state.featuredEvents.isEmpty() && state.trendingEvents.isEmpty() -> ErrorState(
                    message = state.error,
                    onRetry = { state.eventSink(HomeEvent.RetryClicked) }
                )
                else -> PulsrHomeContent(
                    state = state,
                    selectedCategory = selectedCategory,
                    selectedCity = selectedCity,
                    onCategorySelect = { selectedCategory = it },
                    onEventClick = { state.eventSink(HomeEvent.EventClicked(it)) },
                    onFavoriteToggle = { id, fav -> state.eventSink(HomeEvent.FavoriteToggled(id, fav)) },
                    onSearchClick = { state.eventSink(HomeEvent.SearchClicked) },
                )
            }
        }
    }

    if (showCitySheet) {
        CitySelectionBottomSheet(
            currentCity = selectedCity,
            onCitySelected = {
                selectedCity = it
                showCitySheet = false
            },
            onDismiss = { showCitySheet = false }
        )
    }
}

// ─── Top Brand Bar ───────────────────────────────────────────────────────────

@Composable
private fun PulsrTopBar(
    selectedCity: String,
    onCityClick: () -> Unit,
    onSearchClick: () -> Unit,
    onNotificationsClick: () -> Unit,
) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulseLogo")
    val pulseAngle by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(12000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "spinStar"
    )

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(horizontal = 20.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Logo & Brand
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "✳",
                fontSize = 24.sp,
                color = PulsrAcid,
                modifier = Modifier.rotate(pulseAngle)
            )
            Text(
                text = "PULSR",
                fontSize = 22.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 2.sp,
                color = OnSurface
            )
        }

        // Actions: Location Pill + Bell
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // City Pill
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .background(SurfaceDark)
                    .border(1.dp, SurfaceBorder, RoundedCornerShape(20.dp))
                    .clickable(onClick = onCityClick)
                    .padding(horizontal = 10.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Icon(
                    imageVector = Icons.Outlined.LocationOn,
                    contentDescription = null,
                    tint = PulsrPink,
                    modifier = Modifier.size(14.dp)
                )
                Text(
                    text = selectedCity,
                    style = MaterialTheme.typography.labelMedium,
                    color = OnSurface,
                    fontWeight = FontWeight.SemiBold
                )
                Icon(
                    imageVector = Icons.Filled.KeyboardArrowDown,
                    contentDescription = null,
                    tint = OnSurfaceMedium,
                    modifier = Modifier.size(16.dp)
                )
            }

            // Notification Bell with Neon Dot
            Box(
                modifier = Modifier
                    .size(38.dp)
                    .clip(CircleShape)
                    .background(SurfaceDark)
                    .border(1.dp, SurfaceBorder, CircleShape)
                    .clickable(onClick = onNotificationsClick),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Outlined.Notifications,
                    contentDescription = "Notifications",
                    tint = OnSurface,
                    modifier = Modifier.size(18.dp)
                )
                // Notification Dot
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .align(Alignment.TopEnd)
                        .offset(x = (-6).dp, y = 6.dp)
                        .clip(CircleShape)
                        .background(PulsrPink)
                )
            }
        }
    }
}

// ─── Main Feed Content ────────────────────────────────────────────────────────

@Composable
private fun PulsrHomeContent(
    state: HomeState,
    selectedCategory: String,
    selectedCity: String,
    onCategorySelect: (String) -> Unit,
    onEventClick: (String) -> Unit,
    onFavoriteToggle: (String, Boolean) -> Unit,
    onSearchClick: () -> Unit,
) {
    val categories = listOf("All", "Festivals", "Garba", "Raves", "Comedy", "College", "Wellness")

    // Filter events by selected category and prioritize selected city
    val filteredTrending = remember(state.trendingEvents, selectedCategory, selectedCity) {
        val byCat = if (selectedCategory == "All") state.trendingEvents
        else state.trendingEvents.filter { it.categories.any { c -> c.contains(selectedCategory, ignoreCase = true) } }

        val (inCity, otherCities) = byCat.partition { it.venue?.city.equals(selectedCity, ignoreCase = true) }
        inCity + otherCities
    }

    LazyColumn(
        contentPadding = PaddingValues(bottom = 120.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        // Search Strip
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(SurfaceDark)
                    .border(1.dp, SurfaceBorder, RoundedCornerShape(16.dp))
                    .clickable(onClick = onSearchClick)
                    .padding(horizontal = 16.dp, vertical = 14.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Search,
                        contentDescription = "Search",
                        tint = PulsrPink,
                        modifier = Modifier.size(20.dp)
                    )
                    Text(
                        text = "Search festivals, raves, concerts...",
                        style = MaterialTheme.typography.bodyMedium,
                        color = OnSurfaceLow
                    )
                }
            }
        }

        // Live Marquee Ticker Strip
        item {
            MarqueeTickerStrip()
        }

        // Hero Spotlight Banner
        item {
            val heroEvent = state.featuredEvents.firstOrNull()
            SpotlightHeroCard(
                event = heroEvent,
                onClick = { heroEvent?.let { onEventClick(it.id) } }
            )
        }

        // Category Filter Chips
        item {
            CategoryChipsRow(
                categories = categories,
                selectedCategory = selectedCategory,
                onCategorySelect = onCategorySelect
            )
        }

        // Trending Events Carousel
        if (state.featuredEvents.isNotEmpty() || filteredTrending.isNotEmpty()) {
            item {
                SectionHeader(
                    title = "Trending Right Now",
                    badgeText = "SELLING FAST 🔥",
                    showSeeAll = true,
                    onSeeAllClick = onSearchClick
                )
                Spacer(Modifier.height(14.dp))
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 20.dp),
                    horizontalArrangement = Arrangement.spacedBy(18.dp)
                ) {
                    val displayList = if (filteredTrending.isNotEmpty()) filteredTrending else state.featuredEvents
                    items(displayList, key = { it.id }) { event ->
                        TrendingEventCard(
                            event = event,
                            onClick = { onEventClick(event.id) },
                            onFavoriteToggle = { onFavoriteToggle(event.id, !event.isFavorited) }
                        )
                    }
                }
            }
        }

        // Near You This Weekend (Perforated Concert Pass Style)
        item {
            SectionHeader(
                title = "Near You This Weekend",
                badgeText = "POPULAR",
                showSeeAll = false
            )
            Spacer(Modifier.height(14.dp))
        }

        val weekendList = if (filteredTrending.isNotEmpty()) filteredTrending else state.trendingEvents
        items(
            items = weekendList.take(6),
            key = { "weekend_${it.id}" }
        ) { event ->
            TicketPassListItem(
                event = event,
                onClick = { onEventClick(event.id) },
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 6.dp)
            )
        }

        // Social Proof & Perks
        item {
            Spacer(Modifier.height(12.dp))
            AppPerksSection()
        }
    }
}

// ─── Marquee Ticker Strip ─────────────────────────────────────────────────────

@Composable
private fun MarqueeTickerStrip() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface2Dark)
            .border(width = 0.5.dp, color = SurfaceBorder)
            .padding(vertical = 10.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically
        ) {
            TickerBadge(icon = "⚡", text = "15L+ PARTYGOERS")
            Text("✦", color = PulsrFlame, fontSize = 10.sp)
            TickerBadge(icon = "📍", text = "100+ CITIES")
            Text("✦", color = PulsrAcid, fontSize = 10.sp)
            TickerBadge(icon = "🎟️", text = "ZERO HIDDEN FEES")
        }
    }
}

@Composable
private fun TickerBadge(icon: String, text: String) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Text(text = icon, fontSize = 12.sp)
        Text(
            text = text,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = OnSurface,
            letterSpacing = 0.8.sp
        )
    }
}

// ─── Hero Spotlight Card ──────────────────────────────────────────────────────

@Composable
private fun SpotlightHeroCard(
    event: Event?,
    onClick: () -> Unit
) {
    val infiniteTransition = rememberInfiniteTransition(label = "heroPing")
    val pingScale by infiniteTransition.animateFloat(
        initialValue = 0.8f,
        targetValue = 1.3f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pingDot"
    )

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
            .height(290.dp)
            .clip(RoundedCornerShape(24.dp))
            .clickable(onClick = onClick)
            .border(1.dp, GlowBorderPink, RoundedCornerShape(24.dp)),
        colors = CardDefaults.cardColors(containerColor = SurfaceDark),
        shape = RoundedCornerShape(24.dp)
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            // Background Artwork
            AsyncImage(
                model = event?.bannerImageUrl ?: event?.coverImageUrl ?: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop",
                contentDescription = event?.name ?: "Featured Festival",
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )

            // Scrim Gradient
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(HeroCardOverlay)
            )

            // Card Content
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(20.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                // Top Badge: Festival Tag
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(PulsrAcid.copy(alpha = 0.16f))
                        .border(1.dp, PulsrAcid.copy(alpha = 0.5f), RoundedCornerShape(20.dp))
                        .padding(horizontal = 10.dp, vertical = 5.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(7.dp)
                            .scale(pingScale)
                            .clip(CircleShape)
                            .background(PulsrAcid)
                    )
                    Text(
                        text = "INDOMETAL FESTIVAL · 2026",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = PulsrAcid,
                        letterSpacing = 1.sp
                    )
                }

                // Bottom Content: Title + CTA
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = event?.name ?: "BRING ME THE HORIZON",
                        fontSize = 26.sp,
                        fontWeight = FontWeight.Black,
                        color = OnSurface,
                        letterSpacing = (-0.5).sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "${event?.venue?.city ?: "Mumbai"} · ${event?.venue?.name ?: "Arena 1"}",
                                style = MaterialTheme.typography.bodySmall,
                                color = OnSurfaceMedium
                            )
                            Text(
                                text = "From " + formatCurrency(event?.minPrice ?: 149900),
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = PulsrAcid
                            )
                        }

                        // Hot Gradient Action Button
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(14.dp))
                                .background(HotGradient)
                                .clickable(onClick = onClick)
                                .padding(horizontal = 18.dp, vertical = 10.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "Get Tickets",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = OnPrimary,
                                letterSpacing = 0.5.sp
                            )
                        }
                    }
                }
            }
        }
    }
}

// ─── Category Chips ──────────────────────────────────────────────────────────

@Composable
private fun CategoryChipsRow(
    categories: List<String>,
    selectedCategory: String,
    onCategorySelect: (String) -> Unit
) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 20.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        items(categories) { cat ->
            val isSelected = cat == selectedCategory
            val emoji = when (cat) {
                "All" -> "⚡"
                "Festivals" -> "🎪"
                "Garba" -> "🪔"
                "Raves" -> "⚡"
                "Comedy" -> "🎤"
                "College" -> "🎓"
                "Wellness" -> "🧘"
                else -> "🎟️"
            }

            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .then(
                        if (isSelected) {
                            Modifier
                                .background(HotGradient)
                                .border(1.dp, PulsrPink, RoundedCornerShape(20.dp))
                        } else {
                            Modifier
                                .background(SurfaceDark)
                                .border(1.dp, SurfaceBorder, RoundedCornerShape(20.dp))
                        }
                    )
                    .clickable { onCategorySelect(cat) }
                    .padding(horizontal = 14.dp, vertical = 8.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(text = emoji, fontSize = 12.sp)
                    Text(
                        text = cat,
                        fontSize = 13.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                        color = if (isSelected) OnPrimary else OnSurfaceMedium
                    )
                }
            }
        }
    }
}

// ─── Trending Event Card ──────────────────────────────────────────────────────

@Composable
private fun TrendingEventCard(
    event: Event,
    onClick: () -> Unit,
    onFavoriteToggle: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .width(280.dp)
            .clip(RoundedCornerShape(20.dp))
            .clickable(onClick = onClick)
            .border(1.dp, SurfaceBorder, RoundedCornerShape(20.dp)),
        colors = CardDefaults.cardColors(containerColor = SurfaceDark),
        shape = RoundedCornerShape(20.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column {
            // Image with Floating Badges
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp)
            ) {
                AsyncImage(
                    model = event.coverImageUrl,
                    contentDescription = event.name,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )

                // Top Gradient Scrim
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                listOf(Color(0x990A0910), Color.Transparent, Color(0xCC0A0910))
                            )
                        )
                )

                // Live Selling Badge (Top Left)
                Row(
                    modifier = Modifier
                        .padding(12.dp)
                        .align(Alignment.TopStart)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xCC0A0910))
                        .border(1.dp, PulsrFlame.copy(alpha = 0.5f), RoundedCornerShape(12.dp))
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(text = "🔥", fontSize = 10.sp)
                    Text(
                        text = "Selling Fast",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = PulsrFlame
                    )
                }

                // Favorite Toggle (Top Right)
                Box(
                    modifier = Modifier
                        .padding(12.dp)
                        .align(Alignment.TopEnd)
                        .size(34.dp)
                        .clip(CircleShape)
                        .background(Color(0x990A0910))
                        .clickable(onClick = onFavoriteToggle),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = if (event.isFavorited) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                        contentDescription = "Favorite",
                        tint = if (event.isFavorited) PulsrPink else OnSurface,
                        modifier = Modifier.size(18.dp)
                    )
                }

                // Date Chip (Bottom Left)
                Row(
                    modifier = Modifier
                        .padding(12.dp)
                        .align(Alignment.BottomStart)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Surface2Dark.copy(alpha = 0.9f))
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = event.startAt.take(10),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = OnSurface
                    )
                }
            }

            // Info Column
            Column(modifier = Modifier.padding(14.dp)) {
                Text(
                    text = event.name,
                    style = MaterialTheme.typography.titleMedium,
                    color = OnSurface,
                    fontWeight = FontWeight.Bold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                Spacer(Modifier.height(4.dp))

                event.venue?.let {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.LocationOn,
                            contentDescription = null,
                            tint = OnSurfaceLow,
                            modifier = Modifier.size(13.dp)
                        )
                        Text(
                            text = "${it.name}, ${it.city ?: ""}",
                            style = MaterialTheme.typography.bodySmall,
                            color = OnSurfaceMedium,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                Spacer(Modifier.height(10.dp))

                // Price Row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Starts from",
                            style = MaterialTheme.typography.labelSmall,
                            color = OnSurfaceLow
                        )
                        Text(
                            text = formatCurrency(event.minPrice),
                            style = MaterialTheme.typography.titleMedium,
                            color = AccentGold,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    // Book Pill
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(PulsrPink.copy(alpha = 0.15f))
                            .border(1.dp, PulsrPink.copy(alpha = 0.4f), RoundedCornerShape(10.dp))
                            .padding(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Text(
                            text = "Book Now",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = PulsrPink
                        )
                    }
                }
            }
        }
    }
}

// ─── Concert Pass Ticket Style List Item ──────────────────────────────────────

@Composable
private fun TicketPassListItem(
    event: Event,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .clickable(onClick = onClick)
            .border(1.dp, SurfaceBorder, RoundedCornerShape(16.dp)),
        colors = CardDefaults.cardColors(containerColor = SurfaceDark),
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Thumbnail
            AsyncImage(
                model = event.coverImageUrl,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .size(76.dp)
                    .clip(RoundedCornerShape(12.dp))
            )

            Spacer(Modifier.width(14.dp))

            // Center details
            Column(modifier = Modifier.weight(1f)) {
                // Category Pill
                Text(
                    text = event.categories.firstOrNull()?.uppercase() ?: "LIVE EVENT",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = PulsrFlame,
                    letterSpacing = 0.5.sp
                )

                Spacer(Modifier.height(2.dp))

                Text(
                    text = event.name,
                    style = MaterialTheme.typography.titleMedium,
                    color = OnSurface,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                Spacer(Modifier.height(2.dp))

                event.venue?.let {
                    Text(
                        text = "${it.city ?: "Venue"} · ${event.startAt.take(10)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = OnSurfaceMedium
                    )
                }

                Spacer(Modifier.height(4.dp))

                Text(
                    text = formatCurrency(event.minPrice),
                    style = MaterialTheme.typography.labelLarge,
                    color = AccentGold,
                    fontWeight = FontWeight.Bold
                )
            }

            // Right Arrow Action
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(Surface2Dark)
                    .border(1.dp, SurfaceBorder, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Outlined.ArrowForward,
                    contentDescription = "Open",
                    tint = PulsrPink,
                    modifier = Modifier.size(16.dp)
                )
            }
        }
    }
}

// ─── App Perks & Social Proof ────────────────────────────────────────────────

@Composable
private fun AppPerksSection() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Text(
            text = "Why PULSR",
            style = MaterialTheme.typography.headlineSmall,
            color = OnSurface,
            fontWeight = FontWeight.Bold
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            PerkCard(
                icon = "⚡",
                title = "Instant Passes",
                subtitle = "Digital offline QR entry",
                modifier = Modifier.weight(1f)
            )
            PerkCard(
                icon = "🔒",
                title = "Anti-Scalp",
                subtitle = "ECDSA hardware verified",
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
private fun PerkCard(
    icon: String,
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .background(SurfaceDark)
            .border(1.dp, SurfaceBorder, RoundedCornerShape(16.dp))
            .padding(14.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(text = icon, fontSize = 20.sp)
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                color = OnSurface,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = OnSurfaceLow
            )
        }
    }
}

// ─── Section Header ──────────────────────────────────────────────────────────

@Composable
private fun SectionHeader(
    title: String,
    badgeText: String? = null,
    showSeeAll: Boolean = false,
    onSeeAllClick: (() -> Unit)? = null,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.headlineSmall,
                color = OnSurface,
                fontWeight = FontWeight.Bold
            )
            badgeText?.let {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(PulsrFlame.copy(alpha = 0.16f))
                        .border(1.dp, PulsrFlame.copy(alpha = 0.4f), RoundedCornerShape(8.dp))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = it,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        color = PulsrFlame,
                        letterSpacing = 0.5.sp
                    )
                }
            }
        }

        if (showSeeAll && onSeeAllClick != null) {
            TextButton(onClick = onSeeAllClick) {
                Text(
                    text = "See all",
                    style = MaterialTheme.typography.labelLarge,
                    color = PulsrPink,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

// ─── City Selector Modal ──────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CitySelectionBottomSheet(
    currentCity: String,
    onCitySelected: (String) -> Unit,
    onDismiss: () -> Unit
) {
    val cities = listOf("Mumbai", "Delhi NCR", "Bengaluru", "Goa", "Pune", "Hyderabad", "Kolkata")

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = SurfaceDark,
        scrimColor = Color.Black.copy(alpha = 0.7f),
        dragHandle = { BottomSheetDefaults.DragHandle(color = SurfaceBorder) }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "Choose your city",
                style = MaterialTheme.typography.titleLarge,
                color = OnSurface,
                fontWeight = FontWeight.Bold
            )

            cities.forEach { city ->
                val isSelected = city == currentCity
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(if (isSelected) Surface2Dark else Color.Transparent)
                        .clickable { onCitySelected(city) }
                        .padding(horizontal = 14.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = city,
                        style = MaterialTheme.typography.bodyLarge,
                        color = if (isSelected) PulsrPink else OnSurface,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                    )
                    if (isSelected) {
                        Icon(
                            imageVector = Icons.Outlined.CheckCircle,
                            contentDescription = "Selected",
                            tint = PulsrPink,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }
        }
    }
}
