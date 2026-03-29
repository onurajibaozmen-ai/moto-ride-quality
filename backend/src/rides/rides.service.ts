import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RideStatus } from '@prisma/client';

@Injectable()
export class RidesService {
  constructor(private readonly prisma: PrismaService) {}

  // 🚀 START RIDE
  async startRide(userId: string) {
    const activeRide = await this.prisma.ride.findFirst({
      where: {
        userId,
        status: RideStatus.ACTIVE,
      },
    });

    if (activeRide) {
      throw new BadRequestException('User already has an active ride');
    }

    const ride = await this.prisma.ride.create({
      data: {
        userId,
        status: RideStatus.ACTIVE,
        startedAt: new Date(),
      },
    });

    return ride;
  }

  // 🚀 GET ACTIVE RIDE
  async getActiveRide(userId: string) {
    return this.prisma.ride.findFirst({
      where: {
        userId,
        status: RideStatus.ACTIVE,
      },
    });
  }

  // 🚀 GET RIDE BY ID
  async getRideById(id: string, userId: string) {
    const ride = await this.prisma.ride.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    return ride;
  }

  // 🚀 END RIDE (10I — gerçek hesaplama burada)
  async endRide(id: string, userId: string) {
    const ride = await this.prisma.ride.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    if (ride.status !== RideStatus.ACTIVE) {
      throw new BadRequestException('Ride is not active');
    }

    // 🔥 TELEMETRY POINTS ÇEK
    const points = await this.prisma.telemetryPoint.findMany({
      where: { rideId: id },
      orderBy: { ts: 'asc' },
    });

    // 🔥 MESAFE HESAPLA
    let totalDistance = 0;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];

      if (prev.lat && prev.lng && curr.lat && curr.lng) {
        totalDistance += this.calculateDistanceMeters(
          prev.lat,
          prev.lng,
          curr.lat,
          curr.lng,
        );
      }
    }

    // 🔥 SÜRE HESAPLA
    let durationS = 0;

    if (points.length >= 2) {
      const start = points[0].ts.getTime();
      const end = points[points.length - 1].ts.getTime();
      durationS = Math.floor((end - start) / 1000);
    }

    // 🔥 RIDE UPDATE
    const updatedRide = await this.prisma.ride.update({
      where: { id },
      data: {
        endedAt: new Date(),
        status: RideStatus.COMPLETED,
        totalDistanceM: Math.round(totalDistance),
        durationS,
      },
    });

    return updatedRide;
  }

  // 🔥 HAVERSINE FORMÜLÜ
  private calculateDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) {
    const R = 6371000; // metre
    const toRad = (v: number) => (v * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}