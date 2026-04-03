import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AssignOrderDto } from './dto/assign-order.dto';

type ListOrdersFilters = {
  status?: string;
  courierId?: string;
  rideId?: string;
  page?: number;
  limit?: number;
};

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(dto: CreateOrderDto) {
    const order = await this.prisma.order.create({
      data: {
        externalRef: dto.externalRef,
        pickupLat: dto.pickupLat,
        pickupLng: dto.pickupLng,
        dropoffLat: dto.dropoffLat,
        dropoffLng: dto.dropoffLng,
        estimatedPickupTime: dto.estimatedPickupTime
          ? new Date(dto.estimatedPickupTime)
          : undefined,
        estimatedDeliveryTime: dto.estimatedDeliveryTime
          ? new Date(dto.estimatedDeliveryTime)
          : undefined,
        notes: dto.notes,
        status: OrderStatus.PENDING,
      },
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

    return this.enrichOrder(order);
  }

  async listOrders(filters: ListOrdersFilters) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (filters.status) {
      where.status = filters.status as OrderStatus;
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
      throw new NotFoundException('Order not found');
    }

    return this.enrichOrder(order);
  }

  async assignOrder(orderId: string, dto: AssignOrderDto) {
    const courier = await this.prisma.user.findUnique({
      where: { id: dto.courierId },
    });

    if (!courier) {
      throw new NotFoundException('Courier not found');
    }

    if (dto.rideId) {
      const ride = await this.prisma.ride.findUnique({
        where: { id: dto.rideId },
      });

      if (!ride) {
        throw new NotFoundException('Ride not found');
      }
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        assignedCourierId: dto.courierId,
        rideId: dto.rideId,
        assignedAt: new Date(),
        status: OrderStatus.ASSIGNED,
      },
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

    return this.enrichOrder(updated);
  }

  async markPickedUp(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PICKED_UP,
        pickedUpAt: new Date(),
        actualPickupTime: new Date(),
      },
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

    return this.enrichOrder(updated);
  }

  async markDelivered(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.DELIVERED,
        deliveredAt: new Date(),
        actualDeliveryTime: new Date(),
      },
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

    return this.enrichOrder(updated);
  }

  async cancelOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
      },
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

    return this.enrichOrder(updated);
  }

  async getRideOrdersPlan(rideId: string) {
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

    const orders = ride.orders.map((o) => this.enrichOrder(o));
    const stops = this.buildStopsForOrders(orders);
    const recommendedSequence = this.buildRecommendedSequence(stops);

    const actualStops = stops
      .map((stop) => {
        const order = orders.find((o) => o.id === stop.orderId);

        let actualTs: Date | null = null;

        if (stop.type === 'pickup') {
          actualTs = order?.actualPickupTime ?? null;
        } else {
          actualTs = order?.actualDeliveryTime ?? null;
        }

        return {
          ...stop,
          actualTs,
        };
      })
      .filter((s) => s.actualTs !== null)
      .sort(
        (a, b) =>
          new Date(a.actualTs as Date).getTime() -
          new Date(b.actualTs as Date).getTime(),
      )
      .map((s, index) => ({
        sequence: index + 1,
        ...s,
      }));

    return {
      ride: {
        id: ride.id,
        status: ride.status,
        startedAt: ride.startedAt,
        endedAt: ride.endedAt,
        score: ride.score,
      },
      courier: ride.user,
      totalOrders: orders.length,
      orders,
      stops,
      recommendedSequence,
      actualSequence: actualStops,
    };
  }

  private buildStopsForOrders(
    orders: Array<ReturnType<OrdersService['enrichOrder']>>,
  ) {
    const stops = orders.flatMap((order) => [
      {
        stopId: `${order.id}-pickup`,
        orderId: order.id,
        orderRef: order.externalRef ?? order.id,
        type: 'pickup' as const,
        lat: order.pickupLat,
        lng: order.pickupLng,
        status: order.status,
      },
      {
        stopId: `${order.id}-dropoff`,
        orderId: order.id,
        orderRef: order.externalRef ?? order.id,
        type: 'dropoff' as const,
        lat: order.dropoffLat,
        lng: order.dropoffLng,
        status: order.status,
      },
    ]);

    return stops;
  }

  private buildRecommendedSequence(
    stops: Array<{
      stopId: string;
      orderId: string;
      orderRef: string;
      type: 'pickup' | 'dropoff';
      lat: number;
      lng: number;
      status: string;
    }>,
  ) {
    if (stops.length === 0) {
      return [];
    }

    const remaining = [...stops];
    const ordered: typeof remaining = [];

    let current = remaining.shift()!;
    ordered.push(current);

    while (remaining.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        const distance = this.haversineMeters(
          current.lat,
          current.lng,
          candidate.lat,
          candidate.lng,
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }

      current = remaining.splice(nearestIndex, 1)[0];
      ordered.push(current);
    }

    return ordered.map((stop, index) => ({
      sequence: index + 1,
      ...stop,
    }));
  }

  private haversineMeters(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ) {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371000;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) ** 2;

    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private enrichOrder<T extends {
    id: string;
    externalRef: string | null;
    pickupLat: number;
    pickupLng: number;
    dropoffLat: number;
    dropoffLng: number;
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
}