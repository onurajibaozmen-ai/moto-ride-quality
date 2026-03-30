import { Controller, Get, Param, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  getOverview() {
    return this.dashboardService.getOverview();
  }

  @Get('rides')
  getRides(
    @Query('status') status?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED',
    @Query('userId') userId?: string,
  ) {
    return this.dashboardService.getRides({ status, userId });
  }

  @Get('rides/:id/events')
  getRideEvents(@Param('id') rideId: string) {
    return this.dashboardService.getRideEvents(rideId);
  }

  @Get('rides/:id/score-breakdown')
  getRideScoreBreakdown(@Param('id') rideId: string) {
    return this.dashboardService.getRideScoreBreakdown(rideId);
  }

  @Get('couriers')
  getCouriers() {
    return this.dashboardService.getCouriers();
  }

  @Get('pilot-summary')
  getPilotSummary() {
    return this.dashboardService.getPilotSummary();
  }
}