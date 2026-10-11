package io.eventhub.consumer.data.repository

import io.eventhub.consumer.data.mapper.toDomain
import io.eventhub.consumer.data.remote.*
import io.eventhub.consumer.data.remote.dto.*
import io.eventhub.consumer.domain.model.*
import io.eventhub.consumer.domain.repository.*
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.auth.providers.builtin.IDToken
import io.github.jan.supabase.auth.providers.Google
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class EventRepositoryImpl @Inject constructor(
    private val api: EventApiService,
    private val userApi: UserApiService
) : EventRepository {

    private val sampleEvents = listOf(
        Event(
            id = "evt_pulsr_1",
            name = "Indometal Festival ft. Bring Me The Horizon",
            slug = "indometal-bmth",
            description = "The colossal metalcore phenomenon arrives in India for their 18th Anniversary Live. Experience wall-of-sound production, pyrotechnics, and iconic anthems.",
            startAt = "2026-08-24T18:00:00Z",
            endAt = "2026-08-24T23:30:00Z",
            status = EventStatus.PUBLISHED,
            coverImageUrl = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop",
            bannerImageUrl = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop",
            venue = VenueSnippet(
                id = "ven_1",
                name = "Jio World Garden",
                city = "Mumbai",
                state = "Maharashtra",
                address = "BKC, Bandra East, Mumbai",
                latitude = 19.0667,
                longitude = 72.8687
            ),
            organizer = OrganizerSnippet(
                id = "org_1",
                name = "PULSR Live",
                logoUrl = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&auto=format&fit=crop",
                verified = true
            ),
            ticketTypes = listOf(
                TicketType("tt_1", "General Arena", "Access to open lawn arena", 149900, "INR", 450, 6, 1, null, null, "ACTIVE"),
                TicketType("tt_2", "Moshpit Fast Track", "Direct pit entry + 2 complimentary drinks", 299900, "INR", 85, 4, 1, null, null, "ACTIVE"),
                TicketType("tt_3", "VIP Deck Lounge", "Elevated private bar & premium viewing deck", 599900, "INR", 20, 2, 1, null, null, "ACTIVE")
            ),
            categories = listOf("Festivals", "Raves"),
            minPrice = 149900,
            maxPrice = 599900,
            isFree = false,
            isFavorited = true,
            currency = "INR",
            soldCount = 4200,
            totalCapacity = 6000
        ),
        Event(
            id = "evt_pulsr_2",
            name = "Neste x Coldplay - 18th Anniversary Live",
            slug = "neste-coldplay",
            description = "Experience magical neon wristbands, stadium-wide singalongs, and an awe-inspiring spectacle of lights and love.",
            startAt = "2026-08-24T19:00:00Z",
            endAt = "2026-08-24T23:30:00Z",
            status = EventStatus.PUBLISHED,
            coverImageUrl = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop",
            bannerImageUrl = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&auto=format&fit=crop",
            venue = VenueSnippet(
                id = "ven_2",
                name = "DY Patil Stadium",
                city = "Mumbai",
                state = "Maharashtra",
                address = "Nerul, Navi Mumbai",
                latitude = 19.0330,
                longitude = 73.0297
            ),
            organizer = OrganizerSnippet(
                id = "org_2",
                name = "BookMyScene",
                logoUrl = "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200&auto=format&fit=crop",
                verified = true
            ),
            ticketTypes = listOf(
                TicketType("tt_4", "Silver Tier", "Grandstand seating", 249900, "INR", 600, 6, 1, null, null, "ACTIVE"),
                TicketType("tt_5", "Infinity Fan Pit", "Standing directly in front of main runway", 649900, "INR", 120, 4, 1, null, null, "ACTIVE")
            ),
            categories = listOf("Festivals", "Concerts"),
            minPrice = 249900,
            maxPrice = 649900,
            isFree = false,
            isFavorited = false,
            currency = "INR",
            soldCount = 9800,
            totalCapacity = 12000
        ),
        Event(
            id = "evt_pulsr_3",
            name = "Roland Afterdark: Techno Warehouse Rave",
            slug = "roland-afterdark",
            description = "All-night dark industrial techno, modular synthesizer sets, and heavy analog bass in an underground hangar.",
            startAt = "2026-09-06T22:00:00Z",
            endAt = "2026-09-07T05:00:00Z",
            status = EventStatus.PUBLISHED,
            coverImageUrl = "https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=800&auto=format&fit=crop",
            bannerImageUrl = "https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=1200&auto=format&fit=crop",
            venue = VenueSnippet(
                id = "ven_3",
                name = "The Great Eastern Mills",
                city = "Bengaluru",
                state = "Karnataka",
                address = "Whitefield Industrial Area, Bengaluru",
                latitude = 12.9716,
                longitude = 77.5946
            ),
            organizer = OrganizerSnippet(
                id = "org_3",
                name = "Afterdark Underground",
                logoUrl = "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=200&auto=format&fit=crop",
                verified = true
            ),
            ticketTypes = listOf(
                TicketType("tt_6", "Night Owl Entry", "Valid before 11:30 PM", 119900, "INR", 200, 4, 1, null, null, "ACTIVE"),
                TicketType("tt_7", "All-Access Rave Pass", "Anytime entry + backstage lounge", 219900, "INR", 60, 4, 1, null, null, "ACTIVE")
            ),
            categories = listOf("Raves"),
            minPrice = 119900,
            maxPrice = 219900,
            isFree = false,
            isFavorited = true,
            currency = "INR",
            soldCount = 1100,
            totalCapacity = 1500
        ),
        Event(
            id = "evt_pulsr_4",
            name = "Kankupagla Garba: Navratri Nights 2026",
            slug = "kankupagla-garba",
            description = "The most authentic cultural celebration with traditional live dhol, garba legends, and grand LED canopy grounds.",
            startAt = "2026-10-17T20:00:00Z",
            endAt = "2026-10-18T02:00:00Z",
            status = EventStatus.PUBLISHED,
            coverImageUrl = "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&auto=format&fit=crop",
            bannerImageUrl = "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&auto=format&fit=crop",
            venue = VenueSnippet(
                id = "ven_4",
                name = "Navlakhi Palace Grounds",
                city = "Vadodara",
                state = "Gujarat",
                address = "Jawahar Nagar, Vadodara",
                latitude = 22.3072,
                longitude = 73.1812
            ),
            organizer = OrganizerSnippet(
                id = "org_4",
                name = "United Way Heritage",
                logoUrl = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop",
                verified = true
            ),
            ticketTypes = listOf(
                TicketType("tt_8", "Single Night Pass", "Entry for 1 night dance grounds", 250000, "INR", 800, 6, 1, null, null, "ACTIVE"),
                TicketType("tt_9", "Season Pass (9 Nights)", "All 9 nights uninterrupted access", 1499900, "INR", 100, 2, 1, null, null, "ACTIVE")
            ),
            categories = listOf("Garba", "Festivals"),
            minPrice = 250000,
            maxPrice = 1499900,
            isFree = false,
            isFavorited = false,
            currency = "INR",
            soldCount = 5500,
            totalCapacity = 8000
        ),
        Event(
            id = "evt_pulsr_5",
            name = "Novato Freshers' Bash: Campus Opener",
            slug = "novato-freshers",
            description = "College season kick-off party with indie rock, hip-hop battles, and arcade zones.",
            startAt = "2026-08-29T17:00:00Z",
            endAt = "2026-08-29T23:00:00Z",
            status = EventStatus.PUBLISHED,
            coverImageUrl = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop",
            bannerImageUrl = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop",
            venue = VenueSnippet(
                id = "ven_5",
                name = "Bandra Amphitheatre",
                city = "Mumbai",
                state = "Maharashtra",
                address = "Bandstand, Bandra West",
                latitude = 19.0434,
                longitude = 72.8197
            ),
            organizer = OrganizerSnippet(
                id = "org_5",
                name = "Campus Pulse",
                logoUrl = "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200&auto=format&fit=crop",
                verified = true
            ),
            ticketTypes = listOf(
                TicketType("tt_10", "Student Entry (ID Req)", "Full stage access", 99900, "INR", 500, 4, 1, null, null, "ACTIVE")
            ),
            categories = listOf("College"),
            minPrice = 99900,
            maxPrice = 99900,
            isFree = false,
            isFavorited = false,
            currency = "INR",
            soldCount = 890,
            totalCapacity = 1200
        ),
        Event(
            id = "evt_pulsr_6",
            name = "Drum Circle: Sunset Rhythm Ritual",
            slug = "drum-circle-sunset",
            description = "Community percussion jam on the riverbank. Djembe drums provided, guided flow meditation, and ambient acoustic sets.",
            startAt = "2026-09-06T16:30:00Z",
            endAt = "2026-09-06T20:00:00Z",
            status = EventStatus.PUBLISHED,
            coverImageUrl = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop",
            bannerImageUrl = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&auto=format&fit=crop",
            venue = VenueSnippet(
                id = "ven_6",
                name = "Eco Park Lakefront",
                city = "Kolkata",
                state = "West Bengal",
                address = "New Town, Kolkata",
                latitude = 22.6033,
                longitude = 88.4654
            ),
            organizer = OrganizerSnippet(
                id = "org_6",
                name = "Soul Beats Community",
                logoUrl = "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=200&auto=format&fit=crop",
                verified = true
            ),
            ticketTypes = listOf(
                TicketType("tt_11", "Drummer Pass", "Includes rented djembe drum", 120000, "INR", 80, 2, 1, null, null, "ACTIVE"),
                TicketType("tt_12", "Listener Pass", "General lawn seating", 49900, "INR", 150, 4, 1, null, null, "ACTIVE")
            ),
            categories = listOf("Wellness"),
            minPrice = 49900,
            maxPrice = 120000,
            isFree = false,
            isFavorited = true,
            currency = "INR",
            soldCount = 180,
            totalCapacity = 250
        )
    )

    override suspend fun getFeaturedEvents(): List<Event> = try {
        val remote = api.getFeaturedEvents().map { it.toDomain() }
        if (remote.isNotEmpty()) remote else sampleEvents
    } catch (e: Exception) {
        sampleEvents
    }

    override suspend fun getTrendingEvents(): List<Event> = try {
        val remote = api.getTrendingEvents().map { it.toDomain() }
        if (remote.isNotEmpty()) remote else sampleEvents
    } catch (e: Exception) {
        sampleEvents
    }

    override suspend fun getNearbyEvents(lat: Double, lng: Double): List<Event> = try {
        val remote = api.getNearbyEvents(lat, lng).map { it.toDomain() }
        if (remote.isNotEmpty()) remote else sampleEvents
    } catch (e: Exception) {
        sampleEvents
    }

    override suspend fun getEvents(
        city: String?,
        categoryId: String?,
        from: String?,
        to: String?,
        minPrice: Int?,
        maxPrice: Int?,
        page: Int,
        pageSize: Int
    ): List<Event> = try {
        val remote = api.getEvents(city, categoryId, from, to, minPrice, maxPrice, page, pageSize)
            .map { it.toDomain() }
        if (remote.isNotEmpty()) remote else sampleEvents
    } catch (e: Exception) {
        sampleEvents
    }

    override suspend fun getEventById(eventId: String): Event = try {
        api.getEventById(eventId).toDomain()
    } catch (e: Exception) {
        sampleEvents.find { it.id == eventId } ?: sampleEvents.first()
    }

    override suspend fun getEventBySlug(slug: String): Event = try {
        api.getEventBySlug(slug).toDomain()
    } catch (e: Exception) {
        sampleEvents.find { it.slug == slug } ?: sampleEvents.first()
    }

    override suspend fun searchEvents(query: String, page: Int): List<Event> = try {
        val remote = api.searchEvents(query, page).map { it.toDomain() }
        if (remote.isNotEmpty()) remote else sampleEvents.filter { it.name.contains(query, ignoreCase = true) }
    } catch (e: Exception) {
        sampleEvents.filter { it.name.contains(query, ignoreCase = true) }
    }

    override suspend fun toggleFavorite(eventId: String, isFavorited: Boolean) {
        try {
            if (isFavorited) userApi.addFavorite(eventId) else userApi.removeFavorite(eventId)
        } catch (_: Exception) {}
    }

    override suspend fun getFavorites(): List<Event> = try {
        val remote = userApi.getFavorites().map { it.toDomain() }
        if (remote.isNotEmpty()) remote else sampleEvents.filter { it.isFavorited }
    } catch (e: Exception) {
        sampleEvents.filter { it.isFavorited }
    }

    override suspend fun getCategories(): List<Category> = try {
        api.getCategories().map { Category(it.id, it.name, it.iconUrl) }
    } catch (e: Exception) {
        listOf(
            Category("cat_1", "Music", "🎵"),
            Category("cat_2", "Comedy", "🎭"),
            Category("cat_3", "Nightlife", "🍸"),
            Category("cat_4", "Food & Drinks", "🍕"),
            Category("cat_5", "Sports", "⚽")
        )
    }

    override suspend fun getCities(): List<City> = try {
        api.getCities().map { City(it.name, it.state, it.country) }
    } catch (e: Exception) {
        listOf(
            City("New Delhi", "Delhi", "India"),
            City("Mumbai", "Maharashtra", "India"),
            City("Bengaluru", "Karnataka", "India"),
            City("Goa", "Goa", "India")
        )
    }
}

@Singleton
class TicketRepositoryImpl @Inject constructor(
    private val api: TicketApiService,
    private val offlineVault: io.eventhub.consumer.data.local.OfflineTicketVault
) : TicketRepository {

    private val sampleTicket = Ticket(
        id = "tkt_sample_1",
        orderId = "ord_sample_1",
        eventId = "evt_sample_1",
        event = Event(
            id = "evt_sample_1",
            name = "Sunburn Arena ft. Alan Walker",
            slug = "sunburn-alan-walker",
            description = "Alan Walker WalkerWorld Tour",
            startAt = "2026-11-15T18:00:00Z",
            endAt = "2026-11-15T23:00:00Z",
            status = EventStatus.PUBLISHED,
            coverImageUrl = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop",
            bannerImageUrl = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop",
            venue = VenueSnippet("ven_1", "Jawaharlal Nehru Stadium", "New Delhi", "Delhi", "Pragati Vihar", 28.58, 77.23),
            organizer = OrganizerSnippet("org_1", "Sunburn Festival", null, true),
            ticketTypes = emptyList(),
            categories = listOf("Music"),
            minPrice = 149900,
            maxPrice = 799900,
            isFree = false,
            isFavorited = true,
            currency = "INR",
            soldCount = 1850,
            totalCapacity = 5000
        ),
        ticketTypeId = "tt_2",
        ticketTypeName = "VIP Access",
        holderName = "Alex Sharma",
        holderEmail = "alex.sharma@example.com",
        status = TicketStatus.VALID,
        qrToken = "EP-VIP-SUNBURN-2026-SAMPLE-PASS",
        issuedAt = "2026-10-01T12:00:00Z",
        checkedInAt = null,
        seat = "Bay 4, Row C, Seat 12",
        gate = "Gate 2 (VIP Entrance)",
        isOfflineCached = true
    )

    override suspend fun getUserTickets(): List<Ticket> = try {
        val remote = api.getUserTickets().map { it.toDomain() }
        if (remote.isNotEmpty()) {
            offlineVault.saveTickets(remote)
            remote
        } else {
            val cached = offlineVault.getTickets()
            if (cached.isNotEmpty()) cached else listOf(sampleTicket)
        }
    } catch (e: Exception) {
        val cached = offlineVault.getTickets()
        if (cached.isNotEmpty()) cached else listOf(sampleTicket)
    }

    override suspend fun getTicket(ticketId: String): Ticket = try {
        val remote = api.getTicket(ticketId).toDomain()
        offlineVault.saveTicket(remote)
        remote
    } catch (e: Exception) {
        val cached = offlineVault.getTicket(ticketId)
        cached ?: sampleTicket
    }

    override suspend fun getTicketQrToken(ticketId: String): String = try {
        val remoteToken = api.getTicketQrToken(ticketId)
        offlineVault.saveQrToken(ticketId, remoteToken)
        remoteToken
    } catch (e: Exception) {
        offlineVault.getQrToken(ticketId) ?: sampleTicket.qrToken ?: "SAMPLE_QR_TOKEN"
    }

    override suspend fun cacheTicketForOffline(ticket: Ticket, qrToken: String?) {
        offlineVault.saveTicket(ticket, qrToken)
    }

    override suspend fun isTicketCachedOffline(ticketId: String): Boolean {
        return offlineVault.isTicketCached(ticketId)
    }
}

@Singleton
class CheckoutRepositoryImpl @Inject constructor(
    private val api: CheckoutApiService
) : CheckoutRepository {

    override suspend fun createSession(
        eventId: String,
        items: List<CheckoutLineItem>,
        promoCode: String?
    ): CheckoutSession {
        val req = CheckoutSessionRequestDto(
            eventId = eventId,
            items = items.map { CheckoutItemDto(it.ticketTypeId, it.quantity) },
            promoCode = promoCode
        )
        return api.createSession(req).toDomain()
    }

    override suspend fun getSession(sessionId: String): CheckoutSession =
        api.getSession(sessionId).toDomain()

    override suspend fun initiatePayment(sessionId: String): PaymentIntent {
        val res = api.initiatePayment(sessionId)
        return PaymentIntent(
            razorpayOrderId = res.razorpayOrderId,
            amount = res.amount,
            currency = res.currency,
            key = res.key
        )
    }

    override suspend fun cancelSession(sessionId: String) {
        api.cancelSession(sessionId)
    }
}

@Singleton
class UserRepositoryImpl @Inject constructor(
    private val api: UserApiService
) : UserRepository {

    override suspend fun getMe(): User = api.getMe().toDomain()

    override suspend fun updateMe(
        name: String?,
        phone: String?,
        avatarUrl: String?,
        dob: String?,
        whatsappConsent: Boolean?,
    ): User =
        api.updateMe(
            UpdateUserRequestDto(
                name = name,
                phone = phone,
                dob = dob,
                whatsappConsent = whatsappConsent,
                avatarUrl = avatarUrl,
            )
        ).toDomain()

    override suspend fun registerDeviceToken(fcmToken: String) =
        api.registerDeviceToken(fcmToken)

    override suspend fun getNotifications(): List<NotificationItem> = try {
        api.getInAppNotifications().map {
            NotificationItem(
                id = it.id,
                title = it.title,
                body = it.body,
                type = it.type,
                deepLink = it.deepLink,
                isRead = it.isRead,
                createdAt = it.createdAt
            )
        }
    } catch (_: Exception) {
        emptyList()
    }
}

@Singleton
class AuthRepositoryImpl @Inject constructor(
    private val auth: Auth,
    private val authApi: AuthApiService,
    private val userApi: UserApiService,
    private val tokenProvider: AuthTokenProvider,
) : AuthRepository {

    override suspend fun sendOtp(phone: String, purpose: String): SendOtpResponseDto =
        authApi.sendOtp(phone, purpose)

    override suspend fun verifyOtp(phone: String, otp: String, purpose: String): VerifyOtpResponseDto =
        authApi.verifyOtp(phone, otp, purpose)

    override suspend fun signUpWithCanonical(request: SignupRequestDto): User {
        val res = authApi.signup(request)
        tokenProvider.setTokens(res.token, res.refreshToken)
        return res.user.toDomain()
    }

    override suspend fun signInWithIdentifier(identifier: String, password: String): User {
        val res = authApi.login(identifier, password)
        tokenProvider.setTokens(res.token, res.refreshToken)
        return res.user.toDomain()
    }

    override suspend fun requestForgotPasswordOtp(identifier: String): ForgotPasswordRequestResponseDto =
        authApi.requestForgotPasswordOtp(identifier)

    override suspend fun verifyForgotPasswordOtp(identifier: String, otp: String): ForgotPasswordVerifyResponseDto =
        authApi.verifyForgotPasswordOtp(identifier, otp)

    override suspend fun resetForgotPassword(resetToken: String, newPassword: String): SimpleMessageResponseDto =
        authApi.resetForgotPassword(resetToken, newPassword)

    override suspend fun resendConfirmationEmail(email: String?): SimpleMessageResponseDto =
        authApi.resendConfirmationEmail(email)

    override suspend fun changePhoneRequest(newPhone: String): SendOtpResponseDto =
        authApi.changePhoneRequest(newPhone)

    override suspend fun changePhoneVerify(newPhone: String, otp: String): SimpleMessageResponseDto =
        authApi.changePhoneVerify(newPhone, otp)

    override suspend fun changePassword(currentPassword: String, newPassword: String): SimpleMessageResponseDto =
        authApi.changePassword(currentPassword, newPassword)

    override suspend fun signInWithEmail(email: String, password: String): User =
        signInWithIdentifier(email, password)

    override suspend fun signUpWithEmail(email: String, password: String, name: String?): User {
        auth.signUpWith(Email) {
            this.email = email
            this.password = password
        }
        return userApi.getMe().toDomain()
    }

    override suspend fun signInWithGoogle(idToken: String): User {
        auth.signInWith(IDToken) {
            this.idToken = idToken
            this.provider = Google
        }
        return userApi.getMe().toDomain()
    }

    override suspend fun signOut() {
        tokenProvider.clearTokens()
        try {
            auth.signOut()
        } catch (_: Exception) {}
    }

    override suspend fun isAuthenticated(): Boolean =
        tokenProvider.isAuthenticated

    override suspend fun getCurrentUser(): User? = try {
        if (isAuthenticated()) userApi.getMe().toDomain() else null
    } catch (e: Exception) {
        null
    }
}
