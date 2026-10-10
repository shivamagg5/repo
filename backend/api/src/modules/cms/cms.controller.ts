import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
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
  CreateCmsEditorialBlockInput,
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

  @Public()
  @Get('collections')
  async getPublicCollections() {
    return this.cmsService.getCollections();
  }

  // Administrative Content Management Endpoints
  @Get('admin/banners')
  @RequirePermissions('cms.edit' as any)
  async getAdminBanners() {
    return this.cmsService.getAllBannersAdmin();
  }

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

  @Patch('banners/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('cms.edit' as any)
  async updateBanner(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Partial<CreateCmsBannerInput>,
    @CurrentUser() actor: AuthContext,
  ) {
    return this.cmsService.updateBanner(id, body, actor.userId);
  }

  @Delete('banners/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('cms.edit' as any)
  async deleteBanner(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthContext,
  ) {
    return this.cmsService.deleteBanner(id, actor.userId);
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

  @Post('editorial-blocks')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('cms.edit' as any)
  async createEditorialBlock(
    @Body() body: CreateCmsEditorialBlockInput,
    @CurrentUser() actor: AuthContext,
  ) {
    const validated = createCmsEditorialBlockSchema.parse(body);
    return this.cmsService.createEditorialBlock(validated as CreateCmsEditorialBlockInput, actor.userId);
  }

  @Post('featured-events')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('cms.edit' as any)
  async addFeaturedEvent(
    @Body() body: { eventId: string; displayOrder?: number; badgeText?: string },
    @CurrentUser() actor: AuthContext,
  ) {
    return this.cmsService.addFeaturedEvent(body.eventId, body.displayOrder ?? 0, body.badgeText, actor.userId);
  }

  @Delete('featured-events/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('cms.edit' as any)
  async removeFeaturedEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthContext,
  ) {
    return this.cmsService.removeFeaturedEvent(id, actor.userId);
  }
}
