import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HoldExpiryWorkerService } from './hold-expiry-worker.service';
import { HoldExpirationService } from './hold-expiration.service';

describe('HoldExpiryWorkerService', () => {
  let worker: HoldExpiryWorkerService;
  let holdExpirationService: jest.Mocked<HoldExpirationService>;

  beforeEach(async () => {
    const mockHoldExpirationService = {
      processExpiredHolds: jest.fn().mockResolvedValue({ expiredCount: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HoldExpiryWorkerService,
        {
          provide: HoldExpirationService,
          useValue: mockHoldExpirationService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined), // CRON_WORKER not set → active
          },
        },
      ],
    }).compile();

    worker = module.get<HoldExpiryWorkerService>(HoldExpiryWorkerService);
    holdExpirationService = module.get(HoldExpirationService);
  });

  it('should be defined', () => {
    expect(worker).toBeDefined();
  });

  it('should be active when CRON_WORKER is not set', () => {
    // @ts-expect-error accessing private
    expect(worker.isCronWorker).toBe(true);
  });

  it('should NOT call processExpiredHolds when CRON_WORKER=false', async () => {
    // @ts-expect-error accessing private
    worker.isCronWorker = false;
    await worker.runHoldExpiry();
    expect(holdExpirationService.processExpiredHolds).not.toHaveBeenCalled();
  });

  it('should call processExpiredHolds on runHoldExpiry', async () => {
    holdExpirationService.processExpiredHolds.mockResolvedValue({ expiredCount: 3 });
    await worker.runHoldExpiry();
    expect(holdExpirationService.processExpiredHolds).toHaveBeenCalledTimes(1);
  });

  it('should not throw when processExpiredHolds returns 0 expired', async () => {
    holdExpirationService.processExpiredHolds.mockResolvedValue({ expiredCount: 0 });
    await expect(worker.runHoldExpiry()).resolves.toBeUndefined();
  });

  it('should not throw when processExpiredHolds throws an error (error is caught internally)', async () => {
    holdExpirationService.processExpiredHolds.mockRejectedValue(new Error('DB connection lost'));
    // Worker should swallow the error and not crash the process
    await expect(worker.runHoldExpiry()).resolves.toBeUndefined();
  });
});
