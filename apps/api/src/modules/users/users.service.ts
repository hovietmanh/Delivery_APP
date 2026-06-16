import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true, phone: true, email: true, fullName: true,
        role: true, isActive: true, isVerified: true, createdAt: true,
        avatarUrl: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, phone: true, email: true, fullName: true,
        role: true, isActive: true, isVerified: true, createdAt: true,
        customer: { include: { orders: { orderBy: { createdAt: 'desc' }, take: 5 } } },
        driver: true,
      },
    });
  }

  async updateMe(userId: string, dto: { fullName?: string; email?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.fullName && { fullName: dto.fullName.trim() }),
        ...(dto.email !== undefined && { email: dto.email || null }),
      },
      select: { id: true, phone: true, email: true, fullName: true, role: true },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new BadRequestException('Mật khẩu hiện tại không đúng');

    if (newPassword.length < 6) throw new BadRequestException('Mật khẩu mới phải ít nhất 6 ký tự');

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hashed } });
    return { message: 'Đổi mật khẩu thành công' };
  }

  async getSavedAddresses(userId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { userId },
      select: { savedAddresses: true },
    });
    return (customer?.savedAddresses as any[]) ?? [];
  }

  async updateSavedAddresses(userId: string, addresses: any[]) {
    await this.prisma.customer.update({
      where: { userId },
      data: { savedAddresses: addresses },
    });
    return addresses;
  }
}
