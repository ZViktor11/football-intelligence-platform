-- AlterTable
ALTER TABLE "MatchReport" ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" INTEGER;

-- AddForeignKey
ALTER TABLE "MatchReport" ADD CONSTRAINT "MatchReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
