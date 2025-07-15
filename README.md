
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Database Setup

**VERY IMPORTANT TROUBLESHOOTING NOTE:** If you encounter errors like "relation 'entries' does not exist", "relation 'tags' does not exist", or similar, it almost **ALWAYS** means your database migrations have not run correctly OR your `DATABASE_URL` is pointing to the wrong database. Carefully follow steps 3, 4, and the "Troubleshooting" section below.

1.  **Install PostgreSQL**: If you haven't already, install PostgreSQL on your system.
2.  **Create a Database**: Create a new database for this project. For example, `f3codex_dev`.
3.  **Configure Environment Variables**:
    Create a `.env` file in the root of the project if it doesn't already exist. Add your database connection string to this file:
    ```env
    DATABASE_URL="postgresql://YOUR_DB_USER:YOUR_DB_PASSWORD@YOUR_DB_HOST:YOUR_DB_PORT/YOUR_DB_NAME"
    ```
    Replace the placeholders with your actual database credentials and details. For example:
    `DATABASE_URL="postgresql://postgres:password@localhost:5432/f3codex_dev"`
    **Ensure this URL is absolutely correct and the database server is accessible from your application environment.** A small typo here is a common source of issues.
    **If deploying, also verify that platform-level environment variables are not incorrectly overriding your `.env` file's `DATABASE_URL`.**

4.  **Run Database Migrations**:
    The database schema and initial data are managed by migration files located in the `migrations` directory. To apply these migrations to your database, run the following command in your terminal:
    ```bash
    npm run db:migrate:up
    ```
    This command will attempt to create the necessary tables (like `tags`, `entries`, `user_submissions`) and populate them with initial data.
    **VERY IMPORTANT: Watch the terminal output of this command CAREFULLY for any errors.** You should see `[MIGRATION_LOG]` messages indicating the start and finish of each migration file (e.g., `[MIGRATION_LOG] Starting migration: ... UP` and `[MIGRATION_LOG] Finished migration: ... UP`). If errors occur, or if a "Finished" log does not appear after a "Starting" log, the tables will likely not be created or will be in an inconsistent state. Resolve any reported errors before proceeding.

    If you need to roll back migrations (e.g., to retry after a failed `up` command or if developing new migrations), you can use:
    ```bash
    npm run db:migrate:down NUMBER_OF_MIGRATIONS_TO_ROLLBACK
    ```
    For example, `npm run db:migrate:down 1` rolls back the last migration. `npm run db:migrate:down ALL` attempts to roll back all migrations (use with caution if you have important data).

    To create a new migration file (for development):
    ```bash
    npm run db:migrate:create MIGRATION_NAME_HERE
    ```
    Replace `MIGRATION_NAME_HERE` with a descriptive name for your migration (e.g., `add-new-feature-table`).

**Troubleshooting "relation ... does not exist" errors:**

This common error (e.g., "relation 'entries' does not exist" or "relation 'tags' does not exist") means the application tried to access a table that isn't in the database it connected to. This is almost always due to migrations not running correctly or an incorrect `DATABASE_URL`.

**QUICK CHECKLIST FOR "relation ... does not exist" ERRORS:**
1.  **Is `DATABASE_URL` in your `.env` file (and any relevant deployment environment variables) absolutely correct?** (User, password, host, port, **database name** - all must be exact). Is it pointing to the database where you *expect* the tables to be (e.g., `f3codex_dev` and not the default `postgres` database)?
2.  **Is your PostgreSQL server running and accessible from your application environment?**
3.  **Did you run `npm run db:migrate:up`?**
4.  **Did you CAREFULLY check the terminal output of `npm run db:migrate:up` for ANY errors?** Did you see the `[MIGRATION_LOG]` messages for both starting and *finishing* each migration script? If there were errors, they must be fixed, and migrations re-run.
5.  **Connect to your database (using `psql`, DBeaver, etc.) using the *exact same credentials and database name* from your `DATABASE_URL`. Does the table (e.g., `entries`, `tags`) actually exist in that specific database?**
6.  **In the same database client, check the `pgmigrations` table. Does it list the migration file that creates the missing table (e.g., `1747064550000_create_entries_table.js` for the `entries` table, or `1747064544503_create-tags-table.js` for `tags`)?** If not, that migration did not complete successfully on *this specific database*.

**Detailed Troubleshooting Steps:**
- **Verify `DATABASE_URL`**: Triple-check that the `DATABASE_URL` in your `.env` file is absolutely correct and points to the database you intend to use. A small typo can lead to connecting to the wrong (and unmigrated) database. If deployed, ensure server-side environment variables are also correct.
- **Run Migrations & CHECK OUTPUT**: Ensure you have successfully run `npm run db:migrate:up`. **Check the console output of this command for any error messages and for the `[MIGRATION_LOG]` start/finish messages.** If there were errors, address them and try running the migrations again. You might need to roll back first:
    1. Roll back migrations: `npm run db:migrate:down ALL` (or a specific number).
    2. Re-apply migrations: `npm run db:migrate:up`, carefully watching the output.
- **Check Migration Status Table (`pgmigrations`)**: `node-pg-migrate` creates a table named `pgmigrations` that logs successfully applied migrations. Connect to your database (the one specified in `DATABASE_URL`) and inspect this table. If it's empty or missing key migrations (like those creating `entries` or `tags`), they didn't apply successfully *to that database*.
- **Database Client**: Connect to your PostgreSQL database using a tool like `psql` or a GUI client (e.g., pgAdmin, DBeaver). Manually check if the expected tables (`entries`, `tags`, etc.) exist in the specific database your `DATABASE_URL` points to and that they have the correct structure (columns).
- **Application Logs**: Check the console output when you run `npm run db:migrate:up` and when you start your Next.js application (`npm run dev`) for any database-related error messages. The application error messages in `src/lib/api.ts` are designed to guide you.

After running `npm run db:migrate:up` **successfully (with no errors in its output, and with "Finished" logs for all migrations)**, your database should be set up, and the application should be able to connect to it and find the required tables.
If you continue to encounter "relation ... does not exist" errors, meticulously review the steps above, paying extremely close attention to the `DATABASE_URL` and the output of the migration commands.
