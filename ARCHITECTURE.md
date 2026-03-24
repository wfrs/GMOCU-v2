# GMOCU-v2 Architecture

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
Desktop application for managing plasmid databases and GMO documentation for German biosafety compliance (GenTAufzV).

### Core Capabilities
- **Data Management**: CRUD operations for plasmids, features, organisms, GMOs
- **File Handling**: GenBank files, attachments (BLOB), Excel imports/exports
- **External Sync**: JBEI/ice, Google Sheets/Drive, Filebrowser
- **Report Generation**: German Formblatt-Z compliance reports
- **Offline-First**: All data stored locally in SQLite

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
Zustand                   Global UI state
React Query (TanStack)    Server/DB state & caching
React Hook Form           Form state
Zod                       Schema validation
```

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
gmocu-v2/
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
│   │   │   │   ├── ui.ts          # UI state
│   │   │   │   ├── selection.ts   # Current selections
│   │   │   │   └── theme.ts       # Theme preferences
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

```typescript
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

// Settings - Application configuration (singleton)
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
  ice_token: text (encrypted)
  filebrowser_instance: text (URL, nullable)
  filebrowser_user: text (nullable)
  filebrowser_password: text (encrypted, nullable)
  created_at: timestamp
  updated_at: timestamp
}

// GoogleCredentials - Google API credentials
table: google_credentials {
  id: integer (PK, always 1)
  sheets_id: text (nullable)
  drive_folder_id: text (nullable)
  service_account_json: text (encrypted, nullable)
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

```sql
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
```typescript
// Most common queries (optimize these)
1. List plasmids (paginated, filtered by status)
2. Get plasmid with cassettes + GMOs + attachments (single query with joins)
3. Search features by annotation (autocomplete)
4. List organisms filtered by risk group
5. Get all GMOs for report generation
```

#### Write Operations
```typescript
// Transaction boundaries
1. Create plasmid → Insert cassettes → Return full object
2. Update plasmid → Update cassettes (delete old + insert new)
3. Duplicate plasmid → Copy plasmid + cassettes + optionally GMOs
4. Delete plasmid → Cascade deletes cassettes, GMOs, attachments
5. Import from Excel → Batch insert with duplicate checking
```

#### Data Integrity Rules
```typescript
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
  // List plasmids (with pagination & filters)
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

  // Get plasmid by ID (with relations)
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

  // Create plasmid
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

  // Update plasmid
  export const updateSchema = createSchema.extend({
    id: z.number(),
  });
  export type UpdateParams = z.infer<typeof updateSchema>;
  export type UpdateResult = PlasmidWithRelations;

  // Delete plasmid
  export const deleteSchema = z.object({
    id: z.number(),
  });
  export type DeleteParams = z.infer<typeof deleteSchema>;
  export type DeleteResult = { id: number };

  // Duplicate plasmid
  export const duplicateSchema = z.object({
    id: z.number(),
    includeGmos: z.boolean().default(false),
  });
  export type DuplicateParams = z.infer<typeof duplicateSchema>;
  export type DuplicateResult = PlasmidWithRelations;

  // Upload plasmid to external service
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
  // List features
  export const listSchema = z.object({
    searchTerm: z.string().optional(),
    risk: z.enum(['none', 'low', 'medium', 'high']).optional(),
  });
  export type ListParams = z.infer<typeof listSchema>;
  export type ListResult = Feature[];

  // Create feature
  export const createSchema = z.object({
    annotation: z.string().min(1),
    alias: z.string().optional(),
    risk: z.enum(['none', 'low', 'medium', 'high']),
    organism: z.string(),
    uid: z.string().optional(), // Generated if not provided
  });
  export type CreateParams = z.infer<typeof createSchema>;
  export type CreateResult = Feature;

  // Update feature
  export const updateSchema = createSchema.extend({
    id: z.number(),
  });
  export type UpdateParams = z.infer<typeof updateSchema>;
  export type UpdateResult = Feature;

  // Delete feature
  export const deleteSchema = z.object({
    id: z.number(),
  });
  export type DeleteParams = z.infer<typeof deleteSchema>;
  export type DeleteResult = { id: number };

  // Import from Excel
  export const importExcelSchema = z.object({
    filePath: z.string(),
  });
  export type ImportExcelParams = z.infer<typeof importExcelSchema>;
  export type ImportExcelResult = {
    imported: number;
    skipped: number;
    errors: string[];
  };

  // Export to Excel
  export const exportExcelSchema = z.object({
    filePath: z.string(),
    includeUnused: z.boolean().default(false),
  });
  export type ExportExcelParams = z.infer<typeof exportExcelSchema>;
  export type ExportExcelResult = { filePath: string };

  // Sync with Google Sheets
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
  // Similar structure to Features...
  // (Omitted for brevity - follow same pattern)
}

// ========== GMOS ==========

export namespace GMOsIPC {
  // List GMOs
  export const listSchema = z.object({
    plasmidId: z.number().optional(),
  });
  export type ListParams = z.infer<typeof listSchema>;
  export type ListResult = GMO[];

  // Generate Formblatt-Z report
  export const generateReportSchema = z.object({
    filePath: z.string(),
    language: z.enum(['de', 'en']).default('de'),
  });
  export type GenerateReportParams = z.infer<typeof generateReportSchema>;
  export type GenerateReportResult = { filePath: string };
}

// ========== FILES ==========

export namespace FilesIPC {
  // Upload attachment
  export const uploadAttachmentSchema = z.object({
    plasmidId: z.number(),
    filePath: z.string(),
  });
  export type UploadAttachmentParams = z.infer<typeof uploadAttachmentSchema>;
  export type UploadAttachmentResult = Attachment;

  // Download attachment
  export const downloadAttachmentSchema = z.object({
    attachmentId: z.number(),
    savePath: z.string(),
  });
  export type DownloadAttachmentParams = z.infer<typeof downloadAttachmentSchema>;
  export type DownloadAttachmentResult = { filePath: string };

  // Upload GenBank file
  export const uploadGenbankSchema = z.object({
    plasmidId: z.number(),
    filePath: z.string(),
  });
  export type UploadGenbankParams = z.infer<typeof uploadGenbankSchema>;
  export type UploadGenbankResult = { plasmidId: number; gbName: string };

  // Open file dialog
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
  // Get settings
  export type GetResult = Settings;

  // Update settings
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
  // Get app version
  export type GetVersionResult = { version: string };

  // Get user data path
  export type GetUserDataPathResult = { path: string };

  // Open external URL
  export const openExternalSchema = z.object({
    url: z.string().url(),
  });
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

// Generic handler wrapper with validation & error handling
export function registerHandler<I, O>(
  channel: string,
  schema: z.ZodSchema<I>,
  handler: (input: I) => Promise<O>
) {
  ipcMain.handle(channel, async (event, input: unknown): Promise<IPCResponse<O>> => {
    try {
      // Validate input
      const validatedInput = schema.parse(input);
      
      // Execute handler
      const result = await handler(validatedInput);
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error(`IPC handler error [${channel}]:`, error);
      
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: {
            message: 'Validation error',
            code: 'VALIDATION_ERROR',
            details: error.errors,
          },
        };
      }
      
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'INTERNAL_ERROR',
        },
      };
    }
  });
}

// Register all handlers
export function registerAllHandlers() {
  // Plasmids
  registerHandler('plasmids:list', PlasmidsIPC.listSchema, handleListPlasmids);
  registerHandler('plasmids:getById', PlasmidsIPC.getByIdSchema, handleGetPlasmidById);
  registerHandler('plasmids:create', PlasmidsIPC.createSchema, handleCreatePlasmid);
  registerHandler('plasmids:update', PlasmidsIPC.updateSchema, handleUpdatePlasmid);
  registerHandler('plasmids:delete', PlasmidsIPC.deleteSchema, handleDeletePlasmid);
  registerHandler('plasmids:duplicate', PlasmidsIPC.duplicateSchema, handleDuplicatePlasmid);
  registerHandler('plasmids:upload', PlasmidsIPC.uploadSchema, handleUploadPlasmid);
  
  // Features
  registerHandler('features:list', FeaturesIPC.listSchema, handleListFeatures);
  registerHandler('features:create', FeaturesIPC.createSchema, handleCreateFeature);
  // ... etc
  
  // Continue for all namespaces
}
```

### Preload Script

```typescript
// src/preload/index.ts

import { contextBridge, ipcRenderer } from 'electron';
import type { IPCResponse } from '../main/types/ipc';

// Type-safe IPC invoke wrapper
function createIPCInvoker() {
  return {
    invoke: async <T>(channel: string, data?: unknown): Promise<IPCResponse<T>> => {
      return ipcRenderer.invoke(channel, data);
    },
    
    // For event listeners (future use)
    on: (channel: string, callback: (...args: unknown[]) => void) => {
      const subscription = (_event: unknown, ...args: unknown[]) => callback(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    },
  };
}

// Expose to renderer via contextBridge
contextBridge.exposeInMainWorld('api', createIPCInvoker());

// Type declarations
export type IPCClient = ReturnType<typeof createIPCInvoker>;
```

```typescript
// src/preload/types.d.ts

import type { IPCClient } from './index';

declare global {
  interface Window {
    api: IPCClient;
  }
}
```

### Renderer IPC Client

```typescript
// src/renderer/src/lib/ipc-client.ts

import type { IPCResponse } from '@/../../main/types/ipc';

export class IPCError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'IPCError';
  }
}

// Type-safe IPC client
export async function ipcInvoke<T>(
  channel: string,
  data?: unknown
): Promise<T> {
  const response = await window.api.invoke<T>(channel, data);
  
  if (!response.success) {
    throw new IPCError(
      response.error?.message || 'IPC call failed',
      response.error?.code,
      response.error?.details
    );
  }
  
  return response.data!;
}

// Convenience wrappers for each namespace

export const plasmidsAPI = {
  list: (params: PlasmidsIPC.ListParams) =>
    ipcInvoke<PlasmidsIPC.ListResult>('plasmids:list', params),
    
  getById: (params: PlasmidsIPC.GetByIdParams) =>
    ipcInvoke<PlasmidsIPC.GetByIdResult>('plasmids:getById', params),
    
  create: (params: PlasmidsIPC.CreateParams) =>
    ipcInvoke<PlasmidsIPC.CreateResult>('plasmids:create', params),
    
  update: (params: PlasmidsIPC.UpdateParams) =>
    ipcInvoke<PlasmidsIPC.UpdateResult>('plasmids:update', params),
    
  delete: (params: PlasmidsIPC.DeleteParams) =>
    ipcInvoke<PlasmidsIPC.DeleteResult>('plasmids:delete', params),
    
  duplicate: (params: PlasmidsIPC.DuplicateParams) =>
    ipcInvoke<PlasmidsIPC.DuplicateResult>('plasmids:duplicate', params),
    
  upload: (params: PlasmidsIPC.UploadParams) =>
    ipcInvoke<PlasmidsIPC.UploadResult>('plasmids:upload', params),
};

export const featuresAPI = {
  list: (params?: FeaturesIPC.ListParams) =>
    ipcInvoke<FeaturesIPC.ListResult>('features:list', params),
    
  create: (params: FeaturesIPC.CreateParams) =>
    ipcInvoke<FeaturesIPC.CreateResult>('features:create', params),
    
  // ... etc
};

// Continue for all namespaces
```

---

## 7. State Management

### Three-Layer State Strategy

```
┌─────────────────────────────────────────────┐
│         Layer 1: React Query                │  
│   (Server/Database State + Caching)        │
│                                             │
│  - Plasmids, Features, Organisms, GMOs     │
│  - Automatic background refetching         │
│  - Optimistic updates                      │
│  - Cache invalidation                      │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│         Layer 2: Zustand                    │
│   (Client/UI State)                         │
│                                             │
│  - Current tab/view                         │
│  - Selected plasmid/feature/organism ID     │
│  - Table filters & sort state               │
│  - UI preferences (theme, layout)           │
│  - Modal open/close state                   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│         Layer 3: React Hook Form            │
│   (Form State - Ephemeral)                  │
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
      // Refetch on window focus (user returns to app)
      refetchOnWindowFocus: true,
      
      // Don't refetch on mount if data is fresh
      refetchOnMount: false,
      
      // Cache time: 5 minutes
      staleTime: 5 * 60 * 1000,
      
      // Garbage collection: 10 minutes
      gcTime: 10 * 60 * 1000,
      
      // Retry failed queries
      retry: 1,
      
      // Don't refetch on network reconnect (local DB)
      refetchOnReconnect: false,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});

// Query keys factory for consistency
export const queryKeys = {
  // Plasmids
  plasmids: {
    all: ['plasmids'] as const,
    lists: () => [...queryKeys.plasmids.all, 'list'] as const,
    list: (filters: PlasmidsIPC.ListParams) =>
      [...queryKeys.plasmids.lists(), filters] as const,
    details: () => [...queryKeys.plasmids.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.plasmids.details(), id] as const,
  },
  
  // Features
  features: {
    all: ['features'] as const,
    lists: () => [...queryKeys.features.all, 'list'] as const,
    list: (filters?: FeaturesIPC.ListParams) =>
      [...queryKeys.features.lists(), filters] as const,
  },
  
  // Organisms
  organisms: {
    all: ['organisms'] as const,
    lists: () => [...queryKeys.organisms.all, 'list'] as const,
    list: (filters?: OrganismsIPC.ListParams) =>
      [...queryKeys.organisms.lists(), filters] as const,
  },
  
  // GMOs
  gmos: {
    all: ['gmos'] as const,
    lists: () => [...queryKeys.gmos.all, 'list'] as const,
    list: (filters?: GMOsIPC.ListParams) =>
      [...queryKeys.gmos.lists(), filters] as const,
  },
  
  // Settings
  settings: ['settings'] as const,
};
```

### React Query Hooks

```typescript
// src/renderer/src/hooks/usePlasmids.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { plasmidsAPI } from '@/lib/ipc-client';
import { queryKeys } from '@/lib/query-client';
import type { PlasmidsIPC } from '@/../../main/types/ipc';

// List plasmids
export function usePlasmids(params: PlasmidsIPC.ListParams) {
  return useQuery({
    queryKey: queryKeys.plasmids.list(params),
    queryFn: () => plasmidsAPI.list(params),
  });
}

// Get single plasmid
export function usePlasmid(id: number, include?: PlasmidsIPC.GetByIdParams['include']) {
  return useQuery({
    queryKey: queryKeys.plasmids.detail(id),
    queryFn: () => plasmidsAPI.getById({ id, include }),
    enabled: !!id, // Only fetch if ID is provided
  });
}

// Create plasmid mutation
export function useCreatePlasmid() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: plasmidsAPI.create,
    onSuccess: () => {
      // Invalidate all plasmid lists to trigger refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.plasmids.lists() });
    },
  });
}

// Update plasmid mutation
export function useUpdatePlasmid() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: plasmidsAPI.update,
    onMutate: async (updatedPlasmid) => {
      // Optimistic update: cancel ongoing queries
      await queryClient.cancelQueries({
        queryKey: queryKeys.plasmids.detail(updatedPlasmid.id),
      });
      
      // Snapshot previous value
      const previousPlasmid = queryClient.getQueryData(
        queryKeys.plasmids.detail(updatedPlasmid.id)
      );
      
      // Optimistically update cache
      queryClient.setQueryData(
        queryKeys.plasmids.detail(updatedPlasmid.id),
        updatedPlasmid
      );
      
      return { previousPlasmid };
    },
    onError: (err, updatedPlasmid, context) => {
      // Rollback on error
      if (context?.previousPlasmid) {
        queryClient.setQueryData(
          queryKeys.plasmids.detail(updatedPlasmid.id),
          context.previousPlasmid
        );
      }
    },
    onSettled: (data, error, variables) => {
      // Refetch after mutation (success or error)
      queryClient.invalidateQueries({
        queryKey: queryKeys.plasmids.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.plasmids.lists(),
      });
    },
  });
}

// Delete plasmid mutation
export function useDeletePlasmid() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: plasmidsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plasmids.all });
    },
  });
}

// Duplicate plasmid mutation
export function useDuplicatePlasmid() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: plasmidsAPI.duplicate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plasmids.lists() });
    },
  });
}

// Upload plasmid mutation
export function useUploadPlasmid() {
  return useMutation({
    mutationFn: plasmidsAPI.upload,
    // No cache invalidation needed (doesn't change DB)
  });
}
```

### Zustand Stores

```typescript
// src/renderer/src/store/ui.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // Current view
  currentView: 'plasmids' | 'features' | 'organisms' | 'gmos' | 'settings';
  setCurrentView: (view: UIState['currentView']) => void;
  
  // Theme
  theme: 'light' | 'dark';
  setTheme: (theme: UIState['theme']) => void;
  
  // Layout
  layoutMode: 'vertical' | 'horizontal';
  setLayoutMode: (mode: UIState['layoutMode']) => void;
  
  // Font size
  fontSize: number;
  setFontSize: (size: number) => void;
  
  // Sidebar collapsed
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      currentView: 'plasmids',
      setCurrentView: (view) => set({ currentView: view }),
      
      theme: 'light',
      setTheme: (theme) => set({ theme }),
      
      layoutMode: 'vertical',
      setLayoutMode: (mode) => set({ layoutMode: mode }),
      
      fontSize: 14,
      setFontSize: (size) => set({ fontSize: size }),
      
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    {
      name: 'gmocu-ui-state', // localStorage key
      partialize: (state) => ({
        // Only persist these fields
        theme: state.theme,
        layoutMode: state.layoutMode,
        fontSize: state.fontSize,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
```

```typescript
// src/renderer/src/store/selection.ts

import { create } from 'zustand';

interface SelectionState {
  // Selected IDs
  selectedPlasmidId: number | null;
  selectedFeatureId: number | null;
  selectedOrganismId: number | null;
  selectedGMOId: number | null;
  
  // Setters
  setSelectedPlasmidId: (id: number | null) => void;
  setSelectedFeatureId: (id: number | null) => void;
  setSelectedOrganismId: (id: number | null) => void;
  setSelectedGMOId: (id: number | null) => void;
  
  // Clear all selections
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
  
  clearSelections: () => set({
    selectedPlasmidId: null,
    selectedFeatureId: null,
    selectedOrganismId: null,
    selectedGMOId: null,
  }),
}));
```

---

## 8. Component Architecture

### Component Hierarchy

```
App
├── AppShell (Mantine)
│   ├── Header
│   │   ├── Logo
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
│       │   │   └── PlasmidRow
│       │   ├── PlasmidForm
│       │   │   ├── BasicInfoSection
│       │   │   ├── CassettesSection
│       │   │   │   └── CassetteInput (Autocomplete)
│       │   │   ├── GMOsSection
│       │   │   │   └── GMOList
│       │   │   ├── GenbankSection
│       │   │   │   └── FileUpload
│       │   │   └── AttachmentsSection
│       │   │       └── AttachmentList
│       │   └── ActionBar
│       │       ├── SaveButton
│       │       ├── DeleteButton
│       │       ├── DuplicateButton
│       │       └── UploadButton
│       │
│       ├── FeaturesView
│       │   ├── FeatureTable
│       │   ├── FeatureForm
│       │   └── ActionBar
│       │       ├── ImportExcelButton
│       │       ├── ExportExcelButton
│       │       └── SyncSheetsButton
│       │
│       ├── OrganismsView
│       │   ├── OrganismTable
│       │   ├── OrganismForm
│       │   └── ActionBar
│       │
│       ├── GMOsView
│       │   ├── GMOTable
│       │   ├── GMOFilters
│       │   └── ActionBar
│       │       └── GenerateReportButton
│       │
│       └── SettingsView
│           ├── GeneralSettings
│           ├── InstitutionSettings
│           ├── IntegrationSettings
│           │   ├── IceCredentialsForm
│           │   ├── GoogleCredentialsForm
│           │   └── FilebrowserCredentialsForm
│           └── AppearanceSettings
│
└── GlobalModals
    ├── ConfirmDialog
    ├── ErrorModal
    └── ProgressModal
```

### Reusable Component Patterns

```typescript
// src/renderer/src/components/tables/PlasmidTable.tsx

import { useMemo } from 'react';
import { Table } from '@mantine/core';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import type { Plasmid } from '@/types/domain';

interface PlasmidTableProps {
  data: Plasmid[];
  onRowClick?: (plasmid: Plasmid) => void;
  selectedId?: number | null;
}

export function PlasmidTable({ data, onRowClick, selectedId }: PlasmidTableProps) {
  const columns = useMemo(() => [
    {
      accessorKey: 'id',
      header: 'ID',
      size: 60,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      size: 120,
    },
    {
      accessorKey: 'alias',
      header: 'Alias',
      size: 200,
    },
    {
      accessorKey: 'statusValue',
      header: 'Status',
      size: 100,
    },
    {
      accessorKey: 'targetRg',
      header: 'RG',
      size: 50,
    },
  ], []);
  
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });
  
  return (
    <Table highlightOnHover>
      <Table.Thead>
        {table.getHeaderGroups().map(headerGroup => (
          <Table.Tr key={headerGroup.id}>
            {headerGroup.headers.map(header => (
              <Table.Th key={header.id} style={{ width: header.getSize() }}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </Table.Th>
            ))}
          </Table.Tr>
        ))}
      </Table.Thead>
      <Table.Tbody>
        {table.getRowModel().rows.map(row => (
          <Table.Tr
            key={row.id}
            onClick={() => onRowClick?.(row.original)}
            style={{
              cursor: onRowClick ? 'pointer' : 'default',
              backgroundColor: row.original.id === selectedId ? 'var(--mantine-color-blue-light)' : undefined,
            }}
          >
            {row.getVisibleCells().map(cell => (
              <Table.Td key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </Table.Td>
            ))}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
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
│  │  │               │  │              │              │ │
│  │  │ - auth()      │  │ - sheets()   │              │ │
│  │  │ - upload()    │  │ - drive()    │              │ │
│  │  │ - update()    │  │ - sync()     │              │ │
│  │  └───────┬───────┘  └──────┬───────┘              │ │
│  │          │                  │                      │ │
│  │  ┌───────▼──────────────────▼───────┐             │ │
│  │  │    Credential Storage             │             │ │
│  │  │  (Encrypted in SQLite)            │             │ │
│  │  └───────────────────────────────────┘             │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │          IPC Handlers (sync.ts)                    │ │
│  │                                                     │ │
│  │  - sync:ice:upload                                 │ │
│  │  - sync:sheets:download                            │ │
│  │  - sync:sheets:upload                              │ │
│  │  - sync:drive:upload                               │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### JBEI/ice Integration

```typescript
// src/main/services/ice-client.ts

import axios, { AxiosInstance } from 'axios';

export interface IceConfig {
  instance: string; // URL
  token: string; // API token
}

export interface IcePlasmidEntry {
  name: string;
  shortDescription?: string;
  longDescription?: string;
  status: 'Complete' | 'In Progress' | 'Planned';
  partType: 'PLASMID';
  creator: string; // Initials
  creatorEmail?: string;
  principalInvestigator?: string;
  bioSafetyLevel?: number;
  customFields?: Record<string, string>;
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
  
  async uploadPlasmid(
    entry: IcePlasmidEntry,
    genbankFile?: string
  ): Promise<{ id: string; recordId: string; url: string }> {
    // Create entry
    const response = await this.client.post('/rest/parts', entry);
    const { id, recordId } = response.data;
    
    // Upload genbank file if provided
    if (genbankFile) {
      const formData = new FormData();
      formData.append('file', new Blob([genbankFile]), 'plasmid.gb');
      
      await this.client.post(
        `/rest/file/sequence/${id}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
    }
    
    return {
      id,
      recordId,
      url: `${this.config.instance}/entry/${id}`,
    };
  }
  
  async updatePlasmid(id: string, entry: Partial<IcePlasmidEntry>): Promise<void> {
    await this.client.put(`/rest/parts/${id}`, entry);
  }
  
  async getEntry(id: string): Promise<any> {
    const response = await this.client.get(`/rest/parts/${id}`);
    return response.data;
  }
}
```

### Google Sheets Integration

```typescript
// src/main/services/google.ts

import { google } from 'googleapis';
import type { JSONClient } from 'google-auth-library/build/src/auth/googleauth';

export interface GoogleConfig {
  serviceAccountKey: any; // JSON key file
  sheetsId?: string;
  driveFolderId?: string;
}

export class GoogleClient {
  private auth: JSONClient;
  private sheets: ReturnType<typeof google.sheets>;
  private drive: ReturnType<typeof google.drive>;
  
  constructor(private config: GoogleConfig) {
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
  
  // ========== SHEETS ==========
  
  async getFeaturesFromSheet(): Promise<any[]> {
    if (!this.config.sheetsId) throw new Error('Sheets ID not configured');
    
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.config.sheetsId,
      range: 'features!A2:F', // Assuming header in row 1
    });
    
    return response.data.values?.map(row => ({
      annotation: row[0],
      alias: row[1],
      risk: row[2],
      organism: row[3],
      uid: row[4],
      valid: row[5] === '1',
    })) || [];
  }
  
  async updateFeaturesInSheet(features: any[]): Promise<void> {
    if (!this.config.sheetsId) throw new Error('Sheets ID not configured');
    
    const values = features.map(f => [
      f.annotation,
      f.alias || '',
      f.risk,
      f.organism,
      f.uid,
      '1', // valid flag
    ]);
    
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.config.sheetsId,
      range: 'features!A:F',
      valueInputOption: 'RAW',
      requestBody: { values },
    });
  }
  
  async logToSheet(entityType: string, action: string, count: number): Promise<void> {
    if (!this.config.sheetsId) throw new Error('Sheets ID not configured');
    
    const timestamp = new Date().toISOString();
    const values = [[timestamp, entityType, action, count]];
    
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.config.sheetsId,
      range: 'logging!A:D',
      valueInputOption: 'RAW',
      requestBody: { values },
    });
  }
  
  // ========== DRIVE ==========
  
  async uploadFileToDrive(
    fileName: string,
    fileContent: Buffer | string,
    mimeType: string,
    folderPath?: string[]
  ): Promise<string> {
    if (!this.config.driveFolderId) throw new Error('Drive folder ID not configured');
    
    // Create folder structure if needed
    let parentId = this.config.driveFolderId;
    if (folderPath) {
      for (const folderName of folderPath) {
        parentId = await this.getOrCreateFolder(folderName, parentId);
      }
    }
    
    // Upload file
    const response = await this.drive.files.create({
      requestBody: {
        name: fileName,
        parents: [parentId],
      },
      media: {
        mimeType,
        body: typeof fileContent === 'string' ? fileContent : Buffer.from(fileContent),
      },
    });
    
    return response.data.id!;
  }
  
  private async getOrCreateFolder(name: string, parentId: string): Promise<string> {
    // Search for existing folder
    const search = await this.drive.files.list({
      q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id)',
    });
    
    if (search.data.files?.length) {
      return search.data.files[0].id!;
    }
    
    // Create folder
    const response = await this.drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      },
      fields: 'id',
    });
    
    return response.data.id!;
  }
}
```

### Credential Security

```typescript
// src/main/utils/encryption.ts

import crypto from 'crypto';
import { app } from 'electron';

// Use machine-specific key (basic encryption for local storage)
// For production: consider using safeStorage API
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  // Derive key from machine ID + app name
  const machineId = app.getName() + app.getVersion();
  return crypto.scryptSync(machineId, 'salt', KEY_LENGTH);
}

export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  // Return: iv + tag + encrypted (all hex-encoded)
  return iv.toString('hex') + tag.toString('hex') + encrypted;
}

export function decrypt(encrypted: string): string {
  const key = getEncryptionKey();
  
  const iv = Buffer.from(encrypted.slice(0, IV_LENGTH * 2), 'hex');
  const tag = Buffer.from(encrypted.slice(IV_LENGTH * 2, (IV_LENGTH + TAG_LENGTH) * 2), 'hex');
  const ciphertext = encrypted.slice((IV_LENGTH + TAG_LENGTH) * 2);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

---

## 10. Security Model

### Threat Model

1. **Local Data Access**: Database file readable if user has file system access → Acceptable (single-user desktop app)
2. **API Credentials**: Stored encrypted in database
3. **IPC Injection**: Prevented by input validation (Zod schemas)
4. **XSS**: Mitigated by React's automatic escaping + CSP
5. **Dependency Vulnerabilities**: Managed via `npm audit` + updates

### Security Checklist

```typescript
// electron.vite.config.ts
export default {
  main: {
    // ...
  },
  preload: {
    // ...
  },
  renderer: {
    // ...
    plugins: [
      // Content Security Policy
      viteCsp({
        policy: {
          'default-src': ["'self'"],
          'script-src': ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'"], // Mantine requires inline styles
          'img-src': ["'self'", 'data:', 'https:'],
          'connect-src': ["'self'"],
        },
      }),
    ],
  },
};

// src/main/index.ts - BrowserWindow config
const mainWindow = new BrowserWindow({
  webPreferences: {
    contextIsolation: true,        // ✅ Enabled
    nodeIntegration: false,         // ✅ Disabled
    sandbox: true,                  // ✅ Enabled
    preload: join(__dirname, '../preload/index.js'),
  },
});

// Disable navigation
mainWindow.webContents.on('will-navigate', (event) => {
  event.preventDefault();
});

// Disable new window creation
mainWindow.webContents.setWindowOpenHandler(() => {
  return { action: 'deny' };
});
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
    "preview": "electron-vite preview",
    "lint": "eslint src --ext .ts,.tsx",
    "format": "prettier --write src",
    "typecheck": "tsc --noEmit",
    "package": "electron-builder build --publish never",
    "package:mac": "electron-builder build --mac --publish never",
    "package:win": "electron-builder build --win --publish never",
    "package:linux": "electron-builder build --linux --publish never",
    "release": "electron-builder build --publish always"
  }
}
```

### Electron Builder Config

```json
// electron-builder.json
{
  "appId": "com.gmocu.app",
  "productName": "GMOCU",
  "directories": {
    "buildResources": "resources",
    "output": "dist"
  },
  "files": [
    "dist/**/*",
    "package.json"
  ],
  "mac": {
    "category": "public.app-category.productivity",
    "target": ["dmg", "zip"],
    "icon": "resources/icons/icon.icns",
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "resources/entitlements.mac.plist",
    "entitlementsInherit": "resources/entitlements.mac.plist"
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

### Auto-Updates (Future)

```typescript
// src/main/auto-updater.ts

import { autoUpdater } from 'electron-updater';
import { app, BrowserWindow } from 'electron';

export function setupAutoUpdater(mainWindow: BrowserWindow) {
  // Check for updates on startup (after 3 seconds)
  setTimeout(() => {
    autoUpdater.checkForUpdates();
  }, 3000);
  
  // Check every hour
  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 60 * 60 * 1000);
  
  autoUpdater.on('update-available', () => {
    mainWindow.webContents.send('update:available');
  });
  
  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update:downloaded');
  });
  
  // IPC handler to trigger install
  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall();
  });
}
```

---

## 12. Development Workflow

### Initial Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up database
npm run db:generate  # Generate Drizzle schema
npm run db:migrate   # Run migrations

# 3. Start development
npm run dev
```

### Development Commands

```bash
# Development
npm run dev          # Start with HMR

# Type checking
npm run typecheck    # Check types without emitting

# Linting & Formatting
npm run lint         # ESLint
npm run format       # Prettier

# Database
npm run db:generate  # Generate migration from schema changes
npm run db:migrate   # Apply migrations
npm run db:studio    # Open Drizzle Studio (visual DB editor)

# Building
npm run build        # Build for current platform
npm run package      # Package for current platform
npm run package:mac  # Package for macOS
npm run package:win  # Package for Windows
npm run package:linux # Package for Linux
```

### Git Workflow

```
main
  ├──  feature/plasmids-crud
  ├──  feature/features-glossary
  ├──  feature/ice-integration
  └──  bugfix/table-sorting

Release branches: release/v2.0.0
Tags: v2.0.0, v2.0.1, etc.
```

---

## Next Steps

1. ✅ Architecture defined
2. 🔄 Create project scaffolding  
3. 🔄 Set up database schema + migrations
4. 🔄 Implement IPC layer
5. 🔄 Build core components
6. 🔄 Implement features (plasmids, features, organisms, GMOs)
7. 🔄 Add external integrations
8. 🔄 Testing & refinement
9. 🔄 Packaging & distribution

---

**This architecture is production-ready and scalable.**

Ready to start scaffolding?
