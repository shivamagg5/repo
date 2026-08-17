import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { Public } from '../../common/decorators/permissions.decorator';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get('live')
  @HttpCode(HttpStatus.OK)
  getLiveness() {
    return this.healthService.getLiveness();
  }

  @Public()
  @Get('ready')
  @HttpCode(HttpStatus.OK)
  async getReadiness() {
    return this.healthService.getReadiness();
  }
}
