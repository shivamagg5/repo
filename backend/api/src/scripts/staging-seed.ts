// =============================================================================
// Staging Multi-Persona Deterministic Seed Script
// Populates live staging database with realistic organizations, events, tiers,
// venues, campaigns, and staff scanner profiles for Phase 15 release testing.
// =============================================================================

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../database/schema/index';
import { eq } from 'drizzle-orm';

async function runStagingSeed() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';
  console.log(`[Staging Seed] Connecting to database: ${databaseUrl.split('@')[1] || 'localhost'}...`);

  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    console.log('[Staging Seed] 1. Creating multi-role test users...');

    // 1. Users
    const [adminUser] = await db.insert(schema.users).values({
      supabaseAuthId: '00000000-0000-0000-0000-000000000001',
      email: 'admin@staging.eventplatform.com',
      name: 'Platform Superadmin',
      status: 'active',
    }).onConflictDoNothing().returning();

    const [organizerUser] = await db.insert(schema.users).values({
      supabaseAuthId: '00000000-0000-0000-0000-000000000002',
      email: 'organizer@staging.eventplatform.com',
      name: 'Apex Entertainment Group',
      status: 'active',
    }).onConflictDoNothing().returning();

    const [venueUser] = await db.insert(schema.users).values({
      supabaseAuthId: '00000000-0000-0000-0000-000000000003',
      email: 'venue@staging.eventplatform.com',
      name: 'Grand Arena Manager',
      status: 'active',
    }).onConflictDoNothing().returning();

    const [promoterUser] = await db.insert(schema.users).values({
      supabaseAuthId: '00000000-0000-0000-0000-000000000004',
      email: 'promoter@staging.eventplatform.com',
      name: 'Lead Growth Promoter',
      status: 'active',
    }).onConflictDoNothing().returning();

    const [consumerUser] = await db.insert(schema.users).values({
      supabaseAuthId: '00000000-0000-0000-0000-000000000005',
      email: 'consumer1@staging.eventplatform.com',
      name: 'Aarav Sharma',
      status: 'active',
    }).onConflictDoNothing().returning();

    const [staffUser] = await db.insert(schema.users).values({
      supabaseAuthId: '00000000-0000-0000-0000-000000000006',
      email: 'staff1@staging.eventplatform.com',
      name: 'Gate Scanner Staff',
      status: 'active',
    }).onConflictDoNothing().returning();

    console.log('[Staging Seed] 2. Creating organizations & venues...');

    // 2. Organization
    const [org] = await db.insert(schema.organizations).values({
      name: 'Apex Live Entertainment Group',
      slug: 'apex-live-events',
      type: 'organizer',
      status: 'active',
    }).onConflictDoNothing().returning();

    const targetOrgId = org?.id ?? (await db.query.organizations.findFirst({ where: eq(schema.organizations.slug, 'apex-live-events') }))?.id!;

    // 3. Venues
    const [venue1] = await db.insert(schema.venues).values({
      organizationId: targetOrgId,
      name: 'The Staging Arena — BKC',
      slug: 'the-staging-arena',
      capacity: 12000,
      city: 'Mumbai',
      state: 'Maharashtra',
      address: 'Plot 42, G Block, Bandra Kurla Complex',
      status: 'active',
    }).onConflictDoNothing().returning();

    const targetVenueId1 = venue1?.id ?? (await db.query.venues.findFirst({ where: eq(schema.venues.slug, 'the-staging-arena') }))?.id!;

    const [venue2] = await db.insert(schema.venues).values({
      organizationId: targetOrgId,
      name: 'Palace Grounds Grand Arena',
      slug: 'palace-grounds-bengaluru',
      capacity: 25000,
      city: 'Bengaluru',
      state: 'Karnataka',
      address: 'Jayamahal Main Road, Armane Nagar',
      status: 'active',
    }).onConflictDoNothing().returning();

    const targetVenueId2 = venue2?.id ?? (await db.query.venues.findFirst({ where: eq(schema.venues.slug, 'palace-grounds-bengaluru') }))?.id!;

    // 4. Categories
    const categoriesToSeed = [
      { name: 'Music & Concerts', slug: 'music-concerts' },
      { name: 'Standup Comedy', slug: 'standup-comedy' },
      { name: 'Festivals & Fairs', slug: 'festivals-fairs' },
      { name: 'Sports & Fitness', slug: 'sports-fitness' },
      { name: 'Theatre & Arts', slug: 'theatre-arts' },
    ];

    for (const c of categoriesToSeed) {
      await db.insert(schema.eventCategories).values({
        name: c.name,
        slug: c.slug,
        status: 'active',
      }).onConflictDoNothing();
    }

    const musicCatId = (await db.query.eventCategories.findFirst({ where: eq(schema.eventCategories.slug, 'music-concerts') }))?.id!;
    const comedyCatId = (await db.query.eventCategories.findFirst({ where: eq(schema.eventCategories.slug, 'standup-comedy') }))?.id!;
    const festCatId = (await db.query.eventCategories.findFirst({ where: eq(schema.eventCategories.slug, 'festivals-fairs') }))?.id!;

    console.log('[Staging Seed] 3. Creating live blockbuster events & ticket tiers...');

    const now = new Date();

    // Event 1: Neon Nights EDM Festival 2026
    const [event1] = await db.insert(schema.events).values({
      organizerOrganizationId: targetOrgId,
      venueId: targetVenueId1,
      categoryId: musicCatId,
      title: 'Neon Nights Festival 2026',
      slug: 'neon-nights-festival-2026',
      description: 'The premier electronic music festival with immersive lasers, dual stages, and international headliners live in Mumbai BKC.',
      status: 'published',
      startsAt: new Date(now.getTime() + 5 * 24 * 3600 * 1000),
      endsAt: new Date(now.getTime() + 5 * 24 * 3600 * 1000 + 7 * 3600 * 1000),
      timezone: 'Asia/Kolkata',
      capacity: 5000,
      ageRestriction: '18+',
      publishedAt: now,
    }).onConflictDoNothing().returning();

    const ev1Id = event1?.id ?? (await db.query.events.findFirst({ where: eq(schema.events.slug, 'neon-nights-festival-2026') }))?.id!;

    // Event 2: Arijit Singh Symphony Live 2026
    const [event2] = await db.insert(schema.events).values({
      organizerOrganizationId: targetOrgId,
      venueId: targetVenueId2,
      categoryId: musicCatId,
      title: 'Arijit Singh — Symphony Tour Live',
      slug: 'arijit-singh-symphony-live-2026',
      description: 'A 50-piece international grand orchestra accompanies India’s most soulful voice for a magical 3-hour stadium concert.',
      status: 'published',
      startsAt: new Date(now.getTime() + 12 * 24 * 3600 * 1000),
      endsAt: new Date(now.getTime() + 12 * 24 * 3600 * 1000 + 4 * 3600 * 1000),
      timezone: 'Asia/Kolkata',
      capacity: 15000,
      ageRestriction: 'All Ages',
      publishedAt: now,
    }).onConflictDoNothing().returning();

    const ev2Id = event2?.id ?? (await db.query.events.findFirst({ where: eq(schema.events.slug, 'arijit-singh-symphony-live-2026') }))?.id!;

    // Event 3: Zakir Khan — Tathastu Live Special
    const [event3] = await db.insert(schema.events).values({
      organizerOrganizationId: targetOrgId,
      venueId: targetVenueId1,
      categoryId: comedyCatId,
      title: 'Zakir Khan — Tathastu Live Special',
      slug: 'zakir-khan-tathastu-live-2026',
      description: 'The Sakht Launda returns with an unreleased, heartfelt standup special filled with nostalgic storytelling and explosive punchlines.',
      status: 'published',
      startsAt: new Date(now.getTime() + 8 * 24 * 3600 * 1000),
      endsAt: new Date(now.getTime() + 8 * 24 * 3600 * 1000 + 3 * 3600 * 1000),
      timezone: 'Asia/Kolkata',
      capacity: 3500,
      ageRestriction: '16+',
      publishedAt: now,
    }).onConflictDoNothing().returning();

    const ev3Id = event3?.id ?? (await db.query.events.findFirst({ where: eq(schema.events.slug, 'zakir-khan-tathastu-live-2026') }))?.id!;

    // Event 4: Comic Con India 2026
    const [event4] = await db.insert(schema.events).values({
      organizerOrganizationId: targetOrgId,
      venueId: targetVenueId2,
      categoryId: festCatId,
      title: 'Comic Con India 2026 — Mega Edition',
      slug: 'comic-con-india-2026',
      description: 'Pop culture, anime showcases, cosplay championships, gaming arenas, and exclusive international comic artist signings.',
      status: 'published',
      startsAt: new Date(now.getTime() + 20 * 24 * 3600 * 1000),
      endsAt: new Date(now.getTime() + 22 * 24 * 3600 * 1000),
      timezone: 'Asia/Kolkata',
      capacity: 20000,
      ageRestriction: 'All Ages',
      publishedAt: now,
    }).onConflictDoNothing().returning();

    const ev4Id = event4?.id ?? (await db.query.events.findFirst({ where: eq(schema.events.slug, 'comic-con-india-2026') }))?.id!;

    // Media
    const mediaInserts = [
      { eventId: ev1Id, url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop&q=80', type: 'image', sortOrder: 0 },
      { eventId: ev2Id, url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80', type: 'image', sortOrder: 0 },
      { eventId: ev3Id, url: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=1200&auto=format&fit=crop&q=80', type: 'image', sortOrder: 0 },
      { eventId: ev4Id, url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=1200&auto=format&fit=crop&q=80', type: 'image', sortOrder: 0 },
    ];

    for (const m of mediaInserts) {
      if (m.eventId) {
        await db.insert(schema.eventMedia).values(m).onConflictDoNothing();
      }
    }

    // Ticket Types for all events
    const ticketTypesData = [
      // Event 1
      { eventId: ev1Id, name: 'General Admission Phase 1', description: 'Standard festival arena access', priceMinor: 149900, currency: 'INR', quantity: 2500, soldQuantity: 120, reservedQuantity: 0, minPerOrder: 1, maxPerOrder: 6, status: 'active' },
      { eventId: ev1Id, name: 'VIP Fan Pit Pass', description: 'Front-row stage pit with dedicated express bar', priceMinor: 399900, currency: 'INR', quantity: 800, soldQuantity: 45, reservedQuantity: 0, minPerOrder: 1, maxPerOrder: 4, status: 'active' },
      { eventId: ev1Id, name: 'Backstage Lounge Experience', description: 'Artist lounge viewing and complimentary catering', priceMinor: 899900, currency: 'INR', quantity: 50, soldQuantity: 10, reservedQuantity: 0, minPerOrder: 1, maxPerOrder: 2, status: 'active' },

      // Event 2
      { eventId: ev2Id, name: 'Silver Grandstand', description: 'Reserved stadium seating with panoramic stage view', priceMinor: 199900, currency: 'INR', quantity: 5000, soldQuantity: 800, reservedQuantity: 0, minPerOrder: 1, maxPerOrder: 8, status: 'active' },
      { eventId: ev2Id, name: 'Gold Arena Center', description: 'Prime central elevated floor seating', priceMinor: 499900, currency: 'INR', quantity: 3000, soldQuantity: 420, reservedQuantity: 0, minPerOrder: 1, maxPerOrder: 6, status: 'active' },
      { eventId: ev2Id, name: 'Platinum Symphony Lounge', description: 'Orchestra pit perimeter seats + VIP hospitality', priceMinor: 999900, currency: 'INR', quantity: 500, soldQuantity: 110, reservedQuantity: 0, minPerOrder: 1, maxPerOrder: 4, status: 'active' },

      // Event 3
      { eventId: ev3Id, name: 'Auditorium Seating', description: 'Tiered auditorium seat with clear acoustics', priceMinor: 99900, currency: 'INR', quantity: 2000, soldQuantity: 350, reservedQuantity: 0, minPerOrder: 1, maxPerOrder: 6, status: 'active' },
      { eventId: ev3Id, name: 'Front Rows VIP', description: 'Rows A-E prime seating + Meet & Greet opportunity', priceMinor: 249900, currency: 'INR', quantity: 250, soldQuantity: 85, reservedQuantity: 0, minPerOrder: 1, maxPerOrder: 4, status: 'active' },

      // Event 4
      { eventId: ev4Id, name: 'Single Day Explorer Pass', description: 'Access to exhibition floor, anime zone & stage', priceMinor: 89900, currency: 'INR', quantity: 10000, soldQuantity: 1200, reservedQuantity: 0, minPerOrder: 1, maxPerOrder: 10, status: 'active' },
      { eventId: ev4Id, name: '3-Day SuperFan Weekend VIP', description: 'All 3 days access + exclusive Comic Con merch kit', priceMinor: 299900, currency: 'INR', quantity: 2000, soldQuantity: 640, reservedQuantity: 0, minPerOrder: 1, maxPerOrder: 4, status: 'active' },
    ];

    for (const tt of ticketTypesData) {
      if (tt.eventId) {
        await db.insert(schema.ticketTypes).values(tt).onConflictDoNothing();
      }
    }

    console.log('[Staging Seed] 4. Creating check-in gates and scanner devices...');

    // Checkin Gates
    if (ev1Id) {
      await db.insert(schema.checkinGates).values([
        { eventId: ev1Id, name: 'Gate A — General Main', status: 'active' },
        { eventId: ev1Id, name: 'Gate VIP — Express Lane', status: 'active' },
      ]).onConflictDoNothing();
    }

    // Checkin Devices
    await db.insert(schema.checkinDevices).values([
      { organizationId: targetOrgId, deviceIdentifier: 'scanner-device-staging-01', status: 'active', lastSeenAt: now },
      { organizationId: targetOrgId, deviceIdentifier: 'scanner-device-staging-02', status: 'active', lastSeenAt: now },
    ]).onConflictDoNothing();

    console.log('[Staging Seed] 5. Creating promoter campaigns...');

    const [promoterProfile] = await db.insert(schema.promoterProfiles).values({
      organizationId: targetOrgId,
      status: 'active',
    }).onConflictDoNothing().returning();

    const profileId = promoterProfile?.id ?? (await db.query.promoterProfiles.findFirst({ where: eq(schema.promoterProfiles.organizationId, targetOrgId) }))?.id!;

    if (profileId && ev1Id) {
      await db.insert(schema.promoterCampaigns).values({
        promoterId: profileId,
        eventId: ev1Id,
        code: 'EARLYVIP2026',
        commissionType: 'percentage',
        commissionValue: '8.0000',
        status: 'active',
      }).onConflictDoNothing();
    }

    console.log('✅ [Staging Seed] Completed successfully! All blockbuster events, tiers, venues, and users are live.');
  } catch (error) {
    console.error('❌ [Staging Seed] Failed:', error);
  } finally {
    await client.end();
  }
}

void runStagingSeed();
