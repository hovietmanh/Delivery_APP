import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';

@Injectable()
export class VouchersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateVoucherDto) {
    const code = dto.code.toUpperCase().trim();
    const existing = await this.prisma.voucher.findUnique({ where: { code } });
    if (existing) throw new BadRequestException('Mã voucher đã tồn tại');

    const voucher = await this.prisma.voucher.create({
      data: {
        code,
        description: dto.description,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minOrderValue: dto.minOrderValue ?? 0,
        maxDiscount: dto.maxDiscount,
        maxUses: dto.maxUses ?? 100,
        isActive: dto.isActive ?? true,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    if (voucher.isActive) {
      const discountLabel = voucher.discountType === 'PERCENT'
        ? `${voucher.discountValue}%`
        : `${voucher.discountValue.toLocaleString('vi-VN')}đ`;

      this.notificationsService.notifyAllCustomers({
        title: `🎁 Ưu đãi mới: Giảm ${discountLabel}!`,
        body: `Dùng mã ${voucher.code}${voucher.description ? ` · ${voucher.description}` : ''}${voucher.expiresAt ? ` · HSD: ${new Date(voucher.expiresAt).toLocaleDateString('vi-VN')}` : ''}`,
        type: 'promotion',
        data: { voucherId: voucher.id, code: voucher.code },
      }).catch(() => {});
    }

    return voucher;
  }

  async findAll() {
    return this.prisma.voucher.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findActive() {
    const now = new Date();
    return this.prisma.voucher.findMany({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        usedCount: { lt: this.prisma.voucher.fields.maxUses as any },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActiveList() {
    const now = new Date();
    const vouchers = await this.prisma.voucher.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return vouchers.filter(v =>
      (!v.expiresAt || v.expiresAt > now) && v.usedCount < v.maxUses,
    );
  }

  async validate(code: string, orderTotal: number, customerId?: string) {
    const now = new Date();
    const voucher = await this.prisma.voucher.findUnique({
      where: { code: code.toUpperCase().trim() },
    });

    if (!voucher) throw new NotFoundException('Mã voucher không tồn tại');
    if (!voucher.isActive) throw new BadRequestException('Mã voucher không còn hiệu lực');
    if (voucher.expiresAt && voucher.expiresAt < now) throw new BadRequestException('Mã voucher đã hết hạn');
    if (voucher.usedCount >= voucher.maxUses) throw new BadRequestException('Mã voucher đã hết lượt sử dụng');
    if (orderTotal < voucher.minOrderValue) {
      throw new BadRequestException(`Đơn hàng tối thiểu ${voucher.minOrderValue.toLocaleString('vi-VN')}đ`);
    }
    if (voucher.forCustomerId && voucher.forCustomerId !== customerId) {
      throw new BadRequestException('Mã voucher này không dành cho bạn');
    }

    const discountAmount = this.calculateDiscount(voucher, orderTotal);
    return { voucher, discountAmount };
  }

  calculateDiscount(voucher: { discountType: string; discountValue: number; maxDiscount?: number | null }, orderTotal: number): number {
    if (voucher.discountType === 'PERCENT') {
      const raw = (orderTotal * voucher.discountValue) / 100;
      return voucher.maxDiscount ? Math.min(raw, voucher.maxDiscount) : raw;
    }
    return Math.min(voucher.discountValue, orderTotal);
  }

  async update(id: string, dto: Partial<CreateVoucherDto>) {
    const voucher = await this.prisma.voucher.findUnique({ where: { id } });
    if (!voucher) throw new NotFoundException('Voucher not found');

    return this.prisma.voucher.update({
      where: { id },
      data: {
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.discountType && { discountType: dto.discountType }),
        ...(dto.discountValue !== undefined && { discountValue: dto.discountValue }),
        ...(dto.minOrderValue !== undefined && { minOrderValue: dto.minOrderValue }),
        ...(dto.maxDiscount !== undefined && { maxDiscount: dto.maxDiscount }),
        ...(dto.maxUses !== undefined && { maxUses: dto.maxUses }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.expiresAt !== undefined && { expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null }),
      },
    });
  }

  async remove(id: string) {
    const voucher = await this.prisma.voucher.findUnique({ where: { id } });
    if (!voucher) throw new NotFoundException('Voucher not found');
    return this.prisma.voucher.delete({ where: { id } });
  }

  async incrementUsed(id: string) {
    return this.prisma.voucher.update({
      where: { id },
      data: { usedCount: { increment: 1 } },
    });
  }
}
