/**
 * Creates a fresh in-memory SQLite DB with all migrations applied.
 * Uses sql.js (pure WASM) to avoid native binary NODE_MODULE_VERSION conflicts
 * between Electron's Node and the system Node running Vitest.
 */
import initSqlJs from 'sql.js'
import { drizzle } from 'drizzle-orm/sql-js'
import { migrate } from 'drizzle-orm/sql-js/migrator'
import { eq } from 'drizzle-orm'
import { resolve } from 'path'
import * as schema from './schema'

export type TestDB = ReturnType<typeof drizzle<typeof schema>>

export async function createTestDb(): Promise<TestDB> {
  const SQL = await initSqlJs()
  const sqlite = new SQL.Database()
  sqlite.run('PRAGMA foreign_keys = ON')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: resolve(__dirname, 'migrations') })
  const existing = db.select().from(schema.settings).where(eq(schema.settings.id, 1)).get()
  if (!existing) db.insert(schema.settings).values({ id: 1 }).run()
  return db
}
