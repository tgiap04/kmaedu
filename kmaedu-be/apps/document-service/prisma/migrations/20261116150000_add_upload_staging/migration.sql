-- Expand only: bytes of a document accepted by CreateUpload (`UserStorage.processingStatus` =
-- 'UPLOADING') wait here until the worker has stored them in R2. `processingStatus` is a plain
-- TEXT column, so the new value needs no DDL. Deleting the document drops its staging row.

-- CreateTable
CREATE TABLE "upload_staging" (
    "storage_id" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lease_until" TIMESTAMPTZ(6),
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upload_staging_pkey" PRIMARY KEY ("storage_id")
);

-- CreateIndex
CREATE INDEX "upload_staging_next_attempt_at_idx" ON "upload_staging"("next_attempt_at");

-- AddForeignKey
ALTER TABLE "upload_staging" ADD CONSTRAINT "upload_staging_storage_id_fkey" FOREIGN KEY ("storage_id") REFERENCES "UserStorage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
