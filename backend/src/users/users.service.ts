import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CourierAvailabilityStatus,
  OrderStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
        availabilityStatus: CourierAvailabilityStatus.OFFLINE,
        availabilityUpdatedAt: new Date(),
      },
    });
  }

  async listCouriers() {
    const couriers = await this.prisma.user.findMany({
      where: {
        role: UserRole.COURIER,
      },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
      include: {
        rides: {
          where: {
            status: 'ACTIVE',
          },
          take: 1,
          orderBy: {
            startedAt: 'desc',
          },
          include: {
            orders: {
              where: {
                status: {
                  in: [OrderStatus.ASSIGNED, OrderStatus.PICKED_UP],
                },
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
        },
      },
    });

    return couriers.map((courier) => {
      const activeRide = courier.rides[0] ?? null;
      const openOrderCount = activeRide?.orders.length ?? 0;

      return {
        id: courier.id,
        name: courier.name,
        phone: courier.phone,
        role: courier.role,
        isActive: courier.isActive,
        lastSeenAt: courier.lastSeenAt,
        availabilityStatus: courier.availabilityStatus,
        availabilityUpdatedAt: courier.availabilityUpdatedAt,
        shiftAutoReadyEnabled: courier.shiftAutoReadyEnabled,
        activeRide: activeRide
          ? {
              id: activeRide.id,
              status: activeRide.status,
              orderCount: activeRide.orders.length,
            }
          : null,
        dispatch: {
          isAssignable:
            courier.availabilityStatus === CourierAvailabilityStatus.READY,
          hasOpenOrders: openOrderCount > 0,
          openOrderCount,
        },
      };
    });
  }

  async listReadyCouriers() {
    return this.prisma.user.findMany({
      where: {
        role: UserRole.COURIER,
        isActive: true,
        availabilityStatus: CourierAvailabilityStatus.READY,
      },
      orderBy: [{ updatedAt: 'desc' }],
      select: {
        id: true,
        name: true,
        phone: true,
        isActive: true,
        lastSeenAt: true,
        availabilityStatus: true,
        availabilityUpdatedAt: true,
        shiftAutoReadyEnabled: true,
      },
    });
  }

  async listCouriersDebug() {
    const couriers = await this.prisma.user.findMany({
      where: {
        role: UserRole.COURIER,
      },
      orderBy: [{ updatedAt: 'desc' }],
      include: {
        rides: {
          where: {
            status: 'ACTIVE',
          },
          take: 1,
          orderBy: {
            startedAt: 'desc',
          },
          include: {
            orders: {
              where: {
                status: {
                  in: [OrderStatus.ASSIGNED, OrderStatus.PICKED_UP],
                },
              },
            },
          },
        },
      },
    });

    const latestTelemetryList = await Promise.all(
      couriers.map(async (courier) => {
        const point = await this.prisma.telemetryPoint.findFirst({
          where: {
            userId: courier.id,
          },
          orderBy: {
            ts: 'desc',
          },
          select: {
            ts: true,
            lat: true,
            lng: true,
            rideId: true,
          },
        });

        return {
          courierId: courier.id,
          latestTelemetry: point ?? null,
        };
      }),
    );

    const latestTelemetryMap = new Map(
      latestTelemetryList.map((item) => [item.courierId, item.latestTelemetry]),
    );

    return couriers.map((courier) => ({
      id: courier.id,
      name: courier.name,
      isActive: courier.isActive,
      availabilityStatus: courier.availabilityStatus,
      availabilityUpdatedAt: courier.availabilityUpdatedAt,
      lastSeenAt: courier.lastSeenAt,
      activeRide: courier.rides[0]
        ? {
            id: courier.rides[0].id,
            status: courier.rides[0].status,
            openOrderCount: courier.rides[0].orders.length,
          }
        : null,
      latestTelemetry: latestTelemetryMap.get(courier.id) ?? null,
    }));
  }

  async getCourierAvailability(courierId: string) {
    const courier = await this.prisma.user.findFirst({
      where: {
        id: courierId,
        role: UserRole.COURIER,
      },
      include: {
        rides: {
          where: {
            status: 'ACTIVE',
          },
          take: 1,
          orderBy: {
            startedAt: 'desc',
          },
          include: {
            orders: {
              where: {
                status: {
                  in: [OrderStatus.ASSIGNED, OrderStatus.PICKED_UP],
                },
              },
            },
          },
        },
      },
    });

    if (!courier) {
      throw new NotFoundException('Courier not found');
    }

    return {
      id: courier.id,
      name: courier.name,
      phone: courier.phone,
      isActive: courier.isActive,
      lastSeenAt: courier.lastSeenAt,
      availabilityStatus: courier.availabilityStatus,
      availabilityUpdatedAt: courier.availabilityUpdatedAt,
      shiftAutoReadyEnabled: courier.shiftAutoReadyEnabled,
      activeRide: courier.rides[0]
        ? {
            id: courier.rides[0].id,
            status: courier.rides[0].status,
            openOrderCount: courier.rides[0].orders.length,
          }
        : null,
    };
  }

  async updateCourierAvailability(
    courierId: string,
    payload: {
      availabilityStatus: CourierAvailabilityStatus;
      shiftAutoReadyEnabled?: boolean;
    },
  ) {
    const courier = await this.prisma.user.findFirst({
      where: {
        id: courierId,
        role: UserRole.COURIER,
      },
      include: {
        rides: {
          where: {
            status: 'ACTIVE',
          },
          take: 1,
          orderBy: {
            startedAt: 'desc',
          },
          include: {
            orders: {
              where: {
                status: {
                  in: [OrderStatus.ASSIGNED, OrderStatus.PICKED_UP],
                },
              },
            },
          },
        },
      },
    });

    if (!courier) {
      throw new NotFoundException('Courier not found');
    }

    const activeRide = courier.rides[0] ?? null;
    const openOrderCount = activeRide?.orders.length ?? 0;

    if (
      payload.availabilityStatus === CourierAvailabilityStatus.OFFLINE &&
      openOrderCount > 0
    ) {
      throw new BadRequestException(
        'Courier cannot go OFFLINE while open assigned orders exist',
      );
    }

    if (
      payload.availabilityStatus === CourierAvailabilityStatus.READY &&
      activeRide &&
      openOrderCount > 0
    ) {
      throw new BadRequestException(
        'Courier with open delivery workload cannot be marked READY',
      );
    }

    if (
      payload.availabilityStatus === CourierAvailabilityStatus.DELIVERY &&
      !activeRide
    ) {
      throw new BadRequestException(
        'Courier cannot be marked DELIVERY without an active ride',
      );
    }

    return this.prisma.user.update({
      where: { id: courierId },
      data: {
        availabilityStatus: payload.availabilityStatus,
        availabilityUpdatedAt: new Date(),
        shiftAutoReadyEnabled:
          payload.shiftAutoReadyEnabled ?? courier.shiftAutoReadyEnabled,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        isActive: true,
        lastSeenAt: true,
        availabilityStatus: true,
        availabilityUpdatedAt: true,
        shiftAutoReadyEnabled: true,
      },
    });
  }

  async autoSetCourierReadyIfIdle(
    tx: Prisma.TransactionClient,
    courierId: string,
  ) {
    const openOrderCount = await tx.order.count({
      where: {
        assignedCourierId: courierId,
        status: {
          in: [OrderStatus.ASSIGNED, OrderStatus.PICKED_UP],
        },
      },
    });

    const nextStatus =
      openOrderCount > 0
        ? CourierAvailabilityStatus.DELIVERY
        : CourierAvailabilityStatus.READY;

    await tx.user.update({
      where: { id: courierId },
      data: {
        availabilityStatus: nextStatus,
        availabilityUpdatedAt: new Date(),
      },
    });
  }

  async autoSetCourierDelivery(
    tx: Prisma.TransactionClient,
    courierId: string,
  ) {
    await tx.user.update({
      where: { id: courierId },
      data: {
        availabilityStatus: CourierAvailabilityStatus.DELIVERY,
        availabilityUpdatedAt: new Date(),
      },
    });
  }
}