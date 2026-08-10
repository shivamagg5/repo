import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';

export type HoldStatus = 'active' | 'expired' | 'released' | 'converted' | 'cancelled';

@Injectable()
export class HoldStateMachineService {
  private readonly allowedTransitions: Record<HoldStatus, HoldStatus[]> = {
    active: ['expired', 'released', 'converted', 'cancelled'],
    expired: [],   // Terminal
    released: [],  // Terminal
    converted: [], // Terminal
    cancelled: [], // Terminal
  };

  /**
   * Validate hold state transition. Throws exception if transition is invalid or hold is already terminal.
   */
  assertTransition(currentStatus: HoldStatus, targetStatus: HoldStatus): void {
    if (currentStatus === targetStatus) return; // Idempotent no-op

    const allowed = this.allowedTransitions[currentStatus] ?? [];
    if (!allowed.includes(targetStatus)) {
      throw new ConflictException({
        code: 'HOLD_STATE_INVALID',
        message: `Cannot transition reservation hold from state '${currentStatus}' to '${targetStatus}'. Hold is terminal or transition not permitted.`,
      });
    }
  }
}
