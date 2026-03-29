import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { RidesService } from './rides.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { StartRideDto } from './dto/start-ride.dto';
import { EndRideDto } from './dto/end-ride.dto';

@Controller('rides')
@UseGuards(JwtAuthGuard)
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  @Post('start')
  startRide(
    @CurrentUser() user: { userId: string },
    @Body() _body: StartRideDto,
  ) {
    return this.ridesService.startRide(user.userId);
  }

  @Get('active')
  getActiveRide(@CurrentUser() user: { userId: string }) {
    return this.ridesService.getActiveRide(user.userId);
  }

  @Get(':id')
  getRideById(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.ridesService.getRideById(id, user.userId);
  }

  @Post(':id/end')
  endRide(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() _body: EndRideDto,
  ) {
    return this.ridesService.endRide(id, user.userId);
  }
}