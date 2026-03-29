
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RideStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TelemetryBatchDto } from './dto/telemetry-batch.dto';

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
  constructor(private readonly prisma: PrismaService) {}

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

    const result = await this.prisma.telemetryPoint.createMany({
      data: body.points.map((point) => ({
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
    })),
  });

// 🔥 BURASI AYRI OLMALI
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        lastSeenAt: new Date(),
      },
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

    const score = await this.recalculateRideScore(body.rideId);

    return {
      ok: true,
      insertedCount: result.count,
      detectedEventsCount: detectedEvents.length,
      score,
      rideId: body.rideId,
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

        if (dtSec > 0.2 && dtSec < 10) {
          jerkY = (point.accelY - prev.accelY) / dtSec;
        }
      }

      const canEvaluateDynamicEvents = speed >= 15;

      if (canEvaluateDynamicEvents) {
        const harshBrakeByAccel = accelY <= -2.5;
        const harshBrakeByJerk = jerkY !== null && jerkY <= -4.0;

        if (harshBrakeByAccel || harshBrakeByJerk) {
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
        }

        const harshAccelByAccel = accelY >= 2.5;
        const harshAccelByJerk = jerkY !== null && jerkY >= 4.0;

        if (harshAccelByAccel || harshAccelByJerk) {
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
        }
      }

      if (speed >= 70) {
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
    const accelComponent = Math.max(0, Math.abs(params.accelY) - 2.5);
    const jerkComponent =
      params.jerkY !== null ? Math.max(0, Math.abs(params.jerkY) - 4.0) : 0;
    const speedComponent = Math.max(0, params.speed - 15) / 20;

    return Number(
      (1 + accelComponent + jerkComponent * 0.5 + speedComponent).toFixed(2),
    );
  }

  private computeAccelSeverity(params: {
    speed: number;
    accelY: number;
    jerkY: number | null;
  }) {
    const accelComponent = Math.max(0, params.accelY - 2.5);
    const jerkComponent =
      params.jerkY !== null ? Math.max(0, params.jerkY - 4.0) : 0;
    const speedComponent = Math.max(0, params.speed - 15) / 25;

    return Number(
      (1 + accelComponent + jerkComponent * 0.5 + speedComponent).toFixed(2),
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

  private async recalculateRideScore(rideId: string) {
    const events = await this.prisma.rideEvent.findMany({
      where: { rideId },
    });

    let score = 100;

    for (const event of events) {
      const severity = event.severity ?? 1;

      if (event.type === 'harsh_brake') {
        score -= 4 + Math.min(severity, 6) * 1.2;
      } else if (event.type === 'harsh_accel') {
        score -= 3 + Math.min(severity, 6) * 1.0;
      } else if (event.type === 'speeding') {
        score -= 2 + Math.min(severity / 5, 6) * 0.8;
      }
    }

    score = Number(Math.max(0, score).toFixed(2));

    const updatedRide = await this.prisma.ride.update({
      where: { id: rideId },
      data: {
        score,
        scoreVersion: 'v2',
      },
    });

    return updatedRide.score;
  }
}