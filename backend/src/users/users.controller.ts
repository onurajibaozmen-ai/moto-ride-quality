import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { CourierAvailabilityStatus } from '@prisma/client';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('couriers')
  listCouriers() {
    return this.usersService.listCouriers();
  }

  @Get('couriers-ready')
  listReadyCouriers() {
    return this.usersService.listReadyCouriers();
  }

  @Get('couriers-debug')
  listCouriersDebug() {
    return this.usersService.listCouriersDebug();
  }

  @Get('couriers/:id/availability')
  getCourierAvailability(@Param('id') id: string) {
    return this.usersService.getCourierAvailability(id);
  }

  @Patch('couriers/:id/availability')
  updateCourierAvailability(
    @Param('id') id: string,
    @Body()
    body: {
      availabilityStatus: CourierAvailabilityStatus;
      shiftAutoReadyEnabled?: boolean;
    },
  ) {
    return this.usersService.updateCourierAvailability(id, body);
  }
}