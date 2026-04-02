import { Module } from '@nestjs/common';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';
import { RideAnalyticsService } from '../analytics/ride-analytics.service';
import { RideScoringService } from '../scoring/ride-scoring.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TelemetryController],
  providers: [
    TelemetryService,
    RideAnalyticsService,
    RideScoringService,
  ],
})
export class TelemetryModule {}