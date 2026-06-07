-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'LIVE', 'HALF_TIME', 'FINISHED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EventType" ADD VALUE 'CORNER';
ALTER TYPE "EventType" ADD VALUE 'OFFSIDE';

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "playerInId" INTEGER,
ADD COLUMN     "playerOutId" INTEGER;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "awayPossession" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "homePossession" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED';

-- CreateTable
CREATE TABLE "Lineup" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "isStarter" BOOLEAN NOT NULL DEFAULT false,
    "position" TEXT,

    CONSTRAINT "Lineup_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_playerInId_fkey" FOREIGN KEY ("playerInId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_playerOutId_fkey" FOREIGN KEY ("playerOutId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lineup" ADD CONSTRAINT "Lineup_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lineup" ADD CONSTRAINT "Lineup_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lineup" ADD CONSTRAINT "Lineup_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
