-- AlterTable
ALTER TABLE "MatchEvent" ADD COLUMN     "teamId" INTEGER;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
