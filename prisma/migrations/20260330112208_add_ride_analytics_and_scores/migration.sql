-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'COURIER');

-- CreateEnum
CREATE TYPE "RideStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ScoreConfidenceLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'COURIER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "status" "RideStatus" NOT NULL DEFAULT 'ACTIVE',
    "totalDistanceM" DOUBLE PRECISION DEFAULT 0,
    "durationS" INTEGER DEFAULT 0,
    "score" DOUBLE PRECISION,
    "scoreVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelemetryPoint" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "speedKmh" DOUBLE PRECISION,
    "accuracyM" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "accelX" DOUBLE PRECISION,
    "accelY" DOUBLE PRECISION,
    "accelZ" DOUBLE PRECISION,
    "batteryLevel" DOUBLE PRECISION,
    "networkType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelemetryPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RideEvent" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "severity" DOUBLE PRECISION,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RideEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RideAnalytics" (
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
CREATE TABLE "RideScore" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "safetyScore" DOUBLE PRECISION,
    "complianceScore" DOUBLE PRECISION,
    "smoothnessScore" DOUBLE PRECISION,
    "efficiencyScore" DOUBLE PRECISION,
    "confidenceLevel" "ScoreConfidenceLevel" NOT NULL DEFAULT 'MEDIUM',
    "scoringVersion" TEXT NOT NULL,
    "breakdownJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RideScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceModel" TEXT,
    "osVersion" TEXT,
    "appVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "Ride_userId_status_idx" ON "Ride"("userId", "status");

-- CreateIndex
CREATE INDEX "Ride_startedAt_idx" ON "Ride"("startedAt");

-- CreateIndex
CREATE INDEX "TelemetryPoint_rideId_ts_idx" ON "TelemetryPoint"("rideId", "ts");

-- CreateIndex
CREATE INDEX "TelemetryPoint_userId_ts_idx" ON "TelemetryPoint"("userId", "ts");

-- CreateIndex
CREATE INDEX "RideEvent_rideId_type_ts_idx" ON "RideEvent"("rideId", "type", "ts");

-- CreateIndex
CREATE INDEX "RideEvent_userId_ts_idx" ON "RideEvent"("userId", "ts");

-- CreateIndex
CREATE UNIQUE INDEX "RideAnalytics_rideId_key" ON "RideAnalytics"("rideId");

-- CreateIndex
CREATE UNIQUE INDEX "RideScore_rideId_key" ON "RideScore"("rideId");

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelemetryPoint" ADD CONSTRAINT "TelemetryPoint_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideEvent" ADD CONSTRAINT "RideEvent_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideAnalytics" ADD CONSTRAINT "RideAnalytics_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideScore" ADD CONSTRAINT "RideScore_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
