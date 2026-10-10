package io.eventhub.consumer.di

import com.slack.circuit.foundation.Circuit
import com.slack.circuit.runtime.presenter.Presenter
import com.slack.circuit.runtime.ui.Ui
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import io.eventhub.consumer.ui.feature.auth.LoginPresenter
import io.eventhub.consumer.ui.feature.auth.LoginUiFactory
import io.eventhub.consumer.ui.feature.checkout.CheckoutPresenter
import io.eventhub.consumer.ui.feature.checkout.CheckoutUiFactory
import io.eventhub.consumer.ui.feature.eventdetail.EventDetailPresenter
import io.eventhub.consumer.ui.feature.eventdetail.EventDetailUiFactory
import io.eventhub.consumer.ui.feature.home.HomePresenter
import io.eventhub.consumer.ui.feature.home.HomeUiFactory
import io.eventhub.consumer.ui.feature.notifications.NotificationsPresenter
import io.eventhub.consumer.ui.feature.notifications.NotificationsUiFactory
import io.eventhub.consumer.ui.feature.profile.ProfilePresenter
import io.eventhub.consumer.ui.feature.profile.ProfileUiFactory
import io.eventhub.consumer.ui.feature.saved.SavedPresenter
import io.eventhub.consumer.ui.feature.saved.SavedUiFactory
import io.eventhub.consumer.ui.feature.search.SearchPresenter
import io.eventhub.consumer.ui.feature.search.SearchUiFactory
import io.eventhub.consumer.ui.feature.tickets.TicketDetailPresenter
import io.eventhub.consumer.ui.feature.tickets.TicketDetailUiFactory
import io.eventhub.consumer.ui.feature.tickets.TicketsPresenter
import io.eventhub.consumer.ui.feature.tickets.TicketsUiFactory
import io.eventhub.consumer.ui.navigation.*
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object CircuitModule {

    @Provides
    @Singleton
    fun provideCircuit(
        homePresenterFactory: HomePresenter.Factory,
        eventDetailPresenterFactory: EventDetailPresenter.Factory,
        checkoutPresenterFactory: CheckoutPresenter.Factory,
        ticketsPresenterFactory: TicketsPresenter.Factory,
        ticketDetailPresenterFactory: TicketDetailPresenter.Factory,
        searchPresenterFactory: SearchPresenter.Factory,
        loginPresenterFactory: LoginPresenter.Factory,
        profilePresenterFactory: ProfilePresenter.Factory,
        savedPresenterFactory: SavedPresenter.Factory,
        notificationsPresenterFactory: NotificationsPresenter.Factory,
    ): Circuit = Circuit.Builder()
        .addPresenterFactory { screen, navigator, _ ->
            when (screen) {
                is HomeRoute -> homePresenterFactory.create(screen, navigator)
                is DiscoverRoute -> searchPresenterFactory.create(SearchRoute, navigator)
                is EventDetailRoute -> eventDetailPresenterFactory.create(screen, navigator)
                is CheckoutRoute -> checkoutPresenterFactory.create(screen, navigator)
                is TicketsRoute -> ticketsPresenterFactory.create(screen, navigator)
                is TicketDetailRoute -> ticketDetailPresenterFactory.create(screen, navigator)
                is SearchRoute -> searchPresenterFactory.create(screen, navigator)
                is LoginRoute -> loginPresenterFactory.create(screen, navigator)
                is ProfileRoute -> profilePresenterFactory.create(screen, navigator)
                is SavedRoute -> savedPresenterFactory.create(screen, navigator)
                is NotificationsRoute -> notificationsPresenterFactory.create(screen, navigator)
                else -> null
            }
        }
        .addUiFactories(
            listOf(
                HomeUiFactory(),
                EventDetailUiFactory(),
                CheckoutUiFactory(),
                TicketsUiFactory(),
                TicketDetailUiFactory(),
                SearchUiFactory(),
                LoginUiFactory(),
                ProfileUiFactory(),
                SavedUiFactory(),
                NotificationsUiFactory(),
            )
        )
        .build()
}
