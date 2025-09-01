-- OhFixIt: Action artifacts and rollback points; ActionLog enrichment

CREATE TABLE IF NOT EXISTS "RollbackPoint" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actionLogId" uuid NOT NULL REFERENCES "ActionLog"("id") ON DELETE CASCADE,
  "method" varchar(32) NOT NULL,
  "data" json,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ActionArtifact" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actionLogId" uuid NOT NULL REFERENCES "ActionLog"("id") ON DELETE CASCADE,
  "type" varchar(32) NOT NULL,
  "uri" text,
  "hash" varchar(64),
  "createdAt" timestamp NOT NULL DEFAULT now()
);

ALTER TABLE "ActionLog"
  ADD COLUMN IF NOT EXISTS "executionHost" varchar(32),
  ADD COLUMN IF NOT EXISTS "outcome" varchar(32);
