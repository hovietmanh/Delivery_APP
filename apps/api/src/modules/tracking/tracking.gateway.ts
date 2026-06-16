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

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/tracking',
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly trackingService: TrackingService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('customer:watch_order')
  handleWatchOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    client.join(`order:${data.orderId}`);
    client.emit('subscribed', { orderId: data.orderId });
  }

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

  broadcastNewOrder(order: any) {
    this.server.emit('new_order', order);
  }
}
