import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ScannerService } from './scanner.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  deviceRegisterSchema,
  devicePairSchema,
  scanTicketSchema,
  batchSyncScansSchema,
  attendeeSearchQuerySchema,
} from '@platform/validation';
import type { Request } from 'express';

@Controller('scanner')
@UseGuards(AuthGuard)
export class ScannerController {
  constructor(private readonly scannerService: ScannerService) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  async registerDevice(
    @Body(new ZodValidationPipe(deviceRegisterSchema)) body: any,
    @Req() req: Request,
  ) {
    const orgId = (req as any).user?.organizationId ?? '00000000-0000-0000-0000-000000000000';
    return this.scannerService.registerDevice(body, orgId);
  }

  @Post('pair')
  @HttpCode(HttpStatus.OK)
  async pairDevice(
    @Body(new ZodValidationPipe(devicePairSchema)) body: any,
    @Req() req: Request,
  ) {
    const staffUserId = (req as any).user?.sub ?? (req as any).user?.id ?? '00000000-0000-0000-0000-000000000000';
    return this.scannerService.pairDevice(body, staffUserId);
  }

  @Get('events/:id/package')
  async getEventAuthPackage(
    @Param('id') eventId: string,
    @Query('deviceId') deviceId: string,
    @Query('gateId') gateId: string,
    @Req() req: Request,
  ) {
    const staffUserId = (req as any).user?.sub ?? (req as any).user?.id ?? '00000000-0000-0000-0000-000000000000';
    return this.scannerService.pairDevice({ deviceId, eventId, gateId }, staffUserId);
  }

  @Post('scan')
  @HttpCode(HttpStatus.OK)
  async scanTicket(
    @Body(new ZodValidationPipe(scanTicketSchema)) body: any,
    @Req() req: Request,
  ) {
    const staffUserId = (req as any).user?.sub ?? (req as any).user?.id ?? '00000000-0000-0000-0000-000000000000';
    return this.scannerService.scanTicket(body, staffUserId);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async syncOfflineScans(
    @Body(new ZodValidationPipe(batchSyncScansSchema)) body: any,
    @Req() req: Request,
  ) {
    const staffUserId = (req as any).user?.sub ?? (req as any).user?.id ?? '00000000-0000-0000-0000-000000000000';
    return this.scannerService.syncOfflineScans(body, staffUserId);
  }

  @Get('attendees')
  async searchAttendees(
    @Query('eventId') eventId: string,
    @Query('query') query: string,
  ) {
    attendeeSearchQuerySchema.parse({ eventId, query });
    return this.scannerService.searchAttendees(eventId, query);
  }

  @Post('manual-checkin')
  @HttpCode(HttpStatus.OK)
  async manualCheckin(
    @Body() body: { ticketId: string; eventId: string; gateId: string; deviceId: string },
    @Req() req: Request,
  ) {
    const staffUserId = (req as any).user?.sub ?? (req as any).user?.id ?? '00000000-0000-0000-0000-000000000000';
    return this.scannerService.performCheckinTransaction(
      body.ticketId,
      body.eventId,
      body.gateId,
      body.deviceId,
      staffUserId,
    );
  }
}
