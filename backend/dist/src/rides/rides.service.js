"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RidesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let RidesService = class RidesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async startRide(userId) {
        const activeRide = await this.prisma.ride.findFirst({
            where: {
                userId,
                status: client_1.RideStatus.ACTIVE,
            },
        });
        if (activeRide) {
            throw new common_1.BadRequestException('User already has an active ride');
        }
        const ride = await this.prisma.ride.create({
            data: {
                userId,
                status: client_1.RideStatus.ACTIVE,
                startedAt: new Date(),
            },
        });
        return ride;
    }
    async getActiveRide(userId) {
        return this.prisma.ride.findFirst({
            where: {
                userId,
                status: client_1.RideStatus.ACTIVE,
            },
        });
    }
    async getRideById(id, userId) {
        const ride = await this.prisma.ride.findFirst({
            where: {
                id,
                userId,
            },
        });
        if (!ride) {
            throw new common_1.NotFoundException('Ride not found');
        }
        return ride;
    }
    async endRide(id, userId) {
        const ride = await this.prisma.ride.findFirst({
            where: {
                id,
                userId,
            },
        });
        if (!ride) {
            throw new common_1.NotFoundException('Ride not found');
        }
        if (ride.status !== client_1.RideStatus.ACTIVE) {
            throw new common_1.BadRequestException('Ride is not active');
        }
        const points = await this.prisma.telemetryPoint.findMany({
            where: { rideId: id },
            orderBy: { ts: 'asc' },
        });
        let totalDistance = 0;
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            if (prev.lat && prev.lng && curr.lat && curr.lng) {
                totalDistance += this.calculateDistanceMeters(prev.lat, prev.lng, curr.lat, curr.lng);
            }
        }
        let durationS = 0;
        if (points.length >= 2) {
            const start = points[0].ts.getTime();
            const end = points[points.length - 1].ts.getTime();
            durationS = Math.floor((end - start) / 1000);
        }
        const updatedRide = await this.prisma.ride.update({
            where: { id },
            data: {
                endedAt: new Date(),
                status: client_1.RideStatus.COMPLETED,
                totalDistanceM: Math.round(totalDistance),
                durationS,
            },
        });
        return updatedRide;
    }
    calculateDistanceMeters(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const toRad = (v) => (v * Math.PI) / 180;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) *
                Math.cos(toRad(lat2)) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
};
exports.RidesService = RidesService;
exports.RidesService = RidesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RidesService);
//# sourceMappingURL=rides.service.js.map