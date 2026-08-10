import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { events, venues, eventCategories } from '../../database/schema/index';
import { and, eq, inArray, sql, type SQL } from 'drizzle-orm';

export interface SearchQueryParams {
  q?: string;
  categorySlug?: string;
  city?: string;
  venueId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  sort?: 'date' | 'newest' | 'relevance';
  limit?: number;
  cursor?: string; // Base64 encoded JSON { lastStartsAt, lastId } or { lastPublishedAt, lastId }
}

export interface CursorInfo {
  lastVal: string;
  lastId: string;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger('SearchService');

  constructor(private readonly db: DatabaseService) {}

  /**
   * Decode base64 opaque cursor token into values.
   */
  decodeCursor(cursorToken?: string): CursorInfo | null {
    if (!cursorToken) return null;
    try {
      const decoded = Buffer.from(cursorToken, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      if (parsed.lastVal && parsed.lastId) {
        return { lastVal: parsed.lastVal, lastId: parsed.lastId };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Encode cursor values into opaque base64 token.
   */
  encodeCursor(lastVal: string, lastId: string): string {
    return Buffer.from(JSON.stringify({ lastVal, lastId })).toString('base64');
  }

  /**
   * Build PostgreSQL search SQL conditions using indexed trigrams and exact category/city matches.
   */
  buildSearchConditions(params: SearchQueryParams): SQL[] {
    const conditions: SQL[] = [inArray(events.status, ['published', 'live'])];

    // 1. Text search on title/description using trigram match or tsvector match
    if (params.q && params.q.trim().length > 0) {
      const sanitized = params.q.trim();
      // Indexed trigram similarity search: title % sanitized OR title ILIKE 'term%'
      conditions.push(
        sql`(${events.title} % ${sanitized} OR ${events.title} ILIKE ${'%' + sanitized + '%'})`,
      );
    }

    // 2. City filter (via venue join condition or city column)
    if (params.city && params.city.trim().length > 0) {
      const cityClean = params.city.trim();
      conditions.push(
        sql`${events.venueId} IN (SELECT id FROM ${venues} WHERE ${venues.city} ILIKE ${cityClean})`,
      );
    }

    // 3. Venue filter
    if (params.venueId) {
      conditions.push(eq(events.venueId, params.venueId));
    }

    // 4. Category filter
    if (params.categorySlug) {
      conditions.push(
        sql`${events.categoryId} IN (SELECT id FROM ${eventCategories} WHERE ${eventCategories.slug} = ${params.categorySlug})`,
      );
    }

    // 5. Date boundaries (UTC converted dates)
    if (params.dateFrom) {
      conditions.push(sql`${events.startsAt} >= ${params.dateFrom}`);
    }
    if (params.dateTo) {
      conditions.push(sql`${events.startsAt} <= ${params.dateTo}`);
    }

    return conditions;
  }
}
