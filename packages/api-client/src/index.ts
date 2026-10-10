// =============================================================================
// @platform/api-client
// Typed HTTP client for the event platform backend API.
// Used by all web and mobile (via bridging) applications.
// =============================================================================
import type { ApiSuccess, ApiError, ApiResponse } from '@platform/types';

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode?: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export interface ApiClientConfig {
  baseUrl: string;
  getAuthToken?: () => Promise<string | null> | string | null;
  onUnauthorized?: () => void;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly getAuthToken: (() => Promise<string | null> | string | null) | undefined;
  private readonly onUnauthorized: (() => void) | undefined;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.getAuthToken = config.getAuthToken;
    this.onUnauthorized = config.onUnauthorized;
  }

  private async buildHeaders(idempotencyKey?: string): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.getAuthToken) {
      const token = await this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<ApiSuccess<T>> {
    const body = (await response.json()) as ApiResponse<T>;

    if (!response.ok) {
      if (response.status === 401) {
        this.onUnauthorized?.();
      }
      const errorBody = body as ApiError;
      throw new ApiClientError(
        errorBody.error?.code ?? 'UNKNOWN_ERROR',
        errorBody.error?.message ?? 'An unknown error occurred',
        response.status,
        errorBody.error?.details,
      );
    }

    return body as ApiSuccess<T>;
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<ApiSuccess<T>> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value);
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: await this.buildHeaders(),
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(path: string, body?: unknown, idempotencyKey?: string): Promise<ApiSuccess<T>> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: await this.buildHeaders(idempotencyKey),
      body: body ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async put<T>(path: string, body?: unknown): Promise<ApiSuccess<T>> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: await this.buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async patch<T>(path: string, body?: unknown): Promise<ApiSuccess<T>> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: await this.buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(path: string): Promise<ApiSuccess<T>> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: await this.buildHeaders(),
    });

    return this.handleResponse<T>(response);
  }

  // ---------------------------------------------------------------------------
  // Auth Domain Methods
  // ---------------------------------------------------------------------------
  async getMe<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/auth/me');
  }

  async syncUser<T>(body: { name?: string; avatarUrl?: string }): Promise<ApiSuccess<T>> {
    return this.post<T>('/auth/sync', body);
  }

  async logoutUser<T>(): Promise<ApiSuccess<T>> {
    return this.post<T>('/auth/logout');
  }

  // ---------------------------------------------------------------------------
  // Public Discovery Methods
  // ---------------------------------------------------------------------------
  async getPublicEvents<T>(params?: Record<string, string>): Promise<ApiSuccess<T>> {
    return this.get<T>('/public/events', params);
  }

  async getPublicEventsFeed<T>(params?: Record<string, string>): Promise<T> {
    const res = await this.get<T>('/public/events', params);
    return res.data;
  }

  async getPublicEventBySlug<T>(slug: string): Promise<ApiSuccess<T>> {
    return this.get<T>(`/public/events/${encodeURIComponent(slug)}`);
  }

  async getPublicVenues<T>(params?: Record<string, string>): Promise<ApiSuccess<T>> {
    return this.get<T>('/public/venues', params);
  }

  async getPublicVenueBySlug<T>(slug: string): Promise<ApiSuccess<T>> {
    return this.get<T>(`/public/venues/${encodeURIComponent(slug)}`);
  }

  async getPublicCategories<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/public/categories');
  }

  // ---------------------------------------------------------------------------
  // CMS Methods
  // ---------------------------------------------------------------------------
  async getCmsBanners<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/cms/banners');
  }

  async getAdminCmsBanners<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/cms/admin/banners');
  }

  async getCmsFeaturedEvents<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/cms/featured-events');
  }

  async getCmsEditorialBlocks<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/cms/editorial-blocks');
  }

  async getCmsCollections<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/cms/collections');
  }

  async createCmsBanner<T>(body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>('/cms/banners', body);
  }

  async updateCmsBanner<T>(id: string, body: unknown): Promise<ApiSuccess<T>> {
    return this.patch<T>(`/cms/banners/${encodeURIComponent(id)}`, body);
  }

  async deleteCmsBanner<T>(id: string): Promise<ApiSuccess<T>> {
    return this.delete<T>(`/cms/banners/${encodeURIComponent(id)}`);
  }

  async createCmsCollection<T>(body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>('/cms/collections', body);
  }

  async createCmsEditorialBlock<T>(body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>('/cms/editorial-blocks', body);
  }

  async addCmsFeaturedEvent<T>(body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>('/cms/featured-events', body);
  }

  async removeCmsFeaturedEvent<T>(id: string): Promise<ApiSuccess<T>> {
    return this.delete<T>(`/cms/featured-events/${encodeURIComponent(id)}`);
  }

  // ---------------------------------------------------------------------------
  // Ticketing Engine Methods
  // ---------------------------------------------------------------------------
  async createTicketType<T>(eventId: string, body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>(`/events/${encodeURIComponent(eventId)}/ticket-types`, body);
  }

  async updateTicketType<T>(ticketTypeId: string, body: unknown): Promise<ApiSuccess<T>> {
    return this.patch<T>(`/ticket-types/${encodeURIComponent(ticketTypeId)}`, body);
  }

  async getEventTicketTypes<T>(eventId: string): Promise<ApiSuccess<T>> {
    return this.get<T>(`/events/${encodeURIComponent(eventId)}/ticket-types`);
  }

  async createReservation<T>(body: unknown, idempotencyKey?: string): Promise<ApiSuccess<T>> {
    return this.post<T>('/reservations', body, idempotencyKey);
  }

  async getReservation<T>(id: string): Promise<ApiSuccess<T>> {
    return this.get<T>(`/reservations/${encodeURIComponent(id)}`);
  }

  async cancelReservation<T>(id: string): Promise<ApiSuccess<T>> {
    return this.post<T>(`/reservations/${encodeURIComponent(id)}/cancel`);
  }

  // ---------------------------------------------------------------------------
  // Orders & Tickets Methods (actor-scoped on backend)
  // ---------------------------------------------------------------------------
  async createOrder<T>(body: unknown, idempotencyKey?: string): Promise<ApiSuccess<T>> {
    return this.post<T>('/orders', body, idempotencyKey);
  }

  async getOrder<T>(id: string): Promise<ApiSuccess<T>> {
    return this.get<T>(`/orders/${encodeURIComponent(id)}`);
  }

  async listUserOrders<T>(params?: Record<string, string>): Promise<ApiSuccess<T>> {
    return this.get<T>('/orders', params);
  }

  async confirmOrderPayment<T>(id: string): Promise<ApiSuccess<T>> {
    return this.post<T>(`/orders/${encodeURIComponent(id)}/confirm`);
  }

  async getUserTickets<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/tickets');
  }

  async getTicketById<T>(id: string): Promise<ApiSuccess<T>> {
    return this.get<T>(`/tickets/${encodeURIComponent(id)}`);
  }

  // ---------------------------------------------------------------------------
  // Payment Methods
  // ---------------------------------------------------------------------------
  async createPaymentIntent<T>(body: unknown, idempotencyKey?: string): Promise<ApiSuccess<T>> {
    return this.post<T>('/payments/intent', body, idempotencyKey);
  }

  async getPaymentTransaction<T>(id: string): Promise<ApiSuccess<T>> {
    return this.get<T>(`/payments/${encodeURIComponent(id)}`);
  }

  // ---------------------------------------------------------------------------
  // Events Management (Organizer)
  // ---------------------------------------------------------------------------
  async createEvent<T>(organizationId: string, body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>(`/events?organizationId=${encodeURIComponent(organizationId)}`, body);
  }

  async listEvents<T>(organizationId: string): Promise<ApiSuccess<T>> {
    return this.get<T>(`/events?organizationId=${encodeURIComponent(organizationId)}`);
  }

  async getEventById<T>(id: string): Promise<ApiSuccess<T>> {
    return this.get<T>(`/events/${encodeURIComponent(id)}`);
  }

  async updateEvent<T>(id: string, body: unknown): Promise<ApiSuccess<T>> {
    return this.patch<T>(`/events/${encodeURIComponent(id)}`, body);
  }

  async submitEventForReview<T>(id: string): Promise<ApiSuccess<T>> {
    return this.post<T>(`/events/${encodeURIComponent(id)}/submit`);
  }

  async publishEvent<T>(id: string): Promise<ApiSuccess<T>> {
    return this.post<T>(`/events/${encodeURIComponent(id)}/publish`);
  }

  async unpublishEvent<T>(id: string): Promise<ApiSuccess<T>> {
    return this.post<T>(`/events/${encodeURIComponent(id)}/unpublish`);
  }

  async cancelEvent<T>(id: string): Promise<ApiSuccess<T>> {
    return this.post<T>(`/events/${encodeURIComponent(id)}/cancel`);
  }

  async addEventMedia<T>(id: string, body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>(`/events/${encodeURIComponent(id)}/media`, body);
  }

  async removeEventMedia<T>(id: string, mediaId: string): Promise<ApiSuccess<T>> {
    return this.delete<T>(`/events/${encodeURIComponent(id)}/media/${encodeURIComponent(mediaId)}`);
  }

  async setEventLineup<T>(id: string, body: unknown): Promise<ApiSuccess<T>> {
    return this.put<T>(`/events/${encodeURIComponent(id)}/lineup`, body);
  }

  // ---------------------------------------------------------------------------
  // Promoter Engine Methods
  // ---------------------------------------------------------------------------
  async createPromoterCampaign<T>(body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>('/promoter/campaigns', body);
  }

  async getPromoterCampaigns<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/promoter/campaigns');
  }

  async getPromoterCampaignById<T>(id: string): Promise<ApiSuccess<T>> {
    return this.get<T>(`/promoter/campaigns/${encodeURIComponent(id)}`);
  }

  async getPromoterCampaignPerformance<T>(id: string): Promise<ApiSuccess<T>> {
    return this.get<T>(`/promoter/campaigns/${encodeURIComponent(id)}/performance`);
  }

  async getPromoterEarnings<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/promoter/earnings');
  }

  async getPromoterCommissions<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/promoter/commissions');
  }

  async getPromoterPayouts<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/promoter/payouts');
  }

  async requestPromoterPayout<T>(body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>('/promoter/payouts/request', body);
  }

  async recordReferralClick<T>(body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>('/public/referrals/click', body);
  }

  async attributeOrder<T>(orderId: string, code: string): Promise<ApiSuccess<T>> {
    return this.post<T>(`/orders/${encodeURIComponent(orderId)}/attribute`, { code });
  }

  // ---------------------------------------------------------------------------
  // Organizer Dashboard Methods
  // ---------------------------------------------------------------------------
  async getOrganizerOverview<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/organizer/overview');
  }

  async getOrganizerEvents<T>(params?: Record<string, string>): Promise<ApiSuccess<T>> {
    return this.get<T>('/organizer/events', params);
  }

  async getOrganizerEventDashboard<T>(eventId: string): Promise<ApiSuccess<T>> {
    return this.get<T>(`/organizer/events/${encodeURIComponent(eventId)}/dashboard`);
  }

  async getOrganizerEventOrders<T>(eventId: string, params?: Record<string, string>): Promise<ApiSuccess<T>> {
    return this.get<T>(`/organizer/events/${encodeURIComponent(eventId)}/orders`, params);
  }

  async getOrganizerEventAttendance<T>(eventId: string): Promise<ApiSuccess<T>> {
    return this.get<T>(`/organizer/events/${encodeURIComponent(eventId)}/attendance`);
  }

  async getOrganizerEventPromoters<T>(eventId: string): Promise<ApiSuccess<T>> {
    return this.get<T>(`/organizer/events/${encodeURIComponent(eventId)}/promoters`);
  }

  async getOrganizerTeam<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/organizer/team');
  }

  async inviteTeamMember<T>(body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>('/organizer/team/invitations', body);
  }

  // ---------------------------------------------------------------------------
  // Venue Dashboard Methods
  // ---------------------------------------------------------------------------
  async getVenueProfile<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/venue/profile');
  }

  async updateVenueProfile<T>(body: unknown): Promise<ApiSuccess<T>> {
    return this.patch<T>('/venue/profile', body);
  }

  async getVenueCalendar<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/venue/calendar');
  }

  async getVenueEvents<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/venue/events');
  }

  async getVenueStaff<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/venue/staff');
  }

  async inviteVenueStaff<T>(body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>('/venue/staff', body);
  }

  async getVenueTables<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/venue/tables');
  }

  async updateVenueTable<T>(tableId: string, body: unknown): Promise<ApiSuccess<T>> {
    return this.patch<T>(`/venue/tables/${encodeURIComponent(tableId)}`, body);
  }

  async addVenueTableOrder<T>(tableId: string, bottleName: string, price?: number): Promise<ApiSuccess<T>> {
    return this.post<T>(`/venue/tables/${encodeURIComponent(tableId)}/orders`, { bottleName, price });
  }

  async resetVenueTable<T>(tableId: string): Promise<ApiSuccess<T>> {
    return this.post<T>(`/venue/tables/${encodeURIComponent(tableId)}/reset`);
  }

  // ---------------------------------------------------------------------------
  // Finance & Settlement Methods
  // ---------------------------------------------------------------------------
  async listFinancialTransactions<T>(params?: Record<string, string>): Promise<ApiSuccess<T>> {
    return this.get<T>('/finance/transactions', params);
  }

  async runReconciliation<T>(body?: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>('/finance/reconciliation/run', body);
  }

  async generateSettlement<T>(body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>('/settlements/generate', body);
  }

  async reviewSettlement<T>(id: string, body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>(`/settlements/${encodeURIComponent(id)}/review`, body);
  }

  async getOrganizerStatement<T>(organizationId: string, params?: Record<string, string>): Promise<ApiSuccess<T>> {
    return this.get<T>(`/settlements/organizer/${encodeURIComponent(organizationId)}/statement`, params);
  }

  // ---------------------------------------------------------------------------
  // Notification Methods
  // ---------------------------------------------------------------------------
  async registerDeviceToken<T>(body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>('/notifications/device-tokens', body);
  }

  async updateNotificationPreferences<T>(body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>('/notifications/preferences', body);
  }

  async getInAppNotifications<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/notifications/in-app');
  }

  // ---------------------------------------------------------------------------
  // Analytics Methods
  // ---------------------------------------------------------------------------
  async recordAnalyticsEvent<T>(body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>('/analytics/events', body);
  }

  async recordAnalyticsBatch<T>(body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>('/analytics/events/batch', body);
  }

  async getFunnelAnalysis<T>(params?: Record<string, string>): Promise<ApiSuccess<T>> {
    return this.get<T>('/analytics/funnel', params);
  }

  async getOrganizerAnalytics<T>(organizationId: string, params?: Record<string, string>): Promise<ApiSuccess<T>> {
    return this.get<T>(`/analytics/organizer/${encodeURIComponent(organizationId)}`, params);
  }

  async getScannerMetrics<T>(eventId: string): Promise<ApiSuccess<T>> {
    return this.get<T>(`/analytics/scanner/${encodeURIComponent(eventId)}`);
  }

  async getAdminPlatformMetrics<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/analytics/admin');
  }

  // ---------------------------------------------------------------------------
  // Scanner Methods
  // ---------------------------------------------------------------------------
  async registerScannerDevice<T>(body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>('/scanner/register', body);
  }

  async pairScannerDevice<T>(body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>('/scanner/pair', body);
  }

  async getEventAuthPackage<T>(eventId: string, deviceId?: string, gateId?: string): Promise<ApiSuccess<T>> {
    const params: Record<string, string> = {};
    if (deviceId) params['deviceId'] = deviceId;
    if (gateId) params['gateId'] = gateId;
    const query = Object.keys(params).length > 0 ? `?${new URLSearchParams(params).toString()}` : '';
    return this.get<T>(`/scanner/events/${encodeURIComponent(eventId)}/package${query}`);
  }

  async scanTicket<T>(body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>('/scanner/scan', body);
  }

  async syncOfflineScans<T>(body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>('/scanner/sync', body);
  }

  async searchAttendees<T>(eventId: string, query: string): Promise<ApiSuccess<T>> {
    const params = new URLSearchParams({ eventId, query }).toString();
    return this.get<T>(`/scanner/attendees?${params}`);
  }

  async manualCheckin<T>(body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>('/scanner/manual-checkin', body);
  }

  async getTurnstileTelemetry<T>(eventId: string): Promise<ApiSuccess<T>> {
    return this.get<T>(`/events/${encodeURIComponent(eventId)}/telemetry`);
  }

  getTurnstileTelemetryStreamUrl(eventId: string, token?: string): string {
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${this.baseUrl}/events/${encodeURIComponent(eventId)}/live/telemetry${query}`;
  }

  async recordDoorClicker<T>(
    eventId: string,
    body: { delta?: number; direction: 'admit' | 'exit'; gate?: string },
  ): Promise<ApiSuccess<T>> {
    return this.post<T>(`/events/${encodeURIComponent(eventId)}/clicker`, body);
  }

  async admitDoorWalkIn<T>(eventId: string, body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>(`/events/${encodeURIComponent(eventId)}/door-walkin`, body);
  }

  async getEventDevices<T>(eventId: string): Promise<ApiSuccess<T>> {
    return this.get<T>(`/scanner/events/${encodeURIComponent(eventId)}/devices`);
  }

  async recordScannerHeartbeat<T>(body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>('/scanner/heartbeat', body);
  }

  async getEventGuestlists<T>(eventId: string): Promise<ApiSuccess<T>> {
    return this.get<T>(`/events/${encodeURIComponent(eventId)}/guestlists`);
  }

  async checkInGuestlistEntry<T>(guestlistId: string, count: number = 1): Promise<ApiSuccess<T>> {
    return this.post<T>(`/guestlists/${encodeURIComponent(guestlistId)}/checkin`, { count });
  }

  // ---------------------------------------------------------------------------
  // Admin Domain Methods
  // ---------------------------------------------------------------------------
  async getAdminUsers<T>(params?: Record<string, string>): Promise<ApiSuccess<T>> {
    return this.get<T>('/admin/users', params);
  }

  async suspendAdminUser<T>(id: string, body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>(`/admin/users/${encodeURIComponent(id)}/suspend`, body);
  }

  async restoreAdminUser<T>(id: string): Promise<ApiSuccess<T>> {
    return this.post<T>(`/admin/users/${encodeURIComponent(id)}/restore`);
  }

  async getAdminEventReviewQueue<T>(limitOrParams?: number | Record<string, string>): Promise<ApiSuccess<T>> {
    const params = typeof limitOrParams === 'number'
      ? { limit: String(limitOrParams) }
      : limitOrParams;
    return this.get<T>('/admin/events/review-queue', params);
  }

  async reviewAdminEvent<T>(id: string, body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>(`/admin/events/${encodeURIComponent(id)}/review`, body);
  }

  async listAdminOrders<T>(params?: Record<string, string>): Promise<ApiSuccess<T>> {
    return this.get<T>('/admin/orders', params);
  }

  async inspectAdminOrder<T>(id: string): Promise<ApiSuccess<T>> {
    return this.get<T>(`/admin/orders/${encodeURIComponent(id)}`);
  }

  async refundAdminOrder<T>(id: string, body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>(`/admin/orders/${encodeURIComponent(id)}/refund`, body);
  }

  async getAdminAuditLogs<T>(params?: Record<string, string>): Promise<ApiSuccess<T>> {
    return this.get<T>('/admin/audit-logs', params);
  }

  // ---------------------------------------------------------------------------
  // Organizer Marketing & Campaigns
  // ---------------------------------------------------------------------------
  async getOrganizerMarketingOverview<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/organizer/marketing/overview');
  }

  async getOrganizerMarketingCampaigns<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/organizer/marketing/campaigns');
  }

  async createOrganizerMarketingCampaign<T>(body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>('/organizer/marketing/campaigns', body);
  }

  async getOrganizerMarketingCredits<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/organizer/marketing/credits');
  }

  async topupOrganizerMarketingCredits<T>(body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>('/organizer/marketing/credits/topup', body);
  }

  // ---------------------------------------------------------------------------
  // Organizer Data & Attendees
  // ---------------------------------------------------------------------------
  async getOrganizerAttendees<T>(params?: Record<string, string>): Promise<ApiSuccess<T>> {
    return this.get<T>('/organizer/data/attendees', params);
  }

  async getOrganizerPromoterPerformance<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/organizer/data/promoters');
  }

  async getOrganizerScanMetrics<T>(eventId?: string): Promise<ApiSuccess<T>> {
    const params = eventId ? { eventId } : undefined;
    return this.get<T>('/organizer/data/scan-metrics', params);
  }

  // ---------------------------------------------------------------------------
  // Organizer Payouts & Profiles
  // ---------------------------------------------------------------------------
  async getOrganizerPaymentProfiles<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/organizer/payouts/profiles');
  }

  async createOrganizerPaymentProfile<T>(body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>('/organizer/payouts/profiles', body);
  }

  async getOrganizerEventPayouts<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/organizer/payouts/events');
  }

  // ---------------------------------------------------------------------------
  // Admin Customers & 360 Profiles
  // ---------------------------------------------------------------------------
  async getAdminCustomers<T>(params?: Record<string, string>): Promise<ApiSuccess<T>> {
    return this.get<T>('/admin/customers', params);
  }

  async getAdminCustomerProfile<T>(id: string): Promise<ApiSuccess<T>> {
    return this.get<T>(`/admin/customers/${encodeURIComponent(id)}`);
  }

  async updateAdminCustomerNotes<T>(id: string, adminNotes: string): Promise<ApiSuccess<T>> {
    return this.post<T>(`/admin/customers/${encodeURIComponent(id)}/notes`, { adminNotes });
  }

  async reissueAdminCustomerTicket<T>(ticketId: string, reason: string): Promise<ApiSuccess<T>> {
    return this.post<T>(`/admin/customers/tickets/${encodeURIComponent(ticketId)}/reissue`, { reason });
  }

  async transferAdminCustomerTicket<T>(ticketId: string, targetEmail: string, reason: string): Promise<ApiSuccess<T>> {
    return this.post<T>(`/admin/customers/tickets/${encodeURIComponent(ticketId)}/transfer`, { targetEmail, reason });
  }

  // ---------------------------------------------------------------------------
  // Admin Support & Disputes
  // ---------------------------------------------------------------------------
  async getAdminSupportTickets<T>(params?: Record<string, string>): Promise<ApiSuccess<T>> {
    return this.get<T>('/admin/support/tickets', params);
  }

  async updateAdminSupportTicket<T>(id: string, body: unknown): Promise<ApiSuccess<T>> {
    return this.patch<T>(`/admin/support/tickets/${encodeURIComponent(id)}`, body);
  }

  async getAdminRefundQueue<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/admin/support/refund-queue');
  }

  async decideAdminRefund<T>(orderId: string, body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>(`/admin/support/refund-queue/${encodeURIComponent(orderId)}/decision`, body);
  }

  async getAdminChargebackLogs<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/admin/support/chargebacks');
  }

  // ---------------------------------------------------------------------------
  // Admin Dashboard Operations (Events, Organizers, Marketing, Promoters, Settlements)
  // ---------------------------------------------------------------------------
  async getAdminEvents<T>(params?: Record<string, string>): Promise<ApiSuccess<T>> {
    return this.get<T>('/admin/events', params);
  }

  async toggleAdminEventFeatured<T>(eventId: string, featured: boolean): Promise<ApiSuccess<T>> {
    return this.post<T>(`/admin/events/${encodeURIComponent(eventId)}/toggle-featured`, { featured });
  }

  async getAdminOrganizers<T>(params?: Record<string, string>): Promise<ApiSuccess<T>> {
    return this.get<T>('/admin/organizers', params);
  }

  async reviewAdminOrganizerKyb<T>(orgId: string, body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>(`/admin/organizers/${encodeURIComponent(orgId)}/kyb`, body);
  }

  async updateAdminOrganizerStatus<T>(orgId: string, body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>(`/admin/organizers/${encodeURIComponent(orgId)}/status`, body);
  }

  async updateAdminOrganizerCommission<T>(orgId: string, body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>(`/admin/organizers/${encodeURIComponent(orgId)}/commission`, body);
  }

  async getAdminMarketingWallets<T>(params?: Record<string, string>): Promise<ApiSuccess<T>> {
    return this.get<T>('/admin/marketing/wallets', params);
  }

  async grantAdminMarketingCredits<T>(orgId: string, body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>(`/admin/marketing/wallets/${encodeURIComponent(orgId)}/grant`, body);
  }

  async getAdminMarketingCampaigns<T>(params?: Record<string, string>): Promise<ApiSuccess<T>> {
    return this.get<T>('/admin/marketing/campaigns', params);
  }

  async moderateAdminMarketingCampaign<T>(campaignId: string, body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>(`/admin/marketing/campaigns/${encodeURIComponent(campaignId)}/moderate`, body);
  }

  async getAdminPromoters<T>(params?: Record<string, string>): Promise<ApiSuccess<T>> {
    return this.get<T>('/admin/promoters', params);
  }

  async processAdminPromoterPayout<T>(payoutId: string, body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>(`/admin/promoters/payouts/${encodeURIComponent(payoutId)}/process`, body);
  }

  async rejectAdminPromoterPayout<T>(payoutId: string, reason: string): Promise<ApiSuccess<T>> {
    return this.post<T>(`/admin/promoters/payouts/${encodeURIComponent(payoutId)}/reject`, { reason });
  }

  async getAdminSettlements<T>(params?: Record<string, string>): Promise<ApiSuccess<T>> {
    return this.get<T>('/admin/settlements', params);
  }

  async disburseSettlement<T>(settlementId: string, body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>(`/settlements/${encodeURIComponent(settlementId)}/disburse`, body);
  }

  // ---------------------------------------------------------------------------
  // Organizer Receipt & Scanner Pairing
  // ---------------------------------------------------------------------------
  async getOrganizerOrderReceipt<T>(eventId: string, orderId: string): Promise<ApiSuccess<T>> {
    return this.get<T>(`/organizer/events/${encodeURIComponent(eventId)}/orders/${encodeURIComponent(orderId)}/receipt`);
  }

  async createScannerPairingToken<T>(body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>('/organizer/scanner/pairing-token', body);
  }

  // ---------------------------------------------------------------------------
  // Scanner Onboarding & Promoter Eligible Events
  // ---------------------------------------------------------------------------
  async onboardScanner<T>(body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>('/scanner/onboard', body);
  }

  async getPromoterEligibleEvents<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/promoter/eligible-events');
  }

  // ---------------------------------------------------------------------------
  // Newsletter Lead Capture
  // ---------------------------------------------------------------------------
  async subscribeNewsletter<T>(email: string, source = 'consumer-web'): Promise<ApiSuccess<T>> {
    return this.post<T>('/public/newsletter/subscribe', { email, source });
  }

  // ---------------------------------------------------------------------------
  // User Favorites (Bookmarks)
  // ---------------------------------------------------------------------------
  async getUserFavorites<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/users/me/favorites');
  }

  async addUserFavorite<T>(eventId: string): Promise<ApiSuccess<T>> {
    return this.post<T>(`/users/me/favorites/${encodeURIComponent(eventId)}`);
  }

  async removeUserFavorite<T>(eventId: string): Promise<ApiSuccess<T>> {
    return this.delete<T>(`/users/me/favorites/${encodeURIComponent(eventId)}`);
  }

  // ---------------------------------------------------------------------------
  // Organizer Team Members Management
  // ---------------------------------------------------------------------------
  async removeOrganizerTeamMember<T>(userId: string): Promise<ApiSuccess<T>> {
    return this.delete<T>(`/organizer/team/${encodeURIComponent(userId)}`);
  }

  async updateOrganizerTeamMemberRole<T>(userId: string, roleId: string): Promise<ApiSuccess<T>> {
    return this.patch<T>(`/organizer/team/${encodeURIComponent(userId)}/role`, { roleId });
  }

  // ---------------------------------------------------------------------------
  // Organizer WhatsApp Broadcast Templates
  // ---------------------------------------------------------------------------
  async getOrganizerWhatsappTemplates<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/organizer/marketing/whatsapp-templates');
  }

  async createOrganizerWhatsappTemplate<T>(body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>('/organizer/marketing/whatsapp-templates', body);
  }

  // ---------------------------------------------------------------------------
  // User Favorites & Bookmarks Methods
  // ---------------------------------------------------------------------------
  async getFavorites<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/users/me/favorites');
  }

  async addFavorite<T>(eventId: string): Promise<ApiSuccess<T>> {
    return this.post<T>(`/users/me/favorites/${encodeURIComponent(eventId)}`);
  }

  async removeFavorite<T>(eventId: string): Promise<ApiSuccess<T>> {
    return this.delete<T>(`/users/me/favorites/${encodeURIComponent(eventId)}`);
  }

  // ---------------------------------------------------------------------------
  // Promoter Guestlist Methods
  // ---------------------------------------------------------------------------
  async createPromoterGuestlist<T>(body: unknown): Promise<ApiSuccess<T>> {
    return this.post<T>('/promoter/guestlists', body);
  }

  async getPromoterGuestlists<T>(eventId: string): Promise<ApiSuccess<T>> {
    return this.get<T>(`/promoter/guestlists/${encodeURIComponent(eventId)}`);
  }
}


/**
 * Create a singleton API client instance.
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}

export type { ApiSuccess, ApiError, ApiResponse };
