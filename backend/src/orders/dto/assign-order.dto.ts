import { IsOptional, IsString } from 'class-validator';

export class AssignOrderDto {
  @IsString()
  courierId!: string;

  @IsOptional()
  @IsString()
  rideId?: string;
}