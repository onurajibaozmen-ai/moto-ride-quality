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
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get(':id')
  getOrderById(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }

  @Patch(':id/assign')
  assignOrder(
    @Param('id') id: string,
    @Body()
    body: {
      courierId: string;
      rideId?: string;
    },
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

  @Get('ride/:rideId/plan')
  getRidePlan(@Param('rideId') rideId: string) {
    return this.ordersService.getRidePlan(rideId);
  }

  @Get(':id/recommend-courier')
  recommendCourier(@Param('id') id: string) {
    return this.ordersService.recommendCourier(id);
  }

  @Patch(':id/auto-assign')
  autoAssignOrder(@Param('id') id: string) {
    return this.ordersService.autoAssignOrder(id);
  }

  @Get(':id/batch-suggestions')
  suggestBatchCandidates(@Param('id') id: string) {
    return this.ordersService.suggestBatchCandidates(id);
  }
}