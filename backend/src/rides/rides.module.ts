import { Module } from '@nestjs/common';
import { RidesController } from './rides.controller';
import { RidesService } from './rides.service';
import { RideAnalyticsService } from '../analytics/ride-analytics.service';
import { RideScoringService } from '../scoring/ride-scoring.service';

@Module({
  controllers: [RidesController],
  providers: [
    RidesService,
    RideAnalyticsService,
    RideScoringService,
  ],
})
export class RidesModule {}