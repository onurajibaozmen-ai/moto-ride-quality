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

type DetectedEvent = {
  type: 'harsh_brake' | 'harsh_accel' | 'speeding';
  ts: Date;
  lat: number | null;
  lng: number | null;
  severity: number | null;
  metaJson?: Prisma.InputJsonValue;
};

type PointWithDerived = {
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

    const sanitizedPoints = body.points
      .map((point) => ({
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

    const result = await this.prisma.telemetryPoint.createMany({
      data: sanitizedPoints,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt: new Date() },
    });

    const detectedEvents = this.detectEvents(body);

    if (detectedEvents.length > 0) {
      await this.prisma.rideEvent.createMany({
        data: detectedEvents.map((event) => ({
          rideId: body.rideId,
          userId,
          type: event.type,
          ts: event.ts,
          lat: event.lat,
          lng: event.lng,
          severity: event.severity,
          ...(event.metaJson !== undefined ? { metaJson: event.metaJson } : {}),
        })),
      });
    }

    const analytics =
      await this.rideAnalyticsService.recomputeRideAnalytics(body.rideId);
    const scoreCard =
      await this.rideScoringService.recomputeRideScore(body.rideId);

    return {
      ok: true,
      insertedCount: result.count,
      detectedEventsCount: detectedEvents.length,
      rideId: body.rideId,
      analytics: analytics
        ? {
            qualityScore: analytics.qualityScore,
            totalDistanceM: analytics.totalDistanceM,
            movingSeconds: analytics.movingSeconds,
            qualityFlags: analytics.qualityFlags,
          }
        : null,
      score: scoreCard?.totalScore ?? null,
      confidenceLevel: scoreCard?.confidenceLevel ?? null,
    };
  }

  private detectEvents(body: TelemetryBatchDto): DetectedEvent[] {
    const events: DetectedEvent[] = [];

    const points: PointWithDerived[] = body.points
      .map((point) => ({
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
      .sort((a, b) => a.ts.getTime() - b.ts.getTime());

    let lastBrakeTs = 0;
    let lastAccelTs = 0;
    let lastSpeedingTs = 0;

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const prev = i > 0 ? points[i - 1] : null;

      if (!this.isUsableForEvent(point)) {
        continue;
      }

      const speed = point.speedKmh ?? 0;
      const accelY = point.accelY ?? 0;

      let jerkY: number | null = null;
      let dtSec: number | null = null;

      if (
        prev &&
        this.isUsableForEvent(prev) &&
        prev.accelY !== null &&
        point.accelY !== null
      ) {
        dtSec = (point.ts.getTime() - prev.ts.getTime()) / 1000;
        if (dtSec > 0.2 && dtSec < 5) {
          jerkY = (point.accelY - prev.accelY) / dtSec;
        }
      }

      const nowMs = point.ts.getTime();
      const canEvaluateDynamicEvents = speed >= 15;

      if (canEvaluateDynamicEvents) {
        const harshBrakeByAccel = accelY <= -2.7;
        const harshBrakeByJerk = jerkY !== null && jerkY <= -4.5;

        if (
          (harshBrakeByAccel || harshBrakeByJerk) &&
          nowMs - lastBrakeTs > 3000
        ) {
          const severity = this.computeBrakeSeverity({
            speed,
            accelY,
            jerkY,
          });

          events.push({
            type: 'harsh_brake',
            ts: point.ts,
            lat: point.lat ?? null,
            lng: point.lng ?? null,
            severity,
            metaJson: {
              speedKmh: speed,
              accelY,
              jerkY,
              dtSec,
              rule: harshBrakeByAccel ? 'accel' : 'jerk',
            } as Prisma.InputJsonValue,
          });

          lastBrakeTs = nowMs;
        }

        const harshAccelByAccel = accelY >= 2.8;
        const harshAccelByJerk = jerkY !== null && jerkY >= 4.8;

        if (
          (harshAccelByAccel || harshAccelByJerk) &&
          nowMs - lastAccelTs > 3000
        ) {
          const severity = this.computeAccelSeverity({
            speed,
            accelY,
            jerkY,
          });

          events.push({
            type: 'harsh_accel',
            ts: point.ts,
            lat: point.lat ?? null,
            lng: point.lng ?? null,
            severity,
            metaJson: {
              speedKmh: speed,
              accelY,
              jerkY,
              dtSec,
              rule: harshAccelByAccel ? 'accel' : 'jerk',
            } as Prisma.InputJsonValue,
          });

          lastAccelTs = nowMs;
        }
      }

      if (speed >= 72 && nowMs - lastSpeedingTs > 4000) {
        const speedingSeverity = Number((speed - 70).toFixed(2));

        events.push({
          type: 'speeding',
          ts: point.ts,
          lat: point.lat ?? null,
          lng: point.lng ?? null,
          severity: speedingSeverity,
          metaJson: {
            speedKmh: speed,
            threshold: 70,
          } as Prisma.InputJsonValue,
        });

        lastSpeedingTs = nowMs;
      }
    }

    return this.deduplicateNearbyEvents(events);
  }

  private isUsableForEvent(point: PointWithDerived) {
    if (point.accuracyM !== null && point.accuracyM > 30) {
      return false;
    }

    return true;
  }

  private computeBrakeSeverity(params: {
    speed: number;
    accelY: number;
    jerkY: number | null;
  }) {
    const accelComponent = Math.max(0, Math.abs(params.accelY) - 2.7);
    const jerkComponent =
      params.jerkY !== null ? Math.max(0, Math.abs(params.jerkY) - 4.5) : 0;
    const speedComponent = Math.max(0, params.speed - 15) / 20;

    return Number(
      (1 + accelComponent + jerkComponent * 0.45 + speedComponent).toFixed(2),
    );
  }

  private computeAccelSeverity(params: {
    speed: number;
    accelY: number;
    jerkY: number | null;
  }) {
    const accelComponent = Math.max(0, params.accelY - 2.8);
    const jerkComponent =
      params.jerkY !== null ? Math.max(0, params.jerkY - 4.8) : 0;
    const speedComponent = Math.max(0, params.speed - 15) / 25;

    return Number(
      (1 + accelComponent + jerkComponent * 0.45 + speedComponent).toFixed(2),
    );
  }

  private deduplicateNearbyEvents(events: DetectedEvent[]) {
    const deduped: DetectedEvent[] = [];

    for (const event of events) {
      const previous = deduped[deduped.length - 1];

      if (
        previous &&
        previous.type === event.type &&
        Math.abs(event.ts.getTime() - previous.ts.getTime()) <= 3000
      ) {
        if ((event.severity ?? 0) > (previous.severity ?? 0)) {
          deduped[deduped.length - 1] = event;
        }
        continue;
      }

      deduped.push(event);
    }

    return deduped;
  }
}