DO $$ BEGIN
 CREATE TYPE "public"."checkin_result" AS ENUM('success', 'invalid', 'already_used', 'wrong_event', 'refunded', 'cancelled', 'expired', 'access_denied', 'offline_pending');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;


DO $$ BEGIN
 CREATE TYPE "public"."event_status" AS ENUM('draft', 'submitted', 'under_review', 'approved', 'published', 'live', 'completed', 'rejected', 'suspended', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;


DO $$ BEGIN
 CREATE TYPE "public"."notification_status" AS ENUM('queued', 'sent', 'delivered', 'failed', 'read');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;


DO $$ BEGIN
 CREATE TYPE "public"."order_status" AS ENUM('created', 'payment_pending', 'paid', 'tickets_issued', 'completed', 'payment_failed', 'cancelled', 'expired', 'refund_pending', 'partially_refunded', 'refunded');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;


DO $$ BEGIN
 CREATE TYPE "public"."organization_status" AS ENUM('pending', 'active', 'suspended', 'rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;


DO $$ BEGIN
 CREATE TYPE "public"."organization_type" AS ENUM('organizer', 'venue', 'promoter');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;


DO $$ BEGIN
 CREATE TYPE "public"."payment_status" AS ENUM('pending', 'authorized', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;


DO $$ BEGIN
 CREATE TYPE "public"."refund_status" AS ENUM('requested', 'pending', 'processing', 'completed', 'failed', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;


DO $$ BEGIN
 CREATE TYPE "public"."settlement_status" AS ENUM('draft', 'pending_review', 'approved', 'processing', 'paid', 'failed', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;


DO $$ BEGIN
 CREATE TYPE "public"."ticket_status" AS ENUM('issued', 'checked_in', 'refunded', 'void', 'cancelled', 'expired');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;


DO $$ BEGIN
 CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'deleted');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

