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
} from '@platform/validation';
import type { Request } from 'express';

/**
 * FIX-005: Extracts identity claims from the authenticated JWT.
 * Throws ForbiddenException if the required claim is absent.
 * Zero-UUID fallbacks are explicitly prohibited — a missing claim
 * is a fatal auth error, not a default value.
 */
function requireUserId(req: Request): string {
  const userId = (req as any).user?.sub ?? (req as any).user?.id;
  if (!userId) {
    throw new ForbiddenException({
      code: 'MISSING_USER_IDENTITY',
      message: 'Authenticated user identity claim is absent. Request cannot be processed.',
    });
  }
  return userId;
}

function requireOrganizationId(req: Request): string {
  const orgId = (req as any).user?.organizationId;
  if (!orgId) {
    throw new ForbiddenException({
      code: 'MISSING_ORGANIZATION_CONTEXT',
      message: 'Authenticated user does not have an organization context. Scanner access requires org membership.',
    });
  }
  return orgId;
}

@Controller('scanner')
@UseGuards(AuthGuard, DeviceAuthGuard)
export class ScannerController {
  constructor(private readonly scannerService: ScannerService) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  async registerDevice(
    @Body(new ZodValidationPipe(deviceRegisterSchema)) body: any,
    @Req() req: Request,
  ) {
    // FIX-005: orgId must come from verified JWT — no zero-UUID fallback
    const orgId = requireOrganizationId(req);
    return this.scannerService.registerDevice(body, orgId);
  }

  @Post('pair')
  @HttpCode(HttpStatus.OK)
  async pairDevice(
    @Body(new ZodValidationPipe(devicePairSchema)) body: any,
    @Req() req: Request,
  ) {
    // FIX-005/006: Both userId and orgId required; service enforces org/device binding
    const staffUserId = requireUserId(req);
    const staffOrgId = requireOrganizationId(req);
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
    const staffOrgId = requireOrganizationId(req);
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
}
