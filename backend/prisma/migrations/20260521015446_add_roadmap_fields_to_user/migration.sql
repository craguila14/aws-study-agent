-- AlterTable
ALTER TABLE "User" ADD COLUMN     "examDate" TIMESTAMP(3),
ADD COLUMN     "knowledgeLevel" TEXT NOT NULL DEFAULT 'beginner',
ADD COLUMN     "roadmapWeek" INTEGER NOT NULL DEFAULT 1;
