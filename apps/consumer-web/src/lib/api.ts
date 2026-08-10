/**
 * Typed API client — attaches Authorization header automatically.
 * All requests go through the backend API, never directly to Supabase.
 */
export class ApiClient {
  private readonly baseUrl: string;
  private getAuthHeader: (() => Promise<string | null>) | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? process.env['NEXT_PUBLIC_API_URL'] ?? '/api/v1';
  }

  setAuthProvider(fn: () => Promise<string | null>) {
    this.getAuthHeader = fn;
  }

  private async headers(): Promise<HeadersInit> {
    const base: HeadersInit = { 'Content-Type': 'application/json' };
    if (this.getAuthHeader) {
      const token = await this.getAuthHeader();
      if (token) (base as Record<string, string>)['Authorization'] = token;
    }
    return base;
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, value);
        }
      });
    }
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: await this.headers(),
    });
    if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
    return res.json() as Promise<T>;
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: await this.headers(),
      body: body != null ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
    return res.json() as Promise<T>;
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: await this.headers(),
      body: body != null ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
    return res.json() as Promise<T>;
  }

  async delete(path: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: await this.headers(),
    });
    if (!res.ok && res.status !== 204) {
      throw new ApiError(res.status, await res.json().catch(() => null));
    }
  }

  // Discovery Methods
  async getPublicEventsFeed<T>(params?: Record<string, string>): Promise<T> {
    return this.get<T>('/public/events', params);
  }

  async getPublicEventDetail<T>(slug: string): Promise<T> {
    return this.get<T>(`/public/events/${encodeURIComponent(slug)}`);
  }

  async getPublicVenues<T>(params?: Record<string, string>): Promise<T> {
    return this.get<T>('/public/venues', params);
  }

  async getPublicVenueDetail<T>(slug: string): Promise<T> {
    return this.get<T>(`/public/venues/${encodeURIComponent(slug)}`);
  }

  async getPublicCategories<T>(): Promise<T> {
    return this.get<T>('/public/categories');
  }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`API error ${status}`);
  }
}

export const apiClient = new ApiClient();
