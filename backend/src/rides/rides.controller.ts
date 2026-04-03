import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RidesService } from './rides.service';

type AuthRequest = Request & {
  user: {
    id?: string;
    userId?: string;
    sub?: string;
    phone?: string | null;
    role?: string | null;
  };
};

@Controller('rides')
@UseGuards(JwtAuthGuard)
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  private getUserId(req: AuthRequest): string {
    const userId = req.user?.id ?? req.user?.userId ?? req.user?.sub;

    if (!userId) {
      throw new Error('Authenticated user id is missing');
    }

    return userId;
  }

  @Post('start')
  startRide(@Req() req: AuthRequest) {
    const userId = this.getUserId(req);
    return this.ridesService.startRide(userId);
  }

  @Get('active')
  getActiveRide(@Req() req: AuthRequest) {
    const userId = this.getUserId(req);
    return this.ridesService.getActiveRide(userId);
  }

  @Post(':id/end')
  endRide(@Req() req: AuthRequest, @Param('id') rideId: string) {
    const userId = this.getUserId(req);
    console.log('END RIDE DEBUG =>', { userId, rideId, user: req.user });
    return this.ridesService.endRide(userId, rideId);
  }

  @Get(':id/detail')
  getRideDetail(@Req() req: AuthRequest, @Param('id') rideId: string) {
    const userId = this.getUserId(req);
    return this.ridesService.getRideDetail(userId, rideId);
  }


}