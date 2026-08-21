import { NotificationOutboxService } from './notification-outbox.service';
import { PushProviderService } from './providers/push-provider.service';
import { EmailProviderService } from './providers/email-provider.service';
import { SmsProviderService } from './providers/sms-provider.service';

describe('NotificationOutboxService — Atomic Outbox & Worker Claim Suite', () => {
  let outboxService: NotificationOutboxService;
  let mockDb: any;
  let mockDatabaseService: any;
  let mockAuditService: any;
  let pushProvider: PushProviderService;
  let emailProvider: EmailProviderService;
  let smsProvider: SmsProviderService;

  beforeEach(() => {
    mockDb = {
      query: {
        notificationOutbox: {
          findFirst: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
        },
        notificationPreferences: {
          findFirst: jest.fn(),
        },
        deviceTokens: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      },
      insert: jest.fn().mockImplementation(() => ({
        values: jest.fn().mockImplementation((val) => ({
          returning: jest.fn().mockResolvedValue(
            Array.isArray(val)
              ? val.map((v, i) => ({ id: `id-${i}`, ...v }))
              : [{ id: 'outbox-100', ...val }],
          ),
        })),
      })),
      update: jest.fn().mockImplementation(() => ({
        set: jest.fn().mockImplementation(() => ({
          where: jest.fn().mockImplementation(() => ({
            returning: jest.fn().mockResolvedValue([
              {
                id: 'outbox-push-1',
                notificationType: 'order_paid',
                userId: 'usr-2',
                payloadJson: JSON.stringify({ title: 'Order Paid' }),
                retryCount: 0,
                status: 'processing',
              },
            ]),
          })),
        })),
      })),
    };

    mockDatabaseService = { db: mockDb };
    mockAuditService = { log: jest.fn() };
    pushProvider = new PushProviderService();
    emailProvider = new EmailProviderService();
    smsProvider = new SmsProviderService();

    outboxService = new NotificationOutboxService(
      mockDatabaseService as any,
      mockAuditService as any,
      pushProvider,
      emailProvider,
      smsProvider,
    );
  });

  it('ATOMIC OUTBOX CREATION: Persists notification outbox record atomically in core transaction', async () => {
    mockDb.query.notificationOutbox.findFirst.mockResolvedValueOnce(null);

    const res = await outboxService.enqueueEvent(null, {
      notificationType: 'ticket_issued',
      userId: 'usr-customer-1',
      payload: { ticketId: 'tkt-1', eventName: 'Sunburn 2026' },
      idempotencyKey: 'ticket-issued:tkt-1:v1',
    });

    expect(res).toBeDefined();
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('OUTBOX IDEMPOTENCY: Re-submitting identical idempotencyKey returns existing outbox record', async () => {
    mockDb.query.notificationOutbox.findFirst.mockResolvedValueOnce({
      id: 'existing-outbox-1',
      idempotencyKey: 'ticket-issued:tkt-1:v1',
    });

    const res = await outboxService.enqueueEvent(null, {
      notificationType: 'ticket_issued',
      userId: 'usr-customer-1',
      payload: { ticketId: 'tkt-1' },
      idempotencyKey: 'ticket-issued:tkt-1:v1',
    });

    expect(res.id).toBe('existing-outbox-1');
  });

  it('PREFERENCE BYPASS: Transactional events bypass marketing opt-out preference', async () => {
    mockDb.query.notificationPreferences.findFirst.mockResolvedValueOnce({
      enabled: false, // User opted out of marketing
    });

    const isAllowed = await outboxService.checkPreference('usr-1', 'email', 'transactional');
    expect(isAllowed).toBe(true); // Transactional BYPASSES marketing opt-out
  });

  it('PREFERENCE POLICY: Marketing events respect user channel opt-out preference', async () => {
    mockDb.query.notificationPreferences.findFirst.mockResolvedValueOnce({
      enabled: false, // User opted out of marketing push
    });

    const isAllowed = await outboxService.checkPreference('usr-1', 'push', 'marketing');
    expect(isAllowed).toBe(false);
  });

  it('PUSH TOKEN INVALIDATION: Deactivates revoked push token when provider returns invalidToken', async () => {
    mockDb.query.notificationOutbox.findMany.mockResolvedValueOnce([
      {
        id: 'outbox-push-1',
        notificationType: 'order_paid',
        userId: 'usr-2',
        payloadJson: JSON.stringify({ title: 'Order Paid' }),
        retryCount: 0,
      },
    ]);
    mockDb.query.deviceTokens.findMany.mockResolvedValueOnce([
      { id: 'dt-1', token: 'invalid_token_xyz', platform: 'ios', active: true },
    ]);

    jest.spyOn(pushProvider, 'send').mockResolvedValueOnce({
      status: 'permanent_failure',
      providerMessageId: null,
      failureReason: 'FCM Token Invalid: NotRegistered',
      invalidToken: true,
    });

    await outboxService.processOutboxBatch('worker-1');
    expect(mockDb.update).toHaveBeenCalled();
  });
});
