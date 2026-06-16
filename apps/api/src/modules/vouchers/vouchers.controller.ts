import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { VouchersService } from './vouchers.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Vouchers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'vouchers', version: '1' })
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  // ── Admin ────────────────────────────────────────────────────────────────

  @Post()
  create(@Body() dto: CreateVoucherDto) {
    return this.vouchersService.create(dto);
  }

  @Get('admin/all')
  findAll() {
    return this.vouchersService.findAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateVoucherDto>) {
    return this.vouchersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.vouchersService.remove(id);
  }

  // ── Customer ──────────────────────────────────────────────────────────────

  @Get()
  findActive() {
    return this.vouchersService.findActiveList();
  }

  @Get('validate')
  validateCode(@Query('code') code: string, @Query('total') total: string) {
    return this.vouchersService.validate(code, Number(total));
  }
}
