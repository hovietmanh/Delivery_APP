import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TrackingService } from './tracking.service';
import { OrderStatus } from '@prisma/client';
import { Logger } from '@nestjs/common';

export interface LocationPayload {
  tripId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/tracking',
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TrackingGateway.name);

  // Lưu vị trí mới nhất của mỗi trip trong memory (nhanh, không cần Redis)
  private latestLocations = new Map<string, LocationPayload & { timestamp: Date }>();

  constructor(private readonly trackingService: TrackingService) {}

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  // ── Khách hàng subscribe theo dõi đơn hàng ────────────────────────────────

  @SubscribeMessage('customer:watch_order')
  handleWatchOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    client.join(`order:${data.orderId}`);
    client.emit('subscribed', { orderId: data.orderId });
  }

  // ── Khách hàng theo dõi vị trí GPS theo tripId ────────────────────────────

  @SubscribeMessage('customer:watch_trip')
  handleWatchTrip(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tripId: string },
  ) {
    client.join(`trip:${data.tripId}`);

    // Gửi ngay vị trí mới nhất nếu đã có
    const latest = this.latestLocations.get(data.tripId);
    if (latest) {
      client.emit('driver:location', latest);
    }

    client.emit('trip:subscribed', { tripId: data.tripId });
  }

  // ── Tài xế cập nhật vị trí GPS ───────────────────────────────────────────

  @SubscribeMessage('driver:update_location')
  async handleDriverLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: LocationPayload,
  ) {
    if (!data.tripId || !data.latitude || !data.longitude) return;

    const payload = { ...data, timestamp: new Date() };

    // Lưu vào memory
    this.latestLocations.set(data.tripId, payload);

    // Broadcast cho tất cả khách đang theo dõi trip này
    this.server.to(`trip:${data.tripId}`).emit('driver:location', payload);

    // Persist vào DB mỗi 30 giây (lọc theo khoảng cách/thời gian để tránh spam)
    await this.trackingService.saveLocation(data);
  }

  // ── Cập nhật trạng thái đơn hàng ─────────────────────────────────────────

  @SubscribeMessage('order:status_update')
  async handleOrderStatusUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string; status: string; customerId: string; note?: string },
  ) {
    await this.trackingService.addTrackingEvent({
      orderId: data.orderId,
      status: data.status as OrderStatus,
      note: data.note,
    });

    this.server.to(`customer:${data.customerId}`).emit('order:status', {
      orderId: data.orderId,
      status: data.status,
      timestamp: new Date(),
    });
  }

  // ── Lấy vị trí mới nhất (REST fallback) ──────────────────────────────────

  getLatestLocation(tripId: string) {
    return this.latestLocations.get(tripId) ?? null;
  }

  broadcastNewOrder(order: any) {
    this.server.emit('new_order', order);
  }
}
