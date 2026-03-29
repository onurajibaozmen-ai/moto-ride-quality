import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByPhone(phone: string) {
    return this.prisma.user.findUnique({
      where: { phone },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  createCourier(params: {
    name: string;
    phone: string;
    passwordHash: string;
    role?: UserRole;
  }) {
    return this.prisma.user.create({
      data: {
        name: params.name,
        phone: params.phone,
        passwordHash: params.passwordHash,
        role: params.role ?? UserRole.COURIER,
      },
    });
  }
}