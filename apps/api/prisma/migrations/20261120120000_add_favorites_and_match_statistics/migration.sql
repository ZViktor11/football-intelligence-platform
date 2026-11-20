CREATE TYPE "PossessionSide" AS ENUM ('HOME', 'AWAY');

ALTER TABLE "Match"
  ADD COLUMN "shotsOnTargetEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "possessionEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "homeShotsOnTarget" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "awayShotsOnTarget" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "homePossessionMs" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "awayPossessionMs" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "possessionSide" "PossessionSide",
  ADD COLUMN "possessionStartedAt" TIMESTAMP(3),
  ADD COLUMN "statisticsVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "Favorite" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "teamId" INTEGER REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "playerId" INTEGER REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "competitionId" INTEGER REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "matchId" INTEGER REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Favorite_one_target" CHECK (num_nonnulls("teamId", "playerId", "competitionId", "matchId") = 1)
);
CREATE UNIQUE INDEX "Favorite_userId_teamId_key" ON "Favorite"("userId", "teamId");
CREATE UNIQUE INDEX "Favorite_userId_playerId_key" ON "Favorite"("userId", "playerId");
CREATE UNIQUE INDEX "Favorite_userId_competitionId_key" ON "Favorite"("userId", "competitionId");
CREATE UNIQUE INDEX "Favorite_userId_matchId_key" ON "Favorite"("userId", "matchId");
