// =============================================================================
// Pagination types for list API endpoints
// =============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginationMeta {
  total?: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextCursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}
