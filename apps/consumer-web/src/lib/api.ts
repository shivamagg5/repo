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
        if (typeof window !== 'undefined') {
          const demoRole = localStorage.getItem('eventplatform_demo_role');
          if (demoRole) {
            return `dev-token-${demoRole}`;
          }
        }
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
  override async getPublicEventsFeed<T>(params?: Record<string, string>): Promise<T> {
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

  override async getPublicCategories<T = any>(): Promise<any> {
    const res = await super.getPublicCategories<T>();
    return res.data;
  }

  async getUserProfile<T = any>(): Promise<T> {
    const res = await this.get<T>('/users/me');
    return res.data;
  }

  async updateUserProfile<T = any>(body: { name?: string; phone?: string; avatarUrl?: string }): Promise<T> {
    const res = await this.patch<T>('/users/me', body);
    return res.data;
  }
}

export const apiClient = new ApiClient();
export { ApiClientError, ApiClientError as ApiError };
