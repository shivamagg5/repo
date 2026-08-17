export interface AdminUserListItemDto {
  id: string;
  email: string | null;
  name: string;
  phone: string | null;
  status: string;
  createdAt: string;
}

export interface AdminUserDetailDto extends AdminUserListItemDto {
  avatarUrl: string | null;
  updatedAt: string;
  organizations?: Array<{
    organizationId: string;
    organizationName: string;
    roleName: string;
  }>;
}

export interface AdminUserSuspendInput {
  reason: string;
}

export interface AdminEventReviewQueueItemDto {
  id: string;
  title: string;
  slug: string;
  organizerId: string;
  organizerName: string;
  venueId: string | null;
  venueName: string | null;
  status: string;
  startsAt: string;
  submittedAt: string | null;
}

export interface AdminEventReviewInput {
  action: 'approve' | 'reject' | 'suspend';
  reason?: string;
}

export interface AdminOrderInspectionDto {
  id: string;
  userId: string;
  eventId: string;
  eventTitle: string;
  purchaserName: string;
  purchaserEmail: string;
  status: string;
  totalMinor: number;
  currency: string;
  createdAt: string;
  items: Array<{
    id: string;
    ticketTypeName: string;
    quantity: number;
    unitPriceMinor: number;
    totalMinor: number;
  }>;
  tickets: Array<{
    id: string;
    ticketNumber: string;
    status: string;
    checkedInAt: string | null;
  }>;
  payments: Array<{
    id: string;
    provider: string;
    status: string;
    amountMinor: number;
  }>;
}

export interface AdminRefundOrderInput {
  reason: string;
  idempotencyKey: string;
  amountMinor?: number;
}

export interface AdminAuditLogListItemDto {
  id: string;
  actorUserId: string | null;
  actorName?: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface AdminAuditLogQueryInput {
  adminUserId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  cursor?: string;
  limit?: number;
}
