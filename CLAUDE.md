# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

**Pre-development** — architecture and requirements are finalized but the application has not been coded yet. The `gmocu-GMOCU-0.73_OLD_PYTHON_APP/` directory contains the legacy Python/PySimpleGUI app for reference only.

## Tech Stack

Electron (`electron-vite`) + React 18 + TypeScript strict mode. Data layer: `better-sqlite3` + Drizzle ORM. State: React Query (server/DB state) + Zustand (transient UI only). UI: Mantine 7. Validation: Zod on both main and renderer processes.

## Development Commands (once scaffolded)

```bash
npm run dev        # Start electron-vite dev server with HMR
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # ESLint
npm run format     # Prettier
npm run test       # Vitest unit tests
npm run db:generate  # drizzle-kit generate migrations
npm run db:migrate   # Apply migrations
```

## Architecture

### Process Boundaries

The app has three processes with strict security separation:

1. **Main process** (`src/main/`) — Node.js, owns SQLite database, file system, and external API calls. Never import renderer code here.
2. **Preload** (`src/preload/`) — Exposes `window.api` via `contextBridge`. This is the only bridge between main and renderer.
3. **Renderer** (`src/renderer/`) — React SPA with no Node.js access. All data access goes through `window.api` IPC calls.

### IPC Pattern

All IPC channels follow `resource:action` naming (e.g., `plasmids:create`). Every call returns `IPCResponse<T>` with `{ success, data?, error? }`. Zod schemas validate both the input (in renderer) and output (in main). See `src/main/types/ipc.ts` for full API surface.

### State Management Rules

- **SQLite is the source of truth for all settings** (theme, font size, layout, user info, etc.)
- **Zustand** holds only transient UI state (open modals, current selection) — never persisted to localStorage
- **React Query** handles all DB-backed data with caching and invalidation
- On app start, settings are loaded from SQLite via IPC and applied

### Data Model

Key entities: `plasmids` → `cassettes` (genetic constructs, ordered), `gmos` (transformed organisms), `attachments` (BLOBs). Glossaries: `features` (nucleic acid elements) and `organisms` — both have `uid` and `synced` fields for cloud sync. `settings` table is a singleton (always `id=1`). Credentials (`ice_credentials`, `google_credentials`) are encrypted via Electron `safeStorage`.

### Cloud Sync

No server — uses Sciebo (WebDAV) or Google Drive folder. Published plasmids are exported as `plasmid.json` + `.gb` file into a structured folder hierarchy. A `metadata.json` index file is maintained at the root. Glossaries sync with last-write-wins strategy.

### Two TypeScript configs

- `tsconfig.node.json` — main process (Node.js targets)
- `tsconfig.web.json` — renderer process (browser targets)

Both extend the base `tsconfig.json`.
