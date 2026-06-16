import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class TrackingService {
  constructor(private readonly prisma: PrismaService) {}

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
}
