import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  createOrder(
    @Body()
    body: {
      externalRef?: string;
      pickupLat: number;
      pickupLng: number;
      dropoffLat: number;
      dropoffLng: number;
      estimatedPickupTime?: string;
      estimatedDeliveryTime?: string;
      notes?: string;
    },
  ) {
    return this.ordersService.createOrder(body);
  }

  @Get()
  listOrders(
    @Query('status') status?: string,
    @Query('courierId') courierId?: string,
    @Query('rideId') rideId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.listOrders({
      status,
      courierId,
      rideId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('dispatch/queue')
  getDispatchQueue() {
    return this.ordersService.getDispatchQueue();
  }

  @Get('dispatch/trigger-check')
  getDispatchTriggerCheck() {
    return this.ordersService.getDispatchTriggerCheck();
  }

  @Post('dispatch/bulk-auto-assign')
  bulkAutoAssign(
    @Body()
    body?: {
      limit?: number;
    },
  ) {
    return this.ordersService.bulkAutoAssign(body?.limit);
  }

  @Get('dispatch/logs')
  getDispatchLogs(
    @Query('status') status?: string,
    @Query('orderId') orderId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.getDispatchLogs({
      status,
      orderId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  getOrderById(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }

  @Get(':id/dispatch-logs')
  getOrderDispatchLogs(@Param('id') id: string) {
    return this.ordersService.getOrderDispatchLogs(id);
  }

  @Patch(':id/assign')
  assignOrder(
    @Param('id') id: string,
    @Body()
    body: { courierId: string; rideId?: string },
  ) {
    return this.ordersService.assignOrder(id, body);
  }

  @Patch(':id/pickup')
  markPickedUp(@Param('id') id: string) {
    return this.ordersService.markPickedUp(id);
  }

  @Patch(':id/deliver')
  markDelivered(@Param('id') id: string) {
    return this.ordersService.markDelivered(id);
  }

  @Get(':id/recommend-courier')
  recommendCourier(@Param('id') id: string) {
    return this.ordersService.recommendCourier(id);
  }

  @Patch(':id/auto-assign')
  autoAssignOrder(@Param('id') id: string) {
    return this.ordersService.autoAssignOrder(id);
  }

  @Post(':id/approve-auto-assign')
  approveAutoAssign(@Param('id') id: string) {
    return this.ordersService.approveAutoAssign(id);
  }

  @Post(':id/reject-recommendation')
  rejectRecommendation(
    @Param('id') id: string,
    @Body()
    body?: {
      rejectedCourierId?: string;
      reason?: string;
    },
  ) {
    return this.ordersService.rejectRecommendation(id, body);
  }

  @Get(':id/next-candidates')
  getNextCandidates(
    @Param('id') id: string,
    @Query('excludeCourierId') excludeCourierId?: string,
  ) {
    return this.ordersService.getNextCandidates(id, excludeCourierId);
  }

  @Get(':id/batch-suggestions')
  suggestBatchCandidates(@Param('id') id: string) {
    return this.ordersService.suggestBatchCandidates(id);
  }

  @Get('rides/:rideId/plan')
  getRidePlan(@Param('rideId') rideId: string) {
    return this.ordersService.getRidePlan(rideId);
  }
}