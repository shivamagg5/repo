// =============================================================================
// @platform/api-client integration for venue-web
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
}

export const ApiError = ApiClientError;
export const apiClient = new ApiClient();
export { createApiClient, ApiClientError };
