-- OhFixIt Issue #9: Trust, Consent, and Audit Trail
-- Create tables: ConsentEvent, ActionLog, DiagnosticsSnapshot

CREATE TABLE IF NOT EXISTS "ConsentEvent" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chatId" uuid NOT NULL REFERENCES "Chat"("id") ON DELETE CASCADE,
  "userId" uuid REFERENCES "User"("id"),
  "kind" varchar(64) NOT NULL,
  "payload" json,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ActionLog" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chatId" uuid NOT NULL REFERENCES "Chat"("id") ON DELETE CASCADE,
  "userId" uuid REFERENCES "User"("id"),
  "actionType" varchar(64) NOT NULL,
  "status" varchar(32) NOT NULL DEFAULT 'proposed',
  "summary" text,
  "payload" json,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "DiagnosticsSnapshot" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chatId" uuid NOT NULL REFERENCES "Chat"("id") ON DELETE CASCADE,
  "userId" uuid REFERENCES "User"("id"),
  "payload" json,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
