import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RidesModule } from './rides/rides.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { OrdersModule } from './orders/orders.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { GeocodingModule } from './geocoding/geocoding.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    RidesModule,
    TelemetryModule,
    OrdersModule,
    DashboardModule,
  ],
})
export class AppModule {}