import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { GlobalValidationPipe } from './common/pipes/validation.pipe';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
    rawBody: true,
  });

  // Security headers
  app.use(helmet());

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS — restrict origins in production
  const corsEnv = process.env['CORS_ORIGINS'] ?? '*';
  const corsOrigins = corsEnv === '*' ? true : corsEnv.split(',');
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  });

  // Global interceptors and filters
  app.useGlobalInterceptors(new RequestIdInterceptor(), new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(GlobalValidationPipe);

  const port = parseInt(process.env['PORT'] ?? '3001', 10);
  await app.listen(port);

  console.log(`🚀 API server running on http://localhost:${port}/api/v1`);
  console.log(`   Health: http://localhost:${port}/api/v1/health`);
  console.log(`   Ready:  http://localhost:${port}/api/v1/ready`);
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
