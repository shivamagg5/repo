import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReservationService } from './reservation.service';
import { createReservationSchema } from '@platform/validation';
import type { AuthContext } from '@platform/types';

@Controller('reservations')
@UseGuards(AuthGuard)
export class ReservationsController {
  constructor(private readonly reservationService: ReservationService) {}

  @Post()
  createReservation(
    @CurrentUser() actor: AuthContext,
    @Body() body: unknown,
    @Headers('idempotency-key') headerIdempotencyKey?: string,
  ) {
    const validated = createReservationSchema.parse(body);
    const key = validated.idempotencyKey ?? headerIdempotencyKey;
    return this.reservationService.createReservation(actor, { ...validated, idempotencyKey: key });
  }

  @Get(':id')
  getReservation(
    @CurrentUser() actor: AuthContext,
    @Param('id') id: string,
  ) {
    return this.reservationService.findReservation(actor, id);
  }

  @Post(':id/cancel')
  cancelReservation(
    @CurrentUser() actor: AuthContext,
    @Param('id') id: string,
  ) {
    return this.reservationService.cancelReservation(actor, id);
  }
}
