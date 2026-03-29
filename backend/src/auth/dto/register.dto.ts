import { IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsString()
  @MinLength(4)
  password: string;

  @IsOptional()
  @IsString()
  role?: 'ADMIN' | 'COURIER';
}