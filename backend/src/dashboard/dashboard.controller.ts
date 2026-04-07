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
    @Query('status') status?: string,
    @Query('courierId') courierId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.dashboardService.getRides({
      status,
      courierId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('rides/:id')
  getRideDetail(@Param('id') id: string) {
    return this.dashboardService.getRideDetail(id);
  }

  @Get('rides/:id/plan')
  getRidePlan(@Param('id') id: string) {
    return this.dashboardService.getRidePlan(id);
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
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('orders/:id')
  getOrderDetail(@Param('id') id: string) {
    return this.dashboardService.getOrderDetail(id);
  }

  @Get('orders/:id/dispatch-panel')
  getDispatchPanel(@Param('id') id: string) {
    return this.dashboardService.getDispatchPanel(id);
  }

  @Get('couriers')
  getCouriers(
    @Query('availabilityStatus') availabilityStatus?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.dashboardService.getCouriers({
      availabilityStatus,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('couriers/:id/scoring')
  getCourierScoring(@Param('id') id: string) {
    return this.dashboardService.getCourierScoring(id);
  }

  @Get('dispatch/queue')
  getDispatchQueue() {
    return this.dashboardService.getDispatchQueue();
  }

  @Get('dispatch/trigger-check')
  getDispatchTriggerCheck() {
    return this.dashboardService.getDispatchTriggerCheck();
  }

  @Get('dispatch/logs')
  getDispatchLogs(
    @Query('status') status?: string,
    @Query('orderId') orderId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.dashboardService.getDispatchLogs({
      status,
      orderId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}