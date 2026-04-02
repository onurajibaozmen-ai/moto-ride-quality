import { Controller, Get, Param, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  getOverview() {
    return this.dashboardService.getOverview();
  }

  @Get('leaderboard')
  getLeaderboard(@Query('limit') limit?: string) {
    return this.dashboardService.getLeaderboard(limit ? Number(limit) : 20);
  }

  @Get('rides')
  getRides(
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.dashboardService.getRides({
      status,
      userId,
      from,
      to,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get('couriers')
  getCouriers() {
    return this.dashboardService.getCouriers();
  }

  @Get('couriers/:id/score')
  getCourierScore(@Param('id') id: string) {
    return this.dashboardService.getCourierScore(id);
  }

  @Get('pilot-summary')
  getPilotSummary() {
    return this.dashboardService.getPilotSummary();
  }

  @Get('orders/overview')
  getOrdersOverview() {
    return this.dashboardService.getOrdersOverview();
  }

  @Get('orders')
  getOrders(
    @Query('status') status?: string,
    @Query('courierId') courierId?: string,
    @Query('rideId') rideId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.dashboardService.getOrders({
      status,
      courierId,
      rideId,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get('orders/:id')
  getOrderById(@Param('id') id: string) {
    return this.dashboardService.getOrderById(id);
  }
}