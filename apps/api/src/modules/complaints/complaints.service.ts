import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { ComplaintAiService } from './complaint-ai.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';

@Injectable()
export class ComplaintsService {
  constructor(
    private prisma: PrismaService,
    private aiService: ComplaintAiService,
  ) {}

  async create(customerId: string, dto: CreateComplaintDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, customer: { id: customerId } },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    if (!['DELIVERED', 'DISPUTED'].includes(order.status)) {
      throw new BadRequestException('Chỉ có thể khiếu nại đơn hàng đã giao');
    }

    const existing = await this.prisma.complaint.findUnique({ where: { orderId: dto.orderId } });
    if (existing) throw new BadRequestException('Đơn hàng này đã có khiếu nại');

    // Lấy ảnh từ tracking events
    const trackingEvents = await this.prisma.orderTrackingEvent.findMany({
      where: { orderId: dto.orderId, photoUrl: { not: null } },
      orderBy: { timestamp: 'asc' },
    });

    const loadingStatuses = ['PICKED_UP', 'AT_STATION', 'CONFIRMED'];
    const unloadingStatuses = ['ARRIVED', 'DELIVERED'];

    const loadingPhotos = trackingEvents
      .filter((e) => loadingStatuses.includes(e.status) && e.photoUrl)
      .map((e) => e.photoUrl!);
    const unloadingPhotos = trackingEvents
      .filter((e) => unloadingStatuses.includes(e.status) && e.photoUrl)
      .map((e) => e.photoUrl!);

    // Tạo complaint trước
    const complaint = await this.prisma.complaint.create({
      data: {
        orderId: dto.orderId,
        customerId,
        reason: dto.reason,
        description: dto.description,
        requestedAmount: dto.requestedAmount,
        customerPhotos: dto.customerPhotos ?? [],
      },
    });

    // Cập nhật trạng thái đơn hàng thành DISPUTED
    await this.prisma.order.update({
      where: { id: dto.orderId },
      data: { status: 'DISPUTED' },
    });

    // Phân tích AI bất đồng bộ (không block response)
    this.runAiAnalysis(complaint.id, {
      loadingPhotos,
      unloadingPhotos,
      customerPhotos: dto.customerPhotos ?? [],
      description: dto.description,
      reason: dto.reason,
    });

    return { ...complaint, aiStatus: 'ANALYZING' };
  }

  private async runAiAnalysis(
    complaintId: string,
    photos: {
      loadingPhotos: string[];
      unloadingPhotos: string[];
      customerPhotos: string[];
      description: string;
      reason: string;
    },
  ) {
    const verdict = await this.aiService.analyzeComplaint(photos);
    await this.prisma.complaint.update({
      where: { id: complaintId },
      data: {
        aiVerdict: verdict.verdict,
        aiConfidence: verdict.confidence,
        aiReason: verdict.reason,
        aiAnalyzedAt: new Date(),
      },
    });
  }

  async getMyComplaint(customerId: string, orderId: string) {
    const complaint = await this.prisma.complaint.findFirst({
      where: { orderId, customerId },
      include: { order: { select: { trackingCode: true, fromCity: true, toCity: true } } },
    });
    if (!complaint) throw new NotFoundException('Không tìm thấy khiếu nại');
    return complaint;
  }

  async listMyComplaints(customerId: string) {
    return this.prisma.complaint.findMany({
      where: { customerId },
      include: { order: { select: { trackingCode: true, fromCity: true, toCity: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
