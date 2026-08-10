-- =============================================================================
-- Migration: 0004_discovery_search_indexes
-- Description: Trigram & GIN search indexes, deterministic cursor indexes
-- Task: 3.1 — Consumer Discovery Foundation
-- Created: Task 3.1
-- =============================================================================
-- IMPORTANT: Never edit this file after it has been applied to any database.
-- All schema changes must be new migrations (0005_*, 0006_*, etc.)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enable pg_trgm extension for fast trigram text search
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- 2. Trigram & GIN search indexes for title, venue, and city search
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_events_title_trgm ON events USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_venues_name_trgm  ON venues USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_venues_city_trgm  ON venues USING gin (city gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- 3. Composite deterministic cursor indexes for event discovery feeds
-- ---------------------------------------------------------------------------
-- Cursor index for upcoming events feed (status = 'published'/'live', starts_at ASC, id ASC)
CREATE INDEX IF NOT EXISTS idx_events_status_starts_id ON events (status, starts_at ASC, id ASC);

-- Cursor index for newly published events feed (status = 'published'/'live', published_at DESC, id DESC)
CREATE INDEX IF NOT EXISTS idx_events_status_published_id ON events (status, published_at DESC, id DESC);
