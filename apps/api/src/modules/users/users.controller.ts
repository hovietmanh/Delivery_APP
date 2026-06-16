import { Controller, Get, Patch, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── Customer self-service ────────────────────────────────────────────────

  @Patch('me')
  @ApiOperation({ summary: 'Update own profile (name, email)' })
  updateMe(@Request() req: any, @Body() dto: { fullName?: string; email?: string }) {
    return this.usersService.updateMe(req.user.id, dto);
  }

  @Post('me/change-password')
  @ApiOperation({ summary: 'Change own password' })
  changePassword(
    @Request() req: any,
    @Body() dto: { currentPassword: string; newPassword: string },
  ) {
    return this.usersService.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
  }

  @Get('me/addresses')
  @ApiOperation({ summary: 'Get saved addresses' })
  getAddresses(@Request() req: any) {
    return this.usersService.getSavedAddresses(req.user.id);
  }

  @Patch('me/addresses')
  @ApiOperation({ summary: 'Update saved addresses' })
  updateAddresses(@Request() req: any, @Body() body: { addresses: any[] }) {
    return this.usersService.updateSavedAddresses(req.user.id, body.addresses);
  }

  // ── Admin ────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Admin: list all users' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin: get user detail' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}
