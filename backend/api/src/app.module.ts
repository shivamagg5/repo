import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';
import { AuditModule } from './common/audit/audit.module';
import { AuthMiddleware } from './common/middleware/auth.middleware';

// Domain modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { VenuesModule } from './modules/venues/venues.module';
import { EventsModule } from './modules/events/events.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { RefundsModule } from './modules/refunds/refunds.module';
import { ScannerModule } from './modules/scanner/scanner.module';
import { PromotersModule } from './modules/promoters/promoters.module';
import { CommissionsModule } from './modules/commissions/commissions.module';
import { FinanceModule } from './modules/finance/finance.module';
import { SettlementsModule } from './modules/settlements/settlements.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CmsModule } from './modules/cms/cms.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SupportModule } from './modules/support/support.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { AdminModule } from './modules/admin/admin.module';
import { DiscoveryModule } from './modules/discovery/discovery.module';
import { IdempotencyModule } from './common/idempotency/idempotency.module';

@Module({
  imports: [
    // Configuration — loads .env and .env.local
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    // Rate limiting
    // Auth endpoints: throttled separately in AuthController with @Throttle()
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60000,  // 1 minute
        limit: 100,  // 100 req/min per IP
      },
      {
        name: 'auth',
        ttl: 60000,
        limit: 10,   // 10 req/min for auth endpoints
      },
    ]),

    // Infrastructure
    HealthModule,
    DatabaseModule,
    AuditModule,  // Global — AuditService available everywhere
    DiscoveryModule,
    IdempotencyModule,

    // Domain modules (business logic implemented per phase)
    AuthModule,
    UsersModule,
    OrganizationsModule,
    VenuesModule,
    EventsModule,
    TicketsModule,
    InventoryModule,
    OrdersModule,
    PaymentsModule,
    RefundsModule,
    ScannerModule,
    PromotersModule,
    CommissionsModule,
    FinanceModule,
    SettlementsModule,
    NotificationsModule,
    CmsModule,
    AnalyticsModule,
    SupportModule,
    ModerationModule,
    AdminModule,
  ],
})
export class AppModule implements NestModule {
  /**
   * AuthMiddleware is applied globally to all routes.
   * It only performs work (JWT verification + user load) when a Bearer token
   * is present. Public routes (marked with @Public()) are not blocked —
   * the middleware passes through, and guards enforce auth at the route level.
   *
   * Route protection tiers:
   *   Tier 1 — @Public()           : No auth required (health, public events)
   *   Tier 2 — @UseGuards(AuthGuard): Requires authenticated user
   *   Tier 3 — @RequirePermissions(): Requires specific platform permissions
   *   Tier 4 — Service-level rbac  : Org-scoped permission checks via RbacService
   */
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
