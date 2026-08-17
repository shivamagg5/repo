import { Injectable, BadRequestException } from '@nestjs/common';
import type { SettlementStatus } from '@platform/types';

@Injectable()
export class SettlementStateMachineService {
  /**
   * Validate settlement state machine transitions.
   */
  assertTransition(currentState: SettlementStatus, targetState: SettlementStatus): void {
    if (currentState === targetState) return;

    const transitionKey = `${currentState} -> ${targetState}`;

    switch (transitionKey) {
      case 'draft -> pending_review':
      case 'pending_review -> approved':
      case 'pending_review -> failed':
      case 'approved -> processing':
      case 'processing -> paid':
      case 'processing -> failed':
        return;

      default:
        throw new BadRequestException({
          code: 'INVALID_SETTLEMENT_TRANSITION',
          message: `Cannot transition settlement status from "${currentState}" to "${targetState}".`,
        });
    }
  }
}
