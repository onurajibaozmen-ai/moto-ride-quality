import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RideStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [totalCouriers, activeRides, completedRides, rideScores, events] =
      await Promise.all([
        this.prisma.user.count({
          where: { role: 'COURIER' },
        }),
        this.prisma.ride.count({
          where: { status: RideStatus.ACTIVE },
        }),
        this.prisma.ride.count({
          where: { status: RideStatus.COMPLETED },
        }),
        this.prisma.rideScore.findMany({
          select: { totalScore: true, confidenceLevel: true },
        }),
        this.prisma.rideEvent.count(),
      ]);

    const avgScore =
      rideScores.length > 0
        ? Number(
            (
              rideScores.reduce((sum, item) => sum + item.totalScore, 0) /
              rideScores.length
            ).toFixed(2),
          )
        : 0;

    const lowConfidenceRideCount = rideScores.filter(
      (item) => item.confidenceLevel === 'LOW',
    ).length;

    return {
      totalCouriers,
      activeRides,
      completedRides,
      totalEvents: events,
      averageScore: avgScore,
      lowConfidenceRideCount,
    };
  }

  async getRides(filters?: {
    status?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    userId?: string;
  }) {
    const where: Prisma.RideWhereInput = {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.userId ? { userId: filters.userId } : {}),
    };

    const rides = await this.prisma.ride.findMany({
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
      take: 100,
    });

    return rides.map((ride) => ({
      id: ride.id,
      status: ride.status,
      startedAt: ride.startedAt,
      endedAt: ride.endedAt,
      totalDistanceM: ride.analytics?.totalDistanceM ?? ride.totalDistanceM ?? 0,
      durationS:
        ride.durationS ??
        ((ride.endedAt?.getTime() ?? Date.now()) - ride.startedAt.getTime()) /
          1000,
      score: ride.scoreCard?.totalScore ?? ride.score ?? null,
      scoreVersion: ride.scoreCard?.scoringVersion ?? ride.scoreVersion ?? null,
      confidenceLevel: ride.scoreCard?.confidenceLevel ?? null,
      qualityScore: ride.analytics?.qualityScore ?? null,
      qualityFlags: ride.analytics?.qualityFlags ?? [],
      eventsCount: ride._count.rideEvents,
      telemetryCount: ride._count.telemetryPoints,
      courier: ride.user,
    }));
  }

  async getRideEvents(rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      select: { id: true },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    return this.prisma.rideEvent.findMany({
      where: { rideId },
      orderBy: { ts: 'asc' },
    });
  }

  async getRideScoreBreakdown(rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        analytics: true,
        scoreCard: true,
        rideEvents: true,
      },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    const breakdownJson =
      ride.scoreCard?.breakdownJson &&
      typeof ride.scoreCard.breakdownJson === 'object'
        ? ride.scoreCard.breakdownJson
        : {};

    return {
      rideId: ride.id,
      totalScore: ride.scoreCard?.totalScore ?? ride.score ?? null,
      scoringVersion: ride.scoreCard?.scoringVersion ?? ride.scoreVersion ?? null,
      confidenceLevel: ride.scoreCard?.confidenceLevel ?? null,
      qualityScore: ride.analytics?.qualityScore ?? null,
      qualityFlags: ride.analytics?.qualityFlags ?? [],
      analytics: ride.analytics
        ? {
            sampleCount: ride.analytics.sampleCount,
            validPointCount: ride.analytics.validPointCount,
            gpsGapCount: ride.analytics.gpsGapCount,
            lowAccuracyCount: ride.analytics.lowAccuracyCount,
            movingSeconds: ride.analytics.movingSeconds,
            idleSeconds: ride.analytics.idleSeconds,
            totalDistanceM: ride.analytics.totalDistanceM,
            avgSpeedKmh: ride.analytics.avgSpeedKmh,
            p95SpeedKmh: ride.analytics.p95SpeedKmh,
            maxSpeedKmh: ride.analytics.maxSpeedKmh,
            medianAccuracyM: ride.analytics.medianAccuracyM,
          }
        : null,
      eventCounts: {
        harshBrake: ride.rideEvents.filter((event) => event.type === 'harsh_brake')
          .length,
        harshAccel: ride.rideEvents.filter((event) => event.type === 'harsh_accel')
          .length,
        speeding: ride.rideEvents.filter((event) => event.type === 'speeding').length,
      },
      components:
        typeof breakdownJson === 'object' && breakdownJson !== null
          ? (breakdownJson as Record<string, unknown>)
          : {},
    };
  }

  async getCouriers() {
    const couriers = await this.prisma.user.findMany({
      where: {
        role: 'COURIER',
      },
      include: {
        rides: {
          where: {
            status: RideStatus.COMPLETED,
          },
          include: {
            analytics: true,
            scoreCard: true,
            _count: {
              select: {
                rideEvents: true,
              },
            },
          },
          orderBy: {
            startedAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return couriers.map((courier) => {
      const completedRides = courier.rides;
      const totalRides = completedRides.length;

      const avgScore =
        totalRides > 0
          ? Number(
              (
                completedRides.reduce(
                  (sum, ride) => sum + (ride.scoreCard?.totalScore ?? ride.score ?? 0),
                  0,
                ) / totalRides
              ).toFixed(2),
            )
          : 0;

      const totalDistanceM = completedRides.reduce(
        (sum, ride) => sum + (ride.analytics?.totalDistanceM ?? ride.totalDistanceM ?? 0),
        0,
      );

      const totalEvents = completedRides.reduce(
        (sum, ride) => sum + ride._count.rideEvents,
        0,
      );

      const lowConfidenceRides = completedRides.filter(
        (ride) => ride.scoreCard?.confidenceLevel === 'LOW',
      ).length;

      return {
        id: courier.id,
        name: courier.name,
        phone: courier.phone,
        isActive: courier.isActive,
        lastSeenAt: courier.lastSeenAt,
        totalCompletedRides: totalRides,
        averageScore: avgScore,
        totalDistanceM: Number(totalDistanceM.toFixed(2)),
        totalEvents,
        lowConfidenceRides,
      };
    });
  }

  async getPilotSummary() {
    const [overview, couriers, recentCompletedRides] = await Promise.all([
      this.getOverview(),
      this.getCouriers(),
      this.prisma.ride.findMany({
        where: { status: RideStatus.COMPLETED },
        include: {
          analytics: true,
          scoreCard: true,
          user: {
            select: {
              name: true,
              phone: true,
            },
          },
          _count: {
            select: {
              rideEvents: true,
            },
          },
        },
        orderBy: { endedAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      overview,
      couriers,
      recentCompletedRides: recentCompletedRides.map((ride) => ({
        id: ride.id,
        courierName: ride.user.name,
        courierPhone: ride.user.phone,
        startedAt: ride.startedAt,
        endedAt: ride.endedAt,
        totalDistanceM: ride.analytics?.totalDistanceM ?? ride.totalDistanceM ?? 0,
        score: ride.scoreCard?.totalScore ?? ride.score ?? null,
        confidenceLevel: ride.scoreCard?.confidenceLevel ?? null,
        qualityScore: ride.analytics?.qualityScore ?? null,
        eventsCount: ride._count.rideEvents,
      })),
    };
  }
}