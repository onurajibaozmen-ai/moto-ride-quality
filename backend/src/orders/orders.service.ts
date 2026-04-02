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
    return this.prisma.order.create({
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
      items,
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

    return order;
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

    return this.prisma.order.update({
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
  }

  async markPickedUp(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.prisma.order.update({
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
  }

  async markDelivered(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.prisma.order.update({
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
  }

  async cancelOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.prisma.order.update({
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
  }
}