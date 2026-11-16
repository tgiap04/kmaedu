-- Expand: the newest `ai.generation.progress` of an in-flight job, shown by GET /ai/job/:id.
-- Nullable, no default: existing rows and the previous image keep working unchanged.
ALTER TABLE "GenerationJob" ADD COLUMN "progress" JSONB;
