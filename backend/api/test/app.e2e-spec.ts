import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { RequestIdInterceptor } from '../src/common/interceptors/request-id.interceptor';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('API Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalInterceptors(new RequestIdInterceptor(), new ResponseInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/health', () => {
    it('should return 200 with status ok', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.data.status).toBe('ok');
          expect(res.body.meta.requestId).toBeDefined();
          expect(res.body.meta.timestamp).toBeDefined();
        });
    });

    it('should include X-Request-Id header', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.headers['x-request-id']).toBeDefined();
        });
    });
  });

  describe('GET /api/v1/ready', () => {
    it('should return 200 with ready status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/ready')
        .expect(200)
        .expect((res) => {
          expect(res.body.data.status).toBe('ready');
        });
    });
  });

  describe('GET /api/v1/nonexistent', () => {
    it('should return 404 with error envelope', () => {
      return request(app.getHttpServer())
        .get('/api/v1/nonexistent')
        .expect(404)
        .expect((res) => {
          expect(res.body.error).toBeDefined();
          expect(res.body.error.code).toBe('NOT_FOUND');
          expect(res.body.meta.requestId).toBeDefined();
        });
    });
  });
});
