import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CourierAvailabilityStatus,
  DispatchDecisionStatus,
  OrderStatus,
  Prisma,
  RideStatus,
  UserRole,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { GeocodingService } from '../geocoding/geocoding.service';

type ListOrdersParams = {
  status?: string;
  courierId?: string;
  rideId?: string;
  page?: number;
  limit?: number;
};

type DispatchLogsParams = {
  status?: string;
  orderId?: string;
  page?: number;
  limit?: number;
};

type CourierLastLocation = {
  userId: string;
  ts: Date;
  lat: number;
  lng: number;
  rideId: string | null;
};

type CourierDailyStats = {
  courierId: string;
  deliveredCountToday: number;
  totalRouteDistanceMetersToday: number;
};

const BATCH_RULES = {
  MAX_ACTIVE_ORDERS: 3,
  MAX_STOPS: 6,
  MAX_DETOUR_METERS: 3000,
  MAX_PICKUP_DISTANCE_METERS: 5000,
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly geocodingService: GeocodingService,
  ) {}

  async createOrder(payload: {
    externalRef?: string;

    pickupLat?: number;
    pickupLng?: number;
    dropoffLat?: number;
    dropoffLng?: number;

    pickupAddress?: string;
    dropoffAddress?: string;

    estimatedPickupTime?: string;
    estimatedDeliveryTime?: string;
    notes?: string;
  }) {
    const hasPickupCoordinates =
      typeof payload.pickupLat === 'number' &&
      typeof payload.pickupLng === 'number';

    const hasDropoffCoordinates =
      typeof payload.dropoffLat === 'number' &&
      typeof payload.dropoffLng === 'number';

    const hasPickupAddress = !!payload.pickupAddress?.trim();
    const hasDropoffAddress = !!payload.dropoffAddress?.trim();

    if ((!hasPickupCoordinates && !hasPickupAddress) ||
        (!hasDropoffCoordinates && !hasDropoffAddress)) {
      throw new BadRequestException(
        'Either coordinates or addresses must be provided for pickup and dropoff',
      );
    }

    let pickupLat = payload.pickupLat;
    let pickupLng = payload.pickupLng;
    let dropoffLat = payload.dropoffLat;
    let dropoffLng = payload.dropoffLng;

    let pickupFormattedAddress: string | null = null;
    let dropoffFormattedAddress: string | null = null;
    let pickupPlaceId: string | null = null;
    let dropoffPlaceId: string | null = null;

    if (!hasPickupCoordinates && hasPickupAddress) {
      const pickupGeocode = await this.geocodingService.geocodeAddress(
        payload.pickupAddress!.trim(),
      );

      pickupLat = pickupGeocode.lat;
      pickupLng = pickupGeocode.lng;
      pickupFormattedAddress = pickupGeocode.formattedAddress;
      pickupPlaceId = pickupGeocode.placeId;
    }

    if (!hasDropoffCoordinates && hasDropoffAddress) {
      const dropoffGeocode = await this.geocodingService.geocodeAddress(
        payload.dropoffAddress!.trim(),
      );

      dropoffLat = dropoffGeocode.lat;
      dropoffLng = dropoffGeocode.lng;
      dropoffFormattedAddress = dropoffGeocode.formattedAddress;
      dropoffPlaceId = dropoffGeocode.placeId;
    }

    if (
      typeof pickupLat !== 'number' ||
      typeof pickupLng !== 'number' ||
      typeof dropoffLat !== 'number' ||
      typeof dropoffLng !== 'number'
    ) {
      throw new BadRequestException(
        'Valid pickup and dropoff coordinates could not be resolved',
      );
    }

    const created = await this.prisma.order.create({
      data: {
        externalRef: payload.externalRef ?? null,

        pickupLat,
        pickupLng,
        dropoffLat,
        dropoffLng,

        pickupAddress: payload.pickupAddress?.trim() ?? null,
        dropoffAddress: payload.dropoffAddress?.trim() ?? null,
        pickupFormattedAddress,
        dropoffFormattedAddress,
        pickupPlaceId,
        dropoffPlaceId,

        status: OrderStatus.PENDING,
        notes: payload.notes ?? null,
        estimatedPickupTime: payload.estimatedPickupTime
          ? new Date(payload.estimatedPickupTime)
          : null,
        estimatedDeliveryTime: payload.estimatedDeliveryTime
          ? new Date(payload.estimatedDeliveryTime)
          : null,
      },
    });

    let autoRecommendationPreview: any = null;

    try {
      autoRecommendationPreview = await this.recommendCourier(created.id);
    } catch (error) {
      autoRecommendationPreview = null;
    }

    return {
      ...created,
      autoRecommendationPreview,
    };
  }

  async listOrders(params: ListOrdersParams) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (params.status) {
      where.status = params.status as OrderStatus;
    }

    if (params.courierId) {
      where.assignedCourierId = params.courierId;
    }

    if (params.rideId) {
      where.rideId = params.rideId;
    }

    const [total, items] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: {
          courier: true,
          ride: true,
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
      items,
    };
  }

  async getOrderById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        courier: true,
        ride: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async getOrderDispatchLogs(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.prisma.dispatchDecisionLog.findMany({
      where: {
        orderId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        recommendedCourier: {
          select: {
            id: true,
            name: true,
            phone: true,
            availabilityStatus: true,
          },
        },
      },
    });
  }

  async getDispatchLogs(params: DispatchLogsParams) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.DispatchDecisionLogWhereInput = {};

    if (params.status) {
      where.status = params.status as DispatchDecisionStatus;
    }

    if (params.orderId) {
      where.orderId = params.orderId;
    }

    const [total, items] = await Promise.all([
      this.prisma.dispatchDecisionLog.count({ where }),
      this.prisma.dispatchDecisionLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          order: {
            select: {
              id: true,
              externalRef: true,
              status: true,
            },
          },
          recommendedCourier: {
            select: {
              id: true,
              name: true,
              phone: true,
              availabilityStatus: true,
            },
          },
        },
      }),
    ]);

    return {
      page,
      limit,
      total,
      items,
    };
  }

  async getDispatchQueue() {
    const now = Date.now();

    const pendingOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 100,
      include: {
        courier: true,
        ride: true,
      },
    });

    const readyCourierCount = await this.prisma.user.count({
      where: {
        role: UserRole.COURIER,
        isActive: true,
        availabilityStatus: CourierAvailabilityStatus.READY,
      },
    });

    return {
      readyCourierCount,
      pendingOrderCount: pendingOrders.length,
      queue: pendingOrders.map((order) => {
        const waitingMinutes = Math.floor(
          (now - new Date(order.createdAt).getTime()) / (60 * 1000),
        );

        return {
          id: order.id,
          externalRef: order.externalRef,
          status: order.status,
          createdAt: order.createdAt,
          waitingMinutes,
          triggerEligible: waitingMinutes >= 15,
          pickupLat: order.pickupLat,
          pickupLng: order.pickupLng,
          dropoffLat: order.dropoffLat,
          dropoffLng: order.dropoffLng,
        };
      }),
    };
  }

  async getDispatchTriggerCheck() {
    const oldestPendingOrder = await this.prisma.order.findFirst({
      where: {
        status: OrderStatus.PENDING,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const readyCourierCount = await this.prisma.user.count({
      where: {
        role: UserRole.COURIER,
        isActive: true,
        availabilityStatus: CourierAvailabilityStatus.READY,
      },
    });

    if (!oldestPendingOrder) {
      return {
        hasPendingOrders: false,
        readyCourierCount,
        oldestPendingOrder: null,
        oldestWaitingMinutes: 0,
        triggerSatisfied: false,
        reasons: ['no_pending_orders'],
      };
    }

    const oldestWaitingMinutes = Math.floor(
      (Date.now() - new Date(oldestPendingOrder.createdAt).getTime()) /
        (60 * 1000),
    );

    const reasons: string[] = [];

    if (oldestWaitingMinutes < 15) {
      reasons.push('oldest_pending_order_younger_than_15_minutes');
    }

    if (readyCourierCount === 0) {
      reasons.push('no_ready_courier');
    }

    return {
      hasPendingOrders: true,
      readyCourierCount,
      oldestPendingOrder: {
        id: oldestPendingOrder.id,
        externalRef: oldestPendingOrder.externalRef,
        createdAt: oldestPendingOrder.createdAt,
      },
      oldestWaitingMinutes,
      triggerSatisfied: oldestWaitingMinutes >= 15 && readyCourierCount > 0,
      reasons,
    };
  }

  async bulkAutoAssign(limit = 10) {
    const pendingOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: Math.max(1, Math.min(100, limit)),
    });

    const results: Array<{
      orderId: string;
      status: 'assigned' | 'skipped' | 'failed';
      assignedCourierId?: string | null;
      reason?: string;
    }> = [];

    for (const order of pendingOrders) {
      const waitingMinutes = Math.floor(
        (Date.now() - new Date(order.createdAt).getTime()) / (60 * 1000),
      );

      if (waitingMinutes < 15) {
        await this.createDispatchLog({
          orderId: order.id,
          recommendation: null,
          triggerSnapshot: {
            skipped: true,
            reason: 'bulk_auto_assign_skipped_order_younger_than_15_minutes',
            waitingMinutes,
          },
          status: DispatchDecisionStatus.SKIPPED,
          reason: 'bulk_auto_assign_skipped_order_younger_than_15_minutes',
        });

        results.push({
          orderId: order.id,
          status: 'skipped',
          reason: 'order_younger_than_15_minutes',
        });
        continue;
      }

      try {
        const assigned = await this.autoAssignOrder(order.id);

        results.push({
          orderId: order.id,
          status: 'assigned',
          assignedCourierId: assigned.assignedCourierId,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'unknown_error';

        await this.createDispatchLog({
          orderId: order.id,
          recommendation: null,
          triggerSnapshot: {
            bulk: true,
            error: message,
          },
          status: DispatchDecisionStatus.SKIPPED,
          reason: `bulk_auto_assign_failed:${message}`,
        });

        results.push({
          orderId: order.id,
          status: 'failed',
          reason: message,
        });
      }
    }

    return {
      requestedLimit: limit,
      processed: results.length,
      results,
    };
  }

  async assignOrder(
    orderId: string,
    payload: { courierId: string; rideId?: string },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const courier = await this.prisma.user.findFirst({
      where: {
        id: payload.courierId,
        role: UserRole.COURIER,
        isActive: true,
      },
    });

    if (!courier) {
      throw new NotFoundException('Courier not found');
    }

    const assignableStatuses: CourierAvailabilityStatus[] = [
      CourierAvailabilityStatus.READY,
      CourierAvailabilityStatus.DELIVERY,
    ];

    if (!assignableStatuses.includes(courier.availabilityStatus)) {
      throw new BadRequestException(
        'Courier must be READY or DELIVERY to receive assignment',
      );
    }

    let rideId: string | null = null;

    if (payload.rideId) {
      const ride = await this.prisma.ride.findUnique({
        where: { id: payload.rideId },
      });

      if (!ride) {
        throw new NotFoundException('Ride not found');
      }

      rideId = ride.id;
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          assignedCourierId: payload.courierId,
          rideId,
          assignedAt: new Date(),
          status: OrderStatus.ASSIGNED,
        },
        include: {
          courier: true,
          ride: true,
        },
      });

      await this.usersService.autoSetCourierDelivery(tx, payload.courierId);

      return updatedOrder;
    });
  }

  async markPickedUp(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.ASSIGNED) {
      throw new BadRequestException('Order must be ASSIGNED before pickup');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.PICKED_UP,
          pickedUpAt: new Date(),
          actualPickupTime: new Date(),
        },
        include: {
          courier: true,
          ride: true,
        },
      });

      if (updatedOrder.assignedCourierId) {
        await this.usersService.autoSetCourierDelivery(
          tx,
          updatedOrder.assignedCourierId,
        );
      }

      return updatedOrder;
    });
  }

  async markDelivered(orderId: string, payload?: { note?: string }) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PICKED_UP) {
      throw new BadRequestException('Order must be PICKED_UP before delivery');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.DELIVERED,
          deliveredAt: new Date(),
          actualDeliveryTime: new Date(),
          deliveryNote: payload?.note ?? null,
        },
        include: {
          courier: true,
          ride: true,
        },
      });

      if (updatedOrder.assignedCourierId) {
        await this.usersService.autoSetCourierReadyIfIdle(
          tx,
          updatedOrder.assignedCourierId,
        );
      }

      return updatedOrder;
    });
  }

  async getNextStopForCourier(courierId: string) {
    const courier = await this.prisma.user.findFirst({
      where: {
        id: courierId,
        role: UserRole.COURIER,
      },
    });

    if (!courier) {
      throw new NotFoundException('Courier not found');
    }

    const activeRide = await this.prisma.ride.findFirst({
      where: {
        userId: courierId,
        status: RideStatus.ACTIVE,
      },
      include: {
        orders: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (activeRide) {
      const nextRideOrder = activeRide.orders.find(
        (order) =>
          order.status === OrderStatus.ASSIGNED ||
          order.status === OrderStatus.PICKED_UP,
      );

      if (nextRideOrder) {
        const type =
          nextRideOrder.status === OrderStatus.ASSIGNED ? 'pickup' : 'dropoff';

        return {
          courierId,
          rideId: activeRide.id,
          orderId: nextRideOrder.id,
          externalRef: nextRideOrder.externalRef ?? null,
          type,
          lat:
            type === 'pickup'
              ? nextRideOrder.pickupLat
              : nextRideOrder.dropoffLat,
          lng:
            type === 'pickup'
              ? nextRideOrder.pickupLng
              : nextRideOrder.dropoffLng,
          availabilityStatus: courier.availabilityStatus,
          source: 'active_ride',
        };
      }
    }

    const assignedOrder = await this.prisma.order.findFirst({
      where: {
        assignedCourierId: courierId,
        status: {
          in: [OrderStatus.ASSIGNED, OrderStatus.PICKED_UP],
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!assignedOrder) {
      return null;
    }

    const type =
      assignedOrder.status === OrderStatus.ASSIGNED ? 'pickup' : 'dropoff';

    return {
      courierId,
      rideId: assignedOrder.rideId ?? null,
      orderId: assignedOrder.id,
      externalRef: assignedOrder.externalRef ?? null,
      type,
      lat: type === 'pickup' ? assignedOrder.pickupLat : assignedOrder.dropoffLat,
      lng: type === 'pickup' ? assignedOrder.pickupLng : assignedOrder.dropoffLng,
      availabilityStatus: courier.availabilityStatus,
      source: 'assigned_order_fallback',
    };
  }

  async getRidePlan(rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        user: true,
        orders: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    const recommendedSequence = ride.orders.flatMap((order, index) => [
      {
        stopId: `${order.id}_pickup`,
        orderId: order.id,
        orderRef: order.externalRef ?? order.id,
        type: 'pickup',
        lat: order.pickupLat,
        lng: order.pickupLng,
        status: order.status,
        sequence: index * 2 + 1,
      },
      {
        stopId: `${order.id}_dropoff`,
        orderId: order.id,
        orderRef: order.externalRef ?? order.id,
        type: 'dropoff',
        lat: order.dropoffLat,
        lng: order.dropoffLng,
        status: order.status,
        sequence: index * 2 + 2,
      },
    ]);

    const actualSequence = [
      ...ride.orders
        .filter((o) => o.actualPickupTime)
        .sort(
          (a, b) =>
            new Date(a.actualPickupTime!).getTime() -
            new Date(b.actualPickupTime!).getTime(),
        )
        .map((order, index) => ({
          stopId: `${order.id}_pickup`,
          orderId: order.id,
          orderRef: order.externalRef ?? order.id,
          type: 'pickup',
          lat: order.pickupLat,
          lng: order.pickupLng,
          status: order.status,
          sequence: index + 1,
          actualTs: order.actualPickupTime,
        })),
      ...ride.orders
        .filter((o) => o.actualDeliveryTime)
        .sort(
          (a, b) =>
            new Date(a.actualDeliveryTime!).getTime() -
            new Date(b.actualDeliveryTime!).getTime(),
        )
        .map((order, index) => ({
          stopId: `${order.id}_dropoff`,
          orderId: order.id,
          orderRef: order.externalRef ?? order.id,
          type: 'dropoff',
          lat: order.dropoffLat,
          lng: order.dropoffLng,
          status: order.status,
          sequence: index + 1,
          actualTs: order.actualDeliveryTime,
        })),
    ];

    return {
      ride: {
        id: ride.id,
        status: ride.status,
        startedAt: ride.startedAt,
        endedAt: ride.endedAt,
        score: ride.score,
      },
      courier: ride.user
        ? {
            id: ride.user.id,
            name: ride.user.name,
            phone: ride.user.phone,
            availabilityStatus: ride.user.availabilityStatus,
          }
        : null,
      totalOrders: ride.orders.length,
      orders: ride.orders.map((order) => ({
        id: order.id,
        externalRef: order.externalRef,
        status: order.status,
        actualPickupTime: order.actualPickupTime,
        actualDeliveryTime: order.actualDeliveryTime,
        estimatedPickupTime: order.estimatedPickupTime,
        estimatedDeliveryTime: order.estimatedDeliveryTime,
        metrics: {
          pickupDelaySeconds: this.getDelaySeconds(
            order.estimatedPickupTime,
            order.actualPickupTime,
          ),
          deliveryDelaySeconds: this.getDelaySeconds(
            order.estimatedDeliveryTime,
            order.actualDeliveryTime,
          ),
          pickupEtaStatus: this.getEtaStatus(
            order.estimatedPickupTime,
            order.actualPickupTime,
          ),
          deliveryEtaStatus: this.getEtaStatus(
            order.estimatedDeliveryTime,
            order.actualDeliveryTime,
          ),
        },
      })),
      stops: recommendedSequence,
      recommendedSequence,
      actualSequence,
    };
  }

  async recommendCourier(orderId: string, excludedCourierIds: string[] = []) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const couriers = await this.prisma.user.findMany({
      where: {
        role: UserRole.COURIER,
        isActive: true,
        availabilityStatus: CourierAvailabilityStatus.READY,
        id: {
          notIn: excludedCourierIds,
        },
      },
      include: {
        rides: {
          where: {
            status: RideStatus.ACTIVE,
          },
          orderBy: {
            startedAt: 'desc',
          },
          take: 1,
          include: {
            orders: true,
          },
        },
      },
    });

    const latestLocations = await this.getLatestLocationsForCouriers(
      couriers.map((courier) => courier.id),
    );

    const dailyStatsMap = await this.getCourierDailyStats(
      couriers.map((courier) => courier.id),
    );

    const now = Date.now();

    const candidates = couriers
      .map((courier) => {
        const activeRide = courier.rides[0] ?? null;
        const online =
          !!courier.lastSeenAt &&
          now - new Date(courier.lastSeenAt).getTime() <= 5 * 60 * 1000;

        const lastLocation = latestLocations.get(courier.id) ?? null;
        const dailyStats = dailyStatsMap.get(courier.id) ?? {
          courierId: courier.id,
          deliveredCountToday: 0,
          totalRouteDistanceMetersToday: 0,
        };

        const locationAgeSeconds = lastLocation
          ? Math.round((now - new Date(lastLocation.ts).getTime()) / 1000)
          : null;

        const hasFreshLocation =
          locationAgeSeconds !== null && locationAgeSeconds <= 10 * 60;

        const pickupDistanceM = lastLocation
          ? this.calculateDistanceMeters(
              lastLocation.lat,
              lastLocation.lng,
              order.pickupLat,
              order.pickupLng,
            )
          : null;

        const estimatedPickupEtaMinutes =
          pickupDistanceM !== null
            ? this.estimateEtaMinutesFromDistance(pickupDistanceM)
            : null;

        const distanceScore =
          pickupDistanceM !== null
            ? Math.max(0, 100 - pickupDistanceM / 100)
            : 0;

        const onlineScore = online ? 25 : 0;

        const freshnessScore =
          locationAgeSeconds === null
            ? 0
            : Math.max(0, 25 - locationAgeSeconds / 60);

        const deliveredCountPriorityScore = Math.max(
          0,
          200 - dailyStats.deliveredCountToday * 40,
        );

        const routeDistancePriorityScore = Math.max(
          0,
          150 - dailyStats.totalRouteDistanceMetersToday / 250,
        );

        const activeRidePenalty = activeRide ? 10 : 0;
        const activeRideOrderPenalty = activeRide
          ? activeRide.orders.length * 4
          : 0;

        const activeOrderCount = activeRide ? activeRide.orders.length : 0;
        const activeStopCount = activeOrderCount * 2;
        const detourMeters =
          pickupDistanceM !== null ? pickupDistanceM * 1.2 : 99999;

        const batchValidation = this.validateBatchConstraints({
          activeRideOrderCount: activeOrderCount,
          activeStopCount,
          pickupDistanceM,
          detourMeters,
        });

        if (!batchValidation.valid) {
          return null;
        }

        const staleLocationPenalty =
          locationAgeSeconds !== null && locationAgeSeconds > 10 * 60 ? 20 : 0;

        const missingLocationPenalty = lastLocation ? 0 : 40;

        const totalScore = Number(
          (
            deliveredCountPriorityScore +
            routeDistancePriorityScore +
            distanceScore +
            onlineScore +
            freshnessScore -
            activeRidePenalty -
            activeRideOrderPenalty -
            staleLocationPenalty -
            missingLocationPenalty
          ).toFixed(2),
        );

        return {
          courier: {
            id: courier.id,
            name: courier.name,
            phone: courier.phone,
            lastSeenAt: courier.lastSeenAt,
            availabilityStatus: courier.availabilityStatus,
          },
          online,
          activeRide: activeRide
            ? {
                id: activeRide.id,
                status: activeRide.status,
                orderCount: activeRide.orders.length,
              }
            : null,
          location: lastLocation
            ? {
                lat: lastLocation.lat,
                lng: lastLocation.lng,
                ts: lastLocation.ts,
                rideId: lastLocation.rideId,
                ageSeconds: locationAgeSeconds,
                source: 'telemetry_last_known_location',
                fresh: hasFreshLocation,
              }
            : {
                lat: null,
                lng: null,
                ts: null,
                rideId: null,
                ageSeconds: null,
                source: 'unavailable',
                fresh: false,
              },
          dailyStats: {
            deliveredCountToday: dailyStats.deliveredCountToday,
            totalRouteDistanceMetersToday: Number(
              dailyStats.totalRouteDistanceMetersToday.toFixed(2),
            ),
          },
          constraints: {
            activeOrderCount,
            activeStopCount,
            detourMeters: Number(detourMeters.toFixed(2)),
            valid: batchValidation.valid,
            reasons: batchValidation.reasons,
          },
          metrics: {
            pickupDistanceM:
              pickupDistanceM !== null
                ? Number(pickupDistanceM.toFixed(2))
                : null,
            estimatedPickupEtaMinutes,
            deliveredCountPriorityScore: Number(
              deliveredCountPriorityScore.toFixed(2),
            ),
            routeDistancePriorityScore: Number(
              routeDistancePriorityScore.toFixed(2),
            ),
            distanceScore: Number(distanceScore.toFixed(2)),
            onlineScore,
            freshnessScore:
              locationAgeSeconds !== null
                ? Number(freshnessScore.toFixed(2))
                : 0,
            activeRidePenalty,
            activeRideOrderPenalty,
            staleLocationPenalty,
            missingLocationPenalty,
            availabilityStatus: courier.availabilityStatus,
            recommendationReason: {
              basedOn: 'm14_customer_rule_engine',
              deliveredCountToday: dailyStats.deliveredCountToday,
              totalRouteDistanceMetersToday: Number(
                dailyStats.totalRouteDistanceMetersToday.toFixed(2),
              ),
              hasFreshLocation,
              online,
              hasActiveRide: !!activeRide,
            },
          },
          recommendationScore: totalScore,
        };
      })
      .filter(
        (
          candidate,
        ): candidate is NonNullable<typeof candidate> => candidate !== null,
      )
      .sort((a, b) => {
        if (
          a.dailyStats.deliveredCountToday !== b.dailyStats.deliveredCountToday
        ) {
          return (
            a.dailyStats.deliveredCountToday - b.dailyStats.deliveredCountToday
          );
        }

        if (
          a.dailyStats.totalRouteDistanceMetersToday !==
          b.dailyStats.totalRouteDistanceMetersToday
        ) {
          return (
            a.dailyStats.totalRouteDistanceMetersToday -
            b.dailyStats.totalRouteDistanceMetersToday
          );
        }

        if (
          (a.metrics.pickupDistanceM ?? Number.MAX_SAFE_INTEGER) !==
          (b.metrics.pickupDistanceM ?? Number.MAX_SAFE_INTEGER)
        ) {
          return (
            (a.metrics.pickupDistanceM ?? Number.MAX_SAFE_INTEGER) -
            (b.metrics.pickupDistanceM ?? Number.MAX_SAFE_INTEGER)
          );
        }

        if (b.recommendationScore !== a.recommendationScore) {
          return b.recommendationScore - a.recommendationScore;
        }

        return a.courier.id.localeCompare(b.courier.id);
      });

    return {
      order: {
        id: order.id,
        externalRef: order.externalRef,
        status: order.status,
        pickupLat: order.pickupLat,
        pickupLng: order.pickupLng,
        dropoffLat: order.dropoffLat,
        dropoffLng: order.dropoffLng,
      },
      ruleEngine: {
        name: 'm14_customer_rule_engine',
        priorityOrder: [
          'least_delivered_today',
          'lowest_route_distance_today',
          'closest_pickup_distance',
          'highest_dispatch_score',
          'deterministic_tie_break',
        ],
      },
      excludedCourierIds,
      recommendedCourier: candidates[0] ?? null,
      candidates,
    };
  }

  async autoAssignOrder(orderId: string) {
    const recommendation = await this.recommendCourier(orderId);

    if (!recommendation.recommendedCourier) {
      throw new NotFoundException('No suitable courier found');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const courierId = recommendation.recommendedCourier.courier.id;
    const activeRideId = recommendation.recommendedCourier.activeRide?.id;

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const assigned = await tx.order.update({
        where: { id: orderId },
        data: {
          assignedCourierId: courierId,
          rideId: activeRideId ?? null,
          assignedAt: new Date(),
          status: OrderStatus.ASSIGNED,
        },
        include: {
          courier: true,
          ride: true,
        },
      });

      await this.usersService.autoSetCourierDelivery(tx, courierId);

      return assigned;
    });

    await this.createDispatchLog({
      orderId,
      recommendation,
      triggerSnapshot: {
        action: 'auto_assign_order',
      },
      status: DispatchDecisionStatus.AUTO_ASSIGNED,
      reason: 'auto_assign_executed',
    });

    return updatedOrder;
  }

  async approveAutoAssign(orderId: string) {
    const trigger = await this.getDispatchTriggerCheck();

    if (!trigger.triggerSatisfied) {
      await this.createDispatchLog({
        orderId,
        recommendation: null,
        triggerSnapshot: trigger,
        status: DispatchDecisionStatus.SKIPPED,
        reason: 'dispatch_trigger_not_satisfied',
      });

      return {
        approved: false,
        reason: 'dispatch_trigger_not_satisfied',
        trigger,
      };
    }

    const recommendation = await this.recommendCourier(orderId);

    const assigned = await this.autoAssignOrder(orderId);

    await this.createDispatchLog({
      orderId,
      recommendation,
      triggerSnapshot: trigger,
      status: DispatchDecisionStatus.APPROVED,
      reason: 'ops_approved_auto_assign',
    });

    return {
      approved: true,
      action: 'auto_assign_executed',
      order: assigned,
      trigger,
    };
  }

  async rejectRecommendation(
    orderId: string,
    payload?: {
      rejectedCourierId?: string;
      reason?: string;
    },
  ) {
    const rejectedCourierId = payload?.rejectedCourierId ?? null;
    const reason = payload?.reason ?? 'ops_rejected_current_recommendation';

    let nextRecommendation: Awaited<
      ReturnType<OrdersService['recommendCourier']>
    > | null = null;

    if (rejectedCourierId) {
      nextRecommendation = await this.recommendCourier(orderId, [
        rejectedCourierId,
      ]);
    } else {
      nextRecommendation = await this.recommendCourier(orderId);
    }

    await this.createDispatchLog({
      orderId,
      recommendation: nextRecommendation,
      triggerSnapshot: {
        rejectedCourierId,
      },
      status: DispatchDecisionStatus.REJECTED,
      reason,
    });

    return {
      rejected: true,
      reason,
      rejectedCourierId,
      nextRecommendation,
    };
  }

  async getNextCandidates(orderId: string, excludeCourierId?: string) {
    const excluded = excludeCourierId ? [excludeCourierId] : [];
    return this.recommendCourier(orderId, excluded);
  }

  async suggestBatchCandidates(orderId: string) {
    const baseOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        courier: true,
        ride: true,
      },
    });

    if (!baseOrder) {
      throw new NotFoundException('Order not found');
    }

    const nearbyPendingOrders = await this.prisma.order.findMany({
      where: {
        id: { not: orderId },
        status: OrderStatus.PENDING,
      },
      include: {
        courier: true,
        ride: true,
      },
      take: 50,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const suggestions = nearbyPendingOrders
      .map((candidate) => {
        const pickupDistanceM = this.calculateDistanceMeters(
          baseOrder.pickupLat,
          baseOrder.pickupLng,
          candidate.pickupLat,
          candidate.pickupLng,
        );

        const dropoffDistanceM = this.calculateDistanceMeters(
          baseOrder.dropoffLat,
          baseOrder.dropoffLng,
          candidate.dropoffLat,
          candidate.dropoffLng,
        );

        const averageDistanceM = (pickupDistanceM + dropoffDistanceM) / 2;
        const batchScore = Math.max(0, 100 - averageDistanceM / 100);

        return {
          order: {
            id: candidate.id,
            externalRef: candidate.externalRef,
            status: candidate.status,
            pickupLat: candidate.pickupLat,
            pickupLng: candidate.pickupLng,
            dropoffLat: candidate.dropoffLat,
            dropoffLng: candidate.dropoffLng,
          },
          metrics: {
            pickupDistanceM: Number(pickupDistanceM.toFixed(2)),
            dropoffDistanceM: Number(dropoffDistanceM.toFixed(2)),
            averageDistanceM: Number(averageDistanceM.toFixed(2)),
          },
          batchScore: Number(batchScore.toFixed(2)),
        };
      })
      .filter((item) => item.batchScore > 0)
      .sort((a, b) => b.batchScore - a.batchScore)
      .slice(0, 10);

    return {
      baseOrder: {
        id: baseOrder.id,
        externalRef: baseOrder.externalRef,
        status: baseOrder.status,
        pickupLat: baseOrder.pickupLat,
        pickupLng: baseOrder.pickupLng,
        dropoffLat: baseOrder.dropoffLat,
        dropoffLng: baseOrder.dropoffLng,
      },
      suggestions,
    };
  }

  private async createDispatchLog(params: {
    orderId: string;
    recommendation: Awaited<ReturnType<OrdersService['recommendCourier']>> | null;
    triggerSnapshot?: unknown;
    status: DispatchDecisionStatus;
    reason?: string;
  }) {
    return this.prisma.dispatchDecisionLog.create({
      data: {
        orderId: params.orderId,
        recommendedCourierId:
          params.recommendation?.recommendedCourier?.courier.id ?? null,
        status: params.status,
        recommendationPayload:
          (params.recommendation as Prisma.InputJsonValue | null) ?? Prisma.JsonNull,
        triggerSnapshot:
          (params.triggerSnapshot as Prisma.InputJsonValue | undefined) ??
          Prisma.JsonNull,
        reason: params.reason ?? null,
      },
    });
  }

  private validateBatchConstraints(params: {
    activeRideOrderCount: number;
    activeStopCount: number;
    pickupDistanceM: number | null;
    detourMeters: number;
  }) {
    const reasons: string[] = [];

    if (params.activeRideOrderCount >= BATCH_RULES.MAX_ACTIVE_ORDERS) {
      reasons.push('max_active_orders_exceeded');
    }

    if (params.activeStopCount >= BATCH_RULES.MAX_STOPS) {
      reasons.push('max_stop_count_exceeded');
    }

    if (
      params.pickupDistanceM !== null &&
      params.pickupDistanceM > BATCH_RULES.MAX_PICKUP_DISTANCE_METERS
    ) {
      reasons.push('pickup_too_far');
    }

    if (params.detourMeters > BATCH_RULES.MAX_DETOUR_METERS) {
      reasons.push('detour_too_high');
    }

    return {
      valid: reasons.length === 0,
      reasons,
    };
  }

  private async getLatestLocationsForCouriers(
    courierIds: string[],
  ): Promise<Map<string, CourierLastLocation>> {
    const results = await Promise.all(
      courierIds.map(async (courierId) => {
        const point = await this.prisma.telemetryPoint.findFirst({
          where: {
            userId: courierId,
          },
          orderBy: {
            ts: 'desc',
          },
          select: {
            userId: true,
            rideId: true,
            ts: true,
            lat: true,
            lng: true,
          },
        });

        return point
          ? {
              userId: point.userId,
              rideId: point.rideId,
              ts: point.ts,
              lat: point.lat,
              lng: point.lng,
            }
          : null;
      }),
    );

    const map = new Map<string, CourierLastLocation>();

    for (const item of results) {
      if (!item) continue;
      map.set(item.userId, item);
    }

    return map;
  }

  private async getCourierDailyStats(
    courierIds: string[],
  ): Promise<Map<string, CourierDailyStats>> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const deliveredOrders = await this.prisma.order.findMany({
      where: {
        assignedCourierId: {
          in: courierIds,
        },
        status: OrderStatus.DELIVERED,
        deliveredAt: {
          gte: startOfDay,
        },
      },
      select: {
        id: true,
        assignedCourierId: true,
        pickupLat: true,
        pickupLng: true,
        dropoffLat: true,
        dropoffLng: true,
      },
    });

    const map = new Map<string, CourierDailyStats>();

    for (const courierId of courierIds) {
      map.set(courierId, {
        courierId,
        deliveredCountToday: 0,
        totalRouteDistanceMetersToday: 0,
      });
    }

    for (const order of deliveredOrders) {
      if (!order.assignedCourierId) continue;

      const current = map.get(order.assignedCourierId) ?? {
        courierId: order.assignedCourierId,
        deliveredCountToday: 0,
        totalRouteDistanceMetersToday: 0,
      };

      const tripDistance = this.calculateDistanceMeters(
        order.pickupLat,
        order.pickupLng,
        order.dropoffLat,
        order.dropoffLng,
      );

      current.deliveredCountToday += 1;
      current.totalRouteDistanceMetersToday += tripDistance;

      map.set(order.assignedCourierId, current);
    }

    return map;
  }

  private estimateEtaMinutesFromDistance(distanceM: number): number {
    const avgCourierSpeedKmh = 25;
    const minutes = (distanceM / 1000 / avgCourierSpeedKmh) * 60;
    return Math.max(1, Math.round(minutes));
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

  private getDelaySeconds(
    estimated: Date | null,
    actual: Date | null,
  ): number | null {
    if (!estimated || !actual) return null;
    return Math.round((actual.getTime() - estimated.getTime()) / 1000);
  }

  private getEtaStatus(
    estimated: Date | null,
    actual: Date | null,
  ): 'pending' | 'on_time' | 'late' | 'early' | 'unknown' {
    if (!estimated && !actual) return 'unknown';
    if (estimated && !actual) return 'pending';
    if (!estimated || !actual) return 'unknown';

    const diffSeconds = Math.round(
      (actual.getTime() - estimated.getTime()) / 1000,
    );

    if (diffSeconds > 0) return 'late';
    if (diffSeconds < 0) return 'early';
    return 'on_time';
  }
}