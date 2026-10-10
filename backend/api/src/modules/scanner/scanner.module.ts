import { Module } from '@nestjs/common';
import { ScannerController } from './scanner.controller';
import { ScannerService } from './scanner.service';
import { ScannerCryptoService } from './scanner-crypto.service';
import { DatabaseModule } from '../../database/database.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [DatabaseModule, RealtimeModule],
  controllers: [ScannerController],
  providers: [ScannerService, ScannerCryptoService],
  exports: [ScannerService, ScannerCryptoService],
})
export class ScannerModule {}
