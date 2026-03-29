/*
  Warnings:

  - You are about to drop the column `lastSeenat` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "lastSeenat",
ADD COLUMN     "lastSeenAt" TIMESTAMP(3);
