import { Injectable, Logger } from '@nestjs/common';
import crypto from 'node:crypto';

export interface CacheEntry<T> {
  etag: string;
  data: T;
  cachedAt: number;
}

@Injectable()
export class DiscoveryCacheService {
  private readonly logger = new Logger('DiscoveryCacheService');

  /**
   * Calculate deterministic ETag hash for data payload.
   */
  generateETag(data: unknown): string {
    const json = JSON.stringify(data);
    return `W/"${crypto.createHash('sha256').update(json).digest('hex').substring(0, 16)}"`;
  }

  /**
   * Returns Cache-Control header value for public discovery endpoints.
   * Public discovery data is cached for 60 seconds by CDN/Next.js/Browsers.
   */
  getPublicCacheControlHeader(maxAgeSeconds = 60, sMaxAgeSeconds = 300): string {
    return `public, max-age=${maxAgeSeconds}, s-maxage=${sMaxAgeSeconds}, stale-while-revalidate=600`;
  }

  /**
   * Log invalidation trigger for publication, state change, venue status, or category update.
   */
  invalidateDiscoveryCache(reason: string, entityId: string): void {
    this.logger.log(`[Cache Invalidation Event] Trigger: ${reason} | Entity: ${entityId}`);
  }
}
