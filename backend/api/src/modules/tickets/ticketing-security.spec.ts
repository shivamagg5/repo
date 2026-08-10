import { IdempotencyService } from '../../common/idempotency/idempotency.service';

describe('Ticketing Security & Idempotency Tests', () => {
  let idempotencyService: IdempotencyService;

  beforeEach(() => {
    idempotencyService = new IdempotencyService({} as any);
  });

  it('Payload hashing is deterministic and differs for different request bodies', () => {
    const hash1 = idempotencyService.hashPayload({ ticketTypeId: 'tkt-1', quantity: 2 });
    const hash2 = idempotencyService.hashPayload({ ticketTypeId: 'tkt-1', quantity: 2 });
    const hash3 = idempotencyService.hashPayload({ ticketTypeId: 'tkt-1', quantity: 3 });

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });
});
