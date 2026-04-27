# JLab Architecture

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Process Architecture](#process-architecture)
5. [Data Architecture](#data-architecture)
6. [IPC Communication Layer](#ipc-communication-layer)
7. [State Management](#state-management)
8. [Component Architecture](#component-architecture)
9. [External Integrations](#external-integrations)
10. [Security Model](#security-model)
11. [Build & Deployment](#build--deployment)
12. [Development Workflow](#development-workflow)

---

## 1. System Overview

### Application Purpose

Desktop lab management tool for the Jores Lab — covering GMO plasmid documentation (German GenTAufzV compliance) and broader synthetic/molecular biology workflows.

### Core Capabilities

* **Data Management**: CRUD operations for plasmids, features, organisms, GMOs
* **File Handling**: GenBank files, attachments (BLOB), Excel imports/exports
* **External Sync**: JBEI/ice, Google Sheets/Drive, Filebrowser
* **Report Generation**: German Formblatt-Z compliance reports
* **Offline-First**: All data stored locally in SQLite

### Design Principles

1. **Separation of Concerns**: Clear boundaries between UI, business logic, and data
2. **Type Safety**: TypeScript strict mode throughout
3. **Security**: Database isolated in main process, no direct renderer access
4. **Performance**: Efficient IPC, React Query caching, optimistic updates
5. **User Experience**: Offline-capable, fast loads, clear feedback

---

## 2. Technology Stack

### Core Framework

```
Electron 28+              Desktop runtime
React 18                  UI framework
TypeScript 5+             Language (strict mode)
electron-vite             Build tool with HMR
```

### Data Layer

```
better-sqlite3            Native SQLite driver
Drizzle ORM               Type-safe query builder
drizzle-kit               Schema migrations
```

### State Management

```
Zustand                   Global UI state (ephemeral only — not settings source of truth)
React Query (TanStack)    Server/DB state & caching
React Hook Form           Form state
Zod                       Schema validation
```

> **Decision**: SQLite is the single source of truth for all settings (theme, layout, font size, etc.).
> Zustand holds only transient UI state (e.g. which modal is open, current selection). On app start,
> settings are loaded from SQLite via IPC and applied. Zustand is never persisted to localStorage for settings.

### UI Components

```
Mantine 7                 Component library
@mantine/core             Core components
@mantine/hooks            React hooks
@mantine/form             Form utilities
@mantine/notifications    Toast notifications
@mantine/modals           Modal management
@mantine/dates            Date pickers
@tanstack/react-table     Data tables
```

### File & Data Processing

```
exceljs                   Excel generation/parsing
fuse.js                   Fuzzy search
axios                     HTTP client
googleapis                Google APIs
date-fns                  Date utilities
react-dropzone            File uploads
```

### Developer Tools

```
ESLint                    Linting
Prettier                  Code formatting
Vitest                    Unit testing (future)
Electron Builder          Packaging & distribution
```

---

## 3. Project Structure

```
jlab/
├── src/
│   ├── main/                      # Electron main process
│   │   ├── index.ts               # Main entry point
│   │   ├── ipc/                   # IPC handlers
│   │   │   ├── index.ts           # IPC registration
│   │   │   ├── plasmids.ts        # Plasmid operations
│   │   │   ├── features.ts        # Feature operations
│   │   │   ├── organisms.ts       # Organism operations
│   │   │   ├── gmos.ts            # GMO operations
│   │   │   ├── files.ts           # File operations
│   │   │   ├── settings.ts        # Settings operations
│   │   │   └── sync.ts            # External sync operations
│   │   ├── database/              # Database layer
│   │   │   ├── index.ts           # DB initialization
│   │   │   ├── schema.ts          # Drizzle schema
│   │   │   ├── migrations/        # SQL migrations
│   │   │   │   └── 0001_initial.sql
│   │   │   └── queries/           # Reusable queries
│   │   │       ├── plasmids.ts
│   │   │       ├── features.ts
│   │   │       └── ...
│   │   ├── services/              # Business logic
│   │   │   ├── excel.ts           # Excel generation
│   │   │   ├── genbank.ts         # GenBank parsing
│   │   │   ├── reports.ts         # Report generation
│   │   │   ├── ice-client.ts      # JBEI/ice integration
│   │   │   ├── google.ts          # Google APIs
│   │   │   └── filebrowser.ts     # Filebrowser client
│   │   ├── types/                 # Shared types
│   │   │   └── ipc.ts             # IPC type definitions
│   │   └── utils/                 # Utilities
│   │       ├── file-system.ts
│   │       └── validation.ts
│   │
│   ├── renderer/                  # React application
│   │   ├── src/
│   │   │   ├── main.tsx           # React entry point
│   │   │   ├── App.tsx            # Root component
│   │   │   ├── routes/            # Route components
│   │   │   │   ├── PlasmidsView.tsx
│   │   │   │   ├── FeaturesView.tsx
│   │   │   │   ├── OrganismsView.tsx
│   │   │   │   ├── GMOsView.tsx
│   │   │   │   └── SettingsView.tsx
│   │   │   ├── components/        # Reusable components
│   │   │   │   ├── tables/
│   │   │   │   │   ├── PlasmidTable.tsx
│   │   │   │   │   ├── FeatureTable.tsx
│   │   │   │   │   └── ...
│   │   │   │   ├── forms/
│   │   │   │   │   ├── PlasmidForm.tsx
│   │   │   │   │   ├── FeatureForm.tsx
│   │   │   │   │   └── ...
│   │   │   │   ├── shared/
│   │   │   │   │   ├── AutocompleteInput.tsx
│   │   │   │   │   ├── FileUpload.tsx
│   │   │   │   │   └── StatusBadge.tsx
│   │   │   │   └── layout/
│   │   │   │       ├── AppShell.tsx
│   │   │   │       ├── Sidebar.tsx
│   │   │   │       └── Header.tsx
│   │   │   ├── hooks/             # Custom hooks
│   │   │   │   ├── useIPC.ts      # IPC communication
│   │   │   │   ├── usePlasmids.ts # React Query hooks
│   │   │   │   ├── useFeatures.ts
│   │   │   │   └── ...
│   │   │   ├── store/             # Zustand stores
│   │   │   │   ├── ui.ts          # Transient UI state only
│   │   │   │   └── selection.ts   # Current selections
│   │   │   ├── lib/               # Libraries & utilities
│   │   │   │   ├── ipc-client.ts  # IPC wrapper
│   │   │   │   ├── query-client.ts # React Query setup
│   │   │   │   ├── fuzzy-search.ts # Fuse.js wrapper
│   │   │   │   └── validation.ts   # Zod schemas
│   │   │   ├── types/             # TypeScript types
│   │   │   │   ├── domain.ts      # Domain models
│   │   │   │   └── api.ts         # API types
│   │   │   └── styles/            # Global styles
│   │   │       └── global.css
│   │   ├── index.html
│   │   └── vite.config.ts
│   │
│   └── preload/                   # Preload scripts
│       ├── index.ts               # Exposed APIs
│       └── types.d.ts             # Window type augmentation
│
├── resources/                     # Static resources
│   ├── icons/
│   └── templates/                 # Excel templates
│
├── electron.vite.config.ts        # Electron-vite config
├── drizzle.config.ts              # Drizzle ORM config
├── tsconfig.json                  # TypeScript config (base)
├── tsconfig.node.json             # Main process TS config
├── tsconfig.web.json              # Renderer process TS config
├── package.json
├── .eslintrc.json
├── .prettierrc
└── README.md
```

---

## 4. Process Architecture

### Electron Multi-Process Model

```
┌─────────────────────────────────────────────────────────────┐
│                      MAIN PROCESS (Node.js)                  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   Database   │  │  File System │  │  External APIs  │  │
│  │ better-sqlite│  │  Operations  │  │  (Google, Ice)  │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘  │
│         │                 │                    │            │
│         └─────────────────┴────────────────────┘            │
│                           │                                 │
│                  ┌────────▼────────┐                        │
│                  │  IPC Handlers   │                        │
│                  │   (Typed API)   │                        │
│                  └────────┬────────┘                        │
└───────────────────────────┼─────────────────────────────────┘
                            │
                     contextBridge
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                   PRELOAD SCRIPT (Sandboxed)                 │
│                                                              │
│              window.api = { invoke, on, off }                │
│                                                              │
└───────────────────────────┬─────────────────────────────────┘
                            │
                       IPC Channel
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                  RENDERER PROCESS (Chromium)                 │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    React Application                  │  │
│  │                                                       │  │
│  │  ┌─────────────┐  ┌────────────┐  ┌──────────────┐ │  │
│  │  │  React      │  │  Zustand   │  │   Mantine    │ │  │
│  │  │  Components │  │  Stores    │  │   UI         │ │  │
│  │  └──────┬──────┘  └─────┬──────┘  └──────────────┘ │  │
│  │         │               │                           │  │
│  │         └───────────────┴───────────┐               │  │
│  │                                     │               │  │
│  │                          ┌──────────▼──────────┐    │  │
│  │                          │   React Query       │    │  │
│  │                          │   (Data Cache)      │    │  │
│  │                          └──────────┬──────────┘    │  │
│  │                                     │               │  │
│  │                          ┌──────────▼──────────┐    │  │
│  │                          │   IPC Client        │    │  │
│  │                          │   window.api        │    │  │
│  │                          └─────────────────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Security Boundaries

1. **Context Isolation**: Enabled (default in Electron 28+)
2. **Node Integration**: Disabled in renderer
3. **contextBridge**: Only exposed APIs via preload
4. **CSP**: Content Security Policy headers
5. **Database Access**: Only via IPC, never direct

---

## 5. Data Architecture

### Database Schema (SQLite)

#### Core Tables

```
// Plasmids - Main entity
table: plasmids {
  id: integer (PK, autoincrement)
  name: text (e.g., "pXX000")
  alias: text (nullable)
  status_id: integer (FK → selection_values)
  purpose: text (nullable)
  summary: text (nullable)
  genebank: text (GenBank file content, nullable)
  gb_name: text (filename, nullable)
  clone: text (nullable)
  backbone_vector: text (nullable)
  marker: text (nullable)
  target_rg: integer (Risk Group 1-4, default: 1)
  generated_date: date (default: now)
  destroyed_date: date (nullable)
  created_at: timestamp (default: now)
  updated_at: timestamp (auto-updated)
}

// Cassettes - Genetic constructs
table: cassettes {
  id: integer (PK, autoincrement)
  plasmid_id: integer (FK → plasmids, cascade)
  content: text (e.g., "pLac-gfp-term")
  order: integer (display order)
  created_at: timestamp
}

// GMOs - Generated organisms
table: gmos {
  id: integer (PK, autoincrement)
  plasmid_id: integer (FK → plasmids, cascade)
  organism_name: text
  summary: text (nullable)
  approval: text (nullable)
  target_rg: integer (Risk Group)
  generated_date: date
  destroyed_date: date (nullable)
  created_at: timestamp
  updated_at: timestamp
}

// Features - Nucleic acid glossary
table: features {
  id: integer (PK, autoincrement)
  annotation: text (unique, indexed)
  alias: text (nullable)
  risk: text (enum: 'none', 'low', 'medium', 'high')
  organism: text (source organism)
  uid: text (unique, for sync)
  synced: boolean (default: false)
  created_at: timestamp
  updated_at: timestamp
}

// Organisms - Organism glossary
table: organisms {
  id: integer (PK, autoincrement)
  full_name: text
  short_name: text (unique, indexed)
  risk_group: integer (1-4)
  uid: text (unique, for sync)
  synced: boolean (default: false)
  created_at: timestamp
  updated_at: timestamp
}

// Attachments - File storage
table: attachments {
  id: integer (PK, autoincrement)
  plasmid_id: integer (FK → plasmids, cascade)
  filename: text
  file_data: blob
  file_size: integer
  mime_type: text
  created_at: timestamp
}

// SelectionValues - Status dropdown
table: selection_values {
  id: integer (PK, autoincrement)
  value: text (unique)
}
-- Pre-populated: 'Planned', 'In Progress', 'Complete', 'Abandoned'

// Settings - Application configuration (singleton, source of truth)
// Theme, layout, font size, and all user preferences live here.
// The renderer reads these on startup via IPC and must not cache them in localStorage.
table: settings {
  id: integer (PK, always 1)
  initials: text
  institution_name: text
  institution_az: text (Aktenzeichen)
  institution_anlage: text (Anlage Nr.)
  theme: text (default: 'light')
  font_size: integer (default: 14)
  layout_mode: text ('vertical' | 'horizontal')
  duplicate_gmos_on_copy: boolean (default: false)
  upload_completed_only: boolean (default: false)
  autosync_sheets: boolean (default: false)
  zip_before_upload: boolean (default: true)
  target_organisms: text[] (JSON array)
  favorite_organisms: text[] (JSON array)
  updated_at: timestamp
}

// IceCredentials - External service credentials
table: ice_credentials {
  id: integer (PK, autoincrement)
  alias: text
  ice_instance: text (URL)
  ice_token: text (encrypted via safeStorage)
  filebrowser_instance: text (URL, nullable)
  filebrowser_user: text (nullable)
  filebrowser_password: text (encrypted via safeStorage, nullable)
  created_at: timestamp
  updated_at: timestamp
}

// GoogleCredentials - Google API credentials
table: google_credentials {
  id: integer (PK, always 1)
  sheets_id: text (nullable)
  drive_folder_id: text (nullable)
  service_account_json: text (encrypted via safeStorage, nullable)
  updated_at: timestamp
}

// SyncLog - Audit trail
table: sync_log {
  id: integer (PK, autoincrement)
  entity_type: text ('features' | 'organisms')
  action: text ('import' | 'export' | 'update')
  item_count: integer
  status: text ('success' | 'error')
  message: text (nullable)
  created_at: timestamp
}

// Schema version tracking
table: migrations {
  id: integer (PK, autoincrement)
  version: integer (unique)
  name: text
  executed_at: timestamp
}
```

### Indexes

```
CREATE INDEX idx_plasmids_name ON plasmids(name);
CREATE INDEX idx_plasmids_status ON plasmids(status_id);
CREATE INDEX idx_features_annotation ON features(annotation);
CREATE INDEX idx_organisms_short_name ON organisms(short_name);
CREATE INDEX idx_gmos_plasmid ON gmos(plasmid_id);
CREATE INDEX idx_cassettes_plasmid ON cassettes(plasmid_id);
CREATE INDEX idx_attachments_plasmid ON attachments(plasmid_id);
```

### Data Access Patterns

#### Read Operations

```
// Most common queries (optimize these)
1. List plasmids (paginated, filtered by status)
2. Get plasmid with cassettes + GMOs + attachments (single query with joins)
3. Search features by annotation (autocomplete)
4. List organisms filtered by risk group
5. Get all GMOs for report generation
```

#### Write Operations

```
// Transaction boundaries
1. Create plasmid → Insert cassettes → Return full object
2. Update plasmid → Update cassettes (delete old + insert new)
3. Duplicate plasmid → Copy plasmid + cassettes + optionally GMOs
4. Delete plasmid → Cascade deletes cassettes, GMOs, attachments
5. Import from Excel → Batch insert with duplicate checking
```

#### Data Integrity Rules

```
1. Plasmid names must be unique
2. Feature annotations must be unique
3. Organism short_names must be unique
4. Cannot delete features/organisms referenced in cassettes/GMOs
5. Settings table always has exactly 1 row
6. UIDs (for sync) must be globally unique
```

---

## 6. IPC Communication Layer

### API Design Philosophy

1. **Type-Safe**: All IPC calls fully typed (input + output)
2. **Channel Naming**: `resource:action` pattern (e.g., `plasmids:create`)
3. **Error Handling**: Consistent error structure
4. **Validation**: Zod schemas on both ends
5. **No Leaky Abstractions**: Main process knows nothing about React

### IPC Channel Specification

```typescript
// src/main/types/ipc.ts
import { z } from 'zod';

// Base response structure
export interface IPCResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

// ========== PLASMIDS ==========

export namespace PlasmidsIPC {
  export const listSchema = z.object({
    page: z.number().default(1),
    pageSize: z.number().default(50),
    statusId: z.number().optional(),
    searchTerm: z.string().optional(),
  });
  export type ListParams = z.infer<typeof listSchema>;
  export type ListResult = {
    plasmids: Array<Plasmid & { statusValue: string }>;
    total: number;
    page: number;
    pageSize: number;
  };

  export const getByIdSchema = z.object({
    id: z.number(),
    include: z.object({
      cassettes: z.boolean().default(true),
      gmos: z.boolean().default(true),
      attachments: z.boolean().default(false),
    }).optional(),
  });
  export type GetByIdParams = z.infer<typeof getByIdSchema>;
  export type GetByIdResult = PlasmidWithRelations;

  export const createSchema = z.object({
    name: z.string().min(1),
    alias: z.string().optional(),
    statusId: z.number(),
    purpose: z.string().optional(),
    summary: z.string().optional(),
    genebank: z.string().optional(),
    gbName: z.string().optional(),
    clone: z.string().optional(),
    backboneVector: z.string().optional(),
    marker: z.string().optional(),
    targetRg: z.number().min(1).max(4).default(1),
    generatedDate: z.date().optional(),
    cassettes: z.array(z.object({
      content: z.string(),
      order: z.number(),
    })).optional(),
  });
  export type CreateParams = z.infer<typeof createSchema>;
  export type CreateResult = PlasmidWithRelations;

  export const updateSchema = createSchema.extend({ id: z.number() });
  export type UpdateParams = z.infer<typeof updateSchema>;
  export type UpdateResult = PlasmidWithRelations;

  export const deleteSchema = z.object({ id: z.number() });
  export type DeleteParams = z.infer<typeof deleteSchema>;
  export type DeleteResult = { id: number };

  export const duplicateSchema = z.object({
    id: z.number(),
    includeGmos: z.boolean().default(false),
  });
  export type DuplicateParams = z.infer<typeof duplicateSchema>;
  export type DuplicateResult = PlasmidWithRelations;

  export const uploadSchema = z.object({
    id: z.number(),
    targets: z.array(z.enum(['ice', 'gdrive', 'filebrowser'])),
  });
  export type UploadParams = z.infer<typeof uploadSchema>;
  export type UploadResult = {
    ice?: { success: boolean; url?: string; error?: string };
    gdrive?: { success: boolean; url?: string; error?: string };
    filebrowser?: { success: boolean; url?: string; error?: string };
  };
}

// ========== FEATURES ==========

export namespace FeaturesIPC {
  export const listSchema = z.object({
    searchTerm: z.string().optional(),
    risk: z.enum(['none', 'low', 'medium', 'high']).optional(),
  });
  export type ListParams = z.infer<typeof listSchema>;
  export type ListResult = Feature[];

  export const createSchema = z.object({
    annotation: z.string().min(1),
    alias: z.string().optional(),
    risk: z.enum(['none', 'low', 'medium', 'high']),
    organism: z.string(),
    uid: z.string().optional(),
  });
  export type CreateParams = z.infer<typeof createSchema>;
  export type CreateResult = Feature;

  export const updateSchema = createSchema.extend({ id: z.number() });
  export type UpdateParams = z.infer<typeof updateSchema>;
  export type UpdateResult = Feature;

  export const deleteSchema = z.object({ id: z.number() });
  export type DeleteParams = z.infer<typeof deleteSchema>;
  export type DeleteResult = { id: number };

  export const importExcelSchema = z.object({ filePath: z.string() });
  export type ImportExcelParams = z.infer<typeof importExcelSchema>;
  export type ImportExcelResult = { imported: number; skipped: number; errors: string[] };

  export const exportExcelSchema = z.object({
    filePath: z.string(),
    includeUnused: z.boolean().default(false),
  });
  export type ExportExcelParams = z.infer<typeof exportExcelSchema>;
  export type ExportExcelResult = { filePath: string };

  export const syncSheetsSchema = z.object({
    direction: z.enum(['download', 'upload', 'both']),
  });
  export type SyncSheetsParams = z.infer<typeof syncSheetsSchema>;
  export type SyncSheetsResult = {
    downloaded: number;
    uploaded: number;
    updated: number;
    errors: string[];
  };
}

// ========== ORGANISMS ==========

export namespace OrganismsIPC {
  // Follow same pattern as FeaturesIPC
}

// ========== GMOS ==========

export namespace GMOsIPC {
  export const listSchema = z.object({ plasmidId: z.number().optional() });
  export type ListParams = z.infer<typeof listSchema>;
  export type ListResult = GMO[];

  export const generateReportSchema = z.object({
    filePath: z.string(),
    language: z.enum(['de', 'en']).default('de'),
  });
  export type GenerateReportParams = z.infer<typeof generateReportSchema>;
  export type GenerateReportResult = { filePath: string };
}

// ========== FILES ==========

export namespace FilesIPC {
  export const uploadAttachmentSchema = z.object({
    plasmidId: z.number(),
    filePath: z.string(),
  });
  export type UploadAttachmentParams = z.infer<typeof uploadAttachmentSchema>;
  export type UploadAttachmentResult = Attachment;

  export const downloadAttachmentSchema = z.object({
    attachmentId: z.number(),
    savePath: z.string(),
  });
  export type DownloadAttachmentParams = z.infer<typeof downloadAttachmentSchema>;
  export type DownloadAttachmentResult = { filePath: string };

  export const openFileDialogSchema = z.object({
    title: z.string().optional(),
    filters: z.array(z.object({
      name: z.string(),
      extensions: z.array(z.string()),
    })).optional(),
    properties: z.array(z.enum(['openFile', 'openDirectory', 'multiSelections'])).optional(),
  });
  export type OpenFileDialogParams = z.infer<typeof openFileDialogSchema>;
  export type OpenFileDialogResult = { filePaths: string[] };
}

// ========== SETTINGS ==========

export namespace SettingsIPC {
  export type GetResult = Settings;

  export const updateSchema = z.object({
    initials: z.string().optional(),
    institutionName: z.string().optional(),
    institutionAz: z.string().optional(),
    institutionAnlage: z.string().optional(),
    theme: z.string().optional(),
    fontSize: z.number().optional(),
    layoutMode: z.enum(['vertical', 'horizontal']).optional(),
    duplicateGmosOnCopy: z.boolean().optional(),
    uploadCompletedOnly: z.boolean().optional(),
    autosyncSheets: z.boolean().optional(),
    zipBeforeUpload: z.boolean().optional(),
    targetOrganisms: z.array(z.string()).optional(),
    favoriteOrganisms: z.array(z.string()).optional(),
  });
  export type UpdateParams = z.infer<typeof updateSchema>;
  export type UpdateResult = Settings;
}

// ========== APP ==========

export namespace AppIPC {
  export type GetVersionResult = { version: string };
  export type GetUserDataPathResult = { path: string };

  export const openExternalSchema = z.object({ url: z.string().url() });
  export type OpenExternalParams = z.infer<typeof openExternalSchema>;
  export type OpenExternalResult = { success: boolean };
}
```

### Channel Registration Pattern

```typescript
// src/main/ipc/index.ts

import { ipcMain } from 'electron';
import { z } from 'zod';
import type { IPCResponse } from '../types/ipc';

export function registerHandler<I, O>(
  channel: string,
  schema: z.ZodSchema<I>,
  handler: (input: I) => Promise<O>
) {
  ipcMain.handle(channel, async (event, input: unknown): Promise<IPCResponse<O>> => {
    try {
      const validatedInput = schema.parse(input);
      const result = await handler(validatedInput);
      return { success: true, data: result };
    } catch (error) {
      console.error(`IPC handler error [${channel}]:`, error);
      if (error instanceof z.ZodError) {
        return { success: false, error: { message: 'Validation error', code: 'VALIDATION_ERROR', details: error.errors } };
      }
      return { success: false, error: { message: error instanceof Error ? error.message : 'Unknown error', code: 'INTERNAL_ERROR' } };
    }
  });
}

export function registerAllHandlers() {
  registerHandler('plasmids:list', PlasmidsIPC.listSchema, handleListPlasmids);
  registerHandler('plasmids:getById', PlasmidsIPC.getByIdSchema, handleGetPlasmidById);
  registerHandler('plasmids:create', PlasmidsIPC.createSchema, handleCreatePlasmid);
  registerHandler('plasmids:update', PlasmidsIPC.updateSchema, handleUpdatePlasmid);
  registerHandler('plasmids:delete', PlasmidsIPC.deleteSchema, handleDeletePlasmid);
  registerHandler('plasmids:duplicate', PlasmidsIPC.duplicateSchema, handleDuplicatePlasmid);
  registerHandler('plasmids:upload', PlasmidsIPC.uploadSchema, handleUploadPlasmid);
  registerHandler('features:list', FeaturesIPC.listSchema, handleListFeatures);
  registerHandler('features:create', FeaturesIPC.createSchema, handleCreateFeature);
  // ... etc
}
```

### Preload Script

```typescript
// src/preload/index.ts

import { contextBridge, ipcRenderer } from 'electron';
import type { IPCResponse } from '../main/types/ipc';

function createIPCInvoker() {
  return {
    invoke: async <T>(channel: string, data?: unknown): Promise<IPCResponse<T>> => {
      return ipcRenderer.invoke(channel, data);
    },
    on: (channel: string, callback: (...args: unknown[]) => void) => {
      const subscription = (_event: unknown, ...args: unknown[]) => callback(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    },
  };
}

contextBridge.exposeInMainWorld('api', createIPCInvoker());
export type IPCClient = ReturnType<typeof createIPCInvoker>;
```

---

## 7. State Management

### Three-Layer State Strategy

```
┌─────────────────────────────────────────────┐
│         Layer 1: SQLite (via React Query)   │
│   (Persistent State — single source of truth)│
│                                             │
│  - Plasmids, Features, Organisms, GMOs     │
│  - Settings (theme, layout, font size, …)  │
│  - Manual cache invalidation on mutation   │
│  - staleTime: 30s (short, DB is local)     │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│         Layer 2: Zustand                    │
│   (Transient UI State — never persisted)    │
│                                             │
│  - Current tab/view                         │
│  - Selected plasmid/feature/organism ID     │
│  - Table filters & sort state               │
│  - Modal open/close state                   │
│                                             │
│  ⚠ Zustand does NOT own theme, layout,     │
│    or font size. Read those from SQLite.    │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│         Layer 3: React Hook Form            │
│   (Form State — ephemeral)                  │
│                                             │
│  - Form field values                        │
│  - Validation errors                        │
│  - Dirty/touched state                      │
│  - Submit state                             │
└─────────────────────────────────────────────┘
```

### React Query Configuration

```typescript
// src/renderer/src/lib/query-client.ts

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Short staleTime — DB is local so fetches are cheap.
      // Primary freshness mechanism is manual invalidateQueries() after mutations.
      staleTime: 30 * 1000, // 30 seconds

      // Garbage collection: 10 minutes
      gcTime: 10 * 60 * 1000,

      // Refetch when user returns to the window (catches external DB changes)
      refetchOnWindowFocus: true,

      // Don't refetch on mount if data is within staleTime
      refetchOnMount: false,

      // No network reconnect refetch (local DB only)
      refetchOnReconnect: false,

      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Query keys factory
export const queryKeys = {
  plasmids: {
    all: ['plasmids'] as const,
    lists: () => [...queryKeys.plasmids.all, 'list'] as const,
    list: (filters: PlasmidsIPC.ListParams) => [...queryKeys.plasmids.lists(), filters] as const,
    details: () => [...queryKeys.plasmids.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.plasmids.details(), id] as const,
  },
  features: {
    all: ['features'] as const,
    lists: () => [...queryKeys.features.all, 'list'] as const,
    list: (filters?: FeaturesIPC.ListParams) => [...queryKeys.features.lists(), filters] as const,
  },
  organisms: {
    all: ['organisms'] as const,
    lists: () => [...queryKeys.organisms.all, 'list'] as const,
    list: (filters?: OrganismsIPC.ListParams) => [...queryKeys.organisms.lists(), filters] as const,
  },
  gmos: {
    all: ['gmos'] as const,
    lists: () => [...queryKeys.gmos.all, 'list'] as const,
    list: (filters?: GMOsIPC.ListParams) => [...queryKeys.gmos.lists(), filters] as const,
  },
  settings: ['settings'] as const,
};
```

### React Query Hooks

```typescript
// src/renderer/src/hooks/usePlasmids.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { plasmidsAPI } from '@/lib/ipc-client';
import { queryKeys } from '@/lib/query-client';

export function usePlasmids(params: PlasmidsIPC.ListParams) {
  return useQuery({
    queryKey: queryKeys.plasmids.list(params),
    queryFn: () => plasmidsAPI.list(params),
  });
}

export function usePlasmid(id: number, include?: PlasmidsIPC.GetByIdParams['include']) {
  return useQuery({
    queryKey: queryKeys.plasmids.detail(id),
    queryFn: () => plasmidsAPI.getById({ id, include }),
    enabled: !!id,
  });
}

export function useCreatePlasmid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: plasmidsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plasmids.lists() });
    },
  });
}

export function useUpdatePlasmid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: plasmidsAPI.update,
    onMutate: async (updatedPlasmid) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.plasmids.detail(updatedPlasmid.id) });
      const previousPlasmid = queryClient.getQueryData(queryKeys.plasmids.detail(updatedPlasmid.id));
      queryClient.setQueryData(queryKeys.plasmids.detail(updatedPlasmid.id), updatedPlasmid);
      return { previousPlasmid };
    },
    onError: (err, updatedPlasmid, context) => {
      if (context?.previousPlasmid) {
        queryClient.setQueryData(queryKeys.plasmids.detail(updatedPlasmid.id), context.previousPlasmid);
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plasmids.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.plasmids.lists() });
    },
  });
}

export function useDeletePlasmid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: plasmidsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plasmids.all });
    },
  });
}
```

### Zustand Stores

```typescript
// src/renderer/src/store/ui.ts
// Transient UI state only — no settings, no theme, no layout.

import { create } from 'zustand';

interface UIState {
  currentView: 'plasmids' | 'features' | 'organisms' | 'gmos' | 'settings';
  setCurrentView: (view: UIState['currentView']) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentView: 'plasmids',
  setCurrentView: (view) => set({ currentView: view }),
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));
```

```typescript
// src/renderer/src/store/selection.ts

import { create } from 'zustand';

interface SelectionState {
  selectedPlasmidId: number | null;
  selectedFeatureId: number | null;
  selectedOrganismId: number | null;
  selectedGMOId: number | null;
  setSelectedPlasmidId: (id: number | null) => void;
  setSelectedFeatureId: (id: number | null) => void;
  setSelectedOrganismId: (id: number | null) => void;
  setSelectedGMOId: (id: number | null) => void;
  clearSelections: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedPlasmidId: null,
  selectedFeatureId: null,
  selectedOrganismId: null,
  selectedGMOId: null,
  setSelectedPlasmidId: (id) => set({ selectedPlasmidId: id }),
  setSelectedFeatureId: (id) => set({ selectedFeatureId: id }),
  setSelectedOrganismId: (id) => set({ selectedOrganismId: id }),
  setSelectedGMOId: (id) => set({ selectedGMOId: id }),
  clearSelections: () => set({ selectedPlasmidId: null, selectedFeatureId: null, selectedOrganismId: null, selectedGMOId: null }),
}));
```

---

## 8. Component Architecture

### Component Hierarchy

```
App
├── AppShell (Mantine)
│   ├── Header
│   │   ├── Logo (JLab)
│   │   ├── ViewSwitcher (Tabs)
│   │   └── UserMenu
│   │       └── ThemeToggle
│   │
│   ├── Sidebar (optional, collapsible)
│   │   ├── QuickActions
│   │   └── RecentPlasmids
│   │
│   └── Main Content Area
│       ├── PlasmidsView
│       │   ├── PlasmidTable
│       │   ├── PlasmidForm
│       │   │   ├── BasicInfoSection
│       │   │   ├── CassettesSection
│       │   │   ├── GMOsSection
│       │   │   ├── GenbankSection
│       │   │   └── AttachmentsSection
│       │   └── ActionBar
│       │
│       ├── FeaturesView
│       │   ├── FeatureTable
│       │   ├── FeatureForm
│       │   └── ActionBar (Import/Export/Sync)
│       │
│       ├── OrganismsView
│       ├── GMOsView
│       │   └── ActionBar (GenerateReportButton)
│       └── SettingsView
│           ├── GeneralSettings
│           ├── InstitutionSettings
│           ├── IntegrationSettings
│           └── AppearanceSettings
│
└── GlobalModals
    ├── ConfirmDialog
    ├── ErrorModal
    └── ProgressModal
```

---

## 9. External Integrations

### Integration Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   MAIN PROCESS                           │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │          Integration Services Layer                │ │
│  │                                                     │ │
│  │  ┌───────────────┐  ┌──────────────┐              │ │
│  │  │  IceClient    │  │ GoogleClient │              │ │
│  │  └───────┬───────┘  └──────┬───────┘              │ │
│  │          │                  │                      │ │
│  │  ┌───────▼──────────────────▼───────┐             │ │
│  │  │    Credential Storage             │             │ │
│  │  │  (safeStorage encrypted in SQLite)│             │ │
│  │  └───────────────────────────────────┘             │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Credential Security

```typescript
// src/main/utils/encryption.ts
// Uses Electron's native safeStorage API — OS keychain-backed encryption.
// This replaces any deterministic key-based approach and is the baseline from day one.

import { safeStorage } from 'electron';

export function encrypt(text: string): Buffer {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('safeStorage encryption is not available on this system');
  }
  return safeStorage.encryptString(text);
}

export function decrypt(encrypted: Buffer): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('safeStorage encryption is not available on this system');
  }
  return safeStorage.decryptString(encrypted);
}

// Store encrypted bytes as base64 in SQLite text columns
export function encryptToBase64(text: string): string {
  return encrypt(text).toString('base64');
}

export function decryptFromBase64(base64: string): string {
  return decrypt(Buffer.from(base64, 'base64'));
}
```

> **Decision**: `safeStorage` is used from the start — not deferred. Credentials (ice_token,
> filebrowser_password, service_account_json) are encrypted before writing to SQLite and decrypted
> on read. Encrypted bytes are stored as base64 strings in TEXT columns.

### JBEI/ice Integration

```typescript
// src/main/services/ice-client.ts

import axios, { AxiosInstance } from 'axios';

export interface IceConfig {
  instance: string;
  token: string;
}

export class IceClient {
  private client: AxiosInstance;

  constructor(private config: IceConfig) {
    this.client = axios.create({
      baseURL: config.instance,
      headers: {
        'X-ICE-Authentication-SessionId': config.token,
        'Content-Type': 'application/json',
      },
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/rest/accesstokens');
      return true;
    } catch {
      return false;
    }
  }

  async uploadPlasmid(entry: any, genbankFile?: string): Promise<{ id: string; url: string }> {
    const response = await this.client.post('/rest/parts', entry);
    const { id } = response.data;

    if (genbankFile) {
      const formData = new FormData();
      formData.append('file', new Blob([genbankFile]), 'plasmid.gb');
      await this.client.post(`/rest/file/sequence/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }

    return { id, url: `${this.config.instance}/entry/${id}` };
  }
}
```

### Google Sheets / Drive Integration

```typescript
// src/main/services/google.ts

import { google } from 'googleapis';

export class GoogleClient {
  private auth: any;
  private sheets: any;
  private drive: any;

  constructor(private config: { serviceAccountKey: any; sheetsId?: string; driveFolderId?: string }) {
    this.auth = new google.auth.JWT({
      email: config.serviceAccountKey.client_email,
      key: config.serviceAccountKey.private_key,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
      ],
    });
    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    this.drive = google.drive({ version: 'v3', auth: this.auth });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.auth.authorize();
      return true;
    } catch {
      return false;
    }
  }

  async getFeaturesFromSheet(): Promise<any[]> {
    if (!this.config.sheetsId) throw new Error('Sheets ID not configured');
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.config.sheetsId,
      range: 'features!A2:F',
    });
    return response.data.values?.map((row: string[]) => ({
      annotation: row[0], alias: row[1], risk: row[2],
      organism: row[3], uid: row[4], valid: row[5] === '1',
    })) || [];
  }
}
```

---

## 10. Security Model

### Threat Model

1. **Local Data Access**: Database file readable if user has file system access → Acceptable (single-user desktop app)
2. **API Credentials**: Encrypted via `safeStorage` (OS keychain) before storage in SQLite
3. **IPC Injection**: Prevented by Zod input validation on all handlers
4. **XSS**: Mitigated by React's automatic escaping + CSP
5. **Dependency Vulnerabilities**: Managed via `npm audit` + updates

### Security Checklist

```typescript
// src/main/index.ts — BrowserWindow config
const mainWindow = new BrowserWindow({
  webPreferences: {
    contextIsolation: true,       // ✅ Enabled
    nodeIntegration: false,        // ✅ Disabled
    sandbox: true,                 // ✅ Enabled
    preload: join(__dirname, '../preload/index.js'),
  },
});

// Disable navigation
mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());

// Disable new window creation
mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
```

---

## 11. Build & Deployment

### Build Pipeline

```json
// package.json scripts
{
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "lint": "eslint src --ext .ts,.tsx",
    "format": "prettier --write src",
    "typecheck": "tsc --noEmit",
    "package": "electron-builder build --publish never",
    "package:mac": "electron-builder build --mac --publish never",
    "package:win": "electron-builder build --win --publish never",
    "package:linux": "electron-builder build --linux --publish never"
  }
}
```

### Electron Builder Config

```json
// electron-builder.json
{
  "appId": "com.wfrs.jlab",
  "productName": "JLab",
  "directories": {
    "buildResources": "resources",
    "output": "dist"
  },
  "files": ["dist/**/*", "package.json"],
  "mac": {
    "category": "public.app-category.productivity",
    "target": ["dmg", "zip"],
    "icon": "resources/icons/icon.icns",
    "hardenedRuntime": true
  },
  "win": {
    "target": ["nsis", "portable"],
    "icon": "resources/icons/icon.ico"
  },
  "linux": {
    "target": ["AppImage", "deb"],
    "icon": "resources/icons",
    "category": "Science"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true
  }
}
```

---

## 12. Development Workflow

### Initial Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up database
npm run db:generate
npm run db:migrate

# 3. Start development
npm run dev
```

### Development Commands

```bash
npm run dev            # Start with HMR
npm run typecheck      # Check types
npm run lint           # ESLint
npm run format         # Prettier
npm run db:generate    # Generate migration from schema changes
npm run db:migrate     # Apply migrations
npm run db:studio      # Drizzle Studio (visual DB editor)
npm run package        # Package for current platform
```

### Git Workflow

```
main
  ├── feature/plasmids-crud
  ├── feature/features-glossary
  ├── feature/ice-integration
  └── bugfix/table-sorting

Release branches: release/v1.0.0
Tags: v1.0.0, v1.0.1, etc.
```

---

## Next Steps

1. ✅ Architecture defined
2. ✅ Renamed to JLab
3. 🔄 Plan migration runner (schema changes for installed instances)
4. 🔄 Stress-test data model
5. 🔄 Gather Julia's domain knowledge input on open planning questions
6. 🔄 Create project scaffolding
7. 🔄 Implement IPC layer + core components
8. 🔄 Add external integrations
9. 🔄 Packaging & distribution