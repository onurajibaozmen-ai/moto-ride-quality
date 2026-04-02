import { Module } from '@nestjs/common';
import { RidesController } from './rides.controller';
import { RidesService } from './rides.service';
import { RideAnalyticsService } from '../analytics/ride-analytics.service';
import { RideScoringService } from '../scoring/ride-scoring.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RidesController],
  providers: [
    RidesService,
    RideAnalyticsService,
    RideScoringService,
  ],
  exports: [RidesService],
})
export class RidesModule {}