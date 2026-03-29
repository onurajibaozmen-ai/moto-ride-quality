import { PrismaService } from '../prisma/prisma.service';
export declare class RidesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    startRide(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        startedAt: Date;
        endedAt: Date | null;
        status: import("@prisma/client").$Enums.RideStatus;
        totalDistanceM: number | null;
        durationS: number | null;
        score: number | null;
        scoreVersion: string | null;
    }>;
    getActiveRide(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        startedAt: Date;
        endedAt: Date | null;
        status: import("@prisma/client").$Enums.RideStatus;
        totalDistanceM: number | null;
        durationS: number | null;
        score: number | null;
        scoreVersion: string | null;
    } | null>;
    getRideById(id: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        startedAt: Date;
        endedAt: Date | null;
        status: import("@prisma/client").$Enums.RideStatus;
        totalDistanceM: number | null;
        durationS: number | null;
        score: number | null;
        scoreVersion: string | null;
    }>;
    endRide(id: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        startedAt: Date;
        endedAt: Date | null;
        status: import("@prisma/client").$Enums.RideStatus;
        totalDistanceM: number | null;
        durationS: number | null;
        score: number | null;
        scoreVersion: string | null;
    }>;
    private calculateDistanceMeters;
}
