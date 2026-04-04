-- CreateTable: billing_automation_runs
CREATE TABLE "billing_automation_runs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "status" VARCHAR(20) NOT NULL DEFAULT 'running',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "processed_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "billing_automation_runs_pkey" PRIMARY KEY ("id")
);
