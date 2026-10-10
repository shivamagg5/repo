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
  ForbiddenException,
} from '@nestjs/common';
import { ScannerService } from './scanner.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { DeviceAuthGuard } from '../../common/guards/device-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  deviceRegisterSchema,
  devicePairSchema,
  scanTicketSchema,
  batchSyncScansSchema,
  attendeeSearchQuerySchema,
  scannerOnboardSchema,
  scannerHeartbeatSchema,
} from '@platform/validation';
import type { Request } from 'express';

/**
 * FIX-005: Extracts identity claims from the authenticated JWT.
 * Throws ForbiddenException if the required claim is absent.
 * Zero-UUID fallbacks are explicitly prohibited — a missing claim
 * is a fatal auth error, not a default value.
 */
function requireUserId(req: Request): string {
  const userId = (req as any).user?.userId ?? (req as any).user?.sub ?? (req as any).user?.id;
  if (!userId) {
    throw new ForbiddenException({
      code: 'MISSING_USER_IDENTITY',
      message: 'Authenticated user identity claim is absent. Request cannot be processed.',
    });
  }
  return userId;
}

@Controller('scanner')
@UseGuards(AuthGuard, DeviceAuthGuard)
export class ScannerController {
  constructor(private readonly scannerService: ScannerService) {}

  @Post('onboard')
  @HttpCode(HttpStatus.OK)
  async onboardDevice(
    @Body(new ZodValidationPipe(scannerOnboardSchema)) body: any,
    @Req() req: Request,
  ) {
    const staffUserId = requireUserId(req);
    return this.scannerService.onboardScanner(body, staffUserId);
  }

  @Post('register')
  @HttpCode(HttpStatus.OK)
  async registerDevice(
    @Body(new ZodValidationPipe(deviceRegisterSchema)) body: any,
    @Req() req: Request,
  ) {
    const staffUserId = requireUserId(req);
    const requestedOrgId =
      (req.query?.['organizationId'] as string) ||
      (body as any)?.organizationId ||
      (req.headers['x-organization-id'] as string);
    const orgId = await this.scannerService.resolveStaffOrgId(staffUserId, requestedOrgId);
    return this.scannerService.registerDevice(body, orgId);
  }

  @Post('pair')
  @HttpCode(HttpStatus.OK)
  async pairDevice(
    @Body(new ZodValidationPipe(devicePairSchema)) body: any,
    @Req() req: Request,
  ) {
    const staffUserId = requireUserId(req);
    const requestedOrgId =
      (req.query?.['organizationId'] as string) ||
      (body as any)?.organizationId ||
      (req.headers['x-organization-id'] as string);
    const staffOrgId = await this.scannerService.resolveStaffOrgForEvent(staffUserId, body.eventId, requestedOrgId);
    return this.scannerService.pairDevice(body, staffUserId, staffOrgId);
  }

  @Get('events/:id/package')
  async getEventAuthPackage(
    @Param('id') eventId: string,
    @Query('deviceId') deviceId: string,
    @Query('gateId') gateId: string,
    @Req() req: Request,
  ) {
    const staffUserId = requireUserId(req);
    const requestedOrgId =
      (req.query?.['organizationId'] as string) ||
      (req.headers['x-organization-id'] as string);
    const staffOrgId = await this.scannerService.resolveStaffOrgForEvent(staffUserId, eventId, requestedOrgId);
    return this.scannerService.pairDevice({ deviceId, eventId, gateId }, staffUserId, staffOrgId);
  }

  @Post('scan')
  @HttpCode(HttpStatus.OK)
  async scanTicket(
    @Body(new ZodValidationPipe(scanTicketSchema)) body: any,
    @Req() req: Request,
  ) {
    const staffUserId = requireUserId(req);
    return this.scannerService.scanTicket(body, staffUserId);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async syncOfflineScans(
    @Body(new ZodValidationPipe(batchSyncScansSchema)) body: any,
    @Req() req: Request,
  ) {
    const staffUserId = requireUserId(req);
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
    const staffUserId = requireUserId(req);
    return this.scannerService.performCheckinTransaction(
      body.ticketId,
      body.eventId,
      body.gateId,
      body.deviceId,
      staffUserId,
    );
  }

  @Post('heartbeat')
  @HttpCode(HttpStatus.OK)
  async recordHeartbeat(
    @Body(new ZodValidationPipe(scannerHeartbeatSchema)) body: any,
  ) {
    return this.scannerService.recordHeartbeat(body);
  }

  @Get('events/:id/devices')
  async getEventDevices(@Param('id') eventId: string) {
    return this.scannerService.getEventDevices(eventId);
  }
}

