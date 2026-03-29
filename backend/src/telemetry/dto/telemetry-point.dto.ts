import { IsISO8601, IsNumber, IsOptional, IsString } from 'class-validator';

export class TelemetryPointDto {
  @IsISO8601()
  ts: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

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