import {
  Controller,
  Get,
  Post,
  Body,
  Sse,
  Param,
  ParseUUIDPipe,
  UseGuards,
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { RealtimeService } from './realtime.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TurnstileTelemetryDto } from '@platform/types';

@Controller('events')
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  /**
   * Public SSE stream for consumer clients to receive live remaining capacity updates
   * during high-demand flash sales and tier bookings.
   */
  @Sse(':eventId/live/inventory')
  streamInventoryUpdates(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Observable<MessageEvent> {
    return this.realtimeService.getInventoryStream(eventId);
  }

  /**
   * Protected SSE stream for organizers and staff to monitor live gate check-in admissions.
   */
  @Sse(':eventId/live/scans')
  @UseGuards(AuthGuard)
  streamGateScans(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Observable<MessageEvent> {
    return this.realtimeService.getScanStream(eventId);
  }

  /**
   * Protected SSE stream for real-time turnstile telemetry, ingress velocity, and gate stats.
   */
  @Sse(':eventId/live/telemetry')
  @UseGuards(AuthGuard)
  streamTurnstileTelemetry(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Observable<MessageEvent> {
    return this.realtimeService.getTelemetryStream(eventId);
  }

  /**
   * Fetch current aggregated turnstile telemetry snapshot for an event.
   */
  @Get(':eventId/telemetry')
  @UseGuards(AuthGuard)
  getTurnstileTelemetrySnapshot(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): TurnstileTelemetryDto {
    return this.realtimeService.getEventTelemetrySnapshot(eventId);
  }

  /**
   * Record bouncer / turnstile clicker count adjustment (+1, -1, +2, etc.)
   */
  @Post(':eventId/clicker')
  @UseGuards(AuthGuard)
  recordClickerDelta(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() body: { delta?: number; direction: 'admit' | 'exit'; gate?: string },
  ): TurnstileTelemetryDto {
    const delta = Math.max(1, body.delta ?? 1);
    return this.realtimeService.recordClickerDelta(eventId, delta, body.direction, body.gate);
  }

  /**
   * Admit a walk-in patron at the door and update real-time turnstile telemetry
   */
  @Post(':eventId/door-walkin')
  @UseGuards(AuthGuard)
  admitDoorWalkIn(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body()
    body: {
      guestName: string;
      phone?: string;
      plusOnes?: number;
      coverFee?: number;
      promoterName?: string;
      gate?: string;
    },
  ) {
    return this.realtimeService.admitWalkIn(eventId, body);
  }
}
