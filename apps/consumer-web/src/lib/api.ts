// =============================================================================
// @platform/api-client integration for consumer-web
// Wraps the shared @platform/api-client and delegates all requests.
// Single source of truth: @platform/api-client.
// =============================================================================
import { ApiClient as CoreApiClient, createApiClient, ApiClientError } from '@platform/api-client';
import { getSupabaseClient } from './supabase';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1';

export class ApiClient extends CoreApiClient {
  constructor(baseUrl?: string) {
    super({
      baseUrl: baseUrl ?? API_BASE_URL,
      getAuthToken: async () => {
        try {
          const client = getSupabaseClient();
          const { data } = await client.auth.getSession();
          return data.session?.access_token ?? null;
        } catch {
          return null;
        }
      },
    });
  }

  // Backward-compatibility unwrapped aliases for consumer-web page callers
  async getPublicEventsFeed<T>(params?: Record<string, string>): Promise<T> {
    const res = await this.getPublicEvents<T>(params);
    return res.data;
  }

  async getPublicEventDetail<T>(slug: string): Promise<T> {
    const res = await this.getPublicEventBySlug<T>(slug);
    return res.data;
  }

  override async getPublicVenues<T = any>(params?: Record<string, string>): Promise<any> {
    const res = await super.getPublicVenues<T>(params);
    return res.data;
  }

  async getPublicVenueDetail<T>(slug: string): Promise<T> {
    const res = await this.getPublicVenueBySlug<T>(slug);
    return res.data;
  }

  override async getPublicCategories<T = any>(): Promise<any> {
    const res = await super.getPublicCategories<T>();
    return res.data;
  }
}

export const ApiError = ApiClientError;
export const apiClient = new ApiClient();
export { createApiClient, ApiClientError };
