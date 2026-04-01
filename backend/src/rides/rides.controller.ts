import {
  Controller,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { RidesService } from './rides.service';

@Controller('rides')
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  @Post('start')
  startRide(@Req() req: any) {
    return this.ridesService.startRide(req.user?.userId ?? req.user?.id);
  }

  @Get('active')
  getActiveRide(@Req() req: any) {
    return this.ridesService.getActiveRide(req.user?.userId ?? req.user?.id);
  }

  @Get(':id')
  getRide(@Param('id') id: string, @Req() req: any) {
    return this.ridesService.getRideById(id, req.user?.userId ?? req.user?.id);
  }

  @Get(':id/detail')
  getRideDetail(@Param('id') id: string, @Req() req: any) {
    return this.ridesService.getRideDetail(id, req.user?.userId ?? req.user?.id);
  }

  @Post(':id/end')
  endRide(@Param('id') id: string, @Req() req: any) {
    return this.ridesService.endRide(id, req.user?.userId ?? req.user?.id);
  }
}