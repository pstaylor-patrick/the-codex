/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  console.log('[MIGRATION_LOG] Starting migration: 1747064552223_create-user-submissions-table.js UP');
  pgm.createTable('user_submissions', {
    id: { type: 'serial', primaryKey: true },
    submission_type: { type: 'text', notNull: true }, // 'new' or 'edit'
    data: { type: 'jsonb', notNull: true }, // Stores NewEntrySuggestionData or EditEntrySuggestionData
    submitter_name: { type: 'text' },
    submitter_email: { type: 'text' },
    status: { type: 'text', notNull: true, default: 'pending' }, // 'pending', 'approved', 'rejected'
    timestamp: {
      type: 'timestamptz', // timestamp with time zone
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createIndex('user_submissions', 'status');
  pgm.createIndex('user_submissions', 'timestamp');
  console.log('[MIGRATION_LOG] Finished migration: 1747064552223_create-user-submissions-table.js UP');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  console.log('[MIGRATION_LOG] Starting migration: 1747064552223_create-user-submissions-table.js DOWN');
  pgm.dropTable('user_submissions');
  console.log('[MIGRATION_LOG] Finished migration: 1747064552223_create-user-submissions-table.js DOWN');
};
