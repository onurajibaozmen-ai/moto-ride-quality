import { Module } from '@nestjs/common';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';
import { PrismaService } from '../prisma/prisma.service';
import { RideAnalyticsService } from '../analytics/ride-analytics.service';
import { RideScoringService } from '../scoring/ride-scoring.service';

@Module({
  controllers: [TelemetryController],
  providers: [
    TelemetryService,
    PrismaService,
    RideAnalyticsService,
    RideScoringService,
  ],
})
export class TelemetryModule {}