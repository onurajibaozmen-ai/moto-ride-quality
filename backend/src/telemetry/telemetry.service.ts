import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RideStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TelemetryBatchDto } from './dto/telemetry-batch.dto';
import { RideAnalyticsService } from '../analytics/ride-analytics.service';
import { RideScoringService } from '../scoring/ride-scoring.service';
import {
  detectEvents,
  RideEvent as DetectedRideEvent,
  TelemetryPoint as DetectorTelemetryPoint,
} from '../analytics/event-detector';

type SanitizedPoint = {
  rideId: string;
  userId: string;
  ts: Date;
  lat: number;
  lng: number;
  speedKmh: number | null;
  accuracyM: number | null;
  heading: number | null;
  accelX: number | null;
  accelY: number | null;
  accelZ: number | null;
  batteryLevel: number | null;
  networkType: string | null;
};

@Injectable()
export class TelemetryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rideAnalyticsService: RideAnalyticsService,
    private readonly rideScoringService: RideScoringService,
  ) {}

  async ingestBatch(userId: string, body: TelemetryBatchDto) {
    const ride = await this.prisma.ride.findFirst({
      where: {
        id: body.rideId,
        userId,
      },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    if (ride.status !== RideStatus.ACTIVE) {
      throw new BadRequestException('Ride is not active');
    }

    const existingBatch = await this.prisma.telemetryBatchIngest.findFirst({
      where: {
        rideId: body.rideId,
        clientBatchId: body.clientBatchId,
      },
    });

    if (existingBatch) {
      const analytics = await this.prisma.rideAnalytics.findUnique({
        where: { rideId: body.rideId },
      });

      const scoreCard = await this.prisma.rideScore.findUnique({
        where: { rideId: body.rideId },
      });

      return {
        ok: true,
        deduplicated: true,
        insertedCount: 0,
        detectedEventsCount: 0,
        rideId: body.rideId,
        analytics: analytics
          ? {
              qualityScore: analytics.qualityScore,
              totalDistanceM: analytics.totalDistanceM,
              movingSeconds: analytics.movingSeconds,
              idleSeconds: analytics.idleSeconds,
              qualityFlags: analytics.qualityFlags,
            }
          : null,
        score: scoreCard?.totalScore ?? null,
        confidenceLevel: scoreCard?.confidenceLevel ?? null,
      };
    }

    const sanitizedPoints = body.points
      .map<SanitizedPoint>((point) => ({
        rideId: body.rideId,
        userId,
        ts: new Date(point.ts),
        lat: point.lat,
        lng: point.lng,
        speedKmh: point.speedKmh ?? null,
        accuracyM: point.accuracyM ?? null,
        heading: point.heading ?? null,
        accelX: point.accelX ?? null,
        accelY: point.accelY ?? null,
        accelZ: point.accelZ ?? null,
        batteryLevel: point.batteryLevel ?? null,
        networkType: point.networkType ?? null,
      }))
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
      .sort((a, b) => a.ts.getTime() - b.ts.getTime());

    if (sanitizedPoints.length === 0) {
      throw new BadRequestException('No valid telemetry points found');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const createResult = await tx.telemetryPoint.createMany({
        data: sanitizedPoints,
      });

      await tx.telemetryBatchIngest.create({
        data: {
          rideId: body.rideId,
          userId,
          clientBatchId: body.clientBatchId,
          pointCount: sanitizedPoints.length,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { lastSeenAt: new Date() },
      });

      return createResult;
    });

    const detectedEvents = await this.detectAndPersistEvents(
      body.rideId,
      userId,
      sanitizedPoints,
    );

    await this.rideAnalyticsService.recomputeRideAnalytics(body.rideId);
    const scoreCard = await this.rideScoringService.recomputeRideScore(
      body.rideId,
    );

    const analytics = await this.prisma.rideAnalytics.findUnique({
      where: { rideId: body.rideId },
    });

    return {
      ok: true,
      deduplicated: false,
      insertedCount: result.count,
      detectedEventsCount: detectedEvents.length,
      rideId: body.rideId,
      analytics: analytics
        ? {
            qualityScore: analytics.qualityScore,
            totalDistanceM: analytics.totalDistanceM,
            movingSeconds: analytics.movingSeconds,
            idleSeconds: analytics.idleSeconds,
            qualityFlags: analytics.qualityFlags,
          }
        : null,
      score: scoreCard?.totalScore ?? null,
      confidenceLevel: scoreCard?.confidenceLevel ?? null,
    };
  }

  private async detectAndPersistEvents(
    rideId: string,
    userId: string,
    points: SanitizedPoint[],
  ) {
    const detectorInput: DetectorTelemetryPoint[] = points.map((point) => ({
      speed: point.speedKmh ?? 0,
      accelZ: point.accelZ ?? 0,
      timestamp: point.ts,
    }));

    const detectedEvents = detectEvents(detectorInput);

    if (detectedEvents.length === 0) {
      return [];
    }

    await this.prisma.rideEvent.createMany({
      data: detectedEvents.map((event) => {
        const closest = this.findClosestLatLng(points, event.timestamp);

        return {
          rideId,
          userId,
          type: this.mapEventType(event.type),
          ts: event.timestamp,
          lat: closest?.lat ?? null,
          lng: closest?.lng ?? null,
          severity: event.severity,
          metaJson: {
            penalty: event.penalty,
            detectedBy: 'event-detector-v1',
          } as Prisma.InputJsonValue,
        };
      }),
    });

    return detectedEvents;
  }

  private mapEventType(type: DetectedRideEvent['type']) {
    switch (type) {
      case 'HARSH_BRAKE':
        return 'harsh_brake';
      case 'HARSH_ACCEL':
        return 'harsh_accel';
      case 'OVERSPEED':
        return 'speeding';
      default:
        return 'speeding';
    }
  }

  private findClosestLatLng(
    points: Array<{
      ts: Date;
      lat: number;
      lng: number;
    }>,
    targetTs: Date,
  ) {
    if (points.length === 0) {
      return null;
    }

    let closest = points[0];
    let minDiff = Math.abs(points[0].ts.getTime() - targetTs.getTime());

    for (const point of points) {
      const diff = Math.abs(point.ts.getTime() - targetTs.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        closest = point;
      }
    }

    return closest;
  }
}