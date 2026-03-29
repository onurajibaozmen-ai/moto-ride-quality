import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { TelemetryBatchDto } from './dto/telemetry-batch.dto';
import { TelemetryService } from './telemetry.service';

@Controller('telemetry')
@UseGuards(JwtAuthGuard)
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Post('batch')
  ingestBatch(
    @CurrentUser() user: { userId: string },
    @Body() body: TelemetryBatchDto,
  ) {
    return this.telemetryService.ingestBatch(user.userId, body);
  }
}