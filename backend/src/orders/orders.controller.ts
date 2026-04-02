import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AssignOrderDto } from './dto/assign-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  createOrder(@Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(dto);
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
  assignOrder(@Param('id') id: string, @Body() dto: AssignOrderDto) {
    return this.ordersService.assignOrder(id, dto);
  }

  @Patch(':id/pickup')
  markPickedUp(@Param('id') id: string) {
    return this.ordersService.markPickedUp(id);
  }

  @Patch(':id/deliver')
  markDelivered(@Param('id') id: string) {
    return this.ordersService.markDelivered(id);
  }

  @Patch(':id/cancel')
  cancelOrder(@Param('id') id: string) {
    return this.ordersService.cancelOrder(id);
  }
}