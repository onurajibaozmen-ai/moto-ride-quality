-- CreateEnum
CREATE TYPE "public"."ScoreConfidenceLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- DropForeignKey
ALTER TABLE "public"."Device" DROP CONSTRAINT "Device_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Ride" DROP CONSTRAINT "Ride_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RideEvent" DROP CONSTRAINT "RideEvent_rideId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TelemetryPoint" DROP CONSTRAINT "TelemetryPoint_rideId_fkey";

-- CreateTable
CREATE TABLE "public"."RideAnalytics" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "sampleCount" INTEGER NOT NULL DEFAULT 0,
    "validPointCount" INTEGER NOT NULL DEFAULT 0,
    "gpsGapCount" INTEGER NOT NULL DEFAULT 0,
    "lowAccuracyCount" INTEGER NOT NULL DEFAULT 0,
    "movingSeconds" INTEGER NOT NULL DEFAULT 0,
    "idleSeconds" INTEGER NOT NULL DEFAULT 0,
    "totalDistanceM" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgSpeedKmh" DOUBLE PRECISION,
    "p95SpeedKmh" DOUBLE PRECISION,
    "maxSpeedKmh" DOUBLE PRECISION,
    "medianAccuracyM" DOUBLE PRECISION,
    "qualityScore" DOUBLE PRECISION,
    "qualityFlags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RideAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RideScore" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "safetyScore" DOUBLE PRECISION,
    "complianceScore" DOUBLE PRECISION,
    "smoothnessScore" DOUBLE PRECISION,
    "efficiencyScore" DOUBLE PRECISION,
    "confidenceLevel" "public"."ScoreConfidenceLevel" NOT NULL DEFAULT 'MEDIUM',
    "scoringVersion" TEXT NOT NULL,
    "breakdownJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RideScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RideAnalytics_rideId_key" ON "public"."RideAnalytics"("rideId");

-- CreateIndex
CREATE UNIQUE INDEX "RideScore_rideId_key" ON "public"."RideScore"("rideId");

-- CreateIndex
CREATE INDEX "Ride_userId_status_idx" ON "public"."Ride"("userId", "status");

-- CreateIndex
CREATE INDEX "Ride_startedAt_idx" ON "public"."Ride"("startedAt");

-- CreateIndex
CREATE INDEX "RideEvent_rideId_type_ts_idx" ON "public"."RideEvent"("rideId", "type", "ts");

-- CreateIndex
CREATE INDEX "RideEvent_userId_ts_idx" ON "public"."RideEvent"("userId", "ts");

-- CreateIndex
CREATE INDEX "TelemetryPoint_rideId_ts_idx" ON "public"."TelemetryPoint"("rideId", "ts");

-- CreateIndex
CREATE INDEX "TelemetryPoint_userId_ts_idx" ON "public"."TelemetryPoint"("userId", "ts");

-- AddForeignKey
ALTER TABLE "public"."Ride" ADD CONSTRAINT "Ride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TelemetryPoint" ADD CONSTRAINT "TelemetryPoint_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "public"."Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RideEvent" ADD CONSTRAINT "RideEvent_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "public"."Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RideAnalytics" ADD CONSTRAINT "RideAnalytics_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "public"."Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RideScore" ADD CONSTRAINT "RideScore_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "public"."Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
