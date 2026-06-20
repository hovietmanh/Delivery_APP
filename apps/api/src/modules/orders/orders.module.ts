import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ComplaintAiService } from '../complaints/complaint-ai.service';

@Module({
  imports: [PaymentsModule, NotificationsModule],
  controllers: [OrdersController],
  providers: [OrdersService, ComplaintAiService],
  exports: [OrdersService],
})
export class OrdersModule {}
