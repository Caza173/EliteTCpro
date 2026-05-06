import { relations, sql } from 'drizzle-orm';
import { boolean, date, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
};

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    fullName: text('full_name'),
    isActive: boolean('is_active').default(true).notNull(),
    profile: jsonb('profile').$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
    ...timestamps,
  },
  (table) => ({
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
  })
);

export const transactions = pgTable('transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  address: text('address').default('').notNull(),
  status: text('status').default('draft').notNull(),
  data: jsonb('data').$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
  ...timestamps,
});

export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  transactionId: uuid('transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
  fileName: text('file_name').default('').notNull(),
  fileUrl: text('file_url').default('').notNull(),
  docType: text('doc_type').default('other').notNull(),
  data: jsonb('data').$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
  ...timestamps,
});

export const deadlines = pgTable('deadlines', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  transactionId: uuid('transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
  name: text('name').default('').notNull(),
  status: text('status').default('open').notNull(),
  dueDate: date('due_date'),
  data: jsonb('data').$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
  ...timestamps,
});

export const transactionTasks = pgTable('transaction_tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  transactionId: uuid('transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
  phase: integer('phase').default(1).notNull(),
  title: text('title').default('').notNull(),
  orderIndex: integer('order_index').default(0).notNull(),
  isCompleted: boolean('is_completed').default(false).notNull(),
  data: jsonb('data').$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
  ...timestamps,
});

export const checklistItems = pgTable('checklist_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  transactionId: uuid('transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
  uploadedDocumentId: uuid('uploaded_document_id').references(() => documents.id, { onDelete: 'set null' }),
  docType: text('doc_type').default('other').notNull(),
  label: text('label').default('').notNull(),
  status: text('status').default('missing').notNull(),
  required: boolean('required').default(false).notNull(),
  visibleToClient: boolean('visible_to_client').default(false).notNull(),
  requiredByPhase: integer('required_by_phase').default(1),
  data: jsonb('data').$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
  ...timestamps,
});

export const complianceReports = pgTable('compliance_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  transactionId: uuid('transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'set null' }),
  documentName: text('document_name').default('').notNull(),
  status: text('status').default('pending').notNull(),
  blockersCount: integer('blockers_count').default(0).notNull(),
  data: jsonb('data').$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
  ...timestamps,
});

export const signatureRequests = pgTable('signature_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  transactionId: uuid('transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'set null' }),
  provider: text('provider').default('internal').notNull(),
  providerRequestId: text('provider_request_id'),
  status: text('status').default('draft').notNull(),
  title: text('title').default('').notNull(),
  subject: text('subject').default('').notNull(),
  message: text('message').default('').notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  lastReminderSentAt: timestamp('last_reminder_sent_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  declinedAt: timestamp('declined_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  signedDocumentUrl: text('signed_document_url'),
  data: jsonb('data').$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
  ...timestamps,
});

export const commAutomations = pgTable('comm_automations', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  transactionId: uuid('transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
  templateType: text('template_type').default('').notNull(),
  templateStatus: text('template_status').default('draft').notNull(),
  subject: text('subject').default('').notNull(),
  generatedContent: text('generated_content').default('').notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  sentBy: text('sent_by'),
  data: jsonb('data').$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
  ...timestamps,
});

export const userRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
  documents: many(documents),
  deadlines: many(deadlines),
  transactionTasks: many(transactionTasks),
  checklistItems: many(checklistItems),
  complianceReports: many(complianceReports),
  signatureRequests: many(signatureRequests),
  commAutomations: many(commAutomations),
}));

export const transactionRelations = relations(transactions, ({ one, many }) => ({
  owner: one(users, {
    fields: [transactions.ownerId],
    references: [users.id],
  }),
  documents: many(documents),
  deadlines: many(deadlines),
  transactionTasks: many(transactionTasks),
  checklistItems: many(checklistItems),
  complianceReports: many(complianceReports),
  signatureRequests: many(signatureRequests),
  commAutomations: many(commAutomations),
}));

export const documentRelations = relations(documents, ({ one }) => ({
  owner: one(users, {
    fields: [documents.ownerId],
    references: [users.id],
  }),
  transaction: one(transactions, {
    fields: [documents.transactionId],
    references: [transactions.id],
  }),
}));

export const signatureRequestRelations = relations(signatureRequests, ({ one }) => ({
  owner: one(users, {
    fields: [signatureRequests.ownerId],
    references: [users.id],
  }),
  transaction: one(transactions, {
    fields: [signatureRequests.transactionId],
    references: [transactions.id],
  }),
  document: one(documents, {
    fields: [signatureRequests.documentId],
    references: [documents.id],
  }),
}));

export const deadlineRelations = relations(deadlines, ({ one }) => ({
  owner: one(users, {
    fields: [deadlines.ownerId],
    references: [users.id],
  }),
  transaction: one(transactions, {
    fields: [deadlines.transactionId],
    references: [transactions.id],
  }),
}));

export const transactionTaskRelations = relations(transactionTasks, ({ one }) => ({
  owner: one(users, {
    fields: [transactionTasks.ownerId],
    references: [users.id],
  }),
  transaction: one(transactions, {
    fields: [transactionTasks.transactionId],
    references: [transactions.id],
  }),
}));

export const checklistItemRelations = relations(checklistItems, ({ one }) => ({
  owner: one(users, {
    fields: [checklistItems.ownerId],
    references: [users.id],
  }),
  transaction: one(transactions, {
    fields: [checklistItems.transactionId],
    references: [transactions.id],
  }),
  document: one(documents, {
    fields: [checklistItems.uploadedDocumentId],
    references: [documents.id],
  }),
}));

export const complianceReportRelations = relations(complianceReports, ({ one }) => ({
  owner: one(users, {
    fields: [complianceReports.ownerId],
    references: [users.id],
  }),
  transaction: one(transactions, {
    fields: [complianceReports.transactionId],
    references: [transactions.id],
  }),
  document: one(documents, {
    fields: [complianceReports.documentId],
    references: [documents.id],
  }),
}));

export const commAutomationRelations = relations(commAutomations, ({ one }) => ({
  owner: one(users, {
    fields: [commAutomations.ownerId],
    references: [users.id],
  }),
  transaction: one(transactions, {
    fields: [commAutomations.transactionId],
    references: [transactions.id],
  }),
}));

export type UserRow = typeof users.$inferSelect;
export type TransactionRow = typeof transactions.$inferSelect;
export type DocumentRow = typeof documents.$inferSelect;
export type DeadlineRow = typeof deadlines.$inferSelect;
export type TransactionTaskRow = typeof transactionTasks.$inferSelect;
export type ChecklistItemRow = typeof checklistItems.$inferSelect;
export type ComplianceReportRow = typeof complianceReports.$inferSelect;
export type SignatureRequestRow = typeof signatureRequests.$inferSelect;
export type CommAutomationRow = typeof commAutomations.$inferSelect;