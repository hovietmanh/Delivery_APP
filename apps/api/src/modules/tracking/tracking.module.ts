import { Module } from '@nestjs/common';
import { TrackingGateway } from './tracking.gateway';
import { TrackingService } from './tracking.service';
import { PrismaModule } from '../../config/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [TrackingGateway, TrackingService],
  exports: [TrackingGateway, TrackingService],
})
export class TrackingModule {}
