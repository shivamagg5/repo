import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SupportService } from './support.service';
import {
  adminSupportTicketUpdateSchema,
  adminRefundDecisionSchema,
} from '@platform/validation';
import type { AuthContext } from '@platform/types';

@Controller('admin/support')
@UseGuards(AuthGuard, RbacGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('tickets')
  @RequirePermissions('admin.audit' as any)
  async listSupportTickets(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('category') category?: string,
  ) {
    return this.supportService.listSupportTickets({ status, priority, category });
  }

  @Patch('tickets/:id')
  @RequirePermissions('admin.users.manage' as any)
  async updateSupportTicket(
    @Param('id') ticketId: string,
    @Body() body: unknown,
    @CurrentUser() actor: AuthContext,
  ) {
    const validated = adminSupportTicketUpdateSchema.parse(body);
    return this.supportService.updateSupportTicket(ticketId, validated, actor);
  }

  @Get('refund-queue')
  @RequirePermissions('order.view' as any)
  async getRefundQueue() {
    return this.supportService.getRefundQueue();
  }

  @Post('refund-queue/:id/decision')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('ticket.refund' as any)
  async decideRefund(
    @Param('id') orderId: string,
    @Body() body: unknown,
    @CurrentUser() actor: AuthContext,
  ) {
    const validated = adminRefundDecisionSchema.parse(body);
    return this.supportService.decideRefund(
      orderId,
      validated.decision,
      validated.reason,
      actor,
    );
  }

  @Get('chargebacks')
  @RequirePermissions('admin.audit' as any)
  async getChargebackLogs() {
    return this.supportService.getChargebackLogs();
  }
}
