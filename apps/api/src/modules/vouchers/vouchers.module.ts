import { Module } from '@nestjs/common';
import { VouchersController } from './vouchers.controller';
import { VouchersService } from './vouchers.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaService } from '../../config/prisma.service';

@Module({
  imports: [NotificationsModule],
  controllers: [VouchersController],
  providers: [VouchersService, PrismaService],
  exports: [VouchersService],
})
export class VouchersModule {}
