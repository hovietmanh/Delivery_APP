import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrderStatus, TripStatus } from '@prisma/client';

@Injectable()
export class DriversService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async getDriver(userId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { userId } });
    if (!driver) throw new ForbiddenException('Driver profile not found');
    return driver;
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  async getStats(userId: string) {
    const driver = await this.getDriver(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pendingWhere = {
      status: OrderStatus.PENDING,
      tripId: null,
      OR: [
        { assignedDriverId: driver.id },
        {
          assignedDriverId: null,
          OR: [{ assignedCompanyName: null }, { assignedCompanyName: driver.companyName }],
        },
      ],
    } as any;

    const [pending, confirmed, pickingUp, delivering, today_count, delivered] = await Promise.all([
      this.prisma.order.count({ where: pendingWhere }),
      this.prisma.order.count({ where: { trip: { driverId: driver.id }, status: OrderStatus.CONFIRMED } }),
      this.prisma.order.count({ where: { trip: { driverId: driver.id }, status: OrderStatus.PICKING_UP } }),
      this.prisma.order.count({
        where: {
          trip: { driverId: driver.id },
          status: { in: [OrderStatus.AT_STATION, OrderStatus.IN_TRANSIT, OrderStatus.ARRIVED, OrderStatus.OUT_FOR_DELIVERY] },
        },
      }),
      this.prisma.order.count({ where: { trip: { driverId: driver.id }, createdAt: { gte: today } } }),
      this.prisma.order.count({
        where: {
          OR: [
            { trip: { driverId: driver.id }, status: OrderStatus.DELIVERED },
            { assignedDriverId: driver.id, status: OrderStatus.DELIVERED },
          ],
        },
      }),
    ]);

    return {
      pending, today: today_count, delivered,
      tabCounts: { PENDING: pending, CONFIRMED: confirmed, PICKING_UP: pickingUp, DELIVERING: delivering },
    };
  }

  // ── Orders ────────────────────────────────────────────────────────────────

  async getOrders(userId: string, status?: string) {
    const driver = await this.getDriver(userId);

    if (status === 'PENDING') {
      return this.prisma.order.findMany({
        where: {
          status: OrderStatus.PENDING,
          tripId: null,
          OR: [
            { assignedDriverId: driver.id },
            {
              assignedDriverId: null,
              OR: [
                { assignedCompanyName: null },
                { assignedCompanyName: driver.companyName },
              ],
            },
          ],
        },
        include: { customer: { include: { user: { select: { fullName: true, phone: true } } } } },
        orderBy: { createdAt: 'asc' },
      });
    }

    if (status === 'DELIVERING') {
      return this.prisma.order.findMany({
        where: {
          trip: { driverId: driver.id },
          status: { in: [OrderStatus.AT_STATION, OrderStatus.IN_TRANSIT, OrderStatus.ARRIVED, OrderStatus.OUT_FOR_DELIVERY] },
        },
        include: { customer: { include: { user: { select: { fullName: true, phone: true } } } } },
        orderBy: { createdAt: 'desc' },
      });
    }

    const statusFilter = status ? { status: status as OrderStatus } : {};
    return this.prisma.order.findMany({
      where: {
        OR: [
          { trip: { driverId: driver.id }, ...statusFilter },
          { assignedDriverId: driver.id, ...statusFilter },
        ],
      },
      include: { customer: { include: { user: { select: { fullName: true, phone: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { include: { user: { select: { fullName: true, phone: true } } } },
        trip: { include: { driver: true } },
        tracking: { orderBy: { timestamp: 'asc' } },
        complaint: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  // ── Accept / Reject ───────────────────────────────────────────────────────

  async acceptOrder(userId: string, orderId: string) {
    const driver = await this.getDriver(userId);
    if (!driver.todayFromCity || !driver.todayDepartureTime) {
      throw new BadRequestException('Bạn chưa cập nhật Tuyến hôm nay. Vui lòng điền thông tin tuyến trước khi nhận đơn.');
    }
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Order is no longer available');
    }
    if (order.assignedDriverId && order.assignedDriverId !== driver.id) {
      throw new ForbiddenException('Đơn hàng này chỉ dành cho tài xế khác');
    }
    if (!order.assignedDriverId && order.assignedCompanyName && order.assignedCompanyName !== driver.companyName) {
      throw new ForbiddenException('Đơn hàng này chỉ dành cho nhà xe khác');
    }

    // Find or create an active trip for this route + driver
    let trip = await this.prisma.trip.findFirst({
      where: {
        driverId: driver.id,
        status: { in: [TripStatus.SCHEDULED, TripStatus.BOARDING] },
        route: { fromCity: order.fromCity, toCity: order.toCity },
      },
    });

    if (!trip) {
      const route = await this.prisma.route.findFirst({
        where: { fromCity: order.fromCity, toCity: order.toCity, isActive: true },
      });

      const departureTime = this.parseDepartureTime(driver.todayDepartureTime);
      const travelHours = this.estimateTravelHours(order.fromCity, order.toCity);
      const arrivalEta = new Date(departureTime.getTime() + travelHours * 60 * 60 * 1000);

      trip = await this.prisma.trip.create({
        data: {
          routeId: route?.id ?? (await this.ensureRoute(order.fromCity, order.toCity)),
          driverId: driver.id,
          departureTime,
          arrivalEta,
          capacityKg: 1000,
          pricePerKg: driver.todayPricePerKg ?? 15000,
          status: TripStatus.BOARDING,
        },
      });
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { tripId: trip.id, status: OrderStatus.CONFIRMED, confirmedAt: new Date() },
      }),
      this.prisma.orderTrackingEvent.create({
        data: { orderId, status: OrderStatus.CONFIRMED, note: `Nhà xe ${driver.companyName} xác nhận đơn` },
      }),
    ]);

    this.notifications.notifyOrderUpdate(orderId, 'CONFIRMED', order.customerId).catch(() => {});

    return updated;
  }

  async rejectOrder(userId: string, orderId: string, reason: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.PENDING) throw new BadRequestException('Order no longer pending');
    return { message: 'Order rejected', reason };
  }

  // ── Pickup flow ───────────────────────────────────────────────────────────

  async startPickup(userId: string, orderId: string) {
    await this.getDriver(userId);
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException('Đơn hàng chưa được xác nhận');
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PICKING_UP },
      }),
      this.prisma.orderTrackingEvent.create({
        data: { orderId, status: OrderStatus.PICKING_UP, note: 'Tài xế đang đến lấy hàng' },
      }),
    ]);

    this.notifications.notifyOrderUpdate(orderId, 'PICKING_UP', order.customerId).catch(() => {});
    return updated;
  }

  async confirmPickup(userId: string, orderId: string, photos: string[]) {
    await this.getDriver(userId);
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.PICKING_UP) {
      throw new BadRequestException('Đơn hàng chưa ở trạng thái đang lấy');
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.AT_STATION, pickupPhotos: photos, pickedUpAt: new Date() },
      }),
      this.prisma.orderTrackingEvent.create({
        data: { orderId, status: OrderStatus.AT_STATION, photoUrl: photos[0], note: 'Hàng đã lên xe' },
      }),
    ]);

    this.notifications.notifyOrderUpdate(orderId, 'AT_STATION', order.customerId).catch(() => {});
    return updated;
  }

  // ── Delivery flow ─────────────────────────────────────────────────────────

  async startDelivery(userId: string, orderId: string) {
    await this.getDriver(userId);
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.ARRIVED) {
      throw new BadRequestException('Đơn hàng chưa đến bến đích');
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.OUT_FOR_DELIVERY },
      }),
      this.prisma.orderTrackingEvent.create({
        data: { orderId, status: OrderStatus.OUT_FOR_DELIVERY, note: 'Đang giao đến người nhận' },
      }),
    ]);

    this.notifications.notifyOrderUpdate(orderId, 'OUT_FOR_DELIVERY', order.customerId).catch(() => {});
    return updated;
  }

  async confirmDelivery(
    userId: string,
    orderId: string,
    data: { photos: string[]; receiverName: string; amountCollected?: number },
  ) {
    const driver = await this.getDriver(userId);
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.OUT_FOR_DELIVERY) {
      throw new BadRequestException('Đơn hàng chưa ở trạng thái đang giao');
    }

    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.DELIVERED,
          deliveryPhotos: data.photos,
          receiverSignature: data.receiverName,
          deliveredAt: new Date(),
        },
      }),
      this.prisma.orderTrackingEvent.create({
        data: {
          orderId,
          status: OrderStatus.DELIVERED,
          photoUrl: data.photos[0],
          note: `Đã giao cho ${data.receiverName}${data.amountCollected ? `. Thu: ${data.amountCollected.toLocaleString('vi-VN')}đ` : ''}`,
        },
      }),
      this.prisma.driver.update({
        where: { id: driver.id },
        data: { totalTrips: { increment: 1 } },
      }),
    ]);

    this.notifications.notifyOrderUpdate(orderId, 'DELIVERED', order.customerId).catch(() => {});
    return { success: true, orderId };
  }

  // ── Trip ──────────────────────────────────────────────────────────────────

  async getActiveTrip(userId: string) {
    const driver = await this.getDriver(userId);
    return this.prisma.trip.findFirst({
      where: {
        driverId: driver.id,
        status: { in: [TripStatus.BOARDING, TripStatus.IN_TRANSIT, TripStatus.ARRIVED] },
      },
      include: {
        route: true,
        orders: {
          include: { customer: { include: { user: { select: { fullName: true } } } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async updateTripCheckpoint(userId: string, tripId: string, checkpoint: string) {
    const driver = await this.getDriver(userId);
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, driverId: driver.id },
    });
    if (!trip) throw new ForbiddenException('Not your trip');

    const statusMap: Record<string, TripStatus> = {
      DEPARTED: TripStatus.IN_TRANSIT,
      MIDPOINT: TripStatus.IN_TRANSIT,
      ARRIVED_STATION: TripStatus.ARRIVED,
    };

    const newStatus = statusMap[checkpoint] ?? trip.status;
    const checkpoints = (trip.checkpoints as any[] ?? []);
    checkpoints.push({ key: checkpoint, time: new Date().toISOString() });

    const updated = await this.prisma.trip.update({
      where: { id: tripId },
      data: { status: newStatus, checkpoints, progressPercent: this.calcProgress(checkpoint) },
    });

    if (checkpoint === 'ARRIVED_STATION') {
      const arrivedOrders = await this.prisma.order.findMany({
        where: { tripId, status: OrderStatus.IN_TRANSIT },
        select: { id: true, customerId: true },
      });
      await this.prisma.order.updateMany({
        where: { tripId, status: OrderStatus.IN_TRANSIT },
        data: { status: OrderStatus.ARRIVED, arrivedAt: new Date() },
      });
      for (const o of arrivedOrders) {
        this.notifications.notifyOrderUpdate(o.id, 'ARRIVED', o.customerId).catch(() => {});
      }
    } else if (checkpoint === 'DEPARTED') {
      const transitOrders = await this.prisma.order.findMany({
        where: { tripId, status: OrderStatus.AT_STATION },
        select: { id: true, customerId: true },
      });
      await this.prisma.order.updateMany({
        where: { tripId, status: OrderStatus.AT_STATION },
        data: { status: OrderStatus.IN_TRANSIT, departedAt: new Date() },
      });
      for (const o of transitOrders) {
        this.notifications.notifyOrderUpdate(o.id, 'IN_TRANSIT', o.customerId).catch(() => {});
      }
    }

    return updated;
  }

  // ── Today Route ───────────────────────────────────────────────────────────

  async getTodayRoute(userId: string) {
    const driver = await this.getDriver(userId);
    return {
      fromCity: driver.todayFromCity,
      toCity: driver.todayToCity,
      departureTime: driver.todayDepartureTime,
      pricePerKg: driver.todayPricePerKg,
      isSet: !!(driver.todayFromCity && driver.todayToCity && driver.todayDepartureTime),
    };
  }

  async updateTodayRoute(
    userId: string,
    data: { fromCity: string; toCity: string; departureTime: string; pricePerKg?: number },
  ) {
    const driver = await this.getDriver(userId);
    const updated = await this.prisma.driver.update({
      where: { id: driver.id },
      data: {
        todayFromCity: data.fromCity,
        todayToCity: data.toCity,
        todayDepartureTime: data.departureTime,
        todayPricePerKg: data.pricePerKg ?? null,
      },
    });

    // Tạo hoặc cập nhật Trip BOARDING ngay khi tài xế đặt tuyến
    const existingTrip = await this.prisma.trip.findFirst({
      where: { driverId: driver.id, status: TripStatus.BOARDING },
    });

    const routeId = await this.ensureRoute(data.fromCity, data.toCity);
    const departureTime = this.parseDepartureTime(data.departureTime);
    const travelHours = this.estimateTravelHours(data.fromCity, data.toCity);
    const arrivalEta = new Date(departureTime.getTime() + travelHours * 60 * 60 * 1000);
    const pricePerKg = data.pricePerKg ?? 15000;

    if (existingTrip) {
      await this.prisma.trip.update({
        where: { id: existingTrip.id },
        data: { routeId, departureTime, arrivalEta, pricePerKg },
      });
    } else {
      await this.prisma.trip.create({
        data: { routeId, driverId: driver.id, departureTime, arrivalEta, capacityKg: 1000, pricePerKg, status: TripStatus.BOARDING },
      });
    }

    return {
      fromCity: updated.todayFromCity,
      toCity: updated.todayToCity,
      departureTime: updated.todayDepartureTime,
      pricePerKg: updated.todayPricePerKg,
      isSet: true,
    };
  }

  async clearTodayRoute(userId: string) {
    const driver = await this.getDriver(userId);
    await this.prisma.driver.update({
      where: { id: driver.id },
      data: { todayFromCity: null, todayToCity: null, todayDepartureTime: null, todayPricePerKg: null },
    });
    return { isSet: false };
  }

  // ── My Routes (admin-assigned static routes) ───────────────────────────────

  async getMyRoutes(userId: string) {
    const driver = await this.getDriver(userId);
    return this.prisma.driverRoute.findMany({
      where: { driverId: driver.id },
      orderBy: { fromCity: 'asc' },
    });
  }

  // ── Complaints ─────────────────────────────────────────────────────────────

  async getComplaints(userId: string) {
    const driver = await this.getDriver(userId);
    return this.prisma.complaint.findMany({
      where: { order: { trip: { driverId: driver.id } } },
      include: {
        order: {
          select: { id: true, trackingCode: true, pickupPhotos: true, deliveryPhotos: true, total: true },
        },
        customer: { include: { user: { select: { fullName: true, phone: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async respondComplaint(userId: string, complaintId: string, response: string) {
    await this.getDriver(userId);
    const complaint = await this.prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) throw new NotFoundException('Complaint not found');
    // Store response as a resolution note
    return this.prisma.complaint.update({
      where: { id: complaintId },
      data: { resolution: response },
    });
  }

  // ── Complete trip & reset driver state ───────────────────────────────────

  async completeTrip(userId: string, tripId: string) {
    const driver = await this.getDriver(userId);

    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, driverId: driver.id },
      include: { orders: { select: { id: true, status: true } } },
    });
    if (!trip) throw new NotFoundException('Không tìm thấy chuyến xe');
    if (trip.status !== TripStatus.ARRIVED) {
      throw new BadRequestException('Chỉ hoàn tất được khi xe đã đến bến đích');
    }

    const unfinished = trip.orders.filter(
      (o) => !['DELIVERED', 'CANCELLED', 'DISPUTED'].includes(o.status as string),
    );
    if (unfinished.length > 0) {
      throw new BadRequestException(`Còn ${unfinished.length} đơn chưa giao xong. Vui lòng xử lý hết trước khi hoàn tất chuyến.`);
    }

    await this.prisma.$transaction([
      // Đánh dấu chuyến COMPLETED
      this.prisma.trip.update({
        where: { id: tripId },
        data: { status: TripStatus.COMPLETED, progressPercent: 100 },
      }),
      // Reset trạng thái tài xế cho chuyến mới
      this.prisma.driver.update({
        where: { id: driver.id },
        data: {
          todayFromCity: null,
          todayToCity: null,
          todayDepartureTime: null,
          todayPricePerKg: null,
          totalTrips: { increment: 1 },
        },
      }),
    ]);

    return { message: 'Hoàn tất chuyến xe thành công. Sẵn sàng cho chuyến mới!' };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private calcProgress(checkpoint: string): number {
    const map: Record<string, number> = {
      DEPARTED: 15,
      MIDPOINT: 50,
      ARRIVED_STATION: 90,
    };
    return map[checkpoint] ?? 0;
  }

  private async ensureRoute(fromCity: string, toCity: string): Promise<string> {
    const existing = await this.prisma.route.findFirst({
      where: { fromCity, toCity },
    });
    if (existing) return existing.id;
    const hours = this.estimateTravelHours(fromCity, toCity);
    const route = await this.prisma.route.create({
      data: {
        fromCity,
        fromStation: `Bến xe ${fromCity}`,
        toCity,
        toStation: `Bến xe ${toCity}`,
        distanceKm: Math.round(hours * 60),
        durationHours: hours,
        pricePerKg: 15000,
      },
    });
    return route.id;
  }

  private parseDepartureTime(todayDepartureTime: string | null): Date {
    const now = new Date();
    if (!todayDepartureTime) return now;
    const [h, m] = todayDepartureTime.split(':').map(Number);
    const d = new Date(now);
    d.setHours(h ?? 0, m ?? 0, 0, 0);
    if (d < now) d.setDate(d.getDate() + 1); // nếu đã qua giờ xuất bến, dùng ngày mai
    return d;
  }

  // Thời gian di chuyển ước tính theo Google Maps (giờ) cho các tuyến phổ biến VN
  private estimateTravelHours(fromCity: string, toCity: string): number {
    const key = [fromCity, toCity].sort().join('|');
    const HOURS: Record<string, number> = {
      'Hà Nội|Nghệ An': 5,
      'Hà Nội|Vinh': 5,
      'Hà Nội|Thanh Hóa': 3,
      'Hà Nội|Hải Phòng': 2,
      'Hà Nội|Nam Định': 2,
      'Hà Nội|Ninh Bình': 2,
      'Hà Nội|Quảng Bình': 8,
      'Hà Nội|Quảng Trị': 9,
      'Hà Nội|Huế': 11,
      'Hà Nội|Đà Nẵng': 13,
      'Hà Nội|Quảng Ngãi': 16,
      'Hà Nội|Quy Nhơn': 18,
      'Hà Nội|Đắk Lắk': 22,
      'Hà Nội|Nha Trang': 24,
      'Hà Nội|Đà Lạt': 26,
      'Hà Nội|TP. Hồ Chí Minh': 28,
      'Hà Nội|Cần Thơ': 32,
      'Đà Nẵng|TP. Hồ Chí Minh': 16,
      'Đà Nẵng|Quy Nhơn': 5,
      'Đà Nẵng|Huế': 3,
      'Đà Nẵng|Nha Trang': 10,
      'TP. Hồ Chí Minh|Cần Thơ': 3,
      'TP. Hồ Chí Minh|Nha Trang': 7,
      'TP. Hồ Chí Minh|Đà Lạt': 7,
      'TP. Hồ Chí Minh|Vũng Tàu': 2,
      'Nghệ An|Huế': 6,
      'Nghệ An|Đà Nẵng': 8,
    };
    return HOURS[key] ?? 10;
  }
}
