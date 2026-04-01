import { Injectable } from '@nestjs/common';
import { Prisma, ScoreConfidenceLevel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type ScoreBreakdown = {
  eventCounts: Record<string, number>;
  eventPenalties: Record<string, number>;
  analytics: {
    qualityScore: number | null;
    totalDistanceM: number;
    movingSeconds: number;
    qualityFlags: string[];
  };
  factors: {
    shortRidePenalty: number;
    lowQualityPenalty: number;
    confidenceReason: string;
  };
};

@Injectable()
export class RideScoringService {
  constructor(private readonly prisma: PrismaService) {}

  async recomputeRideScore(rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        analytics: true,
        rideEvents: true,
      },
    });

    if (!ride || !ride.analytics) {
      return null;
    }

    const qualityFlags = this.toStringArray(ride.analytics.qualityFlags);
    const eventCounts = this.countEvents(ride.rideEvents.map((event) => event.type));

    const safetyPenalty =
      eventCounts.harsh_brake * 4 +
      eventCounts.harsh_accel * 2.5 +
      eventCounts.sharp_turn * 2;

    const compliancePenalty =
      eventCounts.speeding * 3;

    const smoothnessPenalty =
      eventCounts.harsh_brake * 2 +
      eventCounts.harsh_accel * 2 +
      eventCounts.sharp_turn * 3;

    const shortRidePenalty = qualityFlags.includes('SHORT_RIDE') ? 8 : 0;

    const lowQualityPenalty =
      ride.analytics.qualityScore !== null
        ? (1 - ride.analytics.qualityScore) * 20
        : 12;

    let safetyScore = 100 - safetyPenalty - shortRidePenalty * 0.5;
    let complianceScore = 100 - compliancePenalty;
    let smoothnessScore = 100 - smoothnessPenalty - shortRidePenalty * 0.5;
    let efficiencyScore =
      100 -
      (ride.analytics.idleSeconds > ride.analytics.movingSeconds ? 8 : 0) -
      (ride.analytics.totalDistanceM < 1500 ? 6 : 0);

    safetyScore = this.clamp(safetyScore, 0, 100);
    complianceScore = this.clamp(complianceScore, 0, 100);
    smoothnessScore = this.clamp(smoothnessScore, 0, 100);
    efficiencyScore = this.clamp(efficiencyScore, 0, 100);

    let totalScore =
      safetyScore * 0.4 +
      complianceScore * 0.25 +
      smoothnessScore * 0.25 +
      efficiencyScore * 0.1 -
      lowQualityPenalty;

    totalScore = this.clamp(Number(totalScore.toFixed(2)), 0, 100);

    const confidenceLevel = this.resolveConfidenceLevel({
      qualityScore: ride.analytics.qualityScore,
      qualityFlags,
      sampleCount: ride.analytics.sampleCount,
      movingSeconds: ride.analytics.movingSeconds,
    });

    const confidenceReason = this.resolveConfidenceReason(
      {
        qualityScore: ride.analytics.qualityScore,
        qualityFlags,
        sampleCount: ride.analytics.sampleCount,
        movingSeconds: ride.analytics.movingSeconds,
      },
      confidenceLevel,
    );

    const breakdown: ScoreBreakdown = {
      eventCounts,
      eventPenalties: {
        safetyPenalty: Number(safetyPenalty.toFixed(2)),
        compliancePenalty: Number(compliancePenalty.toFixed(2)),
        smoothnessPenalty: Number(smoothnessPenalty.toFixed(2)),
      },
      analytics: {
        qualityScore: ride.analytics.qualityScore,
        totalDistanceM: ride.analytics.totalDistanceM,
        movingSeconds: ride.analytics.movingSeconds,
        qualityFlags,
      },
      factors: {
        shortRidePenalty,
        lowQualityPenalty: Number(lowQualityPenalty.toFixed(2)),
        confidenceReason,
      },
    };

    const scoreCard = await this.prisma.rideScore.upsert({
      where: { rideId },
      create: {
        rideId,
        totalScore,
        safetyScore: Number(safetyScore.toFixed(2)),
        complianceScore: Number(complianceScore.toFixed(2)),
        smoothnessScore: Number(smoothnessScore.toFixed(2)),
        efficiencyScore: Number(efficiencyScore.toFixed(2)),
        confidenceLevel,
        scoringVersion: 'score-v2-phase-0',
        breakdownJson: breakdown as Prisma.InputJsonValue,
      },
      update: {
        totalScore,
        safetyScore: Number(safetyScore.toFixed(2)),
        complianceScore: Number(complianceScore.toFixed(2)),
        smoothnessScore: Number(smoothnessScore.toFixed(2)),
        efficiencyScore: Number(efficiencyScore.toFixed(2)),
        confidenceLevel,
        scoringVersion: 'score-v2-phase-0',
        breakdownJson: breakdown as Prisma.InputJsonValue,
      },
    });

    await this.prisma.ride.update({
      where: { id: rideId },
      data: {
        score: totalScore,
        scoreVersion: 'score-v2-phase-0',
      },
    });

    return scoreCard;
  }

  private countEvents(types: string[]) {
    const counts: Record<string, number> = {
      harsh_brake: 0,
      harsh_accel: 0,
      speeding: 0,
      sharp_turn: 0,
    };

    for (const type of types) {
      if (!(type in counts)) {
        counts[type] = 0;
      }
      counts[type] += 1;
    }

    return counts;
  }

  private resolveConfidenceLevel(analytics: {
    qualityScore: number | null;
    qualityFlags: string[];
    sampleCount: number;
    movingSeconds: number;
  }): ScoreConfidenceLevel {
    const flags = analytics.qualityFlags;

    if (
      analytics.qualityScore === null ||
      analytics.qualityScore < 0.45 ||
      analytics.sampleCount < 20 ||
      analytics.movingSeconds < 240 ||
      flags.includes('SHORT_RIDE') ||
      flags.includes('LOW_QUALITY')
    ) {
      return ScoreConfidenceLevel.LOW;
    }

    if (
      analytics.qualityScore < 0.75 ||
      flags.includes('LOW_SAMPLE')
    ) {
      return ScoreConfidenceLevel.MEDIUM;
    }

    return ScoreConfidenceLevel.HIGH;
  }

  private resolveConfidenceReason(
    analytics: {
      qualityScore: number | null;
      qualityFlags: string[];
      sampleCount: number;
      movingSeconds: number;
    },
    level: ScoreConfidenceLevel,
  ) {
    const flags = analytics.qualityFlags;

    if (level === ScoreConfidenceLevel.LOW) {
      if (flags.includes('SHORT_RIDE')) {
        return 'ride-too-short';
      }
      if (flags.includes('LOW_QUALITY') || (analytics.qualityScore ?? 0) < 0.45) {
        return 'poor-telemetry-quality';
      }
      return 'insufficient-data';
    }

    if (level === ScoreConfidenceLevel.MEDIUM) {
      if (flags.includes('LOW_SAMPLE')) {
        return 'limited-sample-size';
      }
      return 'moderate-quality';
    }

    return 'high-quality-data';
  }

  private toStringArray(value: Prisma.JsonValue | null | undefined): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === 'string');
  }

  private clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }
}