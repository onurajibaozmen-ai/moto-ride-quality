import { TelemetryPointDto } from './telemetry-point.dto';
export declare class TelemetryBatchDto {
    rideId: string;
    deviceTime?: string;
    points: TelemetryPointDto[];
}
