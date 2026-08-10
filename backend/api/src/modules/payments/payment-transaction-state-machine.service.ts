import { Injectable, ConflictException } from '@nestjs/common';
import type { PaymentStatus } from '@platform/types';

@Injectable()
export class PaymentTransactionStateMachineService {
  private readonly allowedTransitions: Record<PaymentStatus, PaymentStatus[]> = {
    pending: ['authorized', 'paid', 'failed', 'cancelled'],
    authorized: ['paid', 'failed', 'cancelled'],
    paid: ['refunded', 'partially_refunded'],
    failed: [],   // Terminal
    cancelled: [],// Terminal
    refunded: [], // Terminal
    partially_refunded: ['refunded'],
  };

  /**
   * Validate payment transaction state transition.
   */
  assertTransition(currentStatus: PaymentStatus, targetStatus: PaymentStatus): void {
    if (currentStatus === targetStatus) return; // Idempotent no-op

    const allowed = this.allowedTransitions[currentStatus] ?? [];
    if (!allowed.includes(targetStatus)) {
      throw new ConflictException({
        code: 'PAYMENT_TRANSACTION_STATE_INVALID',
        message: `Cannot transition payment transaction from '${currentStatus}' to '${targetStatus}'. Transaction is terminal or transition not permitted.`,
      });
    }
  }
}
