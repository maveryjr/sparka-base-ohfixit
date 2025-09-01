-- Allow nullable chatId for OhFixIt tables to support anonymous sessions
-- DiagnosticsSnapshot, ConsentEvent, and ActionLog previously required chatId
-- and referenced Chat. Anonymous chats are not persisted in DB, so FK could fail.

ALTER TABLE "DiagnosticsSnapshot"
  ALTER COLUMN "chatId" DROP NOT NULL;

ALTER TABLE "ConsentEvent"
  ALTER COLUMN "chatId" DROP NOT NULL;

ALTER TABLE "ActionLog"
  ALTER COLUMN "chatId" DROP NOT NULL;

