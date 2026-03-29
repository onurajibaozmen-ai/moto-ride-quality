import { Injectable, NotFoundException } from '@nestjs/common';
import { RideStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [
      totalCouriers,
      activeRides,
      completedRides,
      totalEvents,
      scoredRides,
      recentRides,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { role: 'COURIER' },
      }),
      this.prisma.ride.count({
        where: { status: RideStatus.ACTIVE },
      }),
      this.prisma.ride.count({
        where: { status: RideStatus.COMPLETED },
      }),
      this.prisma.rideEvent.count(),
      this.prisma.ride.findMany({
        where: {
          score: { not: null },
        },
        select: {
          score: true,
        },
      }),
      this.prisma.ride.findMany({
        take: 5,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              lastSeenAt: true,
            },
          },
        },
      }),
    ]);

    const averageScore =
      scoredRides.length > 0
        ? Number(
            (
              scoredRides.reduce((sum, ride) => sum + (ride.score ?? 0), 0) /
              scoredRides.length
            ).toFixed(2),
          )
        : null;

    return {
      totalCouriers,
      activeRides,
      completedRides,
      totalEvents,
      averageScore,
      recentRides,
    };
  }

  async getRides(params: {
    status?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    userId?: string;
  }) {
    return this.prisma.ride.findMany({
      where: {
        status: params.status,
        userId: params.userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
            lastSeenAt: true,
          },
        },
      },
      take: 50,
    });
  }

  async getRideEvents(rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            lastSeenAt: true,
          },
        },
      },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    const events = await this.prisma.rideEvent.findMany({
      where: { rideId },
      orderBy: {
        ts: 'asc',
      },
    });

    return {
      ride,
      events,
    };
  }

  async getCouriers() {
    const couriers = await this.prisma.user.findMany({
      where: {
        role: 'COURIER',
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        phone: true,
        isActive: true,
        lastSeenAt: true,
        createdAt: true,
        rides: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          select: {
            id: true,
            status: true,
            score: true,
            startedAt: true,
            endedAt: true,
            createdAt: true,
          },
        },
      },
    });

    const now = Date.now();

    return couriers.map((courier) => {
      const lastSeenAt = courier.lastSeenAt;
      const isOnline =
        lastSeenAt != null &&
        now - new Date(lastSeenAt).getTime() <= 60 * 1000;

      return {
        id: courier.id,
        name: courier.name,
        phone: courier.phone,
        isActive: courier.isActive,
        isOnline,
        lastSeenAt,
        createdAt: courier.createdAt,
        lastRide: courier.rides[0] ?? null,
      };
    });
  }

  async getPilotSummary() {
    const [
      totalCouriers,
      activeRides,
      completedRides,
      totalEvents,
      harshBrakeCount,
      harshAccelCount,
      speedingCount,
      scoredRides,
      recentRiskyRides,
      couriers,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { role: 'COURIER' },
      }),
      this.prisma.ride.count({
        where: { status: RideStatus.ACTIVE },
      }),
      this.prisma.ride.count({
        where: { status: RideStatus.COMPLETED },
      }),
      this.prisma.rideEvent.count(),
      this.prisma.rideEvent.count({
        where: { type: 'harsh_brake' },
      }),
      this.prisma.rideEvent.count({
        where: { type: 'harsh_accel' },
      }),
      this.prisma.rideEvent.count({
        where: { type: 'speeding' },
      }),
      this.prisma.ride.findMany({
        where: {
          score: { not: null },
        },
        select: {
          score: true,
        },
      }),
      this.prisma.ride.findMany({
        where: {
          score: { not: null },
        },
        orderBy: {
          score: 'asc',
        },
        take: 5,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      }),
      this.prisma.user.findMany({
        where: { role: 'COURIER' },
        select: {
          id: true,
          lastSeenAt: true,
        },
      }),
    ]);

    const averageScore =
      scoredRides.length > 0
        ? Number(
            (
              scoredRides.reduce((sum, ride) => sum + (ride.score ?? 0), 0) /
              scoredRides.length
            ).toFixed(2),
          )
        : null;

    const now = Date.now();

    const onlineCourierCount = couriers.filter((courier) => {
      if (!courier.lastSeenAt) return false;
      return now - new Date(courier.lastSeenAt).getTime() <= 60 * 1000;
    }).length;

    return {
      totalCouriers,
      onlineCourierCount,
      activeRides,
      completedRides,
      totalEvents,
      averageScore,
      eventBreakdown: {
        harshBrake: harshBrakeCount,
        harshAccel: harshAccelCount,
        speeding: speedingCount,
      },
      riskyRides: recentRiskyRides,
    };
  }
}