import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { LedgerService } from './ledger.service';
import { ReconciliationService } from './reconciliation.service';
import { runReconciliationSchema } from '@platform/validation';

@Controller('finance')
@UseGuards(AuthGuard, RbacGuard)
export class FinanceController {
  constructor(
    private readonly ledgerService: LedgerService,
    private readonly reconciliationService: ReconciliationService,
  ) {}

  @Get('transactions')
  @RequirePermissions('finance.view' as any)
  async listTransactions(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.ledgerService.listTransactions({ cursor, limit: parsedLimit });
  }

  @Post('reconciliation/run')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('finance.reconcile' as any)
  async runReconciliation(@Body() body: { date?: string }) {
    const validated = runReconciliationSchema.parse(body);
    return this.reconciliationService.runReconciliation(validated.date);
  }
}
