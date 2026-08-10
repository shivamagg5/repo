import { Injectable, ConflictException } from '@nestjs/common';
import type { OrderStatus } from '@platform/types';

@Injectable()
export class OrderStateMachineService {
  private readonly allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
    created: ['payment_pending', 'paid', 'cancelled', 'expired'],
    payment_pending: ['paid', 'payment_failed', 'cancelled', 'expired'],
    paid: ['tickets_issued', 'completed', 'refund_pending', 'refunded'],
    tickets_issued: ['completed', 'refund_pending', 'refunded'],
    completed: ['refund_pending', 'refunded', 'partially_refunded'],
    payment_failed: [],     // Terminal
    cancelled: [],          // Terminal
    expired: [],            // Terminal
    refund_pending: ['refunded', 'partially_refunded'],
    refunded: [],           // Terminal
    partially_refunded: ['refunded'],
  };

  /**
   * Validate order state transition.
   */
  assertTransition(currentStatus: OrderStatus, targetStatus: OrderStatus): void {
    if (currentStatus === targetStatus) return; // Idempotent no-op

    const allowed = this.allowedTransitions[currentStatus] ?? [];
    if (!allowed.includes(targetStatus)) {
      throw new ConflictException({
        code: 'ORDER_STATE_INVALID',
        message: `Cannot transition order from state '${currentStatus}' to '${targetStatus}'. Order is terminal or transition not permitted.`,
      });
    }
  }
}
