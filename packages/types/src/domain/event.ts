import type { EventStatus } from './enums.js';
import type { VenuePublic } from './venue.js';
import type { TicketType } from './ticket.js';

export interface Event {
  id: string;
  organizerOrganizationId: string;
  venueId: string | null;
  categoryId: string | null;
  title: string;
  slug: string;
  description: string | null;
  status: EventStatus;
  startsAt: string;
  endsAt: string;
  timezone: string;
  capacity: number | null;
  ageRestriction: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Optimized list DTO for event discovery feeds & card grids.
 */
export interface EventListItemDto {
  id: string;
  title: string;
  slug: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  coverImage: string | null;
  city: string | null;
  venueName: string | null;
  venueSlug: string | null;
  categoryName: string | null;
  categorySlug: string | null;
}

/**
 * Detailed public DTO for event detail pages (`/events/[slug]`).
 * Sanitized — contains ZERO internal management data or audit logs.
 */
export interface EventDetailPublicDto {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  timezone: string;
  ageRestriction: string | null;
  publishedAt: string | null;
  category: EventCategoryPublicDto | null;
  venue: VenuePublic | null;
  media: EventMediaDto[];
  lineup: EventLineupDto[];
  ticketTypes: TicketType[];
}

export interface EventCategoryPublicDto {
  id: string;
  name: string;
  slug: string;
}

export interface EventMediaDto {
  id: string;
  url: string;
  type: string;
  sortOrder: number;
}

export interface EventLineupDto {
  id: string;
  name: string;
  role: string | null;
  sortOrder: number;
}

export interface EventCategory {
  id: string;
  name: string;
  slug: string;
  status: string;
}

export interface EventMedia {
  id: string;
  eventId: string;
  url: string;
  type: string;
  sortOrder: number;
}

export interface EventLineup {
  id: string;
  eventId: string;
  name: string;
  role: string | null;
  sortOrder: number;
}

export interface CreateEventInput {
  organizerOrganizationId?: string; // Derived / validated server-side
  venueId?: string;
  categoryId?: string;
  title: string;
  slug: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  timezone?: string;
  capacity?: number;
  ageRestriction?: string;
}

export interface UpdateEventInput {
  venueId?: string | null;
  categoryId?: string | null;
  title?: string;
  description?: string | null;
  startsAt?: string;
  endsAt?: string;
  timezone?: string;
  capacity?: number | null;
  ageRestriction?: string | null;
}

export interface ReviewEventInput {
  decision: 'approve' | 'reject';
  reason?: string;
}

// Cursor Pagination types
export interface CursorPaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount?: number;
}

export type DatePreset = 'today' | 'tomorrow' | 'this_weekend' | 'this_week' | 'this_month';
export type EventSortOption = 'date' | 'newest' | 'relevance';
