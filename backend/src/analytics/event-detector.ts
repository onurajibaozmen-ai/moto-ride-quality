export type TelemetryPoint = {
  speed: number;
  accelZ: number;
  timestamp: Date;
};

export type RideEvent = {
  type: 'HARSH_BRAKE' | 'HARSH_ACCEL' | 'OVERSPEED';
  timestamp: Date;
  severity: number;
  penalty: number;
};

export function detectEvents(points: TelemetryPoint[]): RideEvent[] {
  const events: RideEvent[] = [];

  for (const p of points) {
    // HARSH BRAKE
    if (p.accelZ < -3) {
      events.push({
        type: 'HARSH_BRAKE',
        timestamp: p.timestamp,
        severity: Math.abs(p.accelZ),
        penalty: 4,
      });
    }

    // HARSH ACCEL
    if (p.accelZ > 3) {
      events.push({
        type: 'HARSH_ACCEL',
        timestamp: p.timestamp,
        severity: p.accelZ,
        penalty: 2,
      });
    }

    // OVERSPEED
    if (p.speed > 80) {
      events.push({
        type: 'OVERSPEED',
        timestamp: p.timestamp,
        severity: p.speed,
        penalty: 3,
      });
    }
  }

  return events;
}