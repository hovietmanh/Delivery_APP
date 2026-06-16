import { Module } from '@nestjs/common';
import { DriversController } from './drivers.controller';
import { AdminDriversController } from './admin-drivers.controller';
import { DriversService } from './drivers.service';
import { PrismaModule } from '../../config/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [DriversController, AdminDriversController],
  providers: [DriversService],
  exports: [DriversService],
})
export class DriversModule {}
