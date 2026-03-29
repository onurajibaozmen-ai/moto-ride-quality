import { RidesService } from './rides.service';
import { StartRideDto } from './dto/start-ride.dto';
import { EndRideDto } from './dto/end-ride.dto';
export declare class RidesController {
    private readonly ridesService;
    constructor(ridesService: RidesService);
    startRide(user: {
        userId: string;
    }, _body: StartRideDto): Promise<{
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
    getActiveRide(user: {
        userId: string;
    }): Promise<{
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
    getRideById(id: string, user: {
        userId: string;
    }): Promise<{
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
    endRide(id: string, user: {
        userId: string;
    }, _body: EndRideDto): Promise<{
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
}
