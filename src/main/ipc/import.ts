import { dialog, BrowserWindow } from 'electron'
import Database from 'better-sqlite3'
import { eq } from 'drizzle-orm'
import { ok, err } from '../types/ipc'
import { loggedHandle, log } from '../lib/logger'
import { backupDb } from '../db'
import {
  organisms,
  features,
  plasmids,
  cassettes,
  gmos
} from '../db/schema'
import type { DB } from '../db'

// ─── Legacy DB row types ───────────────────────────────────────────────────────

interface LegacyOrganism {
  id: number
  full_name: string
  short_name: string
  RG: string
  uid: string
  synced: number
}

interface LegacyFeature {
  id: number
  annotation: string
  alias: string | null
  risk: string | null
  organism: string | null
  uid: string
  synced: number
}

interface LegacyPlasmid {
  id: number
  name: string
  alias: string | null
  status: number
  purpose: string | null
  summary: string | null
  gb: string | null
  clone: string | null
  backbone_vector: string | null
  marker: string | null
  target_RG: number | null
  generated: string | null
  date: string | null
}

interface LegacyCassette {
  cassette_id: number
  content: string
  plasmid_id: number
}

interface LegacyGMO {
  organism_id: number
  organism_name: string
  GMO_summary: string | null
  approval: string | null
  plasmid_id: number | null
  target_RG: number | null
  date_generated: string | null
  date_destroyed: string | null
}

interface LegacyAttachment {
  attach_id: number
  Filename: string
  file: Buffer
  plasmid_id: number
}

interface LegacySettings {
  name: string | null
  initials: string | null
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<number, string> = {
  1: 'complete',
  2: 'in_progress',
  3: 'abandoned',
  4: 'planned'
}

export function parseDate(s: string | null): Date | null {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

export function mimeFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'pdf': return 'application/pdf'
    case 'png': return 'image/png'
    case 'jpg': case 'jpeg': return 'image/jpeg'
    case 'gb': case 'gbk': case 'genbank': case 'fastq': case 'fq': case 'txt': return 'text/plain'
    default: return 'application/octet-stream'
  }
}

// ─── Handler ───────────────────────────────────────────────────────────────────

export function registerImportHandlers(db: DB): void {
  loggedHandle('import:legacyGmocu', async (event, opts?: { backup?: boolean }) => {
    // 0. Dev-only: backup DB before import if requested
    if (process.env.NODE_ENV === 'development' && opts?.backup) {
      const dest = await backupDb()
      log.info(`DB backed up to ${dest}`)
    }

    // 1. Pick file
    const win = BrowserWindow.fromWebContents(event.sender) ?? BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(win!, {
      title: 'Select GMOcu Database',
      filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite'] }],
      properties: ['openFile']
    })

    if (result.canceled || !result.filePaths[0]) {
      return ok({ cancelled: true })
    }

    try {
      const src = new Database(result.filePaths[0], { readonly: true })

      // 2. Read creator info from legacy settings
      const legacySettings = src
        .prepare('SELECT name, initials FROM Settings LIMIT 1')
        .get() as LegacySettings | undefined
      const creatorName = legacySettings?.name ?? ''
      const creatorInitials = legacySettings?.initials ?? ''

      const counts = {
        organisms: 0,
        features: 0,
        plasmids: 0,
        cassettes: 0,
        gmos: 0,
        attachments: 0
      }

      db.transaction((tx) => {
        // 3. Organisms — build short_name → new id map
        const legacyOrgs = src
          .prepare('SELECT id, full_name, short_name, RG, uid, synced FROM Organisms')
          .all() as LegacyOrganism[]

        const orgShortNameToNewId = new Map<string, number>()

        for (const o of legacyOrgs) {
          let newId: number | undefined
          if (o.uid) {
            const existing = tx.select({ id: organisms.id }).from(organisms).where(eq(organisms.uid, o.uid)).get()
            if (existing) {
              newId = existing.id
            }
          }
          if (!newId) {
            const inserted = tx
              .insert(organisms)
              .values({
                name: o.full_name,
                shortName: o.short_name || null,
                riskGroup: parseInt(o.RG) || 1,
                uid: o.uid || null,
                synced: o.synced === 1
              })
              .returning({ id: organisms.id })
              .get()
            newId = inserted?.id
            counts.organisms++
          }
          if (newId && o.short_name) {
            orgShortNameToNewId.set(o.short_name, newId)
          }
        }

        // 4. Features
        const legacyFeatures = src
          .prepare('SELECT id, annotation, alias, risk, organism, uid, synced FROM Features')
          .all() as LegacyFeature[]

        for (const f of legacyFeatures) {
          if (f.uid) {
            const existing = tx.select({ id: features.id }).from(features).where(eq(features.uid, f.uid)).get()
            if (existing) continue
          }
          tx.insert(features)
            .values({
              name: f.annotation,
              alias: f.alias || null,
              type: 'other',
              organismSource: f.organism || null,
              riskLevel: 0,
              uid: f.uid || null,
              synced: f.synced === 1
            })
            .run()
          counts.features++
        }

        // 5. Plasmids — build legacy id → new id map
        const legacyPlasmids = src
          .prepare(
            'SELECT id, name, alias, status, purpose, summary, gb, clone, backbone_vector, marker, target_RG, generated, date FROM Plasmids'
          )
          .all() as LegacyPlasmid[]

        const plasmidIdMap = new Map<number, number>()

        for (const p of legacyPlasmids) {
          const inserted = tx
            .insert(plasmids)
            .values({
              name: p.name,
              alias: p.alias || null,
              description: p.summary || null,
              purpose: p.purpose || null,
              backboneVector: p.clone || p.backbone_vector || null,
              marker: p.marker || null,
              status: STATUS_MAP[p.status] ?? 'planned',
              dateCreated: parseDate(p.generated ?? p.date),
              creatorName,
              creatorInitials
            })
            .returning({ id: plasmids.id })
            .get()
          if (inserted) plasmidIdMap.set(p.id, inserted.id)
          counts.plasmids++
        }

        // 6. Cassettes — group by plasmid_id, assign sequential order
        const legacyCassettes = src
          .prepare('SELECT cassette_id, content, plasmid_id FROM Cassettes ORDER BY plasmid_id, cassette_id')
          .all() as LegacyCassette[]

        const cassetteOrderByPlasmid = new Map<number, number>()
        for (const c of legacyCassettes) {
          const newPlasmidId = plasmidIdMap.get(c.plasmid_id)
          if (!newPlasmidId) continue
          const order = (cassetteOrderByPlasmid.get(c.plasmid_id) ?? 0)
          cassetteOrderByPlasmid.set(c.plasmid_id, order + 1)
          tx.insert(cassettes)
            .values({ plasmidId: newPlasmidId, name: c.content ?? 'Unnamed', order })
            .run()
          counts.cassettes++
        }

        // 7. GMOs
        const legacyGMOs = src
          .prepare(
            'SELECT organism_id, organism_name, GMO_summary, approval, plasmid_id, target_RG, date_generated, date_destroyed FROM GMOs'
          )
          .all() as LegacyGMO[]

        for (const g of legacyGMOs) {
          const newPlasmidId = g.plasmid_id ? plasmidIdMap.get(g.plasmid_id) ?? null : null
          const shortName = (g.organism_name ?? '').trim()
          const hostOrganismId = orgShortNameToNewId.get(shortName) ?? null

          tx.insert(gmos)
            .values({
              plasmidId: newPlasmidId,
              hostOrganismId,
              approval: g.approval || null,
              notes: g.GMO_summary || null,
              createdDate: parseDate(g.date_generated),
              destroyedDate: parseDate(g.date_destroyed)
            })
            .run()
          counts.gmos++
        }

        // 8. Attachments
        const legacyAttachments = src
          .prepare('SELECT attach_id, Filename, file, plasmid_id FROM Attachments')
          .all() as LegacyAttachment[]

        // Legacy BLOB attachments are counted but not migrated
        // TODO: write BLOBs to disk and populate filePath during import
        counts.attachments += legacyAttachments.filter((a) => a.file && plasmidIdMap.has(a.plasmid_id)).length
      })

      src.close()
      return ok({ cancelled: false, counts, creatorName, creatorInitials })
    } catch (e) {
      return err(String(e))
    }
  })
}
