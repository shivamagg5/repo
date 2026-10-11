package io.eventhub.consumer.ui.feature.search

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.CalendarToday
import androidx.compose.material.icons.outlined.Clear
import androidx.compose.material.icons.outlined.ConfirmationNumber
import androidx.compose.material.icons.outlined.LocalFireDepartment
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.TrendingUp
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
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
import io.eventhub.consumer.ui.components.EmptyState
import io.eventhub.consumer.ui.navigation.SearchRoute
import io.eventhub.consumer.ui.theme.*

class SearchUiFactory : Ui.Factory {
    override fun create(screen: Screen, context: CircuitContext): Ui<*>? =
        if (screen is SearchRoute) ui<SearchState> { state, modifier ->
            SearchScreen(state, modifier)
        } else null
}

@Composable
fun SearchScreen(state: SearchState, modifier: Modifier = Modifier) {
    Scaffold(
        modifier = modifier,
        containerColor = BackgroundDark,
        topBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            ) {
                // Search Input Field
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = { state.eventSink(SearchEvent.BackClicked) }) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Outlined.ArrowBack,
                            contentDescription = "Back",
                            tint = OnSurface
                        )
                    }
                    TextField(
                        value = state.query,
                        onValueChange = { state.eventSink(SearchEvent.QueryChanged(it)) },
                        placeholder = { 
                            Text(
                                "Search concerts, raves, comedy...", 
                                color = OnSurfaceMedium,
                                fontSize = 14.sp
                            ) 
                        },
                        leadingIcon = {
                            Icon(Icons.Outlined.Search, contentDescription = null, tint = PulsrAcid)
                        },
                        trailingIcon = {
                            if (state.query.isNotEmpty()) {
                                IconButton(onClick = { state.eventSink(SearchEvent.ClearQuery) }) {
                                    Icon(Icons.Outlined.Clear, contentDescription = "Clear", tint = OnSurfaceMedium)
                                }
                            }
                        },
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor = SurfaceDark,
                            unfocusedContainerColor = SurfaceDark,
                            focusedTextColor = OnSurface,
                            unfocusedTextColor = OnSurface,
                            focusedIndicatorColor = PulsrPink,
                            unfocusedIndicatorColor = SurfaceBorder
                        ),
                        shape = RoundedCornerShape(14.dp),
                        singleLine = true,
                        modifier = Modifier
                            .weight(1f)
                            .border(1.dp, if (state.query.isNotEmpty()) PulsrPink else SurfaceBorder, RoundedCornerShape(14.dp))
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Category Chips Filter
                val categories = listOf("All", "Festivals", "Garba", "Raves", "Comedy", "College", "Wellness")
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    contentPadding = PaddingValues(horizontal = 4.dp)
                ) {
                    items(categories) { cat ->
                        val isSelected = (cat == "All" && state.selectedCategory == null) || state.selectedCategory == cat
                        FilterChip(
                            selected = isSelected,
                            onClick = {
                                val newCat = if (cat == "All") null else cat
                                state.eventSink(SearchEvent.CategoryFilterSelected(newCat))
                            },
                            label = { 
                                Text(
                                    cat, 
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    fontSize = 12.sp
                                ) 
                            },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = PulsrPink,
                                selectedLabelColor = OnPrimary,
                                containerColor = SurfaceDark,
                                labelColor = OnSurfaceMedium
                            ),
                            border = FilterChipDefaults.filterChipBorder(
                                enabled = true,
                                selected = isSelected,
                                borderColor = if (isSelected) PulsrPink else SurfaceBorder
                            ),
                            shape = RoundedCornerShape(20.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(6.dp))

                // Price Budget Filters
                val priceFilters = listOf(
                    "All Prices" to null,
                    "Free Entry" to "FREE",
                    "Under ₹500" to "UNDER_500",
                    "Under ₹1,500" to "UNDER_1500"
                )
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    contentPadding = PaddingValues(horizontal = 4.dp)
                ) {
                    items(priceFilters) { (label, key) ->
                        val isSelected = state.selectedPriceFilter == key
                        SuggestionChip(
                            onClick = { state.eventSink(SearchEvent.PriceFilterSelected(key)) },
                            label = {
                                Text(
                                    text = label,
                                    fontSize = 11.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                    color = if (isSelected) PulsrAcid else OnSurfaceMedium
                                )
                            },
                            colors = SuggestionChipDefaults.suggestionChipColors(
                                containerColor = if (isSelected) PulsrAcid.copy(alpha = 0.12f) else SurfaceDark
                            ),
                            border = SuggestionChipDefaults.suggestionChipBorder(
                                enabled = true,
                                borderColor = if (isSelected) PulsrAcid else SurfaceBorder.copy(alpha = 0.6f)
                            ),
                            shape = RoundedCornerShape(12.dp)
                        )
                    }
                }
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                state.isSearching -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            CircularProgressIndicator(color = PulsrPink, modifier = Modifier.size(36.dp), strokeWidth = 3.dp)
                            Spacer(modifier = Modifier.height(12.dp))
                            Text("Searching live arena events...", color = OnSurfaceMedium, fontSize = 13.sp)
                        }
                    }
                }
                state.query.isBlank() && state.selectedCategory == null && state.selectedPriceFilter == null -> {
                    DiscoverySuggestionsView(
                        onTrendingClick = { state.eventSink(SearchEvent.QueryChanged(it)) },
                        onQuickFilter = { cat, price ->
                            state.eventSink(SearchEvent.CategoryFilterSelected(cat))
                            if (price != null) state.eventSink(SearchEvent.PriceFilterSelected(price))
                        }
                    )
                }
                state.results.isEmpty() -> {
                    EmptyState(
                        title = "No events found",
                        description = "We couldn't find any events matching \"${state.query.ifBlank { state.selectedCategory ?: "current filters" }}\". Try clearing filters or searching another keyword.",
                        icon = Icons.Outlined.Search
                    )
                }
                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(start = 20.dp, top = 12.dp, end = 20.dp, bottom = 128.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        item {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "${state.results.size} EXPERIENCES FOUND",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 1.sp,
                                    color = PulsrAcid
                                )
                                Text(
                                    text = "LIVE INVENTORY",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = OnSurfaceLow
                                )
                            }
                        }
                        items(state.results, key = { it.id }) { event ->
                            SearchResultItem(
                                event = event,
                                onClick = { state.eventSink(SearchEvent.EventClicked(event.id)) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DiscoverySuggestionsView(
    onTrendingClick: (String) -> Unit,
    onQuickFilter: (category: String?, price: String?) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 8.dp)
            .padding(bottom = 128.dp)
    ) {
        // Trending Searches Header
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Icon(
                imageVector = Icons.Outlined.TrendingUp,
                contentDescription = null,
                tint = PulsrFlame,
                modifier = Modifier.size(18.dp)
            )
            Text(
                text = "TRENDING SEARCHES",
                fontSize = 12.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 1.sp,
                color = OnSurface
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Trending Pills
        val trendingQueries = listOf(
            "Coldplay Mumbai",
            "Techno Rave",
            "Sunburn Arena",
            "Navratri Garba",
            "Zakir Khan Live",
            "Boiler Room India"
        )
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(horizontal = 2.dp)
        ) {
            items(trendingQueries) { term ->
                TrendingChip(term = term, onClick = { onTrendingClick(term) })
            }
        }

        Spacer(modifier = Modifier.height(28.dp))

        // Quick Vibe Curations
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Icon(
                imageVector = Icons.Outlined.Bolt,
                contentDescription = null,
                tint = PulsrAcid,
                modifier = Modifier.size(18.dp)
            )
            Text(
                text = "DISCOVER BY CURATION",
                fontSize = 12.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 1.sp,
                color = OnSurface
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Curation Cards
        CurationCard(
            title = "Under ₹500 Steals",
            subtitle = "High-energy gigs, open mics & comedy without breaking the bank",
            badgeText = "BUDGET FRIENDLY",
            badgeColor = PulsrAcid,
            onClick = { onQuickFilter(null, "UNDER_500") }
        )

        Spacer(modifier = Modifier.height(10.dp))

        CurationCard(
            title = "Massive Arena Festivals",
            subtitle = "Multi-stage audio-visual spectacles, headliners and crowd energy",
            badgeText = "STADIUM & ARENA",
            badgeColor = PulsrPink,
            onClick = { onQuickFilter("Festivals", null) }
        )

        Spacer(modifier = Modifier.height(10.dp))

        CurationCard(
            title = "Community Free RSVPs",
            subtitle = "Art mixers, tech summits, popups and cultural gatherings",
            badgeText = "FREE ENTRY",
            badgeColor = PulsrNeon,
            onClick = { onQuickFilter(null, "FREE") }
        )
    }
}

@Composable
private fun TrendingChip(term: String, onClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = SurfaceDark,
        border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceBorder),
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Icon(
                imageVector = Icons.Outlined.TrendingUp,
                contentDescription = null,
                tint = PulsrFlame,
                modifier = Modifier.size(13.dp)
            )
            Text(
                text = term,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                color = OnSurface
            )
        }
    }
}

@Composable
private fun CurationCard(
    title: String,
    subtitle: String,
    badgeText: String,
    badgeColor: Color,
    onClick: () -> Unit
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = SurfaceDark),
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 96.dp)
            .border(1.dp, SurfaceBorder, RoundedCornerShape(16.dp))
            .clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = badgeColor.copy(alpha = 0.15f)
                ) {
                    Text(
                        text = badgeText,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 0.8.sp,
                        color = badgeColor,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = OnSurface
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = OnSurfaceMedium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Spacer(modifier = Modifier.width(8.dp))
            Surface(
                shape = CircleShape,
                color = Surface2Dark,
                modifier = Modifier.size(36.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Outlined.ArrowForward,
                        contentDescription = null,
                        tint = OnSurface,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun SearchResultItem(event: Event, onClick: () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = SurfaceDark),
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, SurfaceBorder, RoundedCornerShape(16.dp))
            .clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Event Image with category badge overlay
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(RoundedCornerShape(12.dp))
            ) {
                AsyncImage(
                    model = event.coverImageUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
                if (event.categories.isNotEmpty()) {
                    Surface(
                        color = BackgroundDark.copy(alpha = 0.8f),
                        shape = RoundedCornerShape(bottomEnd = 6.dp),
                        modifier = Modifier.align(Alignment.TopStart)
                    ) {
                        Text(
                            text = event.categories.first().uppercase(),
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Black,
                            color = PulsrAcid,
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.width(14.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = event.name,
                    style = MaterialTheme.typography.titleMedium,
                    color = OnSurface,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Outlined.LocationOn,
                        contentDescription = null,
                        tint = PulsrFlame,
                        modifier = Modifier.size(13.dp)
                    )
                    Text(
                        text = "${event.venue?.city ?: "India"} • ${event.venue?.name ?: "Venue"}",
                        style = MaterialTheme.typography.bodySmall,
                        color = OnSurfaceMedium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Spacer(modifier = Modifier.height(2.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Outlined.CalendarToday,
                        contentDescription = null,
                        tint = OnSurfaceLow,
                        modifier = Modifier.size(12.dp)
                    )
                    Text(
                        text = event.startAt.take(10),
                        style = MaterialTheme.typography.labelSmall,
                        color = OnSurfaceLow
                    )
                }
                Spacer(modifier = Modifier.height(6.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = formatCurrency(event.minPrice),
                        style = MaterialTheme.typography.labelMedium,
                        color = if (event.isFree) PulsrAcid else AccentGold,
                        fontWeight = FontWeight.ExtraBold
                    )
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = PulsrAcid.copy(alpha = 0.12f)
                    ) {
                        Text(
                            text = "FAST BOOKING",
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Bold,
                            color = PulsrAcid,
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                        )
                    }
                }
            }

            IconButton(onClick = onClick) {
                Icon(
                    imageVector = Icons.AutoMirrored.Outlined.ArrowForward,
                    contentDescription = "View Event",
                    tint = OnSurfaceMedium,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}
