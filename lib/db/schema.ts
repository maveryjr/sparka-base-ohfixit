import type { InferSelectModel } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  json,
  uuid,
  text,
  primaryKey,
  foreignKey,
  boolean,
  integer,
} from 'drizzle-orm/pg-core';

export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  email: varchar('email', { length: 64 }).notNull(),
  name: varchar('name', { length: 64 }),
  image: varchar('image', { length: 256 }),
  credits: integer('credits').notNull().default(100),
  reservedCredits: integer('reservedCredits').notNull().default(0),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable('Chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  title: text('title').notNull(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  visibility: varchar('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
  isPinned: boolean('isPinned').notNull().default(false),
});

export type Chat = InferSelectModel<typeof chat>;

export const message = pgTable('Message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id, {
      onDelete: 'cascade',
    }),
  parentMessageId: uuid('parentMessageId'),
  role: varchar('role').notNull(),
  parts: json('parts').notNull(),
  attachments: json('attachments').notNull(),
  createdAt: timestamp('createdAt').notNull(),
  annotations: json('annotations'),
  isPartial: boolean('isPartial').notNull().default(false),
  selectedModel: varchar('selectedModel', { length: 256 }).default(''),
  selectedTool: varchar('selectedTool', { length: 256 }).default(''),
});

export type DBMessage = InferSelectModel<typeof message>;

export const vote = pgTable(
  'Vote',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id, {
        onDelete: 'cascade',
      }),
    messageId: uuid('messageId')
      .notNull()
      .references(() => message.id, {
        onDelete: 'cascade',
      }),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  'Document',
  {
    id: uuid('id').notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull(),
    title: text('title').notNull(),
    content: text('content'),
    kind: varchar('text', { enum: ['text', 'code', 'sheet'] })
      .notNull()
      .default('text'),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => message.id, {
        onDelete: 'cascade',
      }),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  },
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  'Suggestion',
  {
    id: uuid('id').notNull().defaultRandom(),
    documentId: uuid('documentId').notNull(),
    documentCreatedAt: timestamp('documentCreatedAt').notNull(),
    originalText: text('originalText').notNull(),
    suggestedText: text('suggestedText').notNull(),
    description: text('description'),
    isResolved: boolean('isResolved').notNull().default(false),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  }),
);

export type Suggestion = InferSelectModel<typeof suggestion>;

// OhFixIt – Trust, Consent, and Audit Trail tables

export const consentEvent = pgTable('ConsentEvent', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .references(() => chat.id, { onDelete: 'cascade' }),
  userId: uuid('userId').references(() => user.id), // nullable for anonymous
  kind: varchar('kind', { length: 64 }).notNull(), // 'screenshot' | 'diagnostics' | 'automation'
  payload: json('payload'), // include anonymousId and any extra details
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export type ConsentEvent = InferSelectModel<typeof consentEvent>;

export const actionLog = pgTable('ActionLog', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .references(() => chat.id, { onDelete: 'cascade' }),
  userId: uuid('userId').references(() => user.id), // nullable for anonymous
  actionType: varchar('actionType', { length: 64 }).notNull(), // 'open_url' | 'dom_instruction' | 'script_recommendation' | 'guide_step'
  status: varchar('status', { length: 32 }).notNull().default('proposed'), // 'proposed' | 'approved' | 'executed' | 'cancelled'
  summary: text('summary'),
  payload: json('payload'),
  executionHost: varchar('executionHost', { length: 32 }), // 'browser' | 'desktop-helper' | 'server'
  outcome: varchar('outcome', { length: 32 }), // 'success' | 'failure' | 'aborted'
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export type ActionLog = InferSelectModel<typeof actionLog>;

export const diagnosticsSnapshot = pgTable('DiagnosticsSnapshot', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .references(() => chat.id, { onDelete: 'cascade' }),
  userId: uuid('userId').references(() => user.id), // nullable for anonymous
  payload: json('payload'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export type DiagnosticsSnapshot = InferSelectModel<typeof diagnosticsSnapshot>;

// OhFixIt – Artifacts and Rollbacks

export const rollbackPoint = pgTable('RollbackPoint', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  actionLogId: uuid('actionLogId')
    .notNull()
    .references(() => actionLog.id, { onDelete: 'cascade' }),
  method: varchar('method', { length: 32 }).notNull(),
  data: json('data'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export type RollbackPoint = InferSelectModel<typeof rollbackPoint>;

export const actionArtifact = pgTable('ActionArtifact', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  actionLogId: uuid('actionLogId')
    .notNull()
    .references(() => actionLog.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 32 }).notNull(), // 'fileDiff' | 'systemChange' | 'screenshot' | 'log'
  uri: text('uri'),
  hash: varchar('hash', { length: 64 }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export type ActionArtifact = InferSelectModel<typeof actionArtifact>;

// Health Check tables

export const healthCheck = pgTable('HealthCheck', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .references(() => chat.id, { onDelete: 'cascade' }),
  userId: uuid('userId').references(() => user.id), // nullable for anonymous
  checkKey: varchar('checkKey', { length: 64 }).notNull(), // 'disk-space' | 'network' | etc
  status: varchar('status', { length: 32 }).notNull(), // 'healthy' | 'warning' | 'critical' | 'unknown'
  score: integer('score').notNull().default(0), // 0-100
  details: json('details'), // check-specific results
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export type HealthCheck = InferSelectModel<typeof healthCheck>;

// Device Profile tables

export const deviceProfile = pgTable('DeviceProfile', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  os: varchar('os', { length: 32 }).notNull(), // 'macos' | 'windows' | 'linux'
  name: varchar('name', { length: 128 }).notNull(), // user-friendly device name
  capabilities: json('capabilities'), // what actions/checks this device supports
  lastSeenAt: timestamp('lastSeenAt').notNull().defaultNow(),
  warranty: json('warranty'), // warranty info if available
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export type DeviceProfile = InferSelectModel<typeof deviceProfile>;

// Playbook execution tables

export const playbookRun = pgTable('PlaybookRun', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .references(() => chat.id, { onDelete: 'cascade' }),
  userId: uuid('userId').references(() => user.id), // nullable for anonymous
  playbookId: varchar('playbookId', { length: 64 }).notNull(), // reference to playbook definition
  deviceProfileId: uuid('deviceProfileId')
    .references(() => deviceProfile.id),
  status: varchar('status', { length: 32 }).notNull().default('pending'), // 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  startedAt: timestamp('startedAt'),
  finishedAt: timestamp('finishedAt'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export type PlaybookRun = InferSelectModel<typeof playbookRun>;

export const playbookRunStep = pgTable('PlaybookRunStep', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  runId: uuid('runId')
    .notNull()
    .references(() => playbookRun.id, { onDelete: 'cascade' }),
  stepId: varchar('stepId', { length: 64 }).notNull(), // reference to step definition
  status: varchar('status', { length: 32 }).notNull().default('pending'), // 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  artifacts: json('artifacts'), // artifacts produced by this step
  notes: text('notes'), // execution notes or error details
  startedAt: timestamp('startedAt'),
  finishedAt: timestamp('finishedAt'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export type PlaybookRunStep = InferSelectModel<typeof playbookRunStep>;

// Human handoff tables

export const humanHandoffSession = pgTable('HumanHandoffSession', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id, { onDelete: 'cascade' }),
  userId: uuid('userId').references(() => user.id), // nullable for anonymous
  status: varchar('status', { length: 32 }).notNull().default('pending'), // 'pending' | 'active' | 'completed' | 'cancelled'
  operatorId: varchar('operatorId', { length: 128 }), // identifier for human operator
  startedAt: timestamp('startedAt'),
  endedAt: timestamp('endedAt'),
  transcriptRef: varchar('transcriptRef', { length: 256 }), // reference to stored transcript/recording
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export type HumanHandoffSession = InferSelectModel<typeof humanHandoffSession>;
