-- CreateTable
CREATE TABLE "MatchAdminAssignment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "matchId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchAdminAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchAdminAssignment_userId_matchId_key" ON "MatchAdminAssignment"("userId", "matchId");

-- AddForeignKey
ALTER TABLE "MatchAdminAssignment" ADD CONSTRAINT "MatchAdminAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchAdminAssignment" ADD CONSTRAINT "MatchAdminAssignment_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
