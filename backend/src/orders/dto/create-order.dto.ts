import {
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateOrderDto {
  @IsOptional()
  @IsString()
  externalRef?: string;

  @IsNumber()
  pickupLat!: number;

  @IsNumber()
  pickupLng!: number;

  @IsNumber()
  dropoffLat!: number;

  @IsNumber()
  dropoffLng!: number;

  @IsOptional()
  @IsISO8601()
  estimatedPickupTime?: string;

  @IsOptional()
  @IsISO8601()
  estimatedDeliveryTime?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}