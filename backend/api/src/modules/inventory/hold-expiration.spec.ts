import { HoldExpirationService } from './hold-expiration.service';
import { HoldStateMachineService } from './hold-state-machine.service';

describe('HoldExpirationService — Expiration Worker & Payment Race Tests', () => {
  let expirationService: HoldExpirationService;
  let holdStateMachine: HoldStateMachineService;

  beforeEach(() => {
    holdStateMachine = new HoldStateMachineService();
    expirationService = new HoldExpirationService({} as any, holdStateMachine);
  });

  it('Hold state machine prevents transitioning terminal hold states', () => {
    expect(() => holdStateMachine.assertTransition('expired', 'active')).toThrow();
    expect(() => holdStateMachine.assertTransition('converted', 'expired')).toThrow();
    expect(() => holdStateMachine.assertTransition('cancelled', 'converted')).toThrow();
  });

  it('Allows valid active hold state transitions', () => {
    expect(() => holdStateMachine.assertTransition('active', 'expired')).not.toThrow();
    expect(() => holdStateMachine.assertTransition('active', 'converted')).not.toThrow();
    expect(() => holdStateMachine.assertTransition('active', 'cancelled')).not.toThrow();
  });
});
