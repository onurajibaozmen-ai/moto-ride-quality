import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma, RideStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type ListOrdersParams = {
  status?: string;
  courierId?: string;
  rideId?: string;
  page?: number;
  limit?: number;
};

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(data: {
    externalRef?: string;
    pickupLat: number;
    pickupLng: number;
    dropoffLat: number;
    dropoffLng: number;
    estimatedPickupTime?: string;
    estimatedDeliveryTime?: string;
    notes?: string;
  }) {
    return this.prisma.order.create({
      data: {
        externalRef: data.externalRef ?? null,
        pickupLat: data.pickupLat,
        pickupLng: data.pickupLng,
        dropoffLat: data.dropoffLat,
        dropoffLng: data.dropoffLng,
        estimatedPickupTime: data.estimatedPickupTime
          ? new Date(data.estimatedPickupTime)
          : null,
        estimatedDeliveryTime: data.estimatedDeliveryTime
          ? new Date(data.estimatedDeliveryTime)
          : null,
        notes: data.notes ?? null,
        status: OrderStatus.PENDING,
      },
      include: {
        courier: true,
        ride: true,
      },
    });
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

  async assignOrder(
    orderId: string,
    payload: {
      courierId: string;
      rideId?: string;
    },
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
      },
    });

    if (!courier) {
      throw new NotFoundException('Courier not found');
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

    return this.prisma.order.update({
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

    return this.prisma.order.update({
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
  }

  async markDelivered(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PICKED_UP) {
      throw new BadRequestException('Order must be PICKED_UP before delivery');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.DELIVERED,
        deliveredAt: new Date(),
        actualDeliveryTime: new Date(),
      },
      include: {
        courier: true,
        ride: true,
      },
    });
  }

  async getRidePlan(rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        user: true,
        orders: {
          orderBy: {
            createdAt: 'asc',
          },
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

  async recommendCourier(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const couriers = await this.prisma.user.findMany({
      where: {
        role: UserRole.COURIER,
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

    const now = Date.now();

    const candidates = couriers.map((courier) => {
      const activeRide = courier.rides[0] ?? null;
      const online =
        !!courier.lastSeenAt &&
        now - new Date(courier.lastSeenAt).getTime() <= 5 * 60 * 1000;

      // Geçici placeholder courier position
      const courierLat = 41.0082;
      const courierLng = 28.9784;

      const pickupDistanceM = this.calculateDistanceMeters(
        courierLat,
        courierLng,
        order.pickupLat,
        order.pickupLng,
      );

      const distanceScore = Math.max(0, 100 - pickupDistanceM / 100);
      const onlineScore = online ? 30 : 0;
      const activeRidePenalty = activeRide ? 20 : 0;
      const activeRideOrderPenalty = activeRide
        ? activeRide.orders.length * 5
        : 0;

      const totalScore = Number(
        (
          distanceScore +
          onlineScore -
          activeRidePenalty -
          activeRideOrderPenalty
        ).toFixed(2),
      );

      return {
        courier: {
          id: courier.id,
          name: courier.name,
          phone: courier.phone,
          lastSeenAt: courier.lastSeenAt,
        },
        online,
        activeRide: activeRide
          ? {
              id: activeRide.id,
              status: activeRide.status,
              orderCount: activeRide.orders.length,
            }
          : null,
        metrics: {
          pickupDistanceM: Number(pickupDistanceM.toFixed(2)),
          distanceScore: Number(distanceScore.toFixed(2)),
          onlineScore,
          activeRidePenalty,
          activeRideOrderPenalty,
        },
        recommendationScore: totalScore,
      };
    });

    candidates.sort((a, b) => b.recommendationScore - a.recommendationScore);

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

    return this.prisma.order.update({
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