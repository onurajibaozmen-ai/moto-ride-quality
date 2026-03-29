import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(params: {
    name: string;
    phone: string;
    password: string;
    role?: 'ADMIN' | 'COURIER';
  }) {
    const existing = await this.usersService.findByPhone(params.phone);

    if (existing) {
      throw new BadRequestException('User already exists');
    }

    const passwordHash = await bcrypt.hash(params.password, 10);

    const user = await this.usersService.createCourier({
      name: params.name,
      phone: params.phone,
      passwordHash,
      role: params.role === 'ADMIN' ? UserRole.ADMIN : UserRole.COURIER,
    });

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      phone: user.phone,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
      accessToken,
    };
  }

  async login(phone: string, password: string) {
    const user = await this.usersService.findByPhone(phone);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      phone: user.phone,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
      accessToken,
    };
  }
}