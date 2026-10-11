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
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.GraphicEq
import androidx.compose.material.icons.outlined.LocalFireDepartment
import androidx.compose.material.icons.outlined.LocationCity
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.People
import androidx.compose.material.icons.outlined.QrCodeScanner
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Shield
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
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
import io.eventhub.consumer.data.local.UserPreferencesStore
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
    val context = LocalContext.current
    var selectedCategory by remember { mutableStateOf("All") }
    var selectedCity by remember { mutableStateOf(UserPreferencesStore.getSavedCity(context)) }
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
            onCitySelected = { newCity ->
                UserPreferencesStore.saveCity(context, newCity)
                selectedCity = newCity
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
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(HotGradient),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Outlined.GraphicEq,
                    contentDescription = null,
                    tint = OnPrimary,
                    modifier = Modifier.size(16.dp)
                )
            }
            Text(
                text = "PULSR",
                fontSize = 20.sp,
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
                    badgeText = "POPULAR",
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
                badgeText = "FEATURED",
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
            .padding(vertical = 10.dp, horizontal = 16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically
        ) {
            TickerBadge(icon = Icons.Outlined.People, text = "15L+ ATTENDEES")
            Text("•", color = OnSurfaceLow, fontSize = 10.sp)
            TickerBadge(icon = Icons.Outlined.LocationCity, text = "100+ CITIES")
            Text("•", color = OnSurfaceLow, fontSize = 10.sp)
            TickerBadge(icon = Icons.Outlined.Shield, text = "100% VERIFIED")
        }
    }
}

@Composable
private fun TickerBadge(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    text: String
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = PulsrPink,
            modifier = Modifier.size(13.dp)
        )
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
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(categories) { cat ->
            val isSelected = cat == selectedCategory

            Box(
                modifier = Modifier
                    .height(36.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .then(
                        if (isSelected) {
                            Modifier
                                .background(HotGradient)
                                .border(1.dp, PulsrPink, RoundedCornerShape(18.dp))
                        } else {
                            Modifier
                                .background(SurfaceDark)
                                .border(1.dp, SurfaceBorder, RoundedCornerShape(18.dp))
                        }
                    )
                    .clickable { onCategorySelect(cat) }
                    .padding(horizontal = 16.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = cat,
                    fontSize = 13.sp,
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                    color = if (isSelected) OnPrimary else OnSurfaceMedium,
                    letterSpacing = 0.2.sp
                )
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
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0xCC0A0910))
                        .border(1.dp, PulsrFlame.copy(alpha = 0.5f), RoundedCornerShape(8.dp))
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(5.dp)
                ) {
                    Icon(
                        imageVector = Icons.Outlined.LocalFireDepartment,
                        contentDescription = null,
                        tint = PulsrFlame,
                        modifier = Modifier.size(12.dp)
                    )
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
                icon = Icons.Outlined.QrCodeScanner,
                iconTint = PulsrPink,
                title = "Instant Passes",
                subtitle = "Digital offline QR entry",
                modifier = Modifier.weight(1f)
            )
            PerkCard(
                icon = Icons.Outlined.Shield,
                iconTint = PulsrAcid,
                title = "Anti-Scalping",
                subtitle = "ECDSA hardware verified",
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
private fun PerkCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    iconTint: Color,
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .height(116.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(SurfaceDark)
            .border(1.dp, SurfaceBorder, RoundedCornerShape(16.dp))
            .padding(14.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = iconTint,
                modifier = Modifier.size(22.dp)
            )
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    color = OnSurface,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = OnSurfaceLow,
                    fontSize = 11.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
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
    val popularCities = remember {
        listOf(
            "Mumbai", "Delhi NCR", "Bengaluru", "Goa", "Pune",
            "Hyderabad", "Kolkata", "Chennai", "Ahmedabad", "Jaipur", "Chandigarh"
        )
    }

    val allIndianCities = remember {
        listOf(
            "Agra", "Ahmedabad", "Ajmer", "Aligarh", "Allahabad (Prayagraj)", "Amritsar", "Aurangabad",
            "Bengaluru", "Bareilly", "Bhopal", "Bhubaneswar", "Bikaner", "Chandigarh", "Chennai",
            "Coimbatore", "Cuttack", "Dehradun", "Delhi NCR", "Dhanbad", "Faridabad", "Ghaziabad",
            "Goa", "Gorakhpur", "Guntur", "Gurgaon (Gurugram)", "Guwahati", "Gwalior", "Hubli",
            "Hyderabad", "Indore", "Jabalpur", "Jaipur", "Jalandhar", "Jammu", "Jamshedpur",
            "Jodhpur", "Kanpur", "Kochi", "Kolhapur", "Kolkata", "Kota", "Kozhikode", "Lucknow",
            "Ludhiana", "Madurai", "Mangalore", "Meerut", "Moradabad", "Mumbai", "Mysore", "Nagpur",
            "Nashik", "Navi Mumbai", "Noida", "Patna", "Prayagraj", "Pune", "Raipur", "Rajkot",
            "Ranchi", "Salem", "Shimla", "Siliguri", "Srinagar", "Surat", "Thane",
            "Thiruvananthapuram", "Tiruchirappalli", "Udaipur", "Ujjain", "Vadodara", "Varanasi",
            "Vijayawada", "Visakhapatnam", "Warangal"
        )
    }

    var searchQuery by remember { mutableStateOf("") }

    val filteredCities = remember(searchQuery) {
        if (searchQuery.isBlank()) {
            allIndianCities
        } else {
            val q = searchQuery.trim().lowercase()
            allIndianCities.filter { it.lowercase().contains(q) }
        }
    }

    val isCustomCityNeeded = remember(searchQuery, filteredCities) {
        searchQuery.isNotBlank() && filteredCities.none { it.equals(searchQuery.trim(), ignoreCase = true) }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = SurfaceDark,
        scrimColor = Color.Black.copy(alpha = 0.75f),
        dragHandle = { BottomSheetDefaults.DragHandle(color = SurfaceBorder) }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.85f)
                .padding(horizontal = 20.dp)
        ) {
            Text(
                text = "Choose your city",
                style = MaterialTheme.typography.titleLarge,
                color = OnSurface,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "Discover raves, concerts & festivals in your region",
                style = MaterialTheme.typography.bodySmall,
                color = OnSurfaceLow
            )

            Spacer(modifier = Modifier.height(14.dp))

            // Search Bar for all cities in India
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = {
                    Text(
                        text = "Search all cities in India...",
                        color = OnSurfaceLow,
                        fontSize = 14.sp
                    )
                },
                leadingIcon = {
                    Icon(
                        imageVector = Icons.Outlined.Search,
                        contentDescription = "Search",
                        tint = PulsrPink,
                        modifier = Modifier.size(20.dp)
                    )
                },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Icon(
                                imageVector = Icons.Outlined.Close,
                                contentDescription = "Clear",
                                tint = OnSurfaceLow,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                },
                shape = RoundedCornerShape(14.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = Surface2Dark,
                    unfocusedContainerColor = Surface2Dark,
                    focusedBorderColor = PulsrPink,
                    unfocusedBorderColor = SurfaceBorder,
                    focusedTextColor = OnSurface,
                    unfocusedTextColor = OnSurface
                ),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(16.dp))

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 40.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // If user types a custom city name not in list, show quick select option
                if (isCustomCityNeeded) {
                    item {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Surface2Dark,
                            border = androidx.compose.foundation.BorderStroke(1.dp, PulsrAcid.copy(alpha = 0.5f)),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onCitySelected(searchQuery.trim()) }
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 14.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Outlined.LocationOn,
                                    contentDescription = null,
                                    tint = PulsrAcid,
                                    modifier = Modifier.size(20.dp)
                                )
                                Column {
                                    Text(
                                        text = "Select \"${searchQuery.trim()}\"",
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = PulsrAcid
                                    )
                                    Text(
                                        text = "Set as default city for India events",
                                        fontSize = 11.sp,
                                        color = OnSurfaceLow
                                    )
                                }
                            }
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                }

                // Popular Cities Section (when search query is blank)
                if (searchQuery.isBlank()) {
                    item {
                        Text(
                            text = "TOP CITIES",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp,
                            color = PulsrPink,
                            modifier = Modifier.padding(vertical = 4.dp)
                        )
                    }

                    item {
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.padding(vertical = 4.dp)
                        ) {
                            items(popularCities) { city ->
                                val isSelected = city.equals(currentCity, ignoreCase = true)
                                Surface(
                                    shape = RoundedCornerShape(20.dp),
                                    color = if (isSelected) PulsrPink.copy(alpha = 0.18f) else Surface2Dark,
                                    border = androidx.compose.foundation.BorderStroke(
                                        1.dp,
                                        if (isSelected) PulsrPink else SurfaceBorder
                                    ),
                                    modifier = Modifier.clickable { onCitySelected(city) }
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        Text(
                                            text = city,
                                            fontSize = 13.sp,
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                            color = if (isSelected) PulsrPink else OnSurface
                                        )
                                        if (isSelected) {
                                            Icon(
                                                imageVector = Icons.Outlined.CheckCircle,
                                                contentDescription = null,
                                                tint = PulsrPink,
                                                modifier = Modifier.size(14.dp)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "ALL CITIES IN INDIA",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp,
                            color = OnSurfaceLow,
                            modifier = Modifier.padding(vertical = 4.dp)
                        )
                    }
                }

                // Filtered List
                items(filteredCities) { city ->
                    val isSelected = city.equals(currentCity, ignoreCase = true)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (isSelected) Surface2Dark else Color.Transparent)
                            .clickable { onCitySelected(city) }
                            .padding(horizontal = 14.dp, vertical = 13.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Outlined.LocationOn,
                                contentDescription = null,
                                tint = if (isSelected) PulsrPink else OnSurfaceLow,
                                modifier = Modifier.size(18.dp)
                            )
                            Text(
                                text = city,
                                style = MaterialTheme.typography.bodyLarge,
                                color = if (isSelected) PulsrPink else OnSurface,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                            )
                        }
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

                if (filteredCities.isEmpty() && !isCustomCityNeeded) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 32.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "No cities matching \"$searchQuery\"",
                                color = OnSurfaceLow,
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                    }
                }
            }
        }
    }
}

