import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards, HttpCode, HttpStatus,
  ConflictException, NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../config/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Admin / Drivers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'admin/drivers', version: '1' })
export class AdminDriversController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Admin: list all drivers' })
  findAll() {
    return this.prisma.driver.findMany({
      include: {
        user: { select: { id: true, fullName: true, phone: true, email: true, isActive: true, createdAt: true } },
        routes: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post()
  @ApiOperation({ summary: 'Admin: create driver account' })
  async create(@Body() body: {
    fullName: string;
    phone: string;
    password: string;
    driverCode: string;
    companyName: string;
    vehiclePlate: string;
    vehicleType: string;
    routes?: Array<{ fromCity: string; toCity: string }>;
  }) {
    const existing = await this.prisma.user.findUnique({ where: { phone: body.phone } });
    if (existing) throw new ConflictException('Số điện thoại đã được sử dụng');

    const codeExist = await this.prisma.driver.findUnique({ where: { driverCode: body.driverCode } });
    if (codeExist) throw new ConflictException('Mã tài xế đã tồn tại');

    const plateExist = await this.prisma.driver.findUnique({ where: { vehiclePlate: body.vehiclePlate } });
    if (plateExist) throw new ConflictException('Biển số xe đã được đăng ký');

    const hashed = await bcrypt.hash(body.password, 12);
    const user = await this.prisma.user.create({
      data: {
        phone: body.phone,
        fullName: body.fullName,
        password: hashed,
        role: 'DRIVER',
        isActive: true,
        isVerified: true,
      },
    });

    const driver = await this.prisma.driver.create({
      data: {
        userId: user.id,
        driverCode: body.driverCode,
        companyName: body.companyName,
        vehiclePlate: body.vehiclePlate,
        vehicleType: body.vehicleType,
        isApproved: true,
        routes: body.routes?.length
          ? { create: body.routes.map(r => ({ fromCity: r.fromCity, toCity: r.toCity })) }
          : undefined,
      },
      include: {
        user: { select: { id: true, fullName: true, phone: true, email: true, isActive: true, createdAt: true } },
        routes: true,
      },
    });

    return driver;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Admin: update driver info' })
  async update(@Param('id') id: string, @Body() body: {
    fullName?: string;
    phone?: string;
    companyName?: string;
    vehiclePlate?: string;
    vehicleType?: string;
    routes?: Array<{ fromCity: string; toCity: string }>;
  }) {
    const driver = await this.prisma.driver.findUnique({ where: { id }, include: { user: true } });
    if (!driver) throw new NotFoundException('Driver not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.driver.update({
        where: { id },
        data: {
          ...(body.companyName && { companyName: body.companyName }),
          ...(body.vehiclePlate && { vehiclePlate: body.vehiclePlate }),
          ...(body.vehicleType && { vehicleType: body.vehicleType }),
        },
      });

      await tx.user.update({
        where: { id: driver.userId },
        data: {
          ...(body.fullName && { fullName: body.fullName }),
          ...(body.phone && { phone: body.phone }),
        },
      });

      if (body.routes !== undefined) {
        await tx.driverRoute.deleteMany({ where: { driverId: id } });
        if (body.routes.length > 0) {
          await tx.driverRoute.createMany({
            data: body.routes.map(r => ({ driverId: id, fromCity: r.fromCity, toCity: r.toCity })),
          });
        }
      }
    });

    return this.prisma.driver.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, phone: true, email: true, isActive: true, createdAt: true } },
        routes: true,
      },
    });
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Admin: approve driver' })
  approve(@Param('id') id: string) {
    return this.prisma.driver.update({ where: { id }, data: { isApproved: true } });
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Admin: lock/unlock driver account' })
  async toggleActive(@Param('id') id: string) {
    const driver = await this.prisma.driver.findUnique({ where: { id }, include: { user: true } });
    if (!driver) throw new NotFoundException('Driver not found');
    const updated = await this.prisma.user.update({
      where: { id: driver.userId },
      data: { isActive: !driver.user.isActive },
    });
    return { isActive: updated.isActive };
  }

  @Patch(':id/reset-password')
  @ApiOperation({ summary: 'Admin: reset driver password' })
  async resetPassword(@Param('id') id: string, @Body() body: { newPassword: string }) {
    const driver = await this.prisma.driver.findUnique({ where: { id } });
    if (!driver) throw new NotFoundException('Driver not found');
    const hashed = await bcrypt.hash(body.newPassword, 12);
    await this.prisma.user.update({ where: { id: driver.userId }, data: { password: hashed } });
    return { message: 'Mật khẩu đã được đặt lại' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Admin: delete driver account' })
  async remove(@Param('id') id: string) {
    const driver = await this.prisma.driver.findUnique({ where: { id } });
    if (!driver) throw new NotFoundException('Driver not found');
    await this.prisma.user.delete({ where: { id: driver.userId } });
  }
}
