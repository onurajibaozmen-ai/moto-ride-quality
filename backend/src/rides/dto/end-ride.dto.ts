import { IsOptional, IsNumber } from 'class-validator';

export class EndRideDto {
  @IsOptional()
  @IsNumber()
  totalDistanceM?: number;

  @IsOptional()
  @IsNumber()
  durationS?: number;
}