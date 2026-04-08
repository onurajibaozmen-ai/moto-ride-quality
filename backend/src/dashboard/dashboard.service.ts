import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CourierAvailabilityStatus,
  OrderStatus,
  RideStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';

type DispatchLogsParams = {
  status?: string;
  orderId?: string;
  page?: number;
  limit?: number;
};

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

  async getOverview() {
    const [
      totalOrders,
      pendingOrders,
      assignedOrders,
      pickedUpOrders,
      deliveredOrders,
      totalRides,
      activeRides,
      completedRides,
      totalCouriers,
      activeCouriers,
      readyCouriers,
      deliveryCouriers,
      offlineCouriers,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      this.prisma.order.count({ where: { status: OrderStatus.ASSIGNED } }),
      this.prisma.order.count({ where: { status: OrderStatus.PICKED_UP } }),
      this.prisma.order.count({ where: { status: OrderStatus.DELIVERED } }),
      this.prisma.ride.count(),
      this.prisma.ride.count({ where: { status: RideStatus.ACTIVE } }),
      this.prisma.ride.count({
        where: {
          status: {
            in: [RideStatus.COMPLETED, RideStatus.CANCELLED],
          },
        },
      }),
      this.prisma.user.count({
        where: { role: UserRole.COURIER },
      }),
      this.prisma.user.count({
        where: { role: UserRole.COURIER, isActive: true },
      }),
      this.prisma.user.count({
        where: {
          role: UserRole.COURIER,
          isActive: true,
          availabilityStatus: CourierAvailabilityStatus.READY,
        },
      }),
      this.prisma.user.count({
        where: {
          role: UserRole.COURIER,
          isActive: true,
          availabilityStatus: CourierAvailabilityStatus.DELIVERY,
        },
      }),
      this.prisma.user.count({
        where: {
          role: UserRole.COURIER,
          availabilityStatus: CourierAvailabilityStatus.OFFLINE,
        },
      }),
    ]);

    return {
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        assigned: assignedOrders,
        pickedUp: pickedUpOrders,
        delivered: deliveredOrders,
      },
      rides: {
        total: totalRides,
        active: activeRides,
        completed: completedRides,
      },
      couriers: {
        total: totalCouriers,
        active: activeCouriers,
        ready: readyCouriers,
        delivery: deliveryCouriers,
        offline: offlineCouriers,
      },
    };
  }

  async getRides(params?: {
    status?: string;
    courierId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params?.page ?? 1);
    const limit = Math.min(100, Math.max(1, params?.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: {
      status?: RideStatus;
      userId?: string;
    } = {};

    if (params?.status) {
      where.status = params.status as RideStatus;
    }

    if (params?.courierId) {
      where.userId = params.courierId;
    }

    const [total, items] = await Promise.all([
      this.prisma.ride.count({ where }),
      this.prisma.ride.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              isActive: true,
              lastSeenAt: true,
              availabilityStatus: true,
            },
          },
          orders: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              externalRef: true,
              status: true,
              pickupLat: true,
              pickupLng: true,
              dropoffLat: true,
              dropoffLng: true,
              assignedAt: true,
              pickedUpAt: true,
              deliveredAt: true,
              estimatedPickupTime: true,
              estimatedDeliveryTime: true,
              actualPickupTime: true,
              actualDeliveryTime: true,
            },
          },
        },
      }),
    ]);

    return {
      page,
      limit,
      total,
      items: items.map((ride) => ({
        id: ride.id,
        status: ride.status,
        startedAt: ride.startedAt,
        endedAt: ride.endedAt,
        score: ride.score,
        courier: ride.user
          ? {
              id: ride.user.id,
              name: ride.user.name,
              phone: ride.user.phone,
              isActive: ride.user.isActive,
              lastSeenAt: ride.user.lastSeenAt,
              availabilityStatus: ride.user.availabilityStatus,
            }
          : null,
        orderCount: ride.orders.length,
        orders: ride.orders,
      })),
    };
  }

  async getRideDetail(rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            isActive: true,
            lastSeenAt: true,
            availabilityStatus: true,
            availabilityUpdatedAt: true,
          },
        },
        orders: {
          orderBy: { createdAt: 'asc' },
          include: {
            courier: {
              select: {
                id: true,
                name: true,
                phone: true,
                availabilityStatus: true,
              },
            },
          },
        },
      },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    const telemetryPoints = await this.prisma.telemetryPoint.findMany({
      where: {
        rideId: ride.id,
      },
      orderBy: {
        ts: 'desc',
      },
      take: 50,
      select: {
        id: true,
        ts: true,
        lat: true,
        lng: true,
        speedKmh: true,
        heading: true,
        accuracyM: true,
      },
    });

    return {
      id: ride.id,
      status: ride.status,
      startedAt: ride.startedAt,
      endedAt: ride.endedAt,
      score: ride.score,
      courier: ride.user,
      orderCount: ride.orders.length,
      orders: ride.orders,
      telemetry: telemetryPoints,
    };
  }

  async getRidePlan(rideId: string) {
    return this.ordersService.getRidePlan(rideId);
  }

  async getOrders(params?: {
    status?: string;
    courierId?: string;
    rideId?: string;
    page?: number;
    limit?: number;
  }) {
    return this.ordersService.listOrders({
      status: params?.status,
      courierId: params?.courierId,
      rideId: params?.rideId,
      page: params?.page,
      limit: params?.limit,
    });
  }

  async getOrderDetail(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        courier: {
          select: {
            id: true,
            name: true,
            phone: true,
            lastSeenAt: true,
            availabilityStatus: true,
            availabilityUpdatedAt: true,
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
      throw new NotFoundException('Order not found');
    }

    const [dispatchPanel, dispatchLogs] = await Promise.all([
      this.getDispatchPanel(orderId),
      this.ordersService.getOrderDispatchLogs(orderId),
    ]);

    return {
      ...order,
      dispatchPanel,
      dispatchLogs,
    };
  }

  async getCouriers(params?: {
    availabilityStatus?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params?.page ?? 1);
    const limit = Math.min(100, Math.max(1, params?.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: {
      role: UserRole;
      availabilityStatus?: CourierAvailabilityStatus;
    } = {
      role: UserRole.COURIER,
    };

    if (params?.availabilityStatus) {
      where.availabilityStatus =
        params.availabilityStatus as CourierAvailabilityStatus;
    }

    const [total, couriers] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
        include: {
          rides: {
            where: {
              status: RideStatus.ACTIVE,
            },
            take: 1,
            orderBy: {
              startedAt: 'desc',
            },
            include: {
              orders: {
                where: {
                  status: {
                    in: [OrderStatus.ASSIGNED, OrderStatus.PICKED_UP],
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const latestTelemetryList = await Promise.all(
      couriers.map(async (courier) => {
        const point = await this.prisma.telemetryPoint.findFirst({
          where: {
            userId: courier.id,
          },
          orderBy: {
            ts: 'desc',
          },
          select: {
            ts: true,
            lat: true,
            lng: true,
            rideId: true,
          },
        });

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const deliveredOrdersToday = await this.prisma.order.findMany({
          where: {
            assignedCourierId: courier.id,
            status: OrderStatus.DELIVERED,
            deliveredAt: {
              gte: startOfDay,
            },
          },
          select: {
            pickupLat: true,
            pickupLng: true,
            dropoffLat: true,
            dropoffLng: true,
          },
        });

        const totalRouteDistanceMetersToday = deliveredOrdersToday.reduce(
          (sum, order) =>
            sum +
            this.calculateDistanceMeters(
              order.pickupLat,
              order.pickupLng,
              order.dropoffLat,
              order.dropoffLng,
            ),
          0,
        );

        return {
          courierId: courier.id,
          latestTelemetry: point ?? null,
          deliveredCountToday: deliveredOrdersToday.length,
          totalRouteDistanceMetersToday: Number(
            totalRouteDistanceMetersToday.toFixed(2),
          ),
        };
      }),
    );

    const latestTelemetryMap = new Map(
      latestTelemetryList.map((item) => [item.courierId, item]),
    );

    return {
      page,
      limit,
      total,
      items: couriers.map((courier) => {
        const activeRide = courier.rides[0] ?? null;
        const extra = latestTelemetryMap.get(courier.id);

        return {
          id: courier.id,
          name: courier.name,
          phone: courier.phone,
          role: courier.role,
          isActive: courier.isActive,
          lastSeenAt: courier.lastSeenAt,
          availabilityStatus: courier.availabilityStatus,
          availabilityUpdatedAt: courier.availabilityUpdatedAt,
          shiftAutoReadyEnabled: courier.shiftAutoReadyEnabled,
          activeRide: activeRide
            ? {
                id: activeRide.id,
                status: activeRide.status,
                openOrderCount: activeRide.orders.length,
              }
            : null,
          latestTelemetry: extra?.latestTelemetry ?? null,
          dailyStats: {
            deliveredCountToday: extra?.deliveredCountToday ?? 0,
            totalRouteDistanceMetersToday:
              extra?.totalRouteDistanceMetersToday ?? 0,
          },
          dispatch: {
            isAssignable:
              courier.isActive &&
              courier.availabilityStatus === CourierAvailabilityStatus.READY,
            hasOpenOrders: (activeRide?.orders.length ?? 0) > 0,
            openOrderCount: activeRide?.orders.length ?? 0,
          },
        };
      }),
    };
  }

  async getCourierScoring(courierId: string) {
    const courier = await this.prisma.user.findFirst({
      where: {
        id: courierId,
        role: UserRole.COURIER,
      },
      include: {
        rides: {
          orderBy: {
            startedAt: 'desc',
          },
          take: 50,
          include: {
            orders: true,
          },
        },
      },
    });

    if (!courier) {
      throw new NotFoundException('Courier not found');
    }

    const deliveredOrders = await this.prisma.order.findMany({
      where: {
        assignedCourierId: courierId,
        status: OrderStatus.DELIVERED,
      },
      orderBy: {
        deliveredAt: 'desc',
      },
      take: 200,
      select: {
        id: true,
        externalRef: true,
        status: true,
        estimatedDeliveryTime: true,
        actualDeliveryTime: true,
        estimatedPickupTime: true,
        actualPickupTime: true,
        pickupLat: true,
        pickupLng: true,
        dropoffLat: true,
        dropoffLng: true,
        deliveredAt: true,
      },
    });

    const completedRides = courier.rides.filter(
      (ride) => ride.status === RideStatus.COMPLETED,
    );

    const completedRideCount = completedRides.length;
    const totalAssignedOrders = courier.rides.reduce(
      (sum, ride) => sum + ride.orders.length,
      0,
    );
    const totalDeliveredOrders = deliveredOrders.length;

    const onTimeDeliveredOrders = deliveredOrders.filter((order) => {
      if (!order.estimatedDeliveryTime || !order.actualDeliveryTime) return false;
      return (
        order.actualDeliveryTime.getTime() <= order.estimatedDeliveryTime.getTime()
      );
    }).length;

    const onTimeDeliveryRate =
      totalDeliveredOrders > 0
        ? (onTimeDeliveredOrders / totalDeliveredOrders) * 100
        : null;

    const rideScores = completedRides
      .map((ride) => ride.score)
      .filter((score): score is number => typeof score === 'number');

    const averageRideScore =
      rideScores.length > 0
        ? rideScores.reduce((sum, score) => sum + score, 0) / rideScores.length
        : null;

    const deliveryDelayValues = deliveredOrders
      .map((order) => {
        if (!order.estimatedDeliveryTime || !order.actualDeliveryTime) return null;
        return Math.round(
          (order.actualDeliveryTime.getTime() -
            order.estimatedDeliveryTime.getTime()) /
            1000,
        );
      })
      .filter((value): value is number => value !== null);

    const averageDeliveryDelaySeconds =
      deliveryDelayValues.length > 0
        ? deliveryDelayValues.reduce((sum, value) => sum + value, 0) /
          deliveryDelayValues.length
        : null;

    const deliveredOrdersPerRide =
      completedRideCount > 0 ? totalDeliveredOrders / completedRideCount : null;

    const multiOrderRideCount = completedRides.filter(
      (ride) => ride.orders.length > 1,
    ).length;

    const multiOrderRate =
      completedRideCount > 0
        ? (multiOrderRideCount / completedRideCount) * 100
        : null;

    const averageOrdersPerRide =
      courier.rides.length > 0 ? totalAssignedOrders / courier.rides.length : null;

    const drivingScore =
      averageRideScore !== null
        ? Math.max(0, Math.min(100, averageRideScore))
        : null;

    const punctualityScore =
      onTimeDeliveryRate !== null
        ? Math.max(0, Math.min(100, onTimeDeliveryRate))
        : null;

    let deliveryEfficiencyScore: number | null = null;
    if (averageDeliveryDelaySeconds !== null) {
      const maxPenaltyWindowSeconds = 30 * 60;
      const normalized =
        100 -
        (Math.max(0, averageDeliveryDelaySeconds) / maxPenaltyWindowSeconds) *
          100;
      deliveryEfficiencyScore = Math.max(0, Math.min(100, normalized));
    }

    let multiOrderScore: number | null = null;
    if (multiOrderRate !== null) {
      multiOrderScore = Math.max(0, Math.min(100, multiOrderRate));
    }

    const scoreParts = [
      drivingScore,
      punctualityScore,
      deliveryEfficiencyScore,
      multiOrderScore,
    ].filter((v): v is number => typeof v === 'number');

    const overallScore =
      scoreParts.length > 0
        ? scoreParts.reduce((sum, v) => sum + v, 0) / scoreParts.length
        : null;

    const recentRides = courier.rides.map((ride) => ({
      id: ride.id,
      startedAt: ride.startedAt,
      endedAt: ride.endedAt,
      status: ride.status,
      score: ride.score,
      totalDistanceM: null,
      durationS:
        ride.startedAt && ride.endedAt
          ? Math.round(
              (ride.endedAt.getTime() - ride.startedAt.getTime()) / 1000,
            )
          : null,
    }));

    const recentOrders = deliveredOrders.map((order) => {
      let deliveryDelaySeconds: number | null = null;

      if (order.estimatedDeliveryTime && order.actualDeliveryTime) {
        deliveryDelaySeconds = Math.round(
          (order.actualDeliveryTime.getTime() -
            order.estimatedDeliveryTime.getTime()) /
            1000,
        );
      }

      let deliveryEtaStatus = 'unknown';
      if (deliveryDelaySeconds === null) deliveryEtaStatus = 'unknown';
      else if (deliveryDelaySeconds > 0) deliveryEtaStatus = 'late';
      else if (deliveryDelaySeconds < 0) deliveryEtaStatus = 'early';
      else deliveryEtaStatus = 'on_time';

      return {
        id: order.id,
        externalRef: order.externalRef,
        status: order.status,
        estimatedDeliveryTime: order.estimatedDeliveryTime,
        actualDeliveryTime: order.actualDeliveryTime,
        metrics: {
          deliveryDelaySeconds,
          deliveryEtaStatus,
          onTimeDelivery:
            deliveryDelaySeconds === null ? null : deliveryDelaySeconds <= 0,
        },
      };
    });

    return {
      courier: {
        id: courier.id,
        name: courier.name,
        phone: courier.phone,
        role: courier.role,
        isActive: courier.isActive,
        lastSeenAt: courier.lastSeenAt,
        availabilityStatus: courier.availabilityStatus,
        availabilityUpdatedAt: courier.availabilityUpdatedAt,
      },
      summary: {
        totalCompletedRides: completedRideCount,
        totalAssignedOrders,
        totalDeliveredOrders,
        onTimeDeliveredOrders,
        onTimeDeliveryRate,
        averageRideScore,
        averageDeliveryDelaySeconds,
        deliveredOrdersPerRide,
        multiOrderRideCount,
        multiOrderRate,
        averageOrdersPerRide,
      },
      score: {
        drivingScore,
        punctualityScore,
        deliveryEfficiencyScore,
        multiOrderScore,
        overallScore,
        version: 'm16_scoring_v1',
      },
      recent: {
        rides: recentRides,
        orders: recentOrders,
      },

      analytics: {
        totalRides: courier.rides.length,
        activeRideCount: courier.rides.filter((r) => r.status === RideStatus.ACTIVE)
          .length,
        totalDeliveredOrders,
        deliveredCountToday: deliveredOrders.filter((order) => {
          if (!order.deliveredAt) return false;
          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);
          return order.deliveredAt >= startOfDay;
        }).length,
        totalRouteDistanceMetersToday: Number(
          deliveredOrders
            .filter((order) => {
              if (!order.deliveredAt) return false;
              const startOfDay = new Date();
              startOfDay.setHours(0, 0, 0, 0);
              return order.deliveredAt >= startOfDay;
            })
            .reduce(
              (sum, order) =>
                sum +
                this.calculateDistanceMeters(
                  order.pickupLat,
                  order.pickupLng,
                  order.dropoffLat,
                  order.dropoffLng,
                ),
              0,
            )
            .toFixed(2),
        ),
        onTimePickupCount: deliveredOrders.filter((order) => {
          if (!order.estimatedPickupTime || !order.actualPickupTime) return false;
          return (
            order.actualPickupTime.getTime() <= order.estimatedPickupTime.getTime()
          );
        }).length,
        onTimeDeliveryCount: onTimeDeliveredOrders,
      },
      recentRides: courier.rides.map((ride) => ({
        id: ride.id,
        status: ride.status,
        startedAt: ride.startedAt,
        endedAt: ride.endedAt,
        score: ride.score,
        orderCount: ride.orders.length,
      })),
      recentDeliveredOrders: deliveredOrders.map((order) => ({
        ...order,
        routeDistanceMeters: Number(
          this.calculateDistanceMeters(
            order.pickupLat,
            order.pickupLng,
            order.dropoffLat,
            order.dropoffLng,
          ).toFixed(2),
        ),
      })),
    };
  }

  async getDispatchPanel(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        courier: {
          select: {
            id: true,
            name: true,
            phone: true,
            availabilityStatus: true,
          },
        },
        ride: {
          select: {
            id: true,
            status: true,
            startedAt: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const [recommendation, batchSuggestions] = await Promise.all([
      this.ordersService.recommendCourier(orderId),
      this.ordersService.suggestBatchCandidates(orderId),
    ]);

    return {
      order: {
        id: order.id,
        externalRef: order.externalRef,
        status: order.status,
        assignedCourierId: order.assignedCourierId,
        rideId: order.rideId,
        pickupLat: order.pickupLat,
        pickupLng: order.pickupLng,
        dropoffLat: order.dropoffLat,
        dropoffLng: order.dropoffLng,
      },
      currentAssignment: order.courier
        ? {
            courier: order.courier,
            ride: order.ride,
          }
        : null,
      recommendation,
      batchSuggestions,
    };
  }

  async getDispatchQueue() {
    return this.ordersService.getDispatchQueue();
  }

  async getDispatchTriggerCheck() {
    return this.ordersService.getDispatchTriggerCheck();
  }

  async getDispatchLogs(params: DispatchLogsParams) {
    return this.ordersService.getDispatchLogs(params);
  }

  private calculateDistanceMeters(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ) {
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
}