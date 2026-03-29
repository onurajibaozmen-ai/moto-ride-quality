import {
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TelemetryPointDto } from './telemetry-point.dto';

export class TelemetryBatchDto {
  @IsString()
  rideId: string;

  @IsOptional()
  @IsISO8601()
  deviceTime?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TelemetryPointDto)
  points: TelemetryPointDto[];
}