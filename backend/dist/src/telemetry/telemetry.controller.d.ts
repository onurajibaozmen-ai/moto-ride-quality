import { TelemetryBatchDto } from './dto/telemetry-batch.dto';
import { TelemetryService } from './telemetry.service';
export declare class TelemetryController {
    private readonly telemetryService;
    constructor(telemetryService: TelemetryService);
    ingestBatch(user: {
        userId: string;
    }, body: TelemetryBatchDto): Promise<{
        ok: boolean;
        insertedCount: number;
        detectedEventsCount: number;
        score: number | null;
        rideId: string;
    }>;
}
