import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermissions, Public } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CmsService } from './cms.service';
import {
  createCmsBannerSchema,
  createCmsCollectionSchema,
  createCmsEditorialBlockSchema,
} from '@platform/validation';
import type {
  AuthContext,
  CreateCmsBannerInput,
  CreateCmsCollectionInput,
} from '@platform/types';

@Controller('cms')
@UseGuards(AuthGuard, RbacGuard)
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  // Public Consumer Endpoints (No Auth Required)
  @Public()
  @Get('banners')
  async getPublicBanners() {
    return this.cmsService.getPublicBanners();
  }

  @Public()
  @Get('featured-events')
  async getPublicFeaturedEvents() {
    return this.cmsService.getPublicFeaturedEvents();
  }

  @Public()
  @Get('editorial-blocks')
  async getPublicEditorialBlocks() {
    return this.cmsService.getPublicEditorialBlocks();
  }

  // Administrative Content Management Endpoints
  @Post('banners')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('cms.edit' as any)
  async createBanner(
    @Body() body: CreateCmsBannerInput,
    @CurrentUser() actor: AuthContext,
  ) {
    const validated = createCmsBannerSchema.parse(body);
    return this.cmsService.createBanner(validated as CreateCmsBannerInput, actor.userId);
  }

  @Post('collections')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('cms.edit' as any)
  async createCollection(
    @Body() body: CreateCmsCollectionInput,
    @CurrentUser() actor: AuthContext,
  ) {
    const validated = createCmsCollectionSchema.parse(body);
    return this.cmsService.createCollection(validated as CreateCmsCollectionInput, actor.userId);
  }
}
