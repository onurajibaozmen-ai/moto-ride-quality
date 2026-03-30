import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RideStatus } from '@prisma/client';
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
    const activeRide = await this.prisma.ride.findFirst({
      where: {
        userId,
        status: RideStatus.ACTIVE,
      },
    });

    if (activeRide) {
      throw new BadRequestException('User already has an active ride');
    }

    const ride = await this.prisma.ride.create({
      data: {
        userId,
        startedAt: new Date(),
        status: RideStatus.ACTIVE,
      },
    });

    return ride;
  }

  async getActiveRide(userId: string) {
    const ride = await this.prisma.ride.findFirst({
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
    });

    return ride ?? null;
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

  async endRide(id: string, userId: string) {
    const ride = await this.prisma.ride.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    if (ride.status !== RideStatus.ACTIVE) {
      throw new BadRequestException('Ride is not active');
    }

    const endedRide = await this.prisma.ride.update({
      where: { id },
      data: {
        endedAt: new Date(),
        status: RideStatus.COMPLETED,
      },
    });

    await this.rideAnalyticsService.recomputeRideAnalytics(id);
    await this.rideScoringService.recomputeRideScore(id);

    const finalRide = await this.prisma.ride.findUnique({
      where: { id },
      include: {
        analytics: true,
        scoreCard: true,
        rideEvents: {
          orderBy: { ts: 'asc' },
        },
      },
    });

    return finalRide ?? endedRide;
  }
}