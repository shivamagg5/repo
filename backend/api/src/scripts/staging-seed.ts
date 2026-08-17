// =============================================================================
// Staging Multi-Persona Deterministic Seed Script
// Populates live staging database with realistic organizations, events, tiers,
// venues, campaigns, and staff scanner profiles for Phase 15 release testing.
// =============================================================================

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../database/schema/index';
import { eq } from 'drizzle-orm';
import { ScannerCryptoService } from '../modules/scanner/scanner-crypto.service';

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
      name: 'Platform Admin',
      status: 'active',
    }).onConflictDoNothing().returning();

    const [organizerUser] = await db.insert(schema.users).values({
      supabaseAuthId: '00000000-0000-0000-0000-000000000002',
      email: 'organizer@staging.eventplatform.com',
      name: 'Festival Organizer',
      status: 'active',
    }).onConflictDoNothing().returning();

    const [venueUser] = await db.insert(schema.users).values({
      supabaseAuthId: '00000000-0000-0000-0000-000000000003',
      email: 'venue@staging.eventplatform.com',
      name: 'Arena Manager',
      status: 'active',
    }).onConflictDoNothing().returning();

    const [promoterUser] = await db.insert(schema.users).values({
      supabaseAuthId: '00000000-0000-0000-0000-000000000004',
      email: 'promoter@staging.eventplatform.com',
      name: 'Lead Promoter',
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

    console.log('[Staging Seed] 2. Creating organization & venue...');

    // 2. Organization
    const [org] = await db.insert(schema.organizations).values({
      name: 'Staging Live Entertainment Group',
      slug: 'staging-live-ent',
      type: 'organizer',
      status: 'active',
    }).onConflictDoNothing().returning();

    const targetOrgId = org?.id ?? (await db.query.organizations.findFirst({ where: eq(schema.organizations.slug, 'staging-live-ent') }))?.id!;

    // 3. Venue
    const [venue] = await db.insert(schema.venues).values({
      organizationId: targetOrgId,
      name: 'The Staging Arena',
      slug: 'the-staging-arena',
      capacity: 5000,
      city: 'Mumbai',
      state: 'Maharashtra',
      address: 'Plot 42, Bandra Kurla Complex',
      status: 'active',
    }).onConflictDoNothing().returning();

    const targetVenueId = venue?.id ?? (await db.query.venues.findFirst({ where: eq(schema.venues.slug, 'the-staging-arena') }))?.id!;

    // 4. Category
    const [cat] = await db.insert(schema.eventCategories).values({
      name: 'Music & Nightlife',
      slug: 'music-nightlife',
      status: 'active',
    }).onConflictDoNothing().returning();

    const targetCatId = cat?.id ?? (await db.query.eventCategories.findFirst({ where: eq(schema.eventCategories.slug, 'music-nightlife') }))?.id!;

    console.log('[Staging Seed] 3. Creating staging events & ticket tiers...');

    // 5. Events
    const now = new Date();
    const eventStart = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
    const eventEnd = new Date(eventStart.getTime() + 6 * 3600 * 1000);

    const [publishedEvent] = await db.insert(schema.events).values({
      organizerOrganizationId: targetOrgId,
      venueId: targetVenueId,
      categoryId: targetCatId,
      title: 'Neon Nights Festival 2026',
      slug: 'neon-nights-festival-2026',
      description: 'The premier electronic music festival with immersive lasers and global headliners.',
      status: 'published',
      startsAt: eventStart,
      endsAt: eventEnd,
      timezone: 'Asia/Kolkata',
      capacity: 2500,
      ageRestriction: '18+',
      publishedAt: now,
    }).onConflictDoNothing().returning();

    const targetEventId = publishedEvent?.id ?? (await db.query.events.findFirst({ where: eq(schema.events.slug, 'neon-nights-festival-2026') }))?.id!;

    // 6. Ticket Types
    await db.insert(schema.ticketTypes).values([
      {
        eventId: targetEventId,
        name: 'General Admission Early Bird',
        description: 'Standard festival entry with access to Main Stage.',
        priceMinor: 150000, // ₹1,500
        currency: 'INR',
        quantity: 500,
        soldQuantity: 0,
        reservedQuantity: 0,
        minPerOrder: 1,
        maxPerOrder: 6,
        status: 'active',
      },
      {
        eventId: targetEventId,
        name: 'VIP Lounge Pass',
        description: 'Elevated viewing deck, complimentary drinks, and priority entry lane.',
        priceMinor: 450000, // ₹4,500
        currency: 'INR',
        quantity: 100,
        soldQuantity: 0,
        reservedQuantity: 0,
        minPerOrder: 1,
        maxPerOrder: 4,
        status: 'active',
      },
      {
        eventId: targetEventId,
        name: 'Backstage All-Access',
        description: 'Exclusive artist backstage access, soundcheck viewing, and VIP lounge.',
        priceMinor: 999900, // ₹9,999
        currency: 'INR',
        quantity: 20,
        soldQuantity: 0,
        reservedQuantity: 0,
        minPerOrder: 1,
        maxPerOrder: 2,
        status: 'active',
      },
    ]).onConflictDoNothing();

    // 7. Checkin Gates
    const [gateA] = await db.insert(schema.checkinGates).values({
      eventId: targetEventId,
      name: 'Gate A — Main Entrance',
      status: 'active',
    }).onConflictDoNothing().returning();

    const [gateVIP] = await db.insert(schema.checkinGates).values({
      eventId: targetEventId,
      name: 'Gate VIP — Priority Lane',
      status: 'active',
    }).onConflictDoNothing().returning();

    // 8. Checkin Devices
    await db.insert(schema.checkinDevices).values([
      {
        organizationId: targetOrgId,
        deviceIdentifier: 'scanner-device-staging-01',
        status: 'active',
        lastSeenAt: now,
      },
      {
        organizationId: targetOrgId,
        deviceIdentifier: 'scanner-device-staging-02',
        status: 'active',
        lastSeenAt: now,
      },
    ]).onConflictDoNothing();

    // 9. Promoter Profile & Campaign
    const [promoterProfile] = await db.insert(schema.promoterProfiles).values({
      organizationId: targetOrgId,
      status: 'active',
    }).onConflictDoNothing().returning();

    const targetPromoterId = promoterProfile?.id ?? (await db.query.promoterProfiles.findFirst({ where: eq(schema.promoterProfiles.organizationId, targetOrgId) }))?.id!;

    await db.insert(schema.promoterCampaigns).values({
      promoterId: targetPromoterId,
      eventId: targetEventId,
      code: 'SUMMER2026',
      commissionType: 'percentage',
      commissionValue: '10.0000',
      status: 'active',
    }).onConflictDoNothing();

    console.log('✅ [Staging Seed] Deterministic fixtures populated successfully!');
    console.log(`- Organization: ${targetOrgId}`);
    console.log(`- Event: Neon Nights Festival 2026 (${targetEventId})`);
    console.log(`- Venue: The Staging Arena (${targetVenueId})`);
  } catch (err: any) {
    console.error('❌ [Staging Seed] Error running staging seed:', err);
    throw err;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  runStagingSeed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
