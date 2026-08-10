import { createReservationSchema, createTicketTypeSchema } from '@platform/validation';

describe('Price Snapshot & Price Manipulation Protection Tests', () => {

  it('PRICE MANIPULATION TEST: Rejects client payload attempting to inject unitPrice or totalMinor overrides', () => {
    const maliciousPayload = {
      ticketTypeId: '123e4567-e89b-12d3-a456-426614174000',
      quantity: 2,
      priceMinor: 1, // MALICIOUS: client attempts to override price to 1 paisa
      unitPrice: 1,
      totalMinor: 2,
    };

    const parsed = createReservationSchema.safeParse(maliciousPayload);
    expect(parsed.success).toBe(false); // BLOCKED by strict Zod schema validation
  });

  it('createTicketTypeSchema rejects negative prices and invalid maxPerOrder', () => {
    const invalidPrice = createTicketTypeSchema.safeParse({
      eventId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'VIP',
      priceMinor: -100, // BLOCKED
      quantity: 50,
    });
    expect(invalidPrice.success).toBe(false);

    const invalidRange = createTicketTypeSchema.safeParse({
      eventId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'VIP',
      priceMinor: 99900,
      quantity: 50,
      minPerOrder: 5,
      maxPerOrder: 2, // BLOCKED (< minPerOrder)
    });
    expect(invalidRange.success).toBe(false);
  });
});
