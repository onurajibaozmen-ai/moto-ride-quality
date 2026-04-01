import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type DashboardRideFilters = {
  status?: string;
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [totalCouriers, activeRides, completedRides, avgScoreAgg, totalEvents] =
      await Promise.all([
        this.prisma.user.count({
          where: { role: 'COURIER' },
        }),
        this.prisma.ride.count({
          where: { status: 'ACTIVE' },
        }),
        this.prisma.ride.count({
          where: { status: 'COMPLETED' },
        }),
        this.prisma.ride.aggregate({
          _avg: { score: true },
          where: {
            status: 'COMPLETED',
            score: { not: null },
          },
        }),
        this.prisma.rideEvent.count(),
      ]);

    return {
      totalCouriers,
      activeRides,
      completedRides,
      averageScore: avgScoreAgg._avg.score
        ? Number(avgScoreAgg._avg.score.toFixed(2))
        : null,
      totalEvents,
    };
  }

  async getLeaderboard(limit = 20) {
    const rides = await this.prisma.ride.findMany({
      where: {
        status: 'COMPLETED',
        score: { not: null },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        scoreCard: true,
        analytics: true,
      },
      orderBy: [{ score: 'desc' }, { startedAt: 'desc' }],
      take: limit,
    });

    return rides.map((ride, index) => ({
      rank: index + 1,
      rideId: ride.id,
      courier: ride.user,
      score: ride.score,
      confidenceLevel: ride.scoreCard?.confidenceLevel ?? null,
      totalDistanceM: ride.totalDistanceM,
      durationS: ride.durationS,
      startedAt: ride.startedAt,
      qualityScore: ride.analytics?.qualityScore ?? null,
    }));
  }

  async getRides(filters: DashboardRideFilters) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.RideWhereInput = {};

    if (filters.status) {
      where.status = filters.status as any;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.from || filters.to) {
      where.startedAt = {};
      if (filters.from) {
        where.startedAt.gte = new Date(filters.from);
      }
      if (filters.to) {
        where.startedAt.lte = new Date(filters.to);
      }
    }

    const [total, rides] = await Promise.all([
      this.prisma.ride.count({ where }),
      this.prisma.ride.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          analytics: true,
          scoreCard: true,
          _count: {
            select: {
              rideEvents: true,
              telemetryPoints: true,
            },
          },
        },
        orderBy: {
          startedAt: 'desc',
        },
        skip,
        take: limit,
      }),
    ]);

    return {
      page,
      limit,
      total,
      items: rides.map((ride) => ({
        id: ride.id,
        status: ride.status,
        startedAt: ride.startedAt,
        endedAt: ride.endedAt,
        durationS: ride.durationS,
        totalDistanceM: ride.totalDistanceM,
        score: ride.score,
        courier: ride.user,
        analytics: ride.analytics,
        scoreCard: ride.scoreCard,
        eventCount: ride._count.rideEvents,
        telemetryCount: ride._count.telemetryPoints,
      })),
    };
  }

  async getCouriers() {
    const couriers = await this.prisma.user.findMany({
      where: { role: 'COURIER' },
      include: {
        rides: {
          take: 1,
          orderBy: { startedAt: 'desc' },
          include: {
            analytics: true,
            scoreCard: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = Date.now();

    return couriers.map((courier) => {
      const lastRide = courier.rides[0] ?? null;
      const online =
        courier.lastSeenAt &&
        now - new Date(courier.lastSeenAt).getTime() <= 60 * 1000;

      return {
        id: courier.id,
        name: courier.name,
        phone: courier.phone,
        lastSeenAt: courier.lastSeenAt,
        online: Boolean(online),
        lastRide,
      };
    });
  }

  async getPilotSummary() {
    const riskyRides = await this.prisma.ride.findMany({
      where: {
        status: 'COMPLETED',
        score: { not: null, lt: 70 },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        analytics: true,
        scoreCard: true,
      },
      orderBy: {
        score: 'asc',
      },
      take: 10,
    });

    return {
      generatedAt: new Date(),
      riskyRides,
    };
  }
}