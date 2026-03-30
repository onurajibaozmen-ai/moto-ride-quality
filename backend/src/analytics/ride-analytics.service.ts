import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type TelemetryPointLite = {
  ts: Date;
  lat: number;
  lng: number;
  speedKmh: number | null;
  accuracyM: number | null;
  heading: number | null;
  accelX: number | null;
  accelY: number | null;
  accelZ: number | null;
};

type RideAnalyticsComputation = {
  sampleCount: number;
  validPointCount: number;
  gpsGapCount: number;
  lowAccuracyCount: number;
  movingSeconds: number;
  idleSeconds: number;
  totalDistanceM: number;
  avgSpeedKmh: number | null;
  p95SpeedKmh: number | null;
  maxSpeedKmh: number | null;
  medianAccuracyM: number | null;
  qualityScore: number;
  qualityFlags: string[];
};

@Injectable()
export class RideAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async recomputeRideAnalytics(rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
        status: true,
        telemetryPoints: {
          orderBy: { ts: 'asc' },
          select: {
            ts: true,
            lat: true,
            lng: true,
            speedKmh: true,
            accuracyM: true,
            heading: true,
            accelX: true,
            accelY: true,
            accelZ: true,
          },
        },
      },
    });

    if (!ride) {
      return null;
    }

    const metrics = this.computeAnalytics(ride.telemetryPoints);

    const analytics = await this.prisma.rideAnalytics.upsert({
      where: { rideId },
      create: {
        rideId,
        ...metrics,
        qualityFlags: metrics.qualityFlags as Prisma.InputJsonValue,
      },
      update: {
        ...metrics,
        qualityFlags: metrics.qualityFlags as Prisma.InputJsonValue,
      },
    });

    await this.prisma.ride.update({
      where: { id: rideId },
      data: {
        totalDistanceM: Number(metrics.totalDistanceM.toFixed(2)),
        durationS:
          ride.endedAt && ride.startedAt
            ? Math.max(
                0,
                Math.round(
                  (ride.endedAt.getTime() - ride.startedAt.getTime()) / 1000,
                ),
              )
            : undefined,
      },
    });

    return analytics;
  }

  private computeAnalytics(
    rawPoints: TelemetryPointLite[],
  ): RideAnalyticsComputation {
    const points = rawPoints
      .filter((point) => this.isReasonableCoordinate(point.lat, point.lng))
      .sort((a, b) => a.ts.getTime() - b.ts.getTime());

    const sampleCount = points.length;
    if (sampleCount === 0) {
      return {
        sampleCount: 0,
        validPointCount: 0,
        gpsGapCount: 0,
        lowAccuracyCount: 0,
        movingSeconds: 0,
        idleSeconds: 0,
        totalDistanceM: 0,
        avgSpeedKmh: null,
        p95SpeedKmh: null,
        maxSpeedKmh: null,
        medianAccuracyM: null,
        qualityScore: 0,
        qualityFlags: ['NO_TELEMETRY'],
      };
    }

    let validPointCount = 0;
    let gpsGapCount = 0;
    let lowAccuracyCount = 0;
    let movingSeconds = 0;
    let idleSeconds = 0;
    let totalDistanceM = 0;

    const validSpeeds: number[] = [];
    const validAccuracies: number[] = [];
    const dtSamples: number[] = [];

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const prev = i > 0 ? points[i - 1] : null;

      const usableAccuracy =
        point.accuracyM === null || point.accuracyM <= 30 ? true : false;

      if (usableAccuracy) {
        validPointCount += 1;
      } else {
        lowAccuracyCount += 1;
      }

      if (typeof point.speedKmh === 'number' && point.speedKmh >= 0) {
        validSpeeds.push(point.speedKmh);
      }

      if (typeof point.accuracyM === 'number' && point.accuracyM >= 0) {
        validAccuracies.push(point.accuracyM);
      }

      if (!prev) {
        continue;
      }

      const dtSec = Math.round(
        (point.ts.getTime() - prev.ts.getTime()) / 1000,
      );

      if (dtSec <= 0) {
        continue;
      }

      dtSamples.push(dtSec);

      if (dtSec > 8) {
        gpsGapCount += 1;
      }

      const effectiveSpeed =
        typeof point.speedKmh === 'number'
          ? point.speedKmh
          : typeof prev.speedKmh === 'number'
            ? prev.speedKmh
            : 0;

      if (effectiveSpeed >= 5) {
        movingSeconds += dtSec;
      } else {
        idleSeconds += dtSec;
      }

      if (usableAccuracy && this.isReasonableJump(prev, point, dtSec)) {
        totalDistanceM += this.haversineMeters(
          prev.lat,
          prev.lng,
          point.lat,
          point.lng,
        );
      }
    }

    const medianAccuracyM =
      validAccuracies.length > 0 ? this.percentile(validAccuracies, 50) : null;

    const avgSpeedKmh =
      validSpeeds.length > 0
        ? Number(
            (
              validSpeeds.reduce((sum, value) => sum + value, 0) /
              validSpeeds.length
            ).toFixed(2),
          )
        : null;

    const p95SpeedKmh =
      validSpeeds.length > 0
        ? Number(this.percentile(validSpeeds, 95).toFixed(2))
        : null;

    const maxSpeedKmh =
      validSpeeds.length > 0 ? Number(Math.max(...validSpeeds).toFixed(2)) : null;

    const lowAccuracyRatio =
      sampleCount > 0 ? lowAccuracyCount / sampleCount : 1;
    const gapRatio =
      Math.max(sampleCount - 1, 1) > 0 ? gpsGapCount / Math.max(sampleCount - 1, 1) : 1;
    const validPointRatio = sampleCount > 0 ? validPointCount / sampleCount : 0;

    const medianDt = dtSamples.length > 0 ? this.percentile(dtSamples, 50) : 999;
    const lowDensityPenalty = medianDt <= 2 ? 0 : medianDt <= 4 ? 0.15 : 0.35;

    let qualityScore =
      1 -
      lowAccuracyRatio * 0.35 -
      gapRatio * 0.35 -
      (1 - validPointRatio) * 0.2 -
      lowDensityPenalty * 0.1;

    qualityScore = this.clamp(qualityScore, 0, 1);

    const qualityFlags: string[] = [];

    if (sampleCount < 20) {
      qualityFlags.push('LOW_SAMPLE_COUNT');
    }

    if (medianDt > 4) {
      qualityFlags.push('LOW_SAMPLE_DENSITY');
    }

    if (gapRatio >= 0.15) {
      qualityFlags.push('HIGH_GPS_GAP_RATIO');
    }

    if (lowAccuracyRatio >= 0.2) {
      qualityFlags.push('POOR_GPS_ACCURACY');
    }

    if (totalDistanceM < 1500 || movingSeconds < 240) {
      qualityFlags.push('TOO_SHORT_FOR_RELIABLE_SCORING');
    }

    return {
      sampleCount,
      validPointCount,
      gpsGapCount,
      lowAccuracyCount,
      movingSeconds,
      idleSeconds,
      totalDistanceM: Number(totalDistanceM.toFixed(2)),
      avgSpeedKmh,
      p95SpeedKmh,
      maxSpeedKmh,
      medianAccuracyM:
        medianAccuracyM !== null ? Number(medianAccuracyM.toFixed(2)) : null,
      qualityScore: Number(qualityScore.toFixed(4)),
      qualityFlags,
    };
  }

  private isReasonableCoordinate(lat: number, lng: number) {
    return (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }

  private isReasonableJump(
    prev: TelemetryPointLite,
    current: TelemetryPointLite,
    dtSec: number,
  ) {
    const distanceM = this.haversineMeters(
      prev.lat,
      prev.lng,
      current.lat,
      current.lng,
    );

    const impliedSpeedKmh = (distanceM / Math.max(dtSec, 1)) * 3.6;
    return impliedSpeedKmh <= 140;
  }

  private haversineMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadiusM = 6371000;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusM * c;
  }

  private percentile(values: number[], percentile: number) {
    if (values.length === 0) {
      return 0;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return sorted[lower];
    }

    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  private clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }
}