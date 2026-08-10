-- =============================================================================
-- Migration: 0003_venues_events
-- Description: Venue media, venue availability, domain indexes, and RLS policies
-- Task: 2.1 — Venues + Events + Event Publishing
-- Created: Task 2.1
-- =============================================================================
-- IMPORTANT: Never edit this file after it has been applied to any database.
-- All schema changes must be new migrations (0004_*, 0005_*, etc.)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Venue Media
-- ---------------------------------------------------------------------------
CREATE TABLE venue_media (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id    uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  url         text NOT NULL,
  type        text NOT NULL DEFAULT 'image',
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_venue_media_venue ON venue_media(venue_id, sort_order);

-- ---------------------------------------------------------------------------
-- 2. Venue Availability Foundation
-- ---------------------------------------------------------------------------
CREATE TABLE venue_availability (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id    uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  starts_at   timestamptz NOT NULL,
  ends_at     timestamptz NOT NULL,
  status      text NOT NULL DEFAULT 'available', -- available | booked | hold | maintenance
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX idx_venue_availability_range ON venue_availability(venue_id, starts_at, ends_at);

-- ---------------------------------------------------------------------------
-- 3. Domain Performance Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_events_org_status  ON events(organizer_organization_id, status);
CREATE INDEX idx_events_venue_id    ON events(venue_id);
CREATE INDEX idx_events_category_id ON events(category_id);
CREATE INDEX idx_events_slug       ON events(slug);
CREATE INDEX idx_venues_org_status  ON venues(organization_id, status);
CREATE INDEX idx_venues_slug        ON venues(slug);
CREATE INDEX idx_event_media_event  ON event_media(event_id, sort_order);
CREATE INDEX idx_event_lineups_event ON event_lineups(event_id, sort_order);

-- ---------------------------------------------------------------------------
-- 4. Row Level Security — Enable and create policies
-- ---------------------------------------------------------------------------

-- venue_media RLS: readable if venue is active
ALTER TABLE venue_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "venue_media_select_active"
  ON venue_media FOR SELECT
  USING (venue_id IN (SELECT id FROM venues WHERE status = 'active'));

-- venue_availability RLS: readable if venue is active
ALTER TABLE venue_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "venue_availability_select_active"
  ON venue_availability FOR SELECT
  USING (venue_id IN (SELECT id FROM venues WHERE status = 'active'));

-- event_media RLS: readable for published/live events
ALTER TABLE event_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event_media_select_published"
  ON event_media FOR SELECT
  USING (event_id IN (SELECT id FROM events WHERE status IN ('published', 'live')));

-- event_lineups RLS: readable for published/live events
ALTER TABLE event_lineups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event_lineups_select_published"
  ON event_lineups FOR SELECT
  USING (event_id IN (SELECT id FROM events WHERE status IN ('published', 'live')));
