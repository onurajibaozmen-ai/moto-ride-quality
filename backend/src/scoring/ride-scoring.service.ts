import { Injectable } from '@nestjs/common';
import {
  Prisma,
  ScoreConfidenceLevel,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RideScoringService {
  private readonly scoringVersion = 'v3_analytics_confidence';

  constructor(private readonly prisma: PrismaService) {}

  async recomputeRideScore(rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        analytics: true,
        rideEvents: true,
      },
    });

    if (!ride) {
      return null;
    }

    const analytics = ride.analytics;

    const harshBrakeEvents = ride.rideEvents.filter(
      (event) => event.type === 'harsh_brake',
    );
    const harshAccelEvents = ride.rideEvents.filter(
      (event) => event.type === 'harsh_accel',
    );
    const speedingEvents = ride.rideEvents.filter(
      (event) => event.type === 'speeding',
    );

    const distanceKm = Math.max((analytics?.totalDistanceM ?? 0) / 1000, 0.1);
    const movingSeconds = Math.max(analytics?.movingSeconds ?? 0, 1);
    const idleSeconds = Math.max(analytics?.idleSeconds ?? 0, 0);
    const totalRideSeconds = Math.max(movingSeconds + idleSeconds, 1);

    const brakeRate = harshBrakeEvents.length / distanceKm;
    const accelRate = harshAccelEvents.length / distanceKm;
    const speedingRate = speedingEvents.length / distanceKm;
    const idleRatio = idleSeconds / totalRideSeconds;
    const p95Speed = analytics?.p95SpeedKmh ?? 0;
    const qualityScore = analytics?.qualityScore ?? 0;

    const safetyPenalty =
      this.cappedPenalty(brakeRate, 0.2, 2.5, 24) +
      this.cappedPenalty(accelRate, 0.2, 2.5, 16);

    const compliancePenalty =
      this.cappedPenalty(speedingRate, 0.1, 2.0, 20) +
      this.cappedPenalty(Math.max(0, p95Speed - 55), 0, 30, 8);

    const smoothnessPenalty =
      this.severityWeightedPenalty(harshBrakeEvents, 10) +
      this.severityWeightedPenalty(harshAccelEvents, 6);

    const efficiencyPenalty = this.cappedPenalty(idleRatio, 0.12, 0.5, 18);

    const safetyScore = this.normalizeScore(40 - safetyPenalty, 40);
    const complianceScore = this.normalizeScore(25 - compliancePenalty, 25);
    const smoothnessScore = this.normalizeScore(20 - smoothnessPenalty, 20);
    const efficiencyScore = this.normalizeScore(15 - efficiencyPenalty, 15);

    let totalScore =
      safetyScore * 0.4 +
      complianceScore * 0.25 +
      smoothnessScore * 0.2 +
      efficiencyScore * 0.15;

    totalScore = totalScore * this.qualityMultiplier(qualityScore);
    totalScore = this.clamp(totalScore, 0, 100);

    const confidenceLevel = this.resolveConfidenceLevel(
      qualityScore,
      analytics?.qualityFlags,
    );

    const breakdown = {
      inputs: {
        distanceKm: Number(distanceKm.toFixed(2)),
        movingSeconds,
        idleSeconds,
        idleRatio: Number(idleRatio.toFixed(4)),
        qualityScore,
        p95SpeedKmh: p95Speed,
      },
      eventCounts: {
        harshBrake: harshBrakeEvents.length,
        harshAccel: harshAccelEvents.length,
        speeding: speedingEvents.length,
      },
      rates: {
        brakeRatePerKm: Number(brakeRate.toFixed(4)),
        accelRatePerKm: Number(accelRate.toFixed(4)),
        speedingRatePerKm: Number(speedingRate.toFixed(4)),
      },
      penalties: {
        safetyPenalty: Number(safetyPenalty.toFixed(2)),
        compliancePenalty: Number(compliancePenalty.toFixed(2)),
        smoothnessPenalty: Number(smoothnessPenalty.toFixed(2)),
        efficiencyPenalty: Number(efficiencyPenalty.toFixed(2)),
      },
      scores: {
        safetyScore,
        complianceScore,
        smoothnessScore,
        efficiencyScore,
        totalScore: Number(totalScore.toFixed(2)),
      },
      qualityFlags: analytics?.qualityFlags ?? [],
      scoringVersion: this.scoringVersion,
    };

    const scoreCard = await this.prisma.rideScore.upsert({
      where: { rideId },
      create: {
        rideId,
        totalScore: Number(totalScore.toFixed(2)),
        safetyScore,
        complianceScore,
        smoothnessScore,
        efficiencyScore,
        confidenceLevel,
        scoringVersion: this.scoringVersion,
        breakdownJson: breakdown as Prisma.InputJsonValue,
      },
      update: {
        totalScore: Number(totalScore.toFixed(2)),
        safetyScore,
        complianceScore,
        smoothnessScore,
        efficiencyScore,
        confidenceLevel,
        scoringVersion: this.scoringVersion,
        breakdownJson: breakdown as Prisma.InputJsonValue,
      },
    });

    await this.prisma.ride.update({
      where: { id: rideId },
      data: {
        score: scoreCard.totalScore,
        scoreVersion: this.scoringVersion,
      },
    });

    return scoreCard;
  }

  private cappedPenalty(
    value: number,
    lowerGoodBound: number,
    upperBadBound: number,
    maxPenalty: number,
  ) {
    if (value <= lowerGoodBound) {
      return 0;
    }

    if (value >= upperBadBound) {
      return maxPenalty;
    }

    const ratio =
      (value - lowerGoodBound) / (upperBadBound - lowerGoodBound);

    return Number((ratio * maxPenalty).toFixed(2));
  }

  private severityWeightedPenalty(
    events: { severity: number | null }[],
    maxPenalty: number,
  ) {
    if (events.length === 0) {
      return 0;
    }

    const weighted = events.reduce((sum, event) => {
      const severity = event.severity ?? 1;
      return sum + Math.min(severity, 8);
    }, 0);

    return this.clamp(weighted * 0.8, 0, maxPenalty);
  }

  private qualityMultiplier(qualityScore: number) {
    if (qualityScore >= 0.85) {
      return 1;
    }
    if (qualityScore >= 0.7) {
      return 0.98;
    }
    if (qualityScore >= 0.55) {
      return 0.95;
    }
    return 0.9;
  }

  private resolveConfidenceLevel(
    qualityScore: number,
    qualityFlags: unknown,
  ): ScoreConfidenceLevel {
    const flags = Array.isArray(qualityFlags) ? qualityFlags : [];

    if (flags.includes('TOO_SHORT_FOR_RELIABLE_SCORING') || qualityScore < 0.55) {
      return ScoreConfidenceLevel.LOW;
    }

    if (qualityScore < 0.8) {
      return ScoreConfidenceLevel.MEDIUM;
    }

    return ScoreConfidenceLevel.HIGH;
  }

  private normalizeScore(componentScore: number, componentMax: number) {
    return Number(
      this.clamp((componentScore / componentMax) * 100, 0, 100).toFixed(2),
    );
  }

  private clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }
}