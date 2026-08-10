// =============================================================================
// @platform/validation — Shared Zod Schemas
// =============================================================================
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Common primitives
// ---------------------------------------------------------------------------
export const uuidSchema = z.string().uuid();
export const slugSchema = z.string().min(1).max(100).regex(/^[a-z0-9-]+$/);
export const emailSchema = z.string().email().toLowerCase();
export const phoneSchema = z.string().regex(/^\+?[0-9\s\-().]{7,20}$/).optional();
export const urlSchema = z.string().url();
export const isoDateSchema = z.string().datetime();

// ---------------------------------------------------------------------------
// Enum schemas
// ---------------------------------------------------------------------------
export const userStatusSchema = z.enum(['active', 'suspended', 'deleted']);
export const organizationTypeSchema = z.enum(['organizer', 'venue', 'promoter']);
export const organizationStatusSchema = z.enum(['pending', 'active', 'suspended', 'rejected']);
export const eventStatusSchema = z.enum([
  'draft', 'submitted', 'under_review', 'approved',
  'published', 'live', 'completed', 'rejected', 'suspended', 'cancelled',
]);
export const ticketStatusSchema = z.enum([
  'issued', 'checked_in', 'refunded', 'void', 'cancelled', 'expired',
]);
export const orderStatusSchema = z.enum([
  'created', 'payment_pending', 'paid', 'tickets_issued', 'completed',
  'payment_failed', 'cancelled', 'refund_pending', 'partially_refunded', 'refunded',
]);
export const paymentStatusSchema = z.enum([
  'pending', 'authorized', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded',
]);
export const refundStatusSchema = z.enum([
  'requested', 'pending', 'processing', 'completed', 'failed', 'cancelled',
]);
export const settlementStatusSchema = z.enum([
  'draft', 'pending_review', 'approved', 'processing', 'paid', 'failed', 'cancelled',
]);
export const checkinResultSchema = z.enum([
  'success', 'invalid', 'already_used', 'wrong_event',
  'refunded', 'cancelled', 'expired', 'access_denied', 'offline_pending',
]);

// ---------------------------------------------------------------------------
// Domain schemas — User & Org
// ---------------------------------------------------------------------------
export const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: emailSchema.optional(),
  phone: phoneSchema,
  avatarUrl: urlSchema.optional(),
});

export const updateUserSchema = createUserSchema.partial();

export const createOrganizationSchema = z.object({
  type: organizationTypeSchema,
  name: z.string().min(1).max(200),
  slug: slugSchema,
  description: z.string().max(2000).optional(),
  logoUrl: urlSchema.optional(),
});

export const inviteMemberSchema = z.object({
  email: emailSchema,
  roleId: uuidSchema.optional(),
  roleName: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Domain schemas — Venues
// ---------------------------------------------------------------------------
export const createVenueSchema = z.object({
  organizationId: uuidSchema.optional(), // Optional in payload; derived / verified on server
  name: z.string().min(1).max(200),
  slug: slugSchema,
  description: z.string().max(2000).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional().default('IN'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  capacity: z.number().int().positive().optional(),
}).strict();

export const updateVenueSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  capacity: z.number().int().positive().optional().nullable(),
}).strict();

export const addVenueMediaSchema = z.object({
  url: urlSchema,
  type: z.enum(['image', 'video']).default('image'),
  sortOrder: z.number().int().nonnegative().default(0),
}).strict();

// ---------------------------------------------------------------------------
// Domain schemas — Events
// ---------------------------------------------------------------------------
export const createEventSchema = z.object({
  organizerOrganizationId: uuidSchema.optional(), // Optional in payload; derived / verified on server
  venueId: uuidSchema.optional().nullable(),
  categoryId: uuidSchema.optional().nullable(),
  title: z.string().min(1).max(300),
  slug: slugSchema,
  description: z.string().max(10000).optional(),
  startsAt: isoDateSchema,
  endsAt: isoDateSchema,
  timezone: z.string().min(1).max(50).default('Asia/Kolkata'),
  capacity: z.number().int().positive().optional().nullable(),
  ageRestriction: z.string().max(50).optional().nullable(),
}).strict().refine((data) => new Date(data.endsAt) > new Date(data.startsAt), {
  message: 'endsAt must be after startsAt',
  path: ['endsAt'],
});

export const updateEventSchema = z.object({
  venueId: uuidSchema.optional().nullable(),
  categoryId: uuidSchema.optional().nullable(),
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(10000).optional().nullable(),
  startsAt: isoDateSchema.optional(),
  endsAt: isoDateSchema.optional(),
  timezone: z.string().min(1).max(50).optional(),
  capacity: z.number().int().positive().optional().nullable(),
  ageRestriction: z.string().max(50).optional().nullable(),
}).strict();

export const reviewEventSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  reason: z.string().max(1000).optional(),
}).strict();

export const addEventMediaSchema = z.object({
  url: urlSchema,
  type: z.enum(['image', 'video']).default('image'),
  sortOrder: z.number().int().nonnegative().default(0),
}).strict();

export const setEventLineupSchema = z.object({
  lineup: z.array(
    z.object({
      name: z.string().min(1).max(200),
      role: z.string().max(100).optional().nullable(),
      sortOrder: z.number().int().nonnegative().default(0),
    }),
  ),
}).strict();

export const createTicketTypeSchema = z.object({
  eventId: uuidSchema,
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  priceMinor: z.number().int().nonnegative(),
  currency: z.string().length(3).default('INR'),
  quantity: z.number().int().positive(),
  minPerOrder: z.number().int().positive().default(1),
  maxPerOrder: z.number().int().positive().default(10),
  saleStartsAt: isoDateSchema.optional().nullable(),
  saleEndsAt: isoDateSchema.optional().nullable(),
  status: z.enum(['draft', 'active', 'paused', 'sold_out', 'closed']).default('active'),
}).strict().refine((data) => data.maxPerOrder >= data.minPerOrder, {
  message: 'maxPerOrder must be greater than or equal to minPerOrder',
  path: ['maxPerOrder'],
});

export const updateTicketTypeSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  priceMinor: z.number().int().nonnegative().optional(),
  quantity: z.number().int().positive().optional(),
  minPerOrder: z.number().int().positive().optional(),
  maxPerOrder: z.number().int().positive().optional(),
  saleStartsAt: isoDateSchema.optional().nullable(),
  saleEndsAt: isoDateSchema.optional().nullable(),
  status: z.enum(['draft', 'active', 'paused', 'sold_out', 'closed']).optional(),
}).strict();

export const createReservationSchema = z.object({
  ticketTypeId: uuidSchema,
  quantity: z.number().int().positive(),
  idempotencyKey: z.string().min(1).max(200).optional(),
  // Strict check: reject if client attempts to pass price overrides
}).strict();

export const cancelReservationSchema = z.object({
  reservationId: uuidSchema,
}).strict();

export const createOrderSchema = z.object({
  reservationId: uuidSchema,
  idempotencyKey: z.string().min(1).max(200).optional(),
}).strict();

export const createPaymentIntentSchema = z.object({
  orderId: uuidSchema,
  idempotencyKey: z.string().min(1).max(200).optional(),
  provider: z.string().min(1).max(50).default('razorpay'),
}).strict();

export const createPromoterCampaignSchema = z.object({
  eventId: uuidSchema,
  code: z.string().min(2).max(50).regex(/^[a-zA-Z0-9_-]+$/, { message: 'Code must be alphanumeric.' }),
  commissionType: z.enum(['percentage', 'fixed']),
  commissionValue: z.number().positive(),
}).strict();

export const recordReferralClickSchema = z.object({
  code: z.string().min(2).max(50),
  sessionReference: z.string().max(250).optional(),
}).strict();

export const attributeOrderSchema = z.object({
  orderId: uuidSchema,
  code: z.string().min(2).max(50),
}).strict();

// ---------------------------------------------------------------------------
// Pagination & Public Discovery schemas
// ---------------------------------------------------------------------------
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  cursor: z.string().optional(),
});

export const cursorPaginationSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(24),
  cursor: z.string().optional(),
});

export const datePresetEnum = z.enum([
  'today', 'tomorrow', 'this_weekend', 'this_week', 'this_month',
]);

export const eventSortOptionEnum = z.enum(['date', 'newest', 'relevance']);

export const publicDiscoveryQuerySchema = z.object({
  q: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  venueId: uuidSchema.optional(),
  dateFrom: isoDateSchema.optional(),
  dateTo: isoDateSchema.optional(),
  datePreset: datePresetEnum.optional(),
  sort: eventSortOptionEnum.default('date'),
  limit: z.coerce.number().int().positive().max(100).default(24),
  cursor: z.string().optional(),
  timezone: z.string().max(50).optional().default('Asia/Kolkata'),
});

// Re-export zod for convenience
export { z };
