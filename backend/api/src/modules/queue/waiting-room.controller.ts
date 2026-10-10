import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { WaitingRoomService, QueueConfig } from './waiting-room.service';
import { Public } from '../../common/decorators/permissions.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthContext } from '@platform/types';

@Controller('queue')
export class WaitingRoomController {
  constructor(private readonly waitingRoomService: WaitingRoomService) {}

  @Public()
  @Post(':eventId/join')
  @HttpCode(HttpStatus.OK)
  async joinQueue(
    @Param('eventId') eventId: string,
    @Body() body: { userId?: string },
    @Req() req: any,
  ) {
    const userId = body.userId || req.user?.userId || `anon-${Math.random().toString(36).substring(2, 9)}`;
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    return this.waitingRoomService.joinQueue(eventId, userId, String(ip));
  }

  @Public()
  @Get(':eventId/status')
  async getQueueStatus(
    @Param('eventId') eventId: string,
    @Query('token') queueToken: string,
  ) {
    return this.waitingRoomService.getQueueStatus(eventId, queueToken);
  }

  @Public()
  @Post(':eventId/verify')
  @HttpCode(HttpStatus.OK)
  async verifyAdmitToken(
    @Param('eventId') eventId: string,
    @Body() body: { admitToken: string },
  ) {
    return this.waitingRoomService.verifyAdmitToken(eventId, body.admitToken);
  }

  @Post(':eventId/admit-batch')
  @UseGuards(AuthGuard, RbacGuard)
  @RequirePermissions('event.manage' as any)
  @HttpCode(HttpStatus.OK)
  async admitBatch(
    @Param('eventId') eventId: string,
    @Body() body: { batchSize?: number },
  ) {
    return this.waitingRoomService.admitNextBatch(eventId, body.batchSize);
  }

  @Post(':eventId/configure')
  @UseGuards(AuthGuard, RbacGuard)
  @RequirePermissions('event.manage' as any)
  @HttpCode(HttpStatus.OK)
  async configureWaitingRoom(
    @Param('eventId') eventId: string,
    @Body() config: Partial<QueueConfig>,
  ) {
    return this.waitingRoomService.configureWaitingRoom(eventId, config);
  }
}
