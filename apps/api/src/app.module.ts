import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { OrdersModule } from './modules/orders/orders.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { TripsModule } from './modules/trips/trips.module';
import { VouchersModule } from './modules/vouchers/vouchers.module';
import { ChatModule } from './modules/chat/chat.module';
import { ComplaintsModule } from './modules/complaints/complaints.module';
import { PrismaModule } from './config/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    CacheModule.register({
      isGlobal: true,
      ttl: 300,
    }),

    PrismaModule,
    AuthModule,
    UsersModule,
    DriversModule,
    OrdersModule,
    TrackingModule,
    PaymentsModule,
    NotificationsModule,
    ReviewsModule,
    TripsModule,
    VouchersModule,
    ChatModule,
    ComplaintsModule,
  ],
})
export class AppModule {}
