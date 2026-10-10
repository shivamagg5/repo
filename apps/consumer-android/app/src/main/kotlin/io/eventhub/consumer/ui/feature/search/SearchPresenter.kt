package io.eventhub.consumer.ui.feature.search

import androidx.compose.runtime.*
import com.slack.circuit.runtime.CircuitUiEvent
import com.slack.circuit.runtime.CircuitUiState
import com.slack.circuit.runtime.Navigator
import com.slack.circuit.runtime.presenter.Presenter
import dagger.assisted.Assisted
import dagger.assisted.AssistedFactory
import dagger.assisted.AssistedInject
import io.eventhub.consumer.domain.model.Event
import io.eventhub.consumer.domain.usecase.SearchEventsUseCase
import io.eventhub.consumer.ui.navigation.EventDetailRoute
import io.eventhub.consumer.ui.navigation.SearchRoute
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

data class SearchState(
    val query: String = "",
    val results: List<Event> = emptyList(),
    val isSearching: Boolean = false,
    val selectedCategory: String? = null,
    val selectedPriceFilter: String? = null,
    val error: String? = null,
    val eventSink: (SearchEvent) -> Unit = {}
) : CircuitUiState

sealed interface SearchEvent : CircuitUiEvent {
    data class QueryChanged(val newQuery: String) : SearchEvent
    data class CategoryFilterSelected(val category: String?) : SearchEvent
    data class PriceFilterSelected(val filter: String?) : SearchEvent
    data class EventClicked(val eventId: String) : SearchEvent
    data object ClearQuery : SearchEvent
    data object BackClicked : SearchEvent
}

class SearchPresenter @AssistedInject constructor(
    @Assisted private val screen: SearchRoute,
    @Assisted private val navigator: Navigator,
    private val searchEvents: SearchEventsUseCase,
) : Presenter<SearchState> {

    @Composable
    override fun present(): SearchState {
        var query by remember { mutableStateOf("") }
        var results by remember { mutableStateOf<List<Event>>(emptyList()) }
        var isSearching by remember { mutableStateOf(false) }
        var selectedCategory by remember { mutableStateOf<String?>(null) }
        var selectedPriceFilter by remember { mutableStateOf<String?>(null) }
        var error by remember { mutableStateOf<String?>(null) }
        val scope = rememberCoroutineScope()

        // Debounced search on query changes
        LaunchedEffect(query, selectedCategory, selectedPriceFilter) {
            if (query.isBlank() && selectedCategory == null) {
                results = emptyList()
                return@LaunchedEffect
            }
            delay(300) // 300ms debounce
            isSearching = true
            error = null
            try {
                val raw = searchEvents(query)
                results = raw.filter { ev ->
                    val matchesCategory = selectedCategory == null || ev.categories.contains(selectedCategory)
                    val matchesPrice = when (selectedPriceFilter) {
                        "FREE" -> ev.isFree || (ev.minPrice ?: 0) == 0
                        "UNDER_500" -> {
                            val p = ev.minPrice ?: 0
                            val inRupees = if (p >= 10000 && p % 100 == 0) p / 100 else p
                            inRupees in 1..500
                        }
                        "UNDER_1500" -> {
                            val p = ev.minPrice ?: 0
                            val inRupees = if (p >= 10000 && p % 100 == 0) p / 100 else p
                            inRupees in 1..1500
                        }
                        else -> true
                    }
                    matchesCategory && matchesPrice
                }
            } catch (e: Exception) {
                error = "Search failed: ${e.localizedMessage}"
            } finally {
                isSearching = false
            }
        }

        return SearchState(
            query = query,
            results = results,
            isSearching = isSearching,
            selectedCategory = selectedCategory,
            selectedPriceFilter = selectedPriceFilter,
            error = error,
        ) { uiEvent ->
            when (uiEvent) {
                is SearchEvent.QueryChanged -> query = uiEvent.newQuery
                is SearchEvent.ClearQuery -> query = ""
                is SearchEvent.CategoryFilterSelected -> selectedCategory = uiEvent.category
                is SearchEvent.PriceFilterSelected -> selectedPriceFilter = uiEvent.filter
                is SearchEvent.EventClicked -> navigator.goTo(EventDetailRoute(uiEvent.eventId))
                is SearchEvent.BackClicked -> navigator.pop()
            }
        }
    }

    @AssistedFactory
    fun interface Factory {
        fun create(screen: SearchRoute, navigator: Navigator): SearchPresenter
    }
}
