import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  RawTelemetryPoint,
  cleanTelemetryPoints,
  haversineMeters,
  percentile,
  clamp,
} from './telemetry-cleaning.util';

@Injectable()
export class RideAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async recomputeRideAnalytics(rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        telemetryPoints: {
          orderBy: { ts: 'asc' },
        },
      },
    });

    if (!ride) return null;

    const { cleanedPoints, summary } = cleanTelemetryPoints(
      ride.telemetryPoints as RawTelemetryPoint[],
    );

    let distance = 0;
    let moving = 0;
    let idle = 0;

    const speeds: number[] = [];
    const accuracies: number[] = [];

    for (let i = 1; i < cleanedPoints.length; i++) {
      const p = cleanedPoints[i];
      const prev = cleanedPoints[i - 1];

      const dt = Math.max(
        0,
        Math.round((p.ts.getTime() - prev.ts.getTime()) / 1000),
      );

      if (dt === 0) continue;

      const speed = p.speedKmh ?? prev.speedKmh ?? 0;

      if (speed >= 5) moving += dt;
      else idle += dt;

      if (p.isValidForDistance && prev.isValidForDistance) {
        distance += haversineMeters(prev.lat, prev.lng, p.lat, p.lng);
      }

      if (typeof speed === 'number') speeds.push(speed);
      if (typeof p.accuracyM === 'number') accuracies.push(p.accuracyM);
    }

    const avgSpeed =
      speeds.length > 0
        ? speeds.reduce((a, b) => a + b, 0) / speeds.length
        : null;

    const qualityScore = clamp(
      1 -
        (summary.lowAccuracyCount / Math.max(1, summary.rawCount)) * 0.3 -
        (summary.teleportCount / Math.max(1, summary.rawCount)) * 0.3,
      0,
      1,
    );

    const flags: string[] = [];

    if (summary.rawCount < 20) flags.push('LOW_SAMPLE');
    if (distance < 1500) flags.push('SHORT_RIDE');
    if (qualityScore < 0.5) flags.push('LOW_QUALITY');

    const analytics = await this.prisma.rideAnalytics.upsert({
      where: { rideId },
      create: {
        rideId,
        sampleCount: summary.rawCount,
        validPointCount: cleanedPoints.length,
        gpsGapCount: summary.gapCount,
        lowAccuracyCount: summary.lowAccuracyCount,
        movingSeconds: moving,
        idleSeconds: idle,
        totalDistanceM: distance,
        avgSpeedKmh: avgSpeed,
        p95SpeedKmh: speeds.length ? percentile(speeds, 95) : null,
        maxSpeedKmh: speeds.length ? Math.max(...speeds) : null,
        medianAccuracyM: accuracies.length
          ? percentile(accuracies, 50)
          : null,
        qualityScore,
        qualityFlags: flags as Prisma.InputJsonValue,
      },
      update: {
        sampleCount: summary.rawCount,
        validPointCount: cleanedPoints.length,
        gpsGapCount: summary.gapCount,
        lowAccuracyCount: summary.lowAccuracyCount,
        movingSeconds: moving,
        idleSeconds: idle,
        totalDistanceM: distance,
        avgSpeedKmh: avgSpeed,
        p95SpeedKmh: speeds.length ? percentile(speeds, 95) : null,
        maxSpeedKmh: speeds.length ? Math.max(...speeds) : null,
        medianAccuracyM: accuracies.length
          ? percentile(accuracies, 50)
          : null,
        qualityScore,
        qualityFlags: flags as Prisma.InputJsonValue,
      },
    });

    return analytics;
  }
}