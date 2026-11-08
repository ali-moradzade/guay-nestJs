/*
  Warnings:

  - Added the required column `amount` to the `Reservation` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "amount" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "timestamp" SET DEFAULT CURRENT_TIMESTAMP;
