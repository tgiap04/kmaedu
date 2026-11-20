-- Per-account guess budget for the 6-digit verify/reset codes (expand only: new column with a default).
-- AlterTable
ALTER TABLE "VerifyAccountCode" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ResetPasswordCode" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
