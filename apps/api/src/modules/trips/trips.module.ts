import { Module } from '@nestjs/common';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { PrismaModule } from '../../config/prisma.module';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [PrismaModule, TrackingModule],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
