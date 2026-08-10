// =============================================================================
// Standard API Response Envelope
// All backend responses use this structure.
// =============================================================================

export interface ApiMeta {
  requestId: string;
  timestamp?: string;
}

export interface ApiSuccess<T> {
  data: T;
  meta: ApiMeta;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: ApiMeta;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function isApiError(response: ApiResponse<unknown>): response is ApiError {
  return 'error' in response;
}
