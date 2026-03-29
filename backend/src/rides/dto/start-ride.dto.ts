import { IsOptional, IsString } from 'class-validator';

export class StartRideDto {
  @IsOptional()
  @IsString()
  deviceId?: string;
}