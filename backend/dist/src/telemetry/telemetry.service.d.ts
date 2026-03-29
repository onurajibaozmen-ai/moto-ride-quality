import { PrismaService } from '../prisma/prisma.service';
import { TelemetryBatchDto } from './dto/telemetry-batch.dto';
export declare class TelemetryService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    ingestBatch(userId: string, body: TelemetryBatchDto): Promise<{
        ok: boolean;
        insertedCount: number;
        detectedEventsCount: number;
        score: number | null;
        rideId: string;
    }>;
    private detectEvents;
    private isUsableForEvent;
    private computeBrakeSeverity;
    private computeAccelSeverity;
    private deduplicateNearbyEvents;
    private recalculateRideScore;
}
