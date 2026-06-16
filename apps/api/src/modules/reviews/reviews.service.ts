import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: {
    orderId: string;
    customerId: string;
    driverId: string;
    overallRating: number;
    goodsCareRating: number;
    staffRating: number;
    timeRating: number;
    comment?: string;
  }) {
    return this.prisma.review.create({ data: dto });
  }
}
