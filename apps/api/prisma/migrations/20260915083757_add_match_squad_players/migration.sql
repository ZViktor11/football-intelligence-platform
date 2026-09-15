-- CreateEnum
CREATE TYPE "MatchSquadRole" AS ENUM ('STARTER', 'SUBSTITUTE');

-- CreateTable
CREATE TABLE "MatchSquadPlayer" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "role" "MatchSquadRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchSquadPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchSquadPlayer_matchId_playerId_key" ON "MatchSquadPlayer"("matchId", "playerId");

-- AddForeignKey
ALTER TABLE "MatchSquadPlayer" ADD CONSTRAINT "MatchSquadPlayer_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSquadPlayer" ADD CONSTRAINT "MatchSquadPlayer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSquadPlayer" ADD CONSTRAINT "MatchSquadPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
