import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { VouchersService } from './vouchers.service';
import { PrismaService } from '../../config/prisma.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Vouchers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'vouchers', version: '1' })
export class VouchersController {
  constructor(
    private readonly vouchersService: VouchersService,
    private readonly prisma: PrismaService,
  ) {}

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
  async findActive(@Request() req: any) {
    const customer = await this.prisma.customer.findUnique({ where: { userId: req.user.id } });
    return this.vouchersService.findActiveList(customer?.id);
  }

  @Get('validate')
  async validateCode(@Query('code') code: string, @Query('total') total: string, @Request() req: any) {
    const customer = await this.prisma.customer.findUnique({ where: { userId: req.user.id } });
    return this.vouchersService.validate(code, Number(total), customer?.id);
  }
}
