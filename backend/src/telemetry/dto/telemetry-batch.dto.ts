import {
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class TelemetryPointDto {
  @IsISO8601()
  ts!: string;

  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;

  @IsOptional()
  @IsNumber()
  speedKmh?: number;

  @IsOptional()
  @IsNumber()
  accuracyM?: number;

  @IsOptional()
  @IsNumber()
  heading?: number;

  @IsOptional()
  @IsNumber()
  accelX?: number;

  @IsOptional()
  @IsNumber()
  accelY?: number;

  @IsOptional()
  @IsNumber()
  accelZ?: number;

  @IsOptional()
  @IsNumber()
  batteryLevel?: number;

  @IsOptional()
  @IsString()
  networkType?: string;
}

export class TelemetryBatchDto {
  @IsString()
  rideId!: string;

  @IsString()
  clientBatchId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TelemetryPointDto)
  points!: TelemetryPointDto[];
}