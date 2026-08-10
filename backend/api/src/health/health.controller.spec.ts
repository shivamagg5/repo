import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('GET /health', () => {
    it('should return status ok', () => {
      const result = controller.health();
      expect(result.status).toBe('ok');
    });

    it('should return a timestamp', () => {
      const result = controller.health();
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should return uptime as a number', () => {
      const result = controller.health();
      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /ready', () => {
    it('should return ready status', () => {
      const result = controller.ready();
      expect(result.status).toBe('ready');
    });

    it('should include process check', () => {
      const result = controller.ready();
      expect(result.checks.process).toBe('ok');
    });
  });
});
