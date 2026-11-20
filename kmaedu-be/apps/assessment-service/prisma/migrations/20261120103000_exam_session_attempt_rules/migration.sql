-- Fail fast instead of queueing every query behind a long transaction that holds the table.
SET lock_timeout = '5s';

-- AlterTable: attempt rules of a session (expand-only; existing sessions keep today's behaviour).
ALTER TABLE "ExamSession" ADD COLUMN "durationMinutes" INTEGER,
ADD COLUMN "antiCheatEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "allowLeaveMidway" BOOLEAN NOT NULL DEFAULT true;
