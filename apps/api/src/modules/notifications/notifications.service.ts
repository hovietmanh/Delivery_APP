import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async countUnread(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async getAll(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { message: 'All notifications marked as read' };
  }

  async markRead(userId: string, notifId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notifId, userId },
      data: { isRead: true },
    });
  }

  async create(params: {
    userId: string;
    title: string;
    body: string;
    type: string;
    data?: Record<string, any>;
  }) {
    return this.prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        body: params.body,
        type: params.type,
        data: params.data,
      },
    });
  }

  async notifyAllCustomers(params: { title: string; body: string; type: string; data?: Record<string, any> }) {
    const customers = await this.prisma.customer.findMany({ select: { userId: true } });
    if (customers.length === 0) return;

    await this.prisma.notification.createMany({
      data: customers.map(c => ({
        userId: c.userId,
        title: params.title,
        body: params.body,
        type: params.type,
        data: params.data ?? {},
      })),
    });
  }

  async notifyOrderUpdate(orderId: string, status: string, customerId: string) {
    const statusMessages: Record<string, { title: string; body: string }> = {
      CONFIRMED:        { title: 'Đơn hàng đã được xác nhận', body: 'Nhà xe đã nhận đơn hàng của bạn' },
      PICKING_UP:       { title: 'Đang lấy hàng', body: 'Tài xế đang đến lấy hàng của bạn' },
      AT_STATION:       { title: 'Hàng đã lên xe', body: 'Hàng đã được đưa lên xe tại bến xuất phát' },
      IN_TRANSIT:       { title: 'Xe đã xuất bến 🚌', body: 'Hàng của bạn đang trên đường đến đích' },
      ARRIVED:          { title: 'Xe đã đến bến đích', body: 'Xe đã đến bến, chuẩn bị giao hàng' },
      OUT_FOR_DELIVERY: { title: 'Đang giao đến nhà', body: 'Tài xế đang giao hàng đến địa chỉ của bạn' },
      DELIVERED:        { title: '✅ Giao hàng thành công!', body: 'Đơn hàng đã được giao thành công' },
      CANCELLED:        { title: 'Đơn hàng đã hủy', body: 'Đơn hàng của bạn đã bị hủy' },
    };

    const msg = statusMessages[status];
    if (!msg) return;

    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return;

    return this.create({
      userId: customer.userId,
      title: msg.title,
      body: msg.body,
      type: 'order_update',
      data: { orderId, status },
    });
  }
}
