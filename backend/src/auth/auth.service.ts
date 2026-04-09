import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import {
  CourierAvailabilityStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async register(body: {
    name: string;
    phone: string;
    password: string;
    role?: UserRole;
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { phone: body.phone },
    });

    if (existing) {
      throw new UnauthorizedException('Phone already registered');
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: body.name,
        phone: body.phone,
        passwordHash,
        role: body.role ?? UserRole.COURIER,
        isActive: true,
        availabilityStatus: CourierAvailabilityStatus.OFFLINE,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        lastSeenAt: true,
        availabilityStatus: true,
        availabilityUpdatedAt: true,
      },
    });

    return user;
  }

  async login(phone: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);

    if (!passwordOk) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User is inactive');
    }

    const payload = {
      sub: user.id,
      role: user.role,
      phone: user.phone,
    };

    if (user.role === UserRole.COURIER) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastSeenAt: new Date(),
          availabilityStatus: CourierAvailabilityStatus.READY,
          availabilityUpdatedAt: new Date(),
        },
      });
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastSeenAt: new Date(),
        },
      });
    }

    const accessToken = await this.jwtService.signAsync(payload);

    const freshUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        lastSeenAt: true,
        availabilityStatus: true,
        availabilityUpdatedAt: true,
      },
    });

    return {
      accessToken,
      user: freshUser,
    };
  }
}