/*
  Warnings:

  - You are about to drop the column `correctAnswers` on the `TopicProgress` table. All the data in the column will be lost.
  - You are about to drop the column `totalAnswers` on the `TopicProgress` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TopicProgress" DROP COLUMN "correctAnswers",
DROP COLUMN "totalAnswers",
ADD COLUMN     "easyCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "easyCorrect" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "easyTotal" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hardCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hardCorrect" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hardTotal" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mediumCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mediumCorrect" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mediumTotal" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "topicCompleted" BOOLEAN NOT NULL DEFAULT false;
