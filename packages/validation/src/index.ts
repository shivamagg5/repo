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

// ---------------------------------------------------------------------------
// Scanner Domain Validation Schemas (Task 9.1)
// ---------------------------------------------------------------------------
export const deviceRegisterSchema = z.object({
  deviceIdentifier: z.string().min(3).max(100),
  publicKeyPem: z.string().min(30),
  deviceModel: z.string().max(100).optional(),
});

export const devicePairSchema = z.object({
  deviceId: uuidSchema,
  eventId: uuidSchema,
  gateId: uuidSchema,
});

export const scanTicketSchema = z.object({
  qrPayload: z.string().min(10),
  eventId: uuidSchema,
  gateId: uuidSchema,
  deviceId: uuidSchema,
  scanTimestamp: z.string().optional(),
});

export const batchSyncScanRecordSchema = z.object({
  syncId: uuidSchema,
  qrPayload: z.string().min(10),
  eventId: uuidSchema,
  gateId: uuidSchema,
  deviceId: uuidSchema,
  deviceScannedAt: z.string(),
  localVerificationResult: z.string(),
});

export const batchSyncScansSchema = z.object({
  deviceId: uuidSchema,
  eventId: uuidSchema,
  records: z.array(batchSyncScanRecordSchema).min(1).max(500),
});

export const attendeeSearchQuerySchema = z.object({
  eventId: uuidSchema,
  query: z.string().min(2).max(100),
});

export const scannerHeartbeatSchema = z.object({
  deviceId: uuidSchema,
  deviceIdentifier: z.string().max(100).optional(),
  eventId: uuidSchema.optional(),
  gateId: uuidSchema.optional(),
  batteryLevel: z.number().min(0).max(100).optional(),
  isCharging: z.boolean().optional(),
  offlineQueueDepth: z.number().int().min(0).optional(),
  networkLatencyMs: z.number().min(0).optional(),
  appVersion: z.string().max(50).optional(),
});

// ---------------------------------------------------------------------------
// Admin Domain Schemas
// ---------------------------------------------------------------------------
export const adminUserSuspendSchema = z.object({
  reason: z.string().min(5).max(500),
});

export const adminEventReviewSchema = z.object({
  action: z.enum(['approve', 'reject', 'suspend']),
  reason: z.string().max(500).optional(),
});

export const adminRefundOrderSchema = z.object({
  reason: z.string().min(5).max(500),
  idempotencyKey: z.string().min(5).max(100),
  amountMinor: z.number().int().positive().optional(),
});

export const adminAuditLogQuerySchema = z.object({
  adminUserId: uuidSchema.optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

// ---------------------------------------------------------------------------
// Finance & Settlement Domain Schemas (Phase 10)
// ---------------------------------------------------------------------------
export const generateSettlementSchema = z.object({
  organizationId: uuidSchema,
  eventId: uuidSchema.optional(),
  periodStart: z.string(),
  periodEnd: z.string(),
  idempotencyKey: z.string().min(5).max(100),
});

export const reviewSettlementSchema = z.object({
  action: z.enum(['approve', 'reject', 'hold']),
  reason: z.string().max(500).optional(),
});

export const runReconciliationSchema = z.object({
  date: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Notifications & CMS Domain Schemas (Phase 11)
// ---------------------------------------------------------------------------
export const registerDeviceTokenSchema = z.object({
  deviceId: z.string().min(3),
  token: z.string().min(5),
  platform: z.enum(['ios', 'android', 'web']),
});

export const updateNotificationPreferencesSchema = z.object({
  preferences: z.array(
    z.object({
      channel: z.enum(['push', 'email', 'sms', 'in_app']),
      category: z.enum(['transactional', 'marketing', 'reminders']),
      enabled: z.boolean(),
    }),
  ),
});

export const createCmsBannerSchema = z.object({
  title: z.string().min(3).max(200),
  imageUrl: z.string().url(),
  targetUrl: z.string().url(),
  displayOrder: z.number().int().optional(),
  status: z.enum(['draft', 'scheduled', 'published', 'archived']).optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
});

export const createCmsCollectionSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z.string().min(3).max(200),
  description: z.string().optional(),
  coverImageUrl: z.string().url().optional(),
  eventIds: z.array(uuidSchema).optional(),
  status: z.enum(['draft', 'scheduled', 'published', 'archived']).optional(),
});

export const createCmsEditorialBlockSchema = z.object({
  blockType: z.string().min(3),
  headline: z.string().min(3).max(300),
  bodyMarkdown: z.string(),
  mediaUrl: z.string().url().optional(),
  displayOrder: z.number().int().optional(),
  status: z.enum(['draft', 'scheduled', 'published', 'archived']).optional(),
});

// ---------------------------------------------------------------------------
// Analytics & Funnels Domain Schemas (Phase 12)
// ---------------------------------------------------------------------------
export const recordAnalyticsEventSchema = z.object({
  clientEventId: z.string().optional(),
  eventName: z.string().min(2).max(100),
  eventId: uuidSchema.optional(),
  sessionId: z.string().optional(),
  platform: z.enum(['web', 'ios', 'android', 'admin']).optional(),
  appVersion: z.string().optional(),
  occurredAt: z.string().optional(),
  properties: z.record(z.any()).optional(),
});

export const recordAnalyticsBatchSchema = z.object({
  events: z.array(recordAnalyticsEventSchema).min(1).max(50),
});

export const funnelQuerySchema = z.object({
  eventId: uuidSchema.optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Security & Scale Hardening Domain Schemas (Phase 13)
// ---------------------------------------------------------------------------
export const mfaVerifySchema = z.object({
  mfaToken: z.string().min(6).max(10),
});

export const reauthInputSchema = z.object({
  password: z.string().optional(),
  mfaCode: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Organizer Marketing & Campaigns Schemas
// ---------------------------------------------------------------------------
export const createOrganizerCampaignSchema = z.object({
  eventId: uuidSchema,
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(50).regex(/^[a-zA-Z0-9_-]+$/, { message: 'Code must be alphanumeric.' }),
  campaignType: z.enum(['discount_code', 'whatsapp_blast', 'sms_campaign', 'email_newsletter', 'qr_campaign']),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  discountValueMinor: z.number().int().nonnegative().optional(),
  usageLimit: z.number().int().positive().optional(),
  startsAt: isoDateSchema.optional(),
  endsAt: isoDateSchema.optional(),
}).strict();

export const addMarketingCreditsSchema = z.object({
  credits: z.number().int().min(100),
  billingType: z.enum(['individual', 'company', 'firm']),
  firmName: z.string().max(200).optional(),
  billingEmail: emailSchema.optional(),
  country: z.string().max(100).default('India'),
  state: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
}).strict();

// ---------------------------------------------------------------------------
// Organizer Attendee & Data Schemas
// ---------------------------------------------------------------------------
export const attendeeQuerySchema = z.object({
  eventId: uuidSchema.optional(),
  search: z.string().max(100).optional(),
  genre: z.string().max(100).optional(),
  firstTxnDate: z.string().optional(),
  lastTxnDate: z.string().optional(),
  sortBy: z.enum(['lastTxn', 'totalSpend', 'totalTxns']).default('lastTxn'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(25),
});

// ---------------------------------------------------------------------------
// Organizer Payout & Payment Profile Schemas
// ---------------------------------------------------------------------------
export const createPaymentProfileSchema = z.object({
  accountName: z.string().min(2).max(200),
  nickname: z.string().max(100).optional(),
  businessAddress: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  pincode: z.string().max(20).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).default('India'),
  accountNumber: z.string().min(8).max(30),
  ifsc: z.string().min(4).max(20),
  pan: z.string().min(5).max(20),
  gstRegistered: z.boolean(),
  gstin: z.string().max(30).optional(),
}).strict();

// ---------------------------------------------------------------------------
// Admin Customer Management Schemas
// ---------------------------------------------------------------------------
export const customerSearchQuerySchema = z.object({
  search: z.string().max(100).optional(),
  tier: z.enum(['all', 'vip', 'regular', 'flagged', 'suspended']).default('all'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(25),
});

export const updateCustomerNotesSchema = z.object({
  adminNotes: z.string().max(2000),
}).strict();

export const adminTicketReissueSchema = z.object({
  ticketId: uuidSchema,
  reason: z.string().min(3).max(500),
}).strict();

export const adminTicketTransferSchema = z.object({
  ticketId: uuidSchema,
  targetEmail: emailSchema,
  reason: z.string().min(3).max(500),
}).strict();

// ---------------------------------------------------------------------------
// Admin Support & Disputes Schemas
// ---------------------------------------------------------------------------
export const adminSupportTicketUpdateSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  internalNotes: z.string().max(2000).optional(),
  assignedAdminId: uuidSchema.optional(),
}).strict();

export const adminRefundDecisionSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  reason: z.string().min(3).max(500),
}).strict();

// ---------------------------------------------------------------------------
// Nightlife, Guestlists & Promoter Payout Schemas
// ---------------------------------------------------------------------------
export const partyEntryTypeSchema = z.enum(['general', 'couple', 'female', 'stag', 'vip_table', 'guestlist']);

export const createGuestlistSchema = z.object({
  eventId: uuidSchema,
  guestName: z.string().min(2).max(100),
  guestPhone: phoneSchema,
  guestEmail: emailSchema.optional(),
  entryType: partyEntryTypeSchema.default('guestlist'),
  allowedCount: z.number().int().positive().max(20).default(1),
  curfewTime: z.string().optional(),
  tableNumber: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
}).strict();

export const promoterPayoutRequestSchema = z.object({
  amountMinor: z.number().int().positive(),
  payoutMethod: z.enum(['upi', 'bank_transfer']),
  upiId: z.string().min(3).max(100).optional(),
  bankAccount: z.object({
    accountNumber: z.string().min(8).max(30),
    ifscCode: z.string().min(4).max(20),
    accountHolderName: z.string().min(2).max(100),
  }).optional(),
  notes: z.string().max(500).optional(),
}).refine((data) => {
  if (data.payoutMethod === 'upi') return !!data.upiId && data.upiId.includes('@');
  if (data.payoutMethod === 'bank_transfer') return !!data.bankAccount;
  return true;
}, {
  message: 'Valid UPI ID (e.g. name@bank) or Bank Account details required based on payoutMethod.',
});

export const createVenueSectionSchema = z.object({
  venueId: uuidSchema,
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(50),
  capacity: z.number().int().positive(),
}).strict();

export const createPatronBlacklistSchema = z.object({
  venueId: uuidSchema,
  patronName: z.string().min(2).max(100),
  patronPhone: phoneSchema,
  patronEmail: emailSchema.optional(),
  reason: z.string().min(3).max(500),
  severity: z.enum(['warning', 'banned']).default('banned'),
}).strict();

export const adminReviewKybSchema = z.object({
  status: z.enum(['verified', 'rejected']).optional(),
  action: z.enum(['verify', 'reject']).optional(),
  reason: z.string().max(500).optional(),
});

export const adminUpdateOrgStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
}).strict();

export const adminUpdateCommissionSchema = z.object({
  customCommissionRateBps: z.number().int().min(0).max(5000),
}).strict();

export const adminGrantCreditsSchema = z.object({
  organizationId: uuidSchema,
  amount: z.number().int().positive(),
  reason: z.string().min(3).max(250),
  idempotencyKey: z.string().min(8).max(200),
}).strict();

export const adminModerateCampaignSchema = z.object({
  status: z.enum(['delivered', 'flagged_content']),
}).strict();

export const adminProcessPayoutSchema = z.object({
  payoutId: uuidSchema,
  idempotencyKey: z.string().min(8).max(200),
  notes: z.string().max(500).optional(),
}).strict();

export const adminDisburseSettlementSchema = z.object({
  transactionReference: z.string().min(3).max(100),
  paidAt: isoDateSchema.optional(),
  idempotencyKey: z.string().min(8).max(200),
}).strict();

export const adminToggleFeaturedSchema = z.object({
  featured: z.boolean(),
}).strict();

export const createScannerPairingTokenSchema = z.object({
  eventId: uuidSchema,
  gateId: uuidSchema.optional(),
}).strict();

export const scannerOnboardSchema = z.object({
  pairingCode: z.string().min(6).max(10),
  deviceName: z.string().min(2).max(100),
  deviceFingerprint: z.string().min(4).max(200),
  publicKeyPem: z.string().min(30),
}).strict();

// ---------------------------------------------------------------------------
// CANONICAL AUTHENTICATION SCHEMAS
// ---------------------------------------------------------------------------
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must not exceed 100 characters');

export const phoneE164Schema = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/, 'Phone number must be in valid E.164 format (e.g. +919876543210)');

export const sendOtpSchema = z.object({
  destination: z.string().min(3).max(100),
  purpose: z.enum(['signup', 'forgot_password', 'phone_change']),
}).strict();

export const verifyOtpSchema = z.object({
  destination: z.string().min(3).max(100),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
  purpose: z.enum(['signup', 'forgot_password', 'phone_change']),
}).strict();

export const signupSchema = z.object({
  phone: phoneE164Schema,
  phoneVerificationToken: z.string().min(16, 'Invalid verification token'),
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1, 'Full name is required').max(100),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD'),
  whatsappConsent: z.boolean().default(false),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the Terms and Conditions and Privacy Policy.' }),
  }),
  termsVersion: z.string().default('1.0'),
}).strict();

export const loginSchema = z.object({
  identifier: z.string().min(3, 'Email or mobile number is required').max(100),
  password: z.string().min(1, 'Password is required'),
}).strict();

export const forgotPasswordRequestSchema = z.object({
  identifier: z.string().min(3, 'Email or mobile number is required').max(100),
}).strict();

export const forgotPasswordVerifySchema = z.object({
  identifier: z.string().min(3).max(100),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
}).strict();

export const forgotPasswordResetSchema = z.object({
  identifier: z.string().min(3).max(100),
  resetToken: z.string().min(16, 'Invalid reset token'),
  newPassword: passwordSchema,
}).strict();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
}).strict();

export const changePhoneRequestSchema = z.object({
  newPhone: phoneE164Schema,
}).strict();

export const changePhoneVerifySchema = z.object({
  newPhone: phoneE164Schema,
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
}).strict();

export const changeEmailRequestSchema = z.object({
  newEmail: emailSchema,
}).strict();

export const updateConsumerProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  avatarUrl: z.string().url().optional(),
  whatsappConsent: z.boolean().optional(),
}).strict();

// Re-export zod for convenience
export { z };


