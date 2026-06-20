import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { OrderStatus } from '@prisma/client';

// Lưu location vào DB tối đa 1 lần / 30 giây mỗi trip (tránh spam)
const SAVE_INTERVAL_MS = 30_000;

@Injectable()
export class TrackingService {
  constructor(private readonly prisma: PrismaService) {}

  private lastSaved = new Map<string, number>(); // tripId → timestamp

  async addTrackingEvent(data: {
    orderId: string;
    status: OrderStatus;
    location?: string;
    note?: string;
    photoUrl?: string;
  }) {
    return this.prisma.orderTrackingEvent.create({ data });
  }

  async getOrderTracking(orderId: string) {
    return this.prisma.orderTrackingEvent.findMany({
      where: { orderId },
      orderBy: { timestamp: 'asc' },
    });
  }

  async saveLocation(data: {
    tripId: string;
    driverId: string;
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
  }) {
    const now = Date.now();
    const last = this.lastSaved.get(data.tripId) ?? 0;
    if (now - last < SAVE_INTERVAL_MS) return; // throttle

    this.lastSaved.set(data.tripId, now);
    await this.prisma.driverLocation.create({ data });
  }

  async getLocationHistory(tripId: string, limitMinutes = 60) {
    const since = new Date(Date.now() - limitMinutes * 60_000);
    return this.prisma.driverLocation.findMany({
      where: { tripId, timestamp: { gte: since } },
      orderBy: { timestamp: 'asc' },
      select: { latitude: true, longitude: true, timestamp: true },
    });
  }

  async getLatestLocationFromDb(tripId: string) {
    return this.prisma.driverLocation.findFirst({
      where: { tripId },
      orderBy: { timestamp: 'desc' },
      select: { latitude: true, longitude: true, speed: true, heading: true, timestamp: true },
    });
  }
}
