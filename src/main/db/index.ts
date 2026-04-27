import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { eq } from 'drizzle-orm'
import { join } from 'path'
import { app } from 'electron'
import * as schema from './schema'

export type DB = ReturnType<typeof drizzle<typeof schema>>

let _sqlite: Database.Database | null = null

export function initDb(): DB {
  const dbPath =
    process.env.NODE_ENV === 'development'
      ? join(process.cwd(), 'dev.db')
      : join(app.getPath('userData'), 'jlab.db')

  const migrationsFolder =
    process.env.NODE_ENV === 'development'
      ? join(process.cwd(), 'src/main/db/migrations')
      : join(__dirname, 'migrations')

  const sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  const db = drizzle(sqlite, { schema })

  // Apply any pending migrations (idempotent — tracks applied migrations in __drizzle_migrations)
  migrate(db, { migrationsFolder })

  _sqlite = sqlite
  ensureSettings(db)
  return db
}

/** Dev-only: hot-backup the current database to a timestamped file next to dev.db. */
export async function backupDb(): Promise<string> {
  if (!_sqlite) throw new Error('DB not initialised')
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const dest = join(process.cwd(), `dev-backup-${ts}.db`)
  await _sqlite.backup(dest)
  return dest
}

function ensureSettings(db: DB): void {
  const existing = db.select().from(schema.settings).where(eq(schema.settings.id, 1)).get()
  if (!existing) {
    db.insert(schema.settings).values({ id: 1 }).run()
  }
}
