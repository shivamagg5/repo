import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { MembersService } from './members.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  CreateOrganizationSchema,
  UpdateOrganizationSchema,
  InviteMemberSchema,
  AcceptInvitationSchema,
  ChangeRoleSchema,
  type CreateOrganizationInput,
  type UpdateOrganizationInput,
  type InviteMemberInput,
  type AcceptInvitationInput,
  type ChangeRoleInput,
} from './dto/organization.dto';
import type { AuthContext } from '@platform/types';

@Controller('organizations')
@UseGuards(AuthGuard)
export class OrganizationsController {
  constructor(
    private readonly orgsService: OrganizationsService,
    private readonly membersService: MembersService,
  ) {}

  // ---------------------------------------------------------------------------
  // Organizations
  // ---------------------------------------------------------------------------

  @Post()
  create(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(CreateOrganizationSchema)) body: CreateOrganizationInput,
  ) {
    return this.orgsService.create(user.userId, body);
  }

  @Get()
  findMine(@CurrentUser() user: AuthContext) {
    return this.orgsService.findMyOrganizations(user.userId);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orgsService.findOne(user.userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateOrganizationSchema)) body: UpdateOrganizationInput,
  ) {
    return this.orgsService.update(user.userId, id, body);
  }

  // ---------------------------------------------------------------------------
  // Members
  // ---------------------------------------------------------------------------

  @Get(':id/members')
  listMembers(
    @CurrentUser() user: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.membersService.listMembers(user.userId, id);
  }

  @Post(':id/invitations')
  invite(
    @CurrentUser() user: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(InviteMemberSchema)) body: InviteMemberInput,
  ) {
    return this.membersService.invite(user.userId, id, body);
  }

  /**
   * POST /api/v1/organizations/:id/invitations/accept
   *
   * SECURITY: The invitation record is the authoritative source for
   * organization and role. The :id URL param is treated as a consistency
   * check ONLY — it never overrides the invitation's stored organization_id.
   */
  @Post(':id/invitations/accept')
  @HttpCode(HttpStatus.OK)
  acceptInvitation(
    @CurrentUser() user: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(AcceptInvitationSchema)) body: AcceptInvitationInput,
  ) {
    return this.membersService.acceptInvitation(body.token, user.userId, id);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @CurrentUser() user: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
  ) {
    return this.membersService.removeMember(user.userId, id, targetUserId);
  }

  @Patch(':id/members/:userId/role')
  changeRole(
    @CurrentUser() user: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Body(new ZodValidationPipe(ChangeRoleSchema)) body: ChangeRoleInput,
  ) {
    return this.membersService.changeRole(user.userId, id, targetUserId, body);
  }
}
