package io.eventhub.consumer.data.mapper

import io.eventhub.consumer.data.remote.dto.*
import io.eventhub.consumer.domain.model.*

fun EventDto.toDomain(): Event = Event(
    id = id,
    name = displayName,
    slug = slug,
    description = description,
    startAt = displayStartAt,
    endAt = displayEndAt,
    status = when (status.uppercase()) {
        "DRAFT" -> EventStatus.DRAFT
        "PENDING" -> EventStatus.PENDING
        "CANCELLED" -> EventStatus.CANCELLED
        "COMPLETED" -> EventStatus.COMPLETED
        else -> EventStatus.PUBLISHED
    },
    coverImageUrl = displayCoverImage,
    bannerImageUrl = bannerImageUrl ?: displayCoverImage,
    venue = venue?.toDomain() ?: if (venueName != null || city != null) VenueSnippet(
        id = "ven_$id",
        name = venueName ?: "Event Venue",
        city = city,
        state = null,
        address = null,
        latitude = null,
        longitude = null
    ) else null,
    organizer = organizer?.toDomain(),
    ticketTypes = ticketTypes.map { it.toDomain() },
    categories = if (categories.isNotEmpty()) categories else listOfNotNull(categoryName),
    minPrice = displayMinPrice,
    maxPrice = maxPrice ?: displayMinPrice,
    isFree = isFree || (displayMinPrice == 0),
    isFavorited = isFavorited,
    currency = currency,
    soldCount = soldCount,
    totalCapacity = totalCapacity
)

fun VenueSnippetDto.toDomain(): VenueSnippet = VenueSnippet(
    id = id,
    name = name,
    city = city,
    state = state,
    address = address,
    latitude = latitude,
    longitude = longitude
)

fun OrganizerSnippetDto.toDomain(): OrganizerSnippet = OrganizerSnippet(
    id = id,
    name = name,
    logoUrl = logoUrl,
    verified = verified
)

fun TicketTypeDto.toDomain(): TicketType = TicketType(
    id = id,
    name = name,
    description = description,
    price = price,
    currency = currency,
    available = available,
    maxPerOrder = maxPerOrder,
    minPerOrder = minPerOrder,
    saleStartAt = saleStartAt,
    saleEndAt = saleEndAt,
    status = status
)

fun TicketDto.toDomain(): Ticket = Ticket(
    id = id,
    orderId = orderId,
    eventId = eventId,
    event = event?.toDomain() ?: if (eventTitle != null) Event(
        id = eventId,
        name = eventTitle,
        slug = null,
        description = null,
        startAt = eventStartsAt ?: "",
        endAt = null,
        status = EventStatus.PUBLISHED,
        coverImageUrl = null,
        bannerImageUrl = null,
        venue = if (venueName != null) VenueSnippet("ven_$eventId", venueName, null, null, null, null, null) else null,
        organizer = null,
        ticketTypes = emptyList(),
        categories = emptyList(),
        minPrice = null,
        maxPrice = null,
        isFree = false,
        isFavorited = false,
        currency = "INR",
        soldCount = null,
        totalCapacity = null
    ) else null,
    ticketTypeId = ticketTypeId,
    ticketTypeName = tierName ?: ticketTypeName,
    holderName = holderName,
    holderEmail = holderEmail,
    status = when (status.uppercase()) {
        "USED", "CHECKED_IN" -> TicketStatus.USED
        "CANCELLED", "VOIDED" -> TicketStatus.CANCELLED
        "REFUNDED" -> TicketStatus.REFUNDED
        "TRANSFERRED" -> TicketStatus.TRANSFERRED
        else -> TicketStatus.VALID
    },
    qrToken = qrToken,
    issuedAt = issuedAt,
    checkedInAt = checkedInAt,
    seat = seat,
    gate = gate
)

fun OrderDto.toDomain(): Order = Order(
    id = id,
    status = when (status.uppercase()) {
        "PAID", "COMPLETED" -> OrderStatus.PAID
        "CANCELLED" -> OrderStatus.CANCELLED
        "REFUNDED" -> OrderStatus.REFUNDED
        "FAILED" -> OrderStatus.FAILED
        else -> OrderStatus.PENDING
    },
    event = event?.toDomain(),
    items = items.map { it.toDomain() },
    total = total,
    currency = currency,
    createdAt = createdAt,
    paidAt = paidAt
)

fun OrderItemDto.toDomain(): OrderItem = OrderItem(
    id = id,
    ticketTypeId = ticketTypeId,
    ticketTypeName = ticketTypeName,
    quantity = quantity,
    unitPrice = unitPrice,
    lineTotal = lineTotal
)

fun CheckoutSessionDto.toDomain(): CheckoutSession = CheckoutSession(
    id = id,
    eventId = eventId,
    items = items.map { CheckoutLineItem(it.ticketTypeId, it.ticketTypeName, it.quantity, it.unitPrice, it.lineTotal) },
    subtotal = subtotal,
    fees = fees,
    tax = tax,
    total = total,
    currency = currency,
    promoDiscount = promoDiscount,
    promoCode = promoCode,
    expiresAt = expiresAt,
    status = status
)

fun UserDto.toDomain(): User = User(
    id = id,
    email = email,
    name = name,
    avatarUrl = avatarUrl,
    phone = phone,
    role = role
)
