export type RawTelemetryPoint = {
  ts: Date;
  lat: number;
  lng: number;
  speedKmh: number | null;
  accuracyM: number | null;
  heading: number | null;
  accelX: number | null;
  accelY: number | null;
  accelZ: number | null;
  batteryLevel: number | null;
  networkType: string | null;
};

export type CleanedTelemetryPoint = RawTelemetryPoint & {
  isLowAccuracy: boolean;
  isDuplicateTs: boolean;
  isTeleport: boolean;
  isValidForDistance: boolean;
  isValidForScoring: boolean;
};

export type CleaningSummary = {
  rawCount: number;
  cleanedCount: number;
  duplicateCount: number;
  lowAccuracyCount: number;
  teleportCount: number;
  gapCount: number;
  medianDtSec: number | null;
};

export type CleaningResult = {
  cleanedPoints: CleanedTelemetryPoint[];
  summary: CleaningSummary;
};

const MAX_REASONABLE_SPEED_KMH = 140;
const MAX_REASONABLE_ACCURACY_M = 30;
const GPS_GAP_SEC = 8;

export function cleanTelemetryPoints(
  rawPoints: RawTelemetryPoint[],
): CleaningResult {
  const sorted = [...rawPoints]
    .filter(
      (p) =>
        Number.isFinite(p.lat) &&
        Number.isFinite(p.lng) &&
        p.lat >= -90 &&
        p.lat <= 90 &&
        p.lng >= -180 &&
        p.lng <= 180,
    )
    .sort((a, b) => a.ts.getTime() - b.ts.getTime());

  const cleanedPoints: CleanedTelemetryPoint[] = [];
  let duplicateCount = 0;
  let lowAccuracyCount = 0;
  let teleportCount = 0;
  let gapCount = 0;
  const dtSamples: number[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const point = sorted[i];
    const prev = cleanedPoints.length > 0 ? cleanedPoints[cleanedPoints.length - 1] : null;

    const isLowAccuracy =
      typeof point.accuracyM === 'number' && point.accuracyM > MAX_REASONABLE_ACCURACY_M;

    let isDuplicateTs = false;
    let isTeleport = false;

    if (prev) {
      const dtSec = Math.round((point.ts.getTime() - prev.ts.getTime()) / 1000);

      if (dtSec <= 0) {
        isDuplicateTs = true;
        duplicateCount++;
      } else {
        dtSamples.push(dtSec);
        if (dtSec > GPS_GAP_SEC) gapCount++;

        const distanceM = haversineMeters(prev.lat, prev.lng, point.lat, point.lng);
        const impliedSpeed = (distanceM / dtSec) * 3.6;

        if (impliedSpeed > MAX_REASONABLE_SPEED_KMH) {
          isTeleport = true;
          teleportCount++;
        }
      }
    }

    if (isLowAccuracy) lowAccuracyCount++;

    const isValidForDistance = !isDuplicateTs && !isTeleport && !isLowAccuracy;
    const isValidForScoring = !isDuplicateTs && !isLowAccuracy;

    cleanedPoints.push({
      ...point,
      isLowAccuracy,
      isDuplicateTs,
      isTeleport,
      isValidForDistance,
      isValidForScoring,
    });
  }

  return {
    cleanedPoints,
    summary: {
      rawCount: sorted.length,
      cleanedCount: cleanedPoints.length,
      duplicateCount,
      lowAccuracyCount,
      teleportCount,
      gapCount,
      medianDtSec: dtSamples.length ? percentile(dtSamples, 50) : null,
    },
  };
}

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function percentile(values: number[], p: number) {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);

  if (lo === hi) return sorted[lo];

  const w = idx - lo;
  return sorted[lo] * (1 - w) + sorted[hi] * w;
}

export function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}