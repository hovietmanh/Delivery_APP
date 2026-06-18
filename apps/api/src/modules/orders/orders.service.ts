import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from '@prisma/client';

const VALID_TRANSITIONS: Record<string, OrderStatus[]> = {
  PENDING:           ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:         ['PICKING_UP', 'AT_STATION', 'CANCELLED'],
  PICKING_UP:        ['AT_STATION', 'CANCELLED'],
  AT_STATION:        ['IN_TRANSIT'],
  IN_TRANSIT:        ['ARRIVED'],
  ARRIVED:           ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY:  ['DELIVERED'],
  DELIVERED:         ['DISPUTED'],
  CANCELLED:         [],
  DISPUTED:          [],
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateOrderDto) {
    const customer = await this.prisma.customer.findUnique({ where: { userId } });
    if (!customer) throw new BadRequestException('Customer profile not found');

    const trackingCode = await this.generateTrackingCode();

    return this.prisma.order.create({
      data: {
        trackingCode,
        customerId: customer.id,
        tripId: dto.tripId,
        assignedCompanyName: dto.assignedCompanyName ?? null,
        assignedDriverId: dto.assignedDriverId ?? null,
        fromCity: dto.fromCity,
        fromStation: dto.fromStation,
        toCity: dto.toCity,
        toStation: dto.toStation,
        serviceType: dto.serviceType,
        goodsType: dto.goodsType,
        weightRange: dto.weightRange,
        goodsDescription: dto.goodsDescription,
        goodsValue: dto.goodsValue,
        senderName: dto.senderName,
        senderPhone: dto.senderPhone,
        senderAddress: dto.senderAddress,
        receiverName: dto.receiverName,
        receiverPhone: dto.receiverPhone,
        receiverAddress: dto.receiverAddress,
        shippingFee: dto.shippingFee,
        doorPickupFee: dto.doorPickupFee ?? 0,
        doorDeliveryFee: dto.doorDeliveryFee ?? 0,
        insuranceFee: dto.insuranceFee ?? 0,
        voucherId: dto.voucherId ?? null,
        discount: dto.discount ?? 0,
        total: dto.total,
        codAmount: dto.codAmount ?? 0,
        paymentMethod: dto.paymentMethod,
        note: dto.note,
      },
    });
  }

  async createWithPayment(userId: string, dto: CreateOrderDto) {
    // Re-validate voucher trước khi tạo đơn (tránh race condition)
    if (dto.voucherId) {
      const voucher = await this.prisma.voucher.findUnique({ where: { id: dto.voucherId } });
      if (!voucher || !voucher.isActive) {
        throw new BadRequestException('Mã voucher không còn hiệu lực');
      }
      if (voucher.expiresAt && voucher.expiresAt < new Date()) {
        throw new BadRequestException('Mã voucher đã hết hạn');
      }
      if (voucher.usedCount >= voucher.maxUses) {
        throw new BadRequestException('Mã voucher đã hết lượt sử dụng');
      }
    }

    const order = await this.create(userId, dto);
    const payment = await this.paymentsService.initiatePayment(order.id);

    // Increment usedCount đồng bộ sau khi tạo đơn thành công
    if (dto.voucherId) {
      await this.prisma.voucher.update({
        where: { id: dto.voucherId },
        data: { usedCount: { increment: 1 } },
      });
    }

    this.notificationsService.create({
      userId,
      title: '🎉 Đặt đơn thành công!',
      body: `Mã vận đơn: ${order.trackingCode} · Vui lòng hoàn tất thanh toán.`,
      type: 'order_update',
      data: { orderId: order.id, trackingCode: order.trackingCode },
    }).catch(() => {}); // fire-and-forget, không block response

    return { ...order, payment };
  }

  async findByUser(userId: string, role: string, status?: string) {
    if (role === 'CUSTOMER') {
      const customer = await this.prisma.customer.findUnique({ where: { userId } });
      return this.prisma.order.findMany({
        where: {
          customerId: customer?.id,
          ...(status && { status: status as OrderStatus }),
        },
        include: {
          trip: { include: { driver: { include: { user: true } } } },
          tracking: { orderBy: { timestamp: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (role === 'DRIVER') {
      const driver = await this.prisma.driver.findUnique({ where: { userId } });
      if (!driver) return [];

      if (status === 'PENDING') {
        return this.prisma.order.findMany({
          where: { status: OrderStatus.PENDING, tripId: null },
          include: { customer: { include: { user: true } } },
          orderBy: { createdAt: 'asc' },
        });
      }

      return this.prisma.order.findMany({
        where: {
          trip: { driverId: driver.id },
          ...(status && { status: status as OrderStatus }),
        },
        include: { customer: { include: { user: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }

    // ADMIN
    return this.prisma.order.findMany({
      where: status ? { status: status as OrderStatus } : undefined,
      include: {
        customer: { include: { user: true } },
        trip: { include: { driver: { include: { user: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findFirst({
      where: { OR: [{ id }, { trackingCode: id }] },
      include: {
        customer: { include: { user: true } },
        trip: { include: { driver: { include: { user: true } }, route: true } },
        tracking: { orderBy: { timestamp: 'asc' } },
        complaint: true,
        review: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(orderId: string, newStatus: OrderStatus, options?: {
    driverId?: string;
    photos?: string[];
    signature?: string;
    codAmount?: number;
    note?: string;
  }) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    const allowed = VALID_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(`Cannot transition from ${order.status} to ${newStatus}`);
    }

    const timestamps: any = {};
    if (newStatus === 'CONFIRMED') timestamps.confirmedAt = new Date();
    if (newStatus === 'PICKING_UP') timestamps.pickedUpAt = new Date();
    if (newStatus === 'AT_STATION') timestamps.atStationAt = new Date();
    if (newStatus === 'IN_TRANSIT') timestamps.departedAt = new Date();
    if (newStatus === 'ARRIVED') timestamps.arrivedAt = new Date();
    if (newStatus === 'DELIVERED') timestamps.deliveredAt = new Date();
    if (newStatus === 'CANCELLED') timestamps.cancelledAt = new Date();

    const [updated] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          ...timestamps,
          ...(options?.photos?.length && newStatus === OrderStatus.PICKING_UP
            ? { pickupPhotos: options.photos }
            : {}),
          ...(options?.photos?.length && newStatus === OrderStatus.DELIVERED
            ? { deliveryPhotos: options.photos }
            : {}),
          ...(options?.signature && { receiverSignature: options.signature }),
        },
      }),
      this.prisma.orderTrackingEvent.create({
        data: {
          orderId,
          status: newStatus,
          note: options?.note,
          photoUrl: options?.photos?.[0],
        },
      }),
    ]);

    return updated;
  }

  async cancel(orderId: string, userId: string, reason?: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      throw new BadRequestException('Order cannot be cancelled at this stage');
    }

    const customer = await this.prisma.customer.findUnique({ where: { userId } });
    if (order.customerId !== customer?.id) throw new ForbiddenException();

    const updated = await this.updateStatus(orderId, OrderStatus.CANCELLED, { note: reason });

    this.notificationsService.create({
      userId,
      title: 'Đơn hàng đã bị hủy',
      body: `Đơn ${order.trackingCode} đã hủy${reason ? ` · Lý do: ${reason}` : ''}.`,
      type: 'order_update',
      data: { orderId, trackingCode: order.trackingCode, status: 'CANCELLED' },
    }).catch(() => {});

    return updated;
  }

  // ── Review ────────────────────────────────────────────────────────────────

  async createReview(userId: string, orderId: string, dto: {
    overallRating: number;
    goodsCareRating: number;
    staffRating: number;
    timeRating: number;
    comment?: string;
  }) {
    const customer = await this.prisma.customer.findUnique({ where: { userId } });
    if (!customer) throw new ForbiddenException();
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { trip: true, review: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== customer.id) throw new ForbiddenException();
    if (order.status !== OrderStatus.DELIVERED) throw new BadRequestException('Chỉ được đánh giá đơn đã giao thành công');
    if (order.review) throw new BadRequestException('Đơn hàng đã được đánh giá');
    if (!order.trip?.driverId) throw new BadRequestException('Không tìm thấy tài xế');

    const review = await this.prisma.review.create({
      data: {
        orderId,
        customerId: customer.id,
        driverId: order.trip.driverId,
        ...dto,
      },
    });

    // Cập nhật rating trung bình của tài xế
    const allReviews = await this.prisma.review.aggregate({
      where: { driverId: order.trip.driverId },
      _avg: { overallRating: true },
    });
    await this.prisma.driver.update({
      where: { id: order.trip.driverId },
      data: { rating: allReviews._avg.overallRating ?? 5 },
    });

    return review;
  }

  async getReview(orderId: string) {
    return this.prisma.review.findUnique({ where: { orderId } });
  }

  // ── Complaint ─────────────────────────────────────────────────────────────

  async createComplaint(userId: string, orderId: string, dto: {
    reason: string;
    description: string;
    requestedAmount?: number;
  }) {
    const customer = await this.prisma.customer.findUnique({ where: { userId } });
    if (!customer) throw new ForbiddenException();
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { complaint: true, trip: { include: { driver: { include: { user: true } } } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== customer.id) throw new ForbiddenException();
    if (order.complaint) throw new BadRequestException('Đơn hàng đã có khiếu nại');
    if (!['DELIVERED', 'DISPUTED'].includes(order.status)) {
      throw new BadRequestException('Chỉ được khiếu nại đơn đã giao hoặc đang tranh chấp');
    }

    const complaint = await this.prisma.complaint.create({
      data: {
        orderId,
        customerId: customer.id,
        reason: dto.reason,
        description: dto.description,
        requestedAmount: dto.requestedAmount,
        status: 'PENDING' as any,
      },
    });

    // Cập nhật trạng thái đơn → DISPUTED
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.DISPUTED },
    });

    // Thông báo tài xế
    if (order.trip?.driver?.userId) {
      this.notificationsService.create({
        userId: order.trip.driver.userId,
        title: '⚠️ Khiếu nại mới',
        body: `Đơn ${order.trackingCode} có khiếu nại: ${dto.reason}`,
        type: 'complaint',
        data: { orderId, complaintId: complaint.id },
      }).catch(() => {});
    }

    return complaint;
  }

  async getComplaint(orderId: string) {
    return this.prisma.complaint.findUnique({ where: { orderId } });
  }

  // ── Complaint resolution flow ─────────────────────────────────────────────

  async resolveComplaint(userId: string, orderId: string, body: { verdict: 'FAULT' | 'NO_FAULT'; message: string }) {
    const driver = await this.prisma.driver.findUnique({ where: { userId } });
    if (!driver) throw new ForbiddenException();

    const complaint = await this.prisma.complaint.findUnique({
      where: { orderId },
      include: {
        order: { include: { trip: { include: { driver: true } } } },
        customer: { include: { user: { select: { id: true } } } },
      },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');
    if (complaint.order.trip?.driverId !== driver.id) throw new ForbiddenException('Not your order');
    if (!['PENDING', 'REVIEWING'].includes(complaint.status as string)) {
      throw new BadRequestException('Khiếu nại đã được xử lý');
    }

    if (body.verdict === 'FAULT') {
      const voucherCode = `SORRY-${orderId.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 ngày

      await this.prisma.voucher.create({
        data: {
          code: voucherCode,
          description: `Xin lỗi - bồi thường khiếu nại đơn ${complaint.order.trackingCode}`,
          discountType: 'PERCENT' as any,
          discountValue: 20,
          maxUses: 1,
          forCustomerId: complaint.customerId,
          expiresAt,
        },
      });

      await this.prisma.complaint.update({
        where: { orderId },
        data: {
          status: 'AWAITING_BANK_INFO' as any,
          driverVerdict: 'FAULT',
          apologyMessage: body.message,
          apologyVoucherCode: voucherCode,
        },
      });

      this.notificationsService.create({
        userId: complaint.customer.user.id,
        title: '✅ Khiếu nại được chấp nhận',
        body: `Nhà xe xác nhận lỗi và gửi lời xin lỗi. Voucher giảm 20% đã được thêm. Vui lòng cung cấp số tài khoản để nhận hoàn tiền.`,
        type: 'complaint',
        data: { orderId },
      }).catch(() => {});
    } else {
      await this.prisma.complaint.update({
        where: { orderId },
        data: {
          status: 'RESOLVED_REJECTED' as any,
          driverVerdict: 'NO_FAULT',
          resolution: body.message,
          resolvedAt: new Date(),
        },
      });

      this.notificationsService.create({
        userId: complaint.customer.user.id,
        title: '❌ Kết quả khiếu nại',
        body: body.message,
        type: 'complaint',
        data: { orderId },
      }).catch(() => {});
    }
    return { success: true };
  }

  async submitBankInfo(userId: string, orderId: string, bankAccount: string) {
    const customer = await this.prisma.customer.findUnique({ where: { userId } });
    if (!customer) throw new ForbiddenException();

    const complaint = await this.prisma.complaint.findUnique({
      where: { orderId },
      include: {
        order: { select: { trackingCode: true } },
        customer: true,
      },
    });
    if (!complaint || complaint.customerId !== customer.id) throw new ForbiddenException();
    if (complaint.status !== 'AWAITING_BANK_INFO') throw new BadRequestException('Trạng thái không hợp lệ');

    await this.prisma.complaint.update({
      where: { orderId },
      data: { status: 'AWAITING_TRANSFER' as any, customerBankAccount: bankAccount },
    });

    // Tìm driver userId để thông báo
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { trip: { include: { driver: { include: { user: { select: { id: true } } } } } } },
    });
    if (order?.trip?.driver?.user?.id) {
      this.notificationsService.create({
        userId: order.trip.driver.user.id,
        title: '💰 Khách đã gửi số tài khoản',
        body: `Đơn ${complaint.order.trackingCode}: khách đã cung cấp tài khoản ngân hàng. Vui lòng chuyển tiền và xác nhận.`,
        type: 'complaint',
        data: { orderId },
      }).catch(() => {});
    }
    return { success: true };
  }

  async confirmTransfer(userId: string, orderId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { userId } });
    if (!driver) throw new ForbiddenException();

    const complaint = await this.prisma.complaint.findUnique({
      where: { orderId },
      include: {
        order: { select: { trackingCode: true } },
        customer: { include: { user: { select: { id: true } } } },
      },
    });
    if (!complaint) throw new NotFoundException();
    if (complaint.status !== 'AWAITING_TRANSFER') throw new BadRequestException('Trạng thái không hợp lệ');

    await this.prisma.complaint.update({
      where: { orderId },
      data: { status: 'RESOLVED_REFUND' as any, resolvedAt: new Date() },
    });

    this.notificationsService.create({
      userId: complaint.customer.user.id,
      title: '✅ Đã nhận được hoàn tiền',
      body: `Nhà xe đã chuyển tiền hoàn cho đơn ${complaint.order.trackingCode}. Xin cảm ơn.`,
      type: 'complaint',
      data: { orderId },
    }).catch(() => {});
    return { success: true };
  }

  async getAdminStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, todayOrders, inTransit, delivered, revenue] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { createdAt: { gte: today } } }),
      this.prisma.order.count({ where: { status: { in: ['IN_TRANSIT', 'PICKING_UP', 'AT_STATION', 'ARRIVED', 'OUT_FOR_DELIVERY'] as any } } }),
      this.prisma.order.count({ where: { status: 'DELIVERED' } }),
      this.prisma.order.aggregate({ where: { status: 'DELIVERED' }, _sum: { total: true } }),
    ]);

    return { total, todayOrders, inTransit, delivered, revenue: revenue._sum.total ?? 0 };
  }

  private async generateTrackingCode(): Promise<string> {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const prefix = `BS-${yy}${mm}${dd}-`;

    const last = await this.prisma.order.findFirst({
      where: { trackingCode: { startsWith: prefix } },
      orderBy: { trackingCode: 'desc' },
    });

    const seq = last
      ? String(Number(last.trackingCode.split('-')[2]) + 1).padStart(3, '0')
      : '001';

    return `${prefix}${seq}`;
  }
}
