import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { DiscoveryCacheService } from './discovery-cache.service';

@Module({
  providers: [SearchService, DiscoveryCacheService],
  exports: [SearchService, DiscoveryCacheService],
})
export class DiscoveryModule {}
