import { Injectable, Logger } from '@nestjs/common';
import { and, eq, lte, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { inventoryReservations, ticketTypes, orders } from '../../database/schema/index';
import { HoldStateMachineService } from './hold-state-machine.service';

@Injectable()
export class HoldExpirationService {
  private readonly logger = new Logger('HoldExpirationService');

  constructor(
    private readonly db: DatabaseService,
    private readonly holdStateMachine: HoldStateMachineService,
  ) {}

  /**
   * Process expired reservation holds.
   * Uses `FOR UPDATE SKIP LOCKED` so multiple worker instances do not double-process holds.
   * Idempotent: running multiple times never double-releases inventory.
   */
  async processExpiredHolds(): Promise<{ expiredCount: number }> {
    const now = new Date();

    const expiredList = await this.db.db.transaction(async (tx) => {
      // 1. Claim active expired holds with FOR UPDATE SKIP LOCKED
      const holds = await tx
        .select()
        .from(inventoryReservations)
        .where(
          and(
            eq(inventoryReservations.status, 'active'),
            lte(inventoryReservations.expiresAt, now),
          ),
        )
        .for('update', { skipLocked: true })
        .execute();

      if (holds.length === 0) return [];

      const processedIds: string[] = [];

      for (const hold of holds) {
        try {
          this.holdStateMachine.assertTransition(hold.status as any, 'expired');

          // Mark hold as expired
          await tx
            .update(inventoryReservations)
            .set({ status: 'expired' })
            .where(eq(inventoryReservations.id, hold.id));

          // Atomically decrement reservedQuantity
          await tx
            .update(ticketTypes)
            .set({
              reservedQuantity: sql`GREATEST(0, ${ticketTypes.reservedQuantity} - ${hold.quantity})`,
              updatedAt: now,
            })
            .where(eq(ticketTypes.id, hold.ticketTypeId));

          // Update associated order status to expired
          await tx
            .update(orders)
            .set({ status: 'expired', updatedAt: now })
            .where(and(eq(orders.id, hold.orderId), eq(orders.status, 'created')));

          processedIds.push(hold.id);
        } catch (err: any) {
          this.logger.error(`Failed to process expired hold ${hold.id}: ${err.message}`);
        }
      }

      return processedIds;
    });

    if (expiredList.length > 0) {
      this.logger.log(`[HoldExpirationWorker] Expired ${expiredList.length} reservation holds & released inventory.`);
    }

    return { expiredCount: expiredList.length };
  }
}
