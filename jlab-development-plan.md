# jLab — Development Plan
> Based on Julia's three rounds of interviews and the existing ARCHITECTURE.md.
> This is the "what to do next, in what order, and why" document.

---

## Where We Stand

The repo has three planning documents (ARCHITECTURE.md, REQUIREMENTS.md, README.md)
but **zero code**. The architecture was designed before Julia's interviews and needs
several revisions before it can be built against. The priority right now is to close
the gap between the architecture as written and what Julia actually needs, then move
into scaffolding.

---

## What Needs Updating Before Code Starts

The existing ARCHITECTURE.md was written before Julia's input. These things are now
wrong or incomplete and need to be resolved in the docs first:

### 1. Database schema is significantly outdated

The schema in ARCHITECTURE.md reflects GMOCU's old structure, not jLab's new data
model. The following changes come directly from Julia's interviews:

| What needs changing | Why |
|---|---|
| Add `category` column to `plasmids` (user-defined dropdown, FK to new `categories` table) | Julia's "category" field (entry vector, CDS, terminator, etc.) |
| Add `concentration_ng_ul` REAL to `plasmids` | Julia tracks ng/µL per prep |
| Add `date_miniprep` DATE to `plasmids` | Updated when concentration changes |
| Add `sequenced` BOOLEAN to `plasmids` | Yes/no sequencing flag |
| Add `seq_method` TEXT to `plasmids` | 'Sanger' / 'ONT' / other |
| Add `date_sequenced` DATE to `plasmids` | |
| Add `glycerol_stock_id` TEXT to `plasmids` (nullable) | E.g. `CJM001` — may not always exist |
| Add `date_glycerol_stock` DATE to `plasmids` (nullable) | |
| Add `box` TEXT to `plasmids` (nullable) | Physical freezer box |
| Add `public_comment` TEXT to `plasmids` | Team-visible note |
| Add `private_comment` TEXT to `plasmids` | Personal-only note, never published |
| Add `status_color` TEXT to `selection_values` | User-configurable colour per status |
| Add status value `'Trouble'` to seed data | Julia's "trouble in paradise" |
| `attachments.file_data` BLOB → store as file path on disk | Attachments stored as files, not BLOBs |
| Remove `target_rg` from `gmos` table | RG inherited from organism; never per-GMO |
| Add `strain` TEXT to `gmos` | Free text, e.g. 'TOP10', 'GV3101' |
| Add `glycerol_stock_id` TEXT to `gmos` (nullable) | Glycerol stock linked to the GMO |
| Add `date_glycerol_stock` DATE to `gmos` (nullable) | |
| Add `box` TEXT to `gmos` (nullable) | Physical box of the GMO glycerol stock |
| Add new `categories` table | User-defined dropdown values for plasmid category |
| Add `alias_format` TEXT to `settings` | User-configurable alias template |
| Add `auto_create_gmo_enabled` BOOLEAN to `settings` | Optional behaviour, default off |
| Add `auto_create_gmo_organism` TEXT to `settings` | User-defined organism for auto-create (not hardcoded to E. coli) |
| Add `auto_create_gmo_strain` TEXT to `settings` | Strain for auto-create GMO |
| Add status value `'Trouble in Paradise'` to seed data | Julia's exact status name |
| Add `status_colours` TEXT (JSON) to `settings` | Map of status → colour hex |
| Replace `genebank TEXT` in `plasmids` with `gb_file_path TEXT` | GenBank stored as file, not inline text |
| Add `label_templates` TEXT (JSON) to `settings` | Configurable label printing templates |

### 2. appId needs updating

`electron-builder.json` still says `"appId": "com.gmocu.app"`. Should be
`"com.wfrs.jlab"` and `productName` should be `"jLab"`.

### 3. Zustand persistence target is wrong

ARCHITECTURE.md stores UI state (theme, layout) in `localStorage` via Zustand persist.
The decision is that **SQLite is the single source of truth** for all persistent settings.
Theme, font size, layout mode must be read from and written to the `settings` table,
not localStorage. Zustand can hold these values in memory for the session but should
never be the persistence layer.

### 4. Migration runner is unplanned

There is no migration runner described. Because jLab installs on user machines and
users will upgrade from old versions (including from the original GMOCU), we need:
- A migration runner that runs on app start, applies any pending SQL migrations
- A GMOCU legacy import path that reads a `gmocu.db` and migrates it to the jLab schema

This must be designed before schema work begins.

### 5. The table-first UI is not reflected

The component architecture still describes a form-based layout
(`PlasmidTable` + `PlasmidForm` side by side). The primary interface is now an
**inline-editable table** (Excel-style) with a **detail panel** that opens on row click.
The component design needs to reflect:
- Inline cell editing with autosave on blur/row-leave + `beforeunload` catch
- Copy/paste across cells and rows
- Drag-to-fill on ID column
- Per-column sort and filter
- Two-level cassette validation: token-level highlight + row-level Formblatt-Z readiness flag
- Formblatt-Z validation surfaces as table row highlights, not a blocking popup
- GMO entries as fixed organism columns (dynamic, driven by target organisms in Settings)
- Detail panel (click a row → form-style view of all fields, both views in sync)
- Table library: **AG Grid Community**
- Cassette cell: **tag-input library** (dash-separated tokens with per-token glossary validation)
- Autosave: **blur / row-leave**

### 6. Glossary sync rename behaviour is not defined

The current architecture describes silent auto-cascade of feature renames from Google Sheets.
Julia's requirement is **approval-based rename cascade**: when a feature annotation is renamed
in the shared sheet, users see a prompt on next sync before any cascade is applied to their
cassettes. Silent auto-update applies only to non-rename field changes.

---

## Phase 0 — Pre-Coding (Do This First)

These are the planning tasks that must be complete before a single line of app code
is written. Each one is a decision that, if wrong, is expensive to fix later.

---

### Task 0.1 — Finalise the jLab schema
**What:** Rewrite the database schema section of ARCHITECTURE.md with the corrected
table definitions from Julia's interviews (see list above).

**Why now:** Every other task depends on the schema. IPC types, Drizzle models,
migration files, and component data shapes all flow from this.

**Output:** Updated schema in ARCHITECTURE.md, ready to be turned directly into
Drizzle code.

---

### Task 0.2 — Design the migration runner
**What:** Decide how schema migrations work for installed desktop instances.

**The problem:** Users will have jLab installed. When a new version ships with a
schema change, the app must update their database on first launch without data loss.
The old GMOCU handled this with a chain of `ALTER TABLE` statements gated on a version
number. We need something more robust.

**Decision to make:**
- Use Drizzle Kit migrations (auto-generated SQL files, applied in sequence on startup)
- Each migration file is numbered and logged in a `migrations` table
- On app start: check which migrations have not been applied, apply them in order
- If migration fails: show a clear error, never silently corrupt data

**Output:** A written migration strategy in ARCHITECTURE.md (not code yet — just the
design).

---

### Task 0.3 — Design the GMOCU legacy import
**What:** Decide how a user imports their existing `gmocu.db` into jLab.

**The problem:** Julia has a full GMOCU database she wants to keep. The GMOCU schema
and the jLab schema are different. New fields in jLab (concentration, sequencing,
glycerol stock, category, etc.) have no equivalent in GMOCU, so they will be NULL after
import — that's fine and expected.

**Decision to make:**
- Import is a one-time operation triggered from Settings → "Import from GMOCU"
- User selects their `gmocu.db` file via a file picker
- The importer reads each GMOCU table and maps it to the jLab schema
- The field mapping needs to be written out explicitly (GMOCU column → jLab column)
- Credentials from `IceCredentials` are NOT imported (security risk — they were stored
  in plaintext)
- If a plasmid name already exists in jLab: prompt user (skip / overwrite / keep both)

**Output:** A written import mapping table in ARCHITECTURE.md.

---

### Task 0.4 — Design the inline-editable table
**What:** Decide the technical approach for the Excel-style main table before building it.

This is the highest-risk component in the app. An inline-editable table with autosave,
copy/paste, drag-to-fill, and sub-row expansion is significantly more complex than a
standard read-only data table. The wrong library choice here means a painful rewrite.

**Decision to make:**
- Evaluate `@tanstack/react-table` (headless, full control, more work) vs a higher-level
  grid library (`AG Grid Community`, `react-data-grid`) that has copy/paste and
  inline editing built in
- **Recommendation:** `react-data-grid` (by adazzle) or `AG Grid Community Edition`.
  TanStack Table alone does not provide inline editing, clipboard, or drag-fill —
  these would need to be built from scratch on top of it.
- Decide on the autosave strategy: debounce on cell change (300ms) vs save on blur/row change
- Decide on GMO sub-row representation: expandable rows vs fixed organism columns
  (configurable per user, as Julia requested)

**Output:** A decision written in ARCHITECTURE.md: which table library, autosave
strategy, and GMO layout approach.

---

### Task 0.5 — Design the cassette field
**What:** Decide the exact UX and implementation of the cassette inline editor.

This is the most-hated part of the old app. The new design must support:
- Free text entry with `-` as a separator between feature names
- Autocomplete suggestions from the features glossary as the user types each segment
- Soft visual highlighting on segments that don't match the glossary (no popup)
- Copy/paste of the entire cassette string
- The whole thing must work inside a table cell (not a modal/form)

**Decision to make:**
- Use a custom `contenteditable` div with token-highlighting (complex but full control)
- Or use a tag-input / token-field library that can be configured for this use case
- The highlighting of invalid tokens needs to work in real-time as the user types

**Output:** A short design spec in ARCHITECTURE.md describing the cassette cell component.

---

### Task 0.6 — Design the label printing output
**What:** Decide how label printing works end to end.

**Decisions to make:**
- Output format: PDF generated server-side (main process) via `pdfkit` or `jspdf`
- Label template config stored in `settings.label_templates` as JSON
  (define fields, positions, dimensions, font-size auto-scale)
- Two built-in template types: miniprep label, glycerol stock label
- Print action: select one or more rows → print labels for selected → opens PDF

**Output:** Template data structure defined in ARCHITECTURE.md.

---

### Task 0.7 — Update all naming from GMOCU-v2 to jLab
**What:** Audit ARCHITECTURE.md, REQUIREMENTS.md, and README.md for any remaining
`GMOCU-v2`, `gmocu`, or wrong appId references and replace them with `jLab` / `com.wfrs.jlab`.

**Note:** Keep references to the *legacy* GMOCU app by that name (it is still called GMOCU).
Only the new app's own identity should say jLab.

---

## Phase 1 — Scaffold (First Code)

Once all Phase 0 tasks are signed off, these are the first things to build. Nothing in
Phase 2 should start before Phase 1 is complete.

---

### Task 1.1 — Project scaffolding
- Init `electron-vite` project with TypeScript
- Set up folder structure per ARCHITECTURE.md
- Configure ESLint, Prettier, TypeScript strict mode
- Set `appId: "com.wfrs.jlab"`, `productName: "jLab"` in electron-builder config
- Add jLab logo assets to `resources/`
- Confirm dev server + hot reload works on macOS, Windows, Linux

---

### Task 1.2 — Database setup + migration runner
- Write Drizzle schema (`src/main/database/schema.ts`) from the finalised schema (Task 0.1)
- Write initial migration SQL (`migrations/0001_initial.sql`)
- Implement the migration runner (Task 0.2 design → code)
- Seed `selection_values` with: Planned, In Progress, Complete, Trouble, Abandoned
- Smoke test: app starts, creates `jlab.db`, all tables exist, migrations table populated

---

### Task 1.3 — IPC skeleton
- Set up preload script and `contextBridge` exposure
- Implement `registerHandler` wrapper (validation + error handling pattern)
- Register stub handlers for every channel (returning empty data)
- Confirm renderer can call `window.api.invoke(...)` and get a typed response

---

### Task 1.4 — App shell
- Mantine provider + theme setup
- Navigation: sidebar or top tabs (Plasmids / Features / Organisms / Settings)
- Light/dark theme toggle wired to `settings` table
- Routing between views (no content yet — just empty pages with titles)
- Window chrome: jLab icon in title bar

---

## Phase 2 — Core Data Layer (MVP Foundation)

These are the domain features that everything else depends on. Build in this order
because each one is a dependency for the next.

---

### Task 2.1 — Settings screen + GMOCU import
- Settings form: name, initials, institution, GMO Az./Anlage Nr.
- Settings form: user-defined categories (add/remove items for the Category dropdown)
- Settings form: status colours (colour picker per status)
- Settings form: alias format template
- Settings form: auto-create E. coli GMO toggle + default strain field
- Settings form: favourite organisms + target organisms lists
- **GMOCU legacy import** (Task 0.3 design → code): file picker → read `gmocu.db`
  → map to jLab schema → insert into local DB → show import summary

---

### Task 2.2 — Organisms glossary
- Inline-editable table: full name, short name, RG
- Add / delete rows
- Sort and filter
- Excel export (all / used)
- Excel import
- Validation: short name must be unique

This is built before Features because Features references Organisms in its source
organism field, and before Plasmids because GMO entries reference Organisms.

---

### Task 2.3 — Features (Nucleic Acids) glossary
- Inline-editable table: annotation, alias, risk, source organism
- Autocomplete on source organism field (from Organisms glossary)
- Add / delete rows
- Sort and filter
- Excel export (all / used)
- Excel import
- Validation: annotation name must be unique
- Soft highlight for rows where annotation is referenced in a cassette but the
  glossary entry was later deleted (orphan detection)

---

### Task 2.4 — Plasmid table (read + create + delete)
- Main inline-editable table with all essential columns (§2 of requirements synthesis)
- Row-level colour coding from status
- Autosave on cell blur (debounced)
- Add new row (blank or from GenBank auto-match)
- Delete row (with confirmation)
- Cassette cell with token highlighting (Task 0.5 design → code)
- Category dropdown (values from user-defined categories in Settings)
- Status dropdown (values from `selection_values`)

---

### Task 2.5 — Plasmid table (full editing features)
- Copy/paste: single cell, multi-cell range, full row
- Drag-to-fill on ID column (auto-increment)
- Global search (Ctrl+F across all columns)
- Per-column sort and filter
- Expandable row for GMO sub-entries (or fixed organism columns if configured)
- Duplicate row
- GenBank file attach (drag/drop or file picker)
- GenBank auto-match: scan a folder, match `.gb` files by plasmid ID in filename,
  link automatically
- Attachment file attach (`.ab1`, PDF, etc.) stored on disk
- Private / public comment fields
- Alias auto-generation based on format template from Settings

---

### Task 2.6 — GMO entries
- GMO sub-row or column-per-organism view (per Task 0.4 decision)
- Fields: organism (from glossary), strain (free text), date generated, date destroyed,
  glycerol stock ID, date glycerol stock, box, approval
- RG auto-populated from organism, read-only
- Batch-add favourite organisms button (clearly labelled, not a smiley)
- Auto-create E. coli GMO on new plasmid (if enabled in settings)
- Copy/paste support for GMO rows

---

## Phase 3 — Compliance & Reporting

### Task 3.1 — Formblatt-Z generation
- Pre-flight validation: check all GMOs have required fields, surface missing data
  in the table before generating (highlight incomplete rows)
- Date range picker
- Generate Excel output **identical to GMOCU's format** (use GMOCU output as
  the reference — do not invent a new format)
- Both German and English versions
- Save to user-selected path

### Task 3.2 — Plasmid list export
- Export the current table view to Excel
- Column selection: user picks which columns to include
- Respects current filters (export what you see)

### Task 3.3 — Label printing
- Label template editor in Settings (Task 0.6 design → code)
- Select one or more plasmid rows → print labels
- Two template types: miniprep label, glycerol stock label
- Output: PDF laid out as a grid
- Font auto-scales to fit label dimensions

---

## Phase 4 — Glossary Sync

### Task 4.1 — Google Sheets sync (Features)
- safeStorage-encrypted Google service account JSON
- Push new local features up, pull new online features down
- Propagate annotation renames from master sheet → update all cassette references
- Delete local entries invalidated online
- Sync log

### Task 4.2 — Google Sheets sync (Organisms)
- Same mechanism as features

---

## Phase 5 — Cloud Integrations

### Task 5.1 — GenBank + attachment upload to Google Drive
- Per-plasmid upload of `.gb` file and attachments to configured Drive folder
- Folder structure: `/jLab-uploads/<initials>/<plasmid-id>/`
- Zip option (faster upload)

### Task 5.2 — JBEI/ice integration
- Credentials via safeStorage
- Upload plasmid entry + GenBank file
- Update existing entry
- Test connection button in Settings

### Task 5.3 — Filebrowser integration
- Credentials via safeStorage
- Upload files to configured Filebrowser server
- (macOS/Linux only — note in Settings)

---

## Phase 6 — Team Library

### Task 6.1 — Publish to team library
- Export a plasmid as structured JSON + `.gb` file to the configured shared folder
- `metadata.json` index file for fast browsing without opening individual folders
- Private comment is stripped before export; public comment is included

### Task 6.2 — Browse team library
- Read `metadata.json` from shared folder
- Display as searchable/filterable table
- Search by backbone, cassette content, specific genetic part, creator
- Import a team plasmid into personal workspace (creates a copy)

---

## Phase 7 — Polish & Distribution

### Task 7.1 — Maintenance checks
- Check glossary completeness (missing fields, duplicates)
- Check plasmid completeness for Formblatt-Z

### Task 7.2 — Cross-platform QA
- Test on macOS, Windows, Linux
- Fix platform-specific rendering issues

### Task 7.3 — Packaging + distribution
- `electron-builder` config finalised
- macOS: DMG + code signing
- Windows: NSIS installer
- Linux: AppImage

---

## Summary: What To Do Right Now

In order, before any code:

1. **Task 0.1** — Rewrite the schema in ARCHITECTURE.md with all Julia-driven changes
2. **Task 0.2** — Write the migration runner design
3. **Task 0.3** — Write the GMOCU import field mapping
4. **Task 0.4** — Decide on the table library + autosave strategy
5. **Task 0.5** — Design the cassette cell component
6. **Task 0.6** — Define the label template data structure
7. **Task 0.7** — Naming audit across all docs

Then the first code sprint is Phase 1 (scaffold) → Phase 2.1–2.3 (settings + glossaries)
→ Phase 2.4–2.6 (the plasmid table, which is the whole app).

The plasmid table (Tasks 2.4 + 2.5) is the largest and riskiest single task.
It should be prototyped early — get the inline-editing + autosave + copy/paste
working with dummy data before wiring it to the real IPC/database layer.

---

## Decisions Still Open (Need Robin's Call)

These are not Julia's domain — they are your technical decisions:

| Decision | Options | Notes |
|---|---|---|
| Table library | `react-data-grid` vs `AG Grid Community` vs custom TanStack | See Task 0.4 |
| Cassette cell approach | `contenteditable` + custom tokeniser vs tag-input library | See Task 0.5 |
| GMO layout default | Fixed organism columns vs expandable sub-rows | Julia wants columns for small sets |
| Autosave trigger | Debounce on change (300ms) vs on blur/row-leave | Blur is safer for performance |
| Attachment storage path | Next to `jlab.db` in `~/jLab/attachments/<plasmid-id>/` | Recommended |

---

*Plan compiled from: julia-requirements-synthesis.md, ARCHITECTURE.md (wfrs/GMOCU-v2), gmocu.sql (beyerh/gmocu).*
