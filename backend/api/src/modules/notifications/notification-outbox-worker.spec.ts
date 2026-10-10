import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationOutboxWorkerService } from './notification-outbox-worker.service';
import { NotificationOutboxService } from './notification-outbox.service';

describe('NotificationOutboxWorkerService', () => {
  let worker: NotificationOutboxWorkerService;
  let outboxService: jest.Mocked<NotificationOutboxService>;

  beforeEach(async () => {
    const mockOutboxService = {
      processOutboxBatch: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationOutboxWorkerService,
        {
          provide: NotificationOutboxService,
          useValue: mockOutboxService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined), // Defaults to active
          },
        },
      ],
    }).compile();

    worker = module.get<NotificationOutboxWorkerService>(NotificationOutboxWorkerService);
    outboxService = module.get(NotificationOutboxService);
  });

  it('should be defined', () => {
    expect(worker).toBeDefined();
  });

  it('should be active when CRON_WORKER is not set', () => {
    // @ts-expect-error accessing private property for test verification
    expect(worker.isCronWorker).toBe(true);
  });

  it('should NOT call processOutboxBatch when CRON_WORKER=false', async () => {
    // @ts-expect-error accessing private property
    worker.isCronWorker = false;
    await worker.runOutboxWorker();
    expect(outboxService.processOutboxBatch).not.toHaveBeenCalled();
  });

  it('should call processOutboxBatch on runOutboxWorker', async () => {
    outboxService.processOutboxBatch.mockResolvedValue(undefined);
    await worker.runOutboxWorker();
    expect(outboxService.processOutboxBatch).toHaveBeenCalledTimes(1);
    expect(outboxService.processOutboxBatch).toHaveBeenCalledWith('worker-main', 25);
  });

  it('should skip run if another batch is currently processing', async () => {
    // @ts-expect-error simulating in-flight processing
    worker.isProcessing = true;
    await worker.runOutboxWorker();
    expect(outboxService.processOutboxBatch).not.toHaveBeenCalled();
  });

  it('should safely catch errors from processOutboxBatch without throwing', async () => {
    outboxService.processOutboxBatch.mockRejectedValue(new Error('Network failure'));
    await expect(worker.runOutboxWorker()).resolves.toBeUndefined();
  });
});
