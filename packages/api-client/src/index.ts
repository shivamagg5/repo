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

  private async buildHeaders(): Promise<Record<string, string>> {
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
      Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: await this.buildHeaders(),
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(path: string, body?: unknown): Promise<ApiSuccess<T>> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: await this.buildHeaders(),
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
  // Public Discovery Methods
  // ---------------------------------------------------------------------------
  async getPublicEvents<T>(params?: Record<string, string>): Promise<ApiSuccess<T>> {
    return this.get<T>('/public/events', params);
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
    const headers: Record<string, string> = {};
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    return this.post<T>('/reservations', body);
  }

  async getReservation<T>(id: string): Promise<ApiSuccess<T>> {
    return this.get<T>(`/reservations/${encodeURIComponent(id)}`);
  }

  async cancelReservation<T>(id: string): Promise<ApiSuccess<T>> {
    return this.post<T>(`/reservations/${encodeURIComponent(id)}/cancel`);
  }

  async createOrder<T>(body: unknown, idempotencyKey?: string): Promise<ApiSuccess<T>> {
    return this.post<T>('/orders', body);
  }

  async getOrder<T>(id: string): Promise<ApiSuccess<T>> {
    return this.get<T>(`/orders/${encodeURIComponent(id)}`);
  }

  async getUserTickets<T>(): Promise<ApiSuccess<T>> {
    return this.get<T>('/tickets');
  }
}

/**
 * Create a singleton API client instance.
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}

export type { ApiSuccess, ApiError, ApiResponse };
