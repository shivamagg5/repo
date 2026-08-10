-- =============================================================================
-- Seed: Development seed data
-- Purpose: Initial categories, roles, and permissions for local development
-- Run: Only in development and test environments
-- =============================================================================

-- Event categories
INSERT INTO event_categories (id, name, slug, status) VALUES
  (gen_random_uuid(), 'Music', 'music', 'active'),
  (gen_random_uuid(), 'Comedy', 'comedy', 'active'),
  (gen_random_uuid(), 'Sports', 'sports', 'active'),
  (gen_random_uuid(), 'Arts & Culture', 'arts-culture', 'active'),
  (gen_random_uuid(), 'Food & Drink', 'food-drink', 'active'),
  (gen_random_uuid(), 'Tech & Business', 'tech-business', 'active'),
  (gen_random_uuid(), 'Fitness & Wellness', 'fitness-wellness', 'active'),
  (gen_random_uuid(), 'Family', 'family', 'active'),
  (gen_random_uuid(), 'Nightlife', 'nightlife', 'active'),
  (gen_random_uuid(), 'Online', 'online', 'active')
ON CONFLICT (slug) DO NOTHING;

-- Platform permissions (domain.action format)
INSERT INTO permissions (id, key, description) VALUES
  -- User management
  (gen_random_uuid(), 'user.view', 'View user profiles'),
  (gen_random_uuid(), 'user.edit', 'Edit user profiles'),
  (gen_random_uuid(), 'user.suspend', 'Suspend a user account'),
  (gen_random_uuid(), 'user.delete', 'Delete a user account'),
  
  -- Organization management
  (gen_random_uuid(), 'organization.create', 'Create an organization'),
  (gen_random_uuid(), 'organization.edit', 'Edit organization settings'),
  (gen_random_uuid(), 'organization.delete', 'Delete an organization'),
  (gen_random_uuid(), 'organization.manage_members', 'Manage organization team members'),
  
  -- Event management
  (gen_random_uuid(), 'event.create', 'Create an event'),
  (gen_random_uuid(), 'event.edit', 'Edit an event'),
  (gen_random_uuid(), 'event.publish', 'Publish an event'),
  (gen_random_uuid(), 'event.cancel', 'Cancel an event'),
  (gen_random_uuid(), 'event.approve', 'Admin: approve an event for publication'),
  (gen_random_uuid(), 'event.reject', 'Admin: reject an event'),
  (gen_random_uuid(), 'event.suspend', 'Admin: suspend a published event'),
  (gen_random_uuid(), 'event.feature', 'Admin: feature an event on homepage'),
  
  -- Venue management
  (gen_random_uuid(), 'venue.create', 'Create a venue'),
  (gen_random_uuid(), 'venue.edit', 'Edit venue details'),
  (gen_random_uuid(), 'venue.delete', 'Delete a venue'),
  
  -- Ticket management
  (gen_random_uuid(), 'ticket.manage', 'Manage ticket types'),
  (gen_random_uuid(), 'ticket.view', 'View ticket details'),
  (gen_random_uuid(), 'ticket.void', 'Void a ticket'),
  (gen_random_uuid(), 'ticket.transfer', 'Transfer a ticket to another user'),
  
  -- Order management
  (gen_random_uuid(), 'order.view', 'View order details'),
  (gen_random_uuid(), 'order.cancel', 'Cancel an order'),
  
  -- Financial
  (gen_random_uuid(), 'finance.view', 'View financial reports'),
  (gen_random_uuid(), 'ticket.refund', 'Process a ticket refund'),
  (gen_random_uuid(), 'settlement.view', 'View settlement reports'),
  (gen_random_uuid(), 'settlement.approve', 'Approve a settlement for payment'),
  
  -- Scanner
  (gen_random_uuid(), 'scanner.use', 'Use the ticket scanner'),
  (gen_random_uuid(), 'scanner.manage_devices', 'Register and manage scanner devices'),
  
  -- Promoter
  (gen_random_uuid(), 'promoter.create_campaign', 'Create a promoter campaign'),
  (gen_random_uuid(), 'promoter.view_earnings', 'View promoter earnings'),
  
  -- CMS
  (gen_random_uuid(), 'cms.manage', 'Manage CMS content'),
  
  -- Support
  (gen_random_uuid(), 'support.view', 'View support tickets'),
  (gen_random_uuid(), 'support.respond', 'Respond to support tickets'),
  
  -- Admin
  (gen_random_uuid(), 'admin.roles', 'Manage roles and permissions'),
  (gen_random_uuid(), 'admin.audit', 'View audit logs'),
  (gen_random_uuid(), 'admin.moderation', 'Manage moderation cases')
ON CONFLICT (key) DO NOTHING;

-- Roles (seeded but not wired to permissions here — done in Task 1.1)
INSERT INTO roles (id, organization_type, name) VALUES
  (gen_random_uuid(), 'organizer', 'owner'),
  (gen_random_uuid(), 'organizer', 'manager'),
  (gen_random_uuid(), 'organizer', 'staff'),
  (gen_random_uuid(), 'venue', 'owner'),
  (gen_random_uuid(), 'venue', 'manager'),
  (gen_random_uuid(), 'venue', 'staff'),
  (gen_random_uuid(), 'promoter', 'owner'),
  (gen_random_uuid(), NULL, 'super_admin'),
  (gen_random_uuid(), NULL, 'finance_admin'),
  (gen_random_uuid(), NULL, 'content_admin'),
  (gen_random_uuid(), NULL, 'operations_admin'),
  (gen_random_uuid(), NULL, 'support_agent'),
  (gen_random_uuid(), NULL, 'scanner_staff')
ON CONFLICT DO NOTHING;
