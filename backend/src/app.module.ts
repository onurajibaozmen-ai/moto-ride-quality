import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RidesModule } from './rides/rides.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    RidesModule,
    TelemetryModule,
    DashboardModule,
    OrdersModule,
  ],
})
export class AppModule {}