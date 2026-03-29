import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    getOverview(): Promise<{
        totalCouriers: number;
        activeRides: number;
        completedRides: number;
        totalEvents: number;
        averageScore: number | null;
        recentRides: ({
            user: {
                id: string;
                name: string;
                phone: string;
                lastSeenAt: Date | null;
            };
        } & {
            status: import("@prisma/client").$Enums.RideStatus;
            id: string;
            userId: string;
            startedAt: Date;
            endedAt: Date | null;
            totalDistanceM: number | null;
            durationS: number | null;
            score: number | null;
            scoreVersion: string | null;
            createdAt: Date;
            updatedAt: Date;
        })[];
    }>;
    getRides(status?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED', userId?: string): Promise<({
        user: {
            role: import("@prisma/client").$Enums.UserRole;
            id: string;
            name: string;
            phone: string;
            lastSeenAt: Date | null;
        };
    } & {
        status: import("@prisma/client").$Enums.RideStatus;
        id: string;
        userId: string;
        startedAt: Date;
        endedAt: Date | null;
        totalDistanceM: number | null;
        durationS: number | null;
        score: number | null;
        scoreVersion: string | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    getRideEvents(rideId: string): Promise<{
        ride: {
            user: {
                id: string;
                name: string;
                phone: string;
                lastSeenAt: Date | null;
            };
        } & {
            status: import("@prisma/client").$Enums.RideStatus;
            id: string;
            userId: string;
            startedAt: Date;
            endedAt: Date | null;
            totalDistanceM: number | null;
            durationS: number | null;
            score: number | null;
            scoreVersion: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
        events: {
            id: string;
            userId: string;
            createdAt: Date;
            rideId: string;
            type: string;
            ts: Date;
            lat: number | null;
            lng: number | null;
            severity: number | null;
            metaJson: import("@prisma/client/runtime/library").JsonValue | null;
        }[];
    }>;
    getCouriers(): Promise<{
        id: string;
        name: string;
        phone: string;
        isActive: boolean;
        isOnline: boolean;
        lastSeenAt: Date | null;
        createdAt: Date;
        lastRide: {
            status: import("@prisma/client").$Enums.RideStatus;
            id: string;
            startedAt: Date;
            endedAt: Date | null;
            score: number | null;
            createdAt: Date;
        };
    }[]>;
    getPilotSummary(): Promise<{
        totalCouriers: number;
        onlineCourierCount: number;
        activeRides: number;
        completedRides: number;
        totalEvents: number;
        averageScore: number | null;
        eventBreakdown: {
            harshBrake: number;
            harshAccel: number;
            speeding: number;
        };
        riskyRides: ({
            user: {
                id: string;
                name: string;
                phone: string;
            };
        } & {
            status: import("@prisma/client").$Enums.RideStatus;
            id: string;
            userId: string;
            startedAt: Date;
            endedAt: Date | null;
            totalDistanceM: number | null;
            durationS: number | null;
            score: number | null;
            scoreVersion: string | null;
            createdAt: Date;
            updatedAt: Date;
        })[];
    }>;
}
