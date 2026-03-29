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
exports.TelemetryService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let TelemetryService = class TelemetryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async ingestBatch(userId, body) {
        const ride = await this.prisma.ride.findFirst({
            where: {
                id: body.rideId,
                userId,
            },
        });
        if (!ride) {
            throw new common_1.NotFoundException('Ride not found');
        }
        if (ride.status !== client_1.RideStatus.ACTIVE) {
            throw new common_1.BadRequestException('Ride is not active');
        }
        const result = await this.prisma.telemetryPoint.createMany({
            data: body.points.map((point) => ({
                rideId: body.rideId,
                userId,
                ts: new Date(point.ts),
                lat: point.lat,
                lng: point.lng,
                speedKmh: point.speedKmh ?? null,
                accuracyM: point.accuracyM ?? null,
                heading: point.heading ?? null,
                accelX: point.accelX ?? null,
                accelY: point.accelY ?? null,
                accelZ: point.accelZ ?? null,
                batteryLevel: point.batteryLevel ?? null,
                networkType: point.networkType ?? null,
            })),
        });
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                lastSeenAt: new Date(),
            },
        });
        const detectedEvents = this.detectEvents(body);
        if (detectedEvents.length > 0) {
            await this.prisma.rideEvent.createMany({
                data: detectedEvents.map((event) => ({
                    rideId: body.rideId,
                    userId,
                    type: event.type,
                    ts: event.ts,
                    lat: event.lat,
                    lng: event.lng,
                    severity: event.severity,
                    ...(event.metaJson !== undefined ? { metaJson: event.metaJson } : {}),
                })),
            });
        }
        const score = await this.recalculateRideScore(body.rideId);
        return {
            ok: true,
            insertedCount: result.count,
            detectedEventsCount: detectedEvents.length,
            score,
            rideId: body.rideId,
        };
    }
    detectEvents(body) {
        const events = [];
        const points = body.points
            .map((point) => ({
            ts: new Date(point.ts),
            lat: point.lat,
            lng: point.lng,
            speedKmh: point.speedKmh ?? null,
            accuracyM: point.accuracyM ?? null,
            heading: point.heading ?? null,
            accelX: point.accelX ?? null,
            accelY: point.accelY ?? null,
            accelZ: point.accelZ ?? null,
            batteryLevel: point.batteryLevel ?? null,
            networkType: point.networkType ?? null,
        }))
            .sort((a, b) => a.ts.getTime() - b.ts.getTime());
        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            const prev = i > 0 ? points[i - 1] : null;
            if (!this.isUsableForEvent(point)) {
                continue;
            }
            const speed = point.speedKmh ?? 0;
            const accelY = point.accelY ?? 0;
            let jerkY = null;
            let dtSec = null;
            if (prev &&
                this.isUsableForEvent(prev) &&
                prev.accelY !== null &&
                point.accelY !== null) {
                dtSec = (point.ts.getTime() - prev.ts.getTime()) / 1000;
                if (dtSec > 0.2 && dtSec < 10) {
                    jerkY = (point.accelY - prev.accelY) / dtSec;
                }
            }
            const canEvaluateDynamicEvents = speed >= 15;
            if (canEvaluateDynamicEvents) {
                const harshBrakeByAccel = accelY <= -2.5;
                const harshBrakeByJerk = jerkY !== null && jerkY <= -4.0;
                if (harshBrakeByAccel || harshBrakeByJerk) {
                    const severity = this.computeBrakeSeverity({
                        speed,
                        accelY,
                        jerkY,
                    });
                    events.push({
                        type: 'harsh_brake',
                        ts: point.ts,
                        lat: point.lat ?? null,
                        lng: point.lng ?? null,
                        severity,
                        metaJson: {
                            speedKmh: speed,
                            accelY,
                            jerkY,
                            dtSec,
                            rule: harshBrakeByAccel ? 'accel' : 'jerk',
                        },
                    });
                }
                const harshAccelByAccel = accelY >= 2.5;
                const harshAccelByJerk = jerkY !== null && jerkY >= 4.0;
                if (harshAccelByAccel || harshAccelByJerk) {
                    const severity = this.computeAccelSeverity({
                        speed,
                        accelY,
                        jerkY,
                    });
                    events.push({
                        type: 'harsh_accel',
                        ts: point.ts,
                        lat: point.lat ?? null,
                        lng: point.lng ?? null,
                        severity,
                        metaJson: {
                            speedKmh: speed,
                            accelY,
                            jerkY,
                            dtSec,
                            rule: harshAccelByAccel ? 'accel' : 'jerk',
                        },
                    });
                }
            }
            if (speed >= 70) {
                const speedingSeverity = Number((speed - 70).toFixed(2));
                events.push({
                    type: 'speeding',
                    ts: point.ts,
                    lat: point.lat ?? null,
                    lng: point.lng ?? null,
                    severity: speedingSeverity,
                    metaJson: {
                        speedKmh: speed,
                        threshold: 70,
                    },
                });
            }
        }
        return this.deduplicateNearbyEvents(events);
    }
    isUsableForEvent(point) {
        if (point.accuracyM !== null && point.accuracyM > 30) {
            return false;
        }
        return true;
    }
    computeBrakeSeverity(params) {
        const accelComponent = Math.max(0, Math.abs(params.accelY) - 2.5);
        const jerkComponent = params.jerkY !== null ? Math.max(0, Math.abs(params.jerkY) - 4.0) : 0;
        const speedComponent = Math.max(0, params.speed - 15) / 20;
        return Number((1 + accelComponent + jerkComponent * 0.5 + speedComponent).toFixed(2));
    }
    computeAccelSeverity(params) {
        const accelComponent = Math.max(0, params.accelY - 2.5);
        const jerkComponent = params.jerkY !== null ? Math.max(0, params.jerkY - 4.0) : 0;
        const speedComponent = Math.max(0, params.speed - 15) / 25;
        return Number((1 + accelComponent + jerkComponent * 0.5 + speedComponent).toFixed(2));
    }
    deduplicateNearbyEvents(events) {
        const deduped = [];
        for (const event of events) {
            const previous = deduped[deduped.length - 1];
            if (previous &&
                previous.type === event.type &&
                Math.abs(event.ts.getTime() - previous.ts.getTime()) <= 3000) {
                if ((event.severity ?? 0) > (previous.severity ?? 0)) {
                    deduped[deduped.length - 1] = event;
                }
                continue;
            }
            deduped.push(event);
        }
        return deduped;
    }
    async recalculateRideScore(rideId) {
        const events = await this.prisma.rideEvent.findMany({
            where: { rideId },
        });
        let score = 100;
        for (const event of events) {
            const severity = event.severity ?? 1;
            if (event.type === 'harsh_brake') {
                score -= 4 + Math.min(severity, 6) * 1.2;
            }
            else if (event.type === 'harsh_accel') {
                score -= 3 + Math.min(severity, 6) * 1.0;
            }
            else if (event.type === 'speeding') {
                score -= 2 + Math.min(severity / 5, 6) * 0.8;
            }
        }
        score = Number(Math.max(0, score).toFixed(2));
        const updatedRide = await this.prisma.ride.update({
            where: { id: rideId },
            data: {
                score,
                scoreVersion: 'v2',
            },
        });
        return updatedRide.score;
    }
};
exports.TelemetryService = TelemetryService;
exports.TelemetryService = TelemetryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TelemetryService);
//# sourceMappingURL=telemetry.service.js.map