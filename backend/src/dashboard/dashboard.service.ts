import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type DashboardRideFilters = {
  status?: string;
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

type DashboardOrderFilters = {
  status?: string;
  courierId?: string;
  rideId?: string;
  page?: number;
  limit?: number;
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [totalCouriers, activeRides, completedRides, avgScoreAgg, totalEvents] =
      await Promise.all([
        this.prisma.user.count({
          where: { role: 'COURIER' },
        }),
        this.prisma.ride.count({
          where: { status: 'ACTIVE' },
        }),
        this.prisma.ride.count({
          where: { status: 'COMPLETED' },
        }),
        this.prisma.ride.aggregate({
          _avg: { score: true },
          where: {
            status: 'COMPLETED',
            score: { not: null },
          },
        }),
        this.prisma.rideEvent.count(),
      ]);

    return {
      totalCouriers,
      activeRides,
      completedRides,
      averageScore: avgScoreAgg._avg.score
        ? Number(avgScoreAgg._avg.score.toFixed(2))
        : null,
      totalEvents,
    };
  }

  async getLeaderboard(limit = 20) {
    const rides = await this.prisma.ride.findMany({
      where: {
        status: 'COMPLETED',
        score: { not: null },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        scoreCard: true,
        analytics: true,
      },
      orderBy: [{ score: 'desc' }, { startedAt: 'desc' }],
      take: limit,
    });

    return rides.map((ride, index) => ({
      rank: index + 1,
      rideId: ride.id,
      courier: ride.user,
      score: ride.score,
      confidenceLevel: ride.scoreCard?.confidenceLevel ?? null,
      totalDistanceM: ride.totalDistanceM,
      durationS: ride.durationS,
      startedAt: ride.startedAt,
      qualityScore: ride.analytics?.qualityScore ?? null,
    }));
  }

  async getRides(filters: DashboardRideFilters) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.RideWhereInput = {};

    if (filters.status) {
      where.status = filters.status as any;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.from || filters.to) {
      where.startedAt = {};
      if (filters.from) {
        where.startedAt.gte = new Date(filters.from);
      }
      if (filters.to) {
        where.startedAt.lte = new Date(filters.to);
      }
    }

    const [total, rides] = await Promise.all([
      this.prisma.ride.count({ where }),
      this.prisma.ride.findMany({
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
              orders: true,
            },
          },
        },
        orderBy: {
          startedAt: 'desc',
        },
        skip,
        take: limit,
      }),
    ]);

    return {
      page,
      limit,
      total,
      items: rides.map((ride) => ({
        id: ride.id,
        status: ride.status,
        startedAt: ride.startedAt,
        endedAt: ride.endedAt,
        durationS: ride.durationS,
        totalDistanceM: ride.totalDistanceM,
        score: ride.score,
        courier: ride.user,
        analytics: ride.analytics,
        scoreCard: ride.scoreCard,
        eventCount: ride._count.rideEvents,
        telemetryCount: ride._count.telemetryPoints,
        orderCount: ride._count.orders,
      })),
    };
  }

  async getCouriers() {
    const couriers = await this.prisma.user.findMany({
      where: { role: 'COURIER' },
      include: {
        rides: {
          take: 1,
          orderBy: { startedAt: 'desc' },
          include: {
            analytics: true,
            scoreCard: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = Date.now();

    return couriers.map((courier) => {
      const lastRide = courier.rides[0] ?? null;
      const online =
        courier.lastSeenAt &&
        now - new Date(courier.lastSeenAt).getTime() <= 60 * 1000;

      return {
        id: courier.id,
        name: courier.name,
        phone: courier.phone,
        lastSeenAt: courier.lastSeenAt,
        online: Boolean(online),
        lastRide,
      };
    });
  }

  async getPilotSummary() {
    const riskyRides = await this.prisma.ride.findMany({
      where: {
        status: 'COMPLETED',
        score: { not: null, lt: 70 },
      },
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
      },
      orderBy: {
        score: 'asc',
      },
      take: 10,
    });

    return {
      generatedAt: new Date(),
      riskyRides,
    };
  }

  async getOrdersOverview() {
    const orders = await this.prisma.order.findMany({
      include: {
        courier: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        ride: {
          select: {
            id: true,
            status: true,
            startedAt: true,
            endedAt: true,
            score: true,
          },
        },
      },
    });

    const enriched = orders.map((order) => this.enrichOrder(order));

    const delivered = enriched.filter((order) => order.status === 'DELIVERED');
    const onTimeDeliveryCount = delivered.filter(
      (order) => order.metrics.onTimeDelivery === true,
    ).length;
    const lateDeliveryCount = delivered.filter(
      (order) => order.metrics.deliveryEtaStatus === 'late',
    ).length;

    const pickupDelays = enriched
      .map((order) => order.metrics.pickupDelaySeconds)
      .filter((value): value is number => typeof value === 'number');

    const deliveryDelays = enriched
      .map((order) => order.metrics.deliveryDelaySeconds)
      .filter((value): value is number => typeof value === 'number');

    return {
      totalOrders: enriched.length,
      pendingOrders: enriched.filter((o) => o.status === 'PENDING').length,
      assignedOrders: enriched.filter((o) => o.status === 'ASSIGNED').length,
      pickedUpOrders: enriched.filter((o) => o.status === 'PICKED_UP').length,
      deliveredOrders: enriched.filter((o) => o.status === 'DELIVERED').length,
      cancelledOrders: enriched.filter((o) => o.status === 'CANCELLED').length,
      onTimeDeliveryCount,
      lateDeliveryCount,
      averagePickupDelaySeconds:
        pickupDelays.length > 0
          ? Math.round(
              pickupDelays.reduce((sum, value) => sum + value, 0) /
                pickupDelays.length,
            )
          : null,
      averageDeliveryDelaySeconds:
        deliveryDelays.length > 0
          ? Math.round(
              deliveryDelays.reduce((sum, value) => sum + value, 0) /
                deliveryDelays.length,
            )
          : null,
    };
  }

  async getOrders(filters: DashboardOrderFilters) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (filters.status) {
      where.status = filters.status as any;
    }

    if (filters.courierId) {
      where.assignedCourierId = filters.courierId;
    }

    if (filters.rideId) {
      where.rideId = filters.rideId;
    }

    const [total, items] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: {
          courier: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          ride: {
            select: {
              id: true,
              status: true,
              startedAt: true,
              endedAt: true,
              score: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
    ]);

    return {
      page,
      limit,
      total,
      items: items.map((item) => this.enrichOrder(item)),
    };
  }

  async getOrderById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        courier: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        ride: {
          select: {
            id: true,
            status: true,
            startedAt: true,
            endedAt: true,
            score: true,
          },
        },
      },
    });

    if (!order) {
      return null;
    }

    return this.enrichOrder(order);
  }

  async getCourierScore(courierId: string) {
    const courier = await this.prisma.user.findUnique({
      where: { id: courierId },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
      },
    });

    if (!courier) {
      throw new NotFoundException('Courier not found');
    }

    const [rides, orders] = await Promise.all([
      this.prisma.ride.findMany({
        where: {
          userId: courierId,
          status: 'COMPLETED',
        },
        include: {
          scoreCard: true,
          analytics: true,
          orders: true,
        },
        orderBy: {
          startedAt: 'desc',
        },
        take: 50,
      }),
      this.prisma.order.findMany({
        where: {
          assignedCourierId: courierId,
        },
        include: {
          ride: {
            select: {
              id: true,
              status: true,
              startedAt: true,
              endedAt: true,
              score: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 100,
      }),
    ]);

    const enrichedOrders = orders.map((order) => this.enrichOrder(order));

    const completedRideScores = rides
      .map((ride) => ride.score)
      .filter((value): value is number => typeof value === 'number');

    const deliveredOrders = enrichedOrders.filter(
      (order) => order.status === 'DELIVERED',
    );

    const onTimeDeliveredOrders = deliveredOrders.filter(
      (order) => order.metrics.onTimeDelivery === true,
    );

    const deliveryDelayValues = deliveredOrders
      .map((order) => order.metrics.deliveryDelaySeconds)
      .filter((value): value is number => typeof value === 'number');

    const deliveredPerRideBase =
      rides.length > 0 ? deliveredOrders.length / rides.length : 0;

    const multiOrderRideCount = rides.filter((ride) => ride.orders.length >= 2).length;
    const multiOrderRate = rides.length > 0 ? multiOrderRideCount / rides.length : 0;

    const averageOrdersPerRide =
      rides.length > 0
        ? rides.reduce((sum, ride) => sum + ride.orders.length, 0) / rides.length
        : 0;

    const drivingScore =
      completedRideScores.length > 0
        ? Number(
            (
              completedRideScores.reduce((sum, value) => sum + value, 0) /
              completedRideScores.length
            ).toFixed(2),
          )
        : null;

    let punctualityScore: number | null = null;
    if (deliveredOrders.length > 0) {
      const onTimeRate = onTimeDeliveredOrders.length / deliveredOrders.length;
      const avgDelay =
        deliveryDelayValues.length > 0
          ? deliveryDelayValues.reduce((sum, value) => sum + value, 0) /
            deliveryDelayValues.length
          : 0;

      const delayPenalty = Math.max(0, avgDelay) / 60;
      punctualityScore = this.clamp(
        Number((onTimeRate * 100 - delayPenalty).toFixed(2)),
        0,
        100,
      );
    }

    let deliveryEfficiencyScore: number | null = null;
    if (rides.length > 0 || deliveredOrders.length > 0) {
      const deliveredPerRideScore = this.clamp(deliveredPerRideBase * 35, 0, 100);

      const avgDeliveryDelay =
        deliveryDelayValues.length > 0
          ? deliveryDelayValues.reduce((sum, value) => sum + value, 0) /
            deliveryDelayValues.length
          : 0;

      const delayComponent = this.clamp(
        100 - Math.max(0, avgDeliveryDelay) / 60,
        0,
        100,
      );

      deliveryEfficiencyScore = Number(
        (deliveredPerRideScore * 0.5 + delayComponent * 0.5).toFixed(2),
      );
    }

    const sequenceScores: number[] = [];

    for (const ride of rides) {
      if (ride.orders.length < 2) continue;

      const plan = await this.prisma.order.findMany({
        where: { rideId: ride.id },
      });

      if (plan.length < 2) continue;

      const recommended = [...plan].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

      const actual = [...plan]
        .filter((o) => o.actualDeliveryTime)
        .sort(
          (a, b) =>
            new Date(a.actualDeliveryTime!).getTime() -
            new Date(b.actualDeliveryTime!).getTime(),
        );

      if (actual.length < 2) continue;

      let correct = 0;

      for (let i = 0; i < Math.min(recommended.length, actual.length); i++) {
        if (recommended[i].id === actual[i].id) {
          correct++;
        }
      }

      const accuracy = correct / Math.min(recommended.length, actual.length);
      sequenceScores.push(accuracy * 100);
    }

    let multiOrderScore: number | null = null;
    if (rides.length > 0) {
      const multiOrderRateScore = this.clamp(multiOrderRate * 100, 0, 100);
      const averageOrdersPerRideScore = this.clamp(
        averageOrdersPerRide * 40,
        0,
        100,
      );

      const avgSequenceScore =
        sequenceScores.length > 0
          ? sequenceScores.reduce((sum, v) => sum + v, 0) / sequenceScores.length
          : null;

      multiOrderScore = Number(
        (
          multiOrderRateScore * 0.3 +
          averageOrdersPerRideScore * 0.3 +
          (avgSequenceScore ?? 50) * 0.4
        ).toFixed(2),
      );
    }

    const weights = {
      driving: drivingScore !== null ? 0.4 : 0,
      punctuality: punctualityScore !== null ? 0.25 : 0,
      deliveryEfficiency: deliveryEfficiencyScore !== null ? 0.2 : 0,
      multiOrder: multiOrderScore !== null ? 0.15 : 0,
    };

    const totalWeight =
      weights.driving +
      weights.punctuality +
      weights.deliveryEfficiency +
      weights.multiOrder;

    const overallScore =
      totalWeight > 0
        ? Number(
            (
              ((drivingScore ?? 0) * weights.driving +
                (punctualityScore ?? 0) * weights.punctuality +
                (deliveryEfficiencyScore ?? 0) * weights.deliveryEfficiency +
                (multiOrderScore ?? 0) * weights.multiOrder) /
              totalWeight
            ).toFixed(2),
          )
        : null;

    return {
      courier,
      summary: {
        totalCompletedRides: rides.length,
        totalAssignedOrders: enrichedOrders.length,
        totalDeliveredOrders: deliveredOrders.length,
        onTimeDeliveredOrders: onTimeDeliveredOrders.length,
        onTimeDeliveryRate:
          deliveredOrders.length > 0
            ? Number(
                (
                  (onTimeDeliveredOrders.length / deliveredOrders.length) *
                  100
                ).toFixed(2),
              )
            : null,
        averageRideScore: drivingScore,
        averageDeliveryDelaySeconds:
          deliveryDelayValues.length > 0
            ? Math.round(
                deliveryDelayValues.reduce((sum, value) => sum + value, 0) /
                  deliveryDelayValues.length,
              )
            : null,
        deliveredOrdersPerRide:
          rides.length > 0
            ? Number((deliveredOrders.length / rides.length).toFixed(2))
            : null,
        multiOrderRideCount,
        multiOrderRate:
          rides.length > 0
            ? Number((multiOrderRate * 100).toFixed(2))
            : null,
        averageOrdersPerRide:
          rides.length > 0
            ? Number(averageOrdersPerRide.toFixed(2))
            : null,
        averageSequenceAccuracy:
          sequenceScores.length > 0
            ? Number(
                (
                  sequenceScores.reduce((sum, v) => sum + v, 0) /
                  sequenceScores.length
                ).toFixed(2),
              )
            : null,
      },
      score: {
        drivingScore,
        punctualityScore,
        deliveryEfficiencyScore,
        multiOrderScore,
        overallScore,
        version: 'courier-score-v3-multi-order',
      },
      recent: {
        rides: rides.slice(0, 10),
        orders: enrichedOrders.slice(0, 10),
      },
    };
  }

  private enrichOrder<T extends {
    estimatedPickupTime: Date | null;
    estimatedDeliveryTime: Date | null;
    actualPickupTime: Date | null;
    actualDeliveryTime: Date | null;
    assignedAt: Date | null;
    pickedUpAt: Date | null;
    deliveredAt: Date | null;
    status: string;
  }>(order: T) {
    const pickupDelaySeconds = this.getDelaySeconds(
      order.estimatedPickupTime,
      order.actualPickupTime,
    );

    const deliveryDelaySeconds = this.getDelaySeconds(
      order.estimatedDeliveryTime,
      order.actualDeliveryTime,
    );

    const onTimePickup =
      order.actualPickupTime && order.estimatedPickupTime
        ? pickupDelaySeconds !== null && pickupDelaySeconds <= 0
        : null;

    const onTimeDelivery =
      order.actualDeliveryTime && order.estimatedDeliveryTime
        ? deliveryDelaySeconds !== null && deliveryDelaySeconds <= 0
        : null;

    const pickupEtaStatus = this.getEtaStatus(
      order.estimatedPickupTime,
      order.actualPickupTime,
    );

    const deliveryEtaStatus = this.getEtaStatus(
      order.estimatedDeliveryTime,
      order.actualDeliveryTime,
    );

    return {
      ...order,
      metrics: {
        pickupDelaySeconds,
        deliveryDelaySeconds,
        onTimePickup,
        onTimeDelivery,
        pickupEtaStatus,
        deliveryEtaStatus,
      },
    };
  }

  private getDelaySeconds(
    estimated: Date | null,
    actual: Date | null,
  ): number | null {
    if (!estimated || !actual) {
      return null;
    }

    return Math.round((actual.getTime() - estimated.getTime()) / 1000);
  }

  private getEtaStatus(
    estimated: Date | null,
    actual: Date | null,
  ): 'pending' | 'on_time' | 'late' | 'early' | 'unknown' {
    if (!estimated && !actual) {
      return 'unknown';
    }

    if (estimated && !actual) {
      return 'pending';
    }

    if (!estimated || !actual) {
      return 'unknown';
    }

    const diffSeconds = Math.round(
      (actual.getTime() - estimated.getTime()) / 1000,
    );

    if (diffSeconds > 0) {
      return 'late';
    }

    if (diffSeconds < 0) {
      return 'early';
    }

    return 'on_time';
  }

  private clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }
}