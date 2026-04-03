import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RideStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RideAnalyticsService } from '../analytics/ride-analytics.service';
import { RideScoringService } from '../scoring/ride-scoring.service';

@Injectable()
export class RidesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rideAnalyticsService: RideAnalyticsService,
    private readonly rideScoringService: RideScoringService,
  ) {}

  async startRide(userId: string) {
    if (!userId) {
      throw new Error('startRide called without userId');
    }

    const activeRide = await this.prisma.ride.findFirst({
      where: {
        userId,
        status: RideStatus.ACTIVE,
      },
    });

    if (activeRide) {
      throw new BadRequestException('User already has an active ride');
    }

    return this.prisma.ride.create({
      data: {
        userId,
        startedAt: new Date(),
        status: RideStatus.ACTIVE,
      },
    });
  }

  async getActiveRide(userId: string) {
    return (
      (await this.prisma.ride.findFirst({
        where: {
          userId,
          status: RideStatus.ACTIVE,
        },
        include: {
          analytics: true,
          scoreCard: true,
        },
        orderBy: {
          startedAt: 'desc',
        },
      })) ?? null
    );
  }

  async getRideById(id: string, userId: string) {
    const ride = await this.prisma.ride.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        telemetryPoints: {
          orderBy: { ts: 'asc' },
          take: 500,
        },
        rideEvents: {
          orderBy: { ts: 'asc' },
        },
        analytics: true,
        scoreCard: true,
      },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    return ride;
  }

  async getRideDetail(id: string, userId: string) {
    const ride = await this.prisma.ride.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        telemetryPoints: {
          orderBy: { ts: 'asc' },
          take: 2000,
        },
        rideEvents: {
          orderBy: { ts: 'asc' },
        },
        analytics: true,
        scoreCard: true,
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    const insights = this.buildRideInsights(ride);

    return {
      ride: {
        id: ride.id,
        status: ride.status,
        startedAt: ride.startedAt,
        endedAt: ride.endedAt,
        durationS: ride.durationS,
        totalDistanceM: ride.totalDistanceM,
        score: ride.score,
        scoreVersion: ride.scoreVersion,
      },
      courier: ride.user,
      analytics: ride.analytics,
      scoreCard: ride.scoreCard,
      events: ride.rideEvents,
      telemetry: ride.telemetryPoints.map((point) => ({
        ts: point.ts,
        lat: point.lat,
        lng: point.lng,
        speedKmh: point.speedKmh,
        accuracyM: point.accuracyM,
        heading: point.heading,
      })),
      insights,
    };
  }

  async endRide(userId: string, rideId: string) {
    if (!userId) {
      throw new Error('endRide called without userId');
    }

    let ride: Prisma.RideGetPayload<object> | null = null;

    if (rideId) {
      ride = await this.prisma.ride.findFirst({
        where: {
          id: rideId,
          userId,
          status: RideStatus.ACTIVE,
        },
      });
    }

    if (!ride) {
      ride = await this.prisma.ride.findFirst({
        where: {
          userId,
          status: RideStatus.ACTIVE,
        },
        orderBy: {
          startedAt: 'desc',
        },
      });
    }

    if (!ride) {
      throw new NotFoundException('Active ride not found for this user');
    }

    const endedAt = new Date();
    const durationS = Math.max(
      0,
      Math.round(
        (endedAt.getTime() - new Date(ride.startedAt).getTime()) / 1000,
      ),
    );

    const telemetryPoints = await this.prisma.telemetryPoint.findMany({
      where: { rideId: ride.id },
      orderBy: { ts: 'asc' },
    });

    let totalDistanceM = 0;

    for (let i = 1; i < telemetryPoints.length; i++) {
      const prev = telemetryPoints[i - 1];
      const curr = telemetryPoints[i];

      totalDistanceM += this.calculateDistanceMeters(
        prev.lat,
        prev.lng,
        curr.lat,
        curr.lng,
      );
    }

    const updatedRide = await this.prisma.ride.update({
      where: { id: ride.id },
      data: {
        status: RideStatus.COMPLETED,
        endedAt,
        durationS,
        totalDistanceM,
      },
    });

    return updatedRide;
  }

  private calculateDistanceMeters(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadiusM = 6371000;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusM * c;
  }

  private buildRideInsights(ride: {
    analytics: any;
    scoreCard: any;
    rideEvents: Array<{ type: string; severity: number | null }>;
  }) {
    const insights: Array<{
      code: string;
      level: 'info' | 'warning' | 'critical';
      title: string;
      message: string;
    }> = [];

    const eventCounts = ride.rideEvents.reduce<Record<string, number>>((acc, event) => {
      acc[event.type] = (acc[event.type] ?? 0) + 1;
      return acc;
    }, {});

    if ((eventCounts.harsh_brake ?? 0) >= 3) {
      insights.push({
        code: 'HARSH_BRAKE_CLUSTER',
        level: 'warning',
        title: 'Frequent harsh braking',
        message:
          'This ride contains repeated harsh braking events. Review braking anticipation and intersection approach behavior.',
      });
    }

    if ((eventCounts.speeding ?? 0) >= 3) {
      insights.push({
        code: 'SPEEDING_PATTERN',
        level: 'warning',
        title: 'Repeated speeding',
        message:
          'Multiple speeding events were detected. Compliance score is likely affected.',
      });
    }

    const flags = Array.isArray(ride.analytics?.qualityFlags)
      ? ride.analytics.qualityFlags.filter((item: unknown): item is string => typeof item === 'string')
      : [];

    if (flags.includes('LOW_QUALITY')) {
      insights.push({
        code: 'GPS_QUALITY_WARNING',
        level: 'info',
        title: 'Low telemetry quality',
        message:
          'Some telemetry points were low quality. Score confidence may be reduced.',
      });
    }

    if (ride.scoreCard?.confidenceLevel === 'LOW') {
      insights.push({
        code: 'LOW_CONFIDENCE_SCORE',
        level: 'critical',
        title: 'Low score confidence',
        message:
          'Ride score is based on limited or low-quality telemetry. Treat it cautiously.',
      });
    }

    if (insights.length === 0) {
      insights.push({
        code: 'NO_MAJOR_ISSUES',
        level: 'info',
        title: 'No major issues detected',
        message:
          'This ride does not show strong negative patterns under current rules.',
      });
    }

    return insights;
  }
}