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

    const [pending, today_count, delivered] = await Promise.all([
      this.prisma.order.count({ where: { status: OrderStatus.PENDING, tripId: null } }),
      this.prisma.order.count({
        where: { trip: { driverId: driver.id }, createdAt: { gte: today } },
      }),
      this.prisma.order.count({
        where: { trip: { driverId: driver.id }, status: OrderStatus.DELIVERED },
      }),
    ]);

    return { pending, today: today_count, delivered };
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

    return this.prisma.order.findMany({
      where: {
        trip: { driverId: driver.id },
        ...(status ? { status: status as OrderStatus } : {}),
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

      const now = new Date();
      trip = await this.prisma.trip.create({
        data: {
          routeId: route?.id ?? (await this.ensureRoute(order.fromCity, order.toCity)),
          driverId: driver.id,
          departureTime: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2h from now
          arrivalEta: new Date(now.getTime() + 26 * 60 * 60 * 1000),   // +24h travel
          capacityKg: 1000,
          pricePerKg: 15000,
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

  // ── Pickup (photos) ───────────────────────────────────────────────────────

  async confirmPickup(userId: string, orderId: string, photos: string[]) {
    await this.getDriver(userId);
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    // Determine next status based on serviceType
    const nextStatus = ['DOOR_TO_STATION', 'DOOR_TO_DOOR'].includes(order.serviceType)
      ? OrderStatus.PICKING_UP
      : OrderStatus.AT_STATION;

    const result = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: nextStatus,
          pickupPhotos: photos,
          pickedUpAt: new Date(),
        },
      }),
      this.prisma.orderTrackingEvent.create({
        data: { orderId, status: nextStatus, photoUrl: photos[0] },
      }),
    ]);

    this.notifications.notifyOrderUpdate(orderId, nextStatus, order.customerId).catch(() => {});

    return result;
  }

  // ── Delivery ──────────────────────────────────────────────────────────────

  async confirmDelivery(
    userId: string,
    orderId: string,
    data: { photos: string[]; signature: string; codCollected?: number },
  ) {
    await this.getDriver(userId);
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    if (!['ARRIVED', 'OUT_FOR_DELIVERY'].includes(order.status)) {
      throw new BadRequestException('Order is not ready for delivery');
    }

    const result = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.DELIVERED,
          deliveryPhotos: data.photos,
          receiverSignature: data.signature,
          deliveredAt: new Date(),
        },
      }),
      this.prisma.orderTrackingEvent.create({
        data: { orderId, status: OrderStatus.DELIVERED, photoUrl: data.photos[0], note: `Giao thành công. Chữ ký: ${data.signature}` },
      }),
    ]);

    this.notifications.notifyOrderUpdate(orderId, 'DELIVERED', order.customerId).catch(() => {});

    return result;
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
      include: { order: { select: { trackingCode: true } } },
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
    const route = await this.prisma.route.create({
      data: {
        fromCity,
        fromStation: `Bến xe ${fromCity}`,
        toCity,
        toStation: `Bến xe ${toCity}`,
        distanceKm: 1700,
        durationHours: 24,
        pricePerKg: 15000,
      },
    });
    return route.id;
  }
}
