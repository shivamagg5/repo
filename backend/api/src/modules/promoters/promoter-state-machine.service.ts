import { Injectable, ConflictException } from '@nestjs/common';

export type CommissionStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'reversed' | 'paid';

@Injectable()
export class CommissionStateMachineService {
  private readonly allowedTransitions: Record<CommissionStatus, CommissionStatus[]> = {
    pending: ['approved', 'rejected', 'cancelled'],
    approved: ['paid', 'rejected', 'cancelled', 'reversed'],
    paid: ['reversed'],        // Paid commissions are REVERSED (via auditable entry), NEVER muted to rejected!
    rejected: [],              // Terminal
    cancelled: [],             // Terminal
    reversed: [],              // Terminal
  };

  /**
   * Validate commission status transition.
   */
  assertTransition(currentStatus: CommissionStatus, targetStatus: CommissionStatus): void {
    if (currentStatus === targetStatus) return; // Idempotent no-op

    const allowed = this.allowedTransitions[currentStatus] ?? [];
    if (!allowed.includes(targetStatus)) {
      throw new ConflictException({
        code: 'COMMISSION_STATE_INVALID',
        message: `Cannot transition commission entry from '${currentStatus}' to '${targetStatus}'. Entry is terminal or transition not permitted.`,
      });
    }
  }
}
