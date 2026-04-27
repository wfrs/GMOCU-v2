# JLab Product Requirements

## Product Vision

A modern, user-friendly desktop lab management tool for the Jores Lab — covering plasmid documentation, GMO compliance, and broader synthetic/molecular biology workflows. Designed for researchers of all technical levels, from bachelor students to lab managers.

---

## Core Principles

1. **Local-first**: Fast, works offline, data stays on user's machine
2. **Share when ready**: Publish finished work to team, not forced real-time sync
3. **Progressive disclosure**: Start simple (name + file), add details later
4. **No server required**: Pure desktop app + cloud storage folders
5. **Compliance-ready**: Generate German regulatory forms when needed, not constantly

---

## Users & Use Cases

### Primary Users

| Role | Tech Skill | Primary Need |
| --- | --- | --- |
| Bachelor/Master students | Varies | Quick plasmid entry, find existing plasmids |
| PhD students | Medium | Document research, share with team |
| PostDocs | Medium-High | Manage collections, compliance docs |
| Lab manager | High | Oversight, regulatory compliance, team coordination |

### User Stories

#### Story 1: Quick Entry (Most Common)

```
As a PhD student,
I just finished cloning a plasmid,
I want to save it with minimal effort (< 1 minute),
So I can go home and add details later.
```

#### Story 2: Finding Plasmids

```
As a researcher,
I need to find if someone already made a plasmid with a specific gene,
I want to search the team library by name/gene/creator,
So I don't duplicate work.
```

#### Story 3: Detailed Documentation

```
As a PostDoc preparing to publish,
I need complete documentation of plasmids used,
I want to add purpose, methods, attachments, and sequences,
So the paper supplementary materials are complete.
```

#### Story 4: Compliance Reporting

```
As a lab manager,
I need to generate Formblatt-Z for a biosafety inspection,
I want to export all GMO documentation in the required format,
So we pass the audit without manual data entry.
```

#### Story 5: Team Sharing

```
As a team member,
I finished and verified a useful plasmid,
I want to publish it to the team library,
So others can find and use it.
```

---

## Core Features

### Phase 1: MVP (Must-Have)

#### 1. Plasmid Management

* **Create plasmid**

  + Drag & drop GenBank file (reads name/sequence)
  + Minimal fields: Name, Creator (auto-filled), optional description
  + Quick save: < 30 seconds from file to database
* **View/Edit plasmid**

  + List view with search/filter (by name, creator, date)
  + Detail view showing all information
  + Edit any field, save changes
  + Additional metadata fields: purpose, cloned by, concentration, date created, date sequenced, sequencing result/notes
* **Delete plasmid**

  + Soft delete (mark as archived) vs hard delete
  + Confirmation dialog
* **GenBank file handling**

  + Store sequence in database
  + Export .gb file when needed
  + Visual indicator if file present

#### 2. Personal Workspace

* **My Plasmids tab**
  + All plasmids created by current user
  + Status: Draft / In Progress / Finished / Archived
  + Sort by date, name, status
  + Quick filters

#### 3. Team Library

* **Browse published plasmids**

  + Read-only view of team's finished plasmids
  + Search across all published work
  + Filter by creator, date, genetic elements
* **Import from library**

  + Copy plasmid from team library to personal workspace
  + Creates a new entry (duplicate with reference to original)
* **Publish to library**

  + Export finished plasmid to shared cloud folder (Sciebo/Google Drive)
  + Exports as structured JSON + GenBank file
  + Only works for "Finished" status plasmids

#### 4. Basic Search

* **Search bar**
  + Search by plasmid name
  + Search by description
  + Search by creator name
  + Fuzzy matching (typo-tolerant)

#### 5. Settings

* **Personal info**

  + Name/Initials (appears as Creator)
  + Institution details (for compliance forms)
* **Cloud storage**

  + Configure Sciebo or Google Drive folder path
  + Test connection
* **Appearance**

  + Light/Dark theme
  + Font size

### Phase 2: Enhanced Features (Should-Have)

#### 6. Genetic Elements Documentation

* **Features glossary**

  + Maintain list of genetic elements (promoters, genes, terminators, etc.)
  + Tag features with: name, type, organism source, risk level
  + Shared team glossary (synced via cloud)
* **Plasmid composition (cassettes)**

  + A plasmid contains one or more cassettes (ordered genetic constructs)
  + Each cassette part has a **source organism**
  + Each source organism belongs to a **role/group** (e.g. donor organism category)
  + Visual representation of construct (linear/circular map)
  + Auto-extract features from GenBank annotations

#### 7. GMO Documentation

* **Link plasmids to organisms**

  + Define which organisms were transformed
  + Track GMO creation/destruction dates
  + Link multiple plasmids to one GMO (co-transformation)
* **Organism glossary**

  + Maintain list of organisms with risk groups
  + Organisms have a role/group classification (used in cassette part attribution)
  + Shared team glossary

#### 8. Compliance & Reporting

* **Formblatt-Z generation**

  + Export German GMO compliance form (Excel format)
  + Auto-populate from GMO data
  + Configurable date ranges
  + Both German and English versions
* **Plasmid list export**

  + Excel export of all plasmids (confirmed requirement from Julia)
  + Customizable columns
  + Filter by date range, creator, status

#### 9a. Label Printing

* **Glycerol stock / storage labels**

  + Generate printable labels (Word/PDF) for plasmid stocks (e.g. glycerol shock tubes)
  + Label layout (fields shown, font size, label dimensions) is configurable under **Preferences**
  + Print single or batch labels from the plasmid list

#### 9b. Seed Documentation (Independent Module)

* **Separate tab for plant seed records**

  + Completely independent of plasmid/GMO data — its own data model and UI tab
  + Document seed stocks: species, line/accession, source, storage location, notes
  + Search and filter seed records
  + Export seed list
* _Scope note_: Seed data does NOT link to plasmid entries. It is a standalone inventory for plant material management.

#### 10. Attachments

* **File attachments per plasmid**
  + Sequencing results (.ab1, .seq)
  + Documentation PDFs
  + Images
  + Store as BLOB in database OR reference to cloud files
  + Preview attachments in app

#### 10. Advanced Search

* **Filter combinations**

  + Multiple criteria: creator AND date range AND status
  + Save common filters
* **Search by genetic elements**

  + "Find all plasmids containing gene X"
  + "Find plasmids with promoter Y and terminator Z"

### Phase 3: Nice-to-Have

#### 11. History & Versioning

* **Track changes**
  + Who edited what and when
  + View previous versions
  + Restore old version

#### 12. Plasmid Relationships

* **Cloning lineage**

  + "This plasmid was derived from pXX001"
  + Visual family tree
* **Duplicates detection**

  + Warn if similar plasmid exists
  + Suggest existing plasmids when creating new

#### 13. Batch Operations

* **Import multiple plasmids**

  + Drag & drop folder of GenBank files
  + Auto-extract metadata
* **Bulk edit**

  + Change status for multiple plasmids
  + Batch publish to team library

#### 14. External Integration

* **JBEI/ice sync** (if lab uses it)
  + Upload plasmid to ice repository
  + Keep reference URL
  + Optional: import from ice

#### 15. Collaboration Features

* **Comments**

  + Add notes to plasmids
  + Team members can comment on shared plasmids
* **Notifications**

  + "New plasmids published to library"
  + "Someone imported your plasmid"

---

## User Workflows

### Workflow 1: New Plasmid (Happy Path)

```
1. Student finishes cloning
2. Opens JLab
3. Clicks "New Plasmid" button
4. Drags GenBank file from SnapGene/Benchling export
   → App auto-fills: name (from file), sequence
   → App auto-fills: creator (from settings)
5. [Optional] Adds one-line description
6. Clicks "Save"
7. Plasmid appears in "My Plasmids" with status "Draft"

Time: 15-30 seconds
```

### Workflow 2: Finding Existing Plasmid

```
1. Researcher needs plasmid with GFP
2. Opens JLab
3. Switches to "Team Library" tab
4. Types "GFP" in search bar
5. Sees list of matching plasmids with creators
6. Clicks on interesting one → sees full details
7. [Optional] Clicks "Import" → copy to personal workspace

Time: 30 seconds
```

### Workflow 3: Publishing to Team

```
1. PostDoc finished and verified plasmid
2. Opens plasmid in JLab
3. Fills in complete details:
   - Purpose/description
   - Genetic elements
   - Attachments (sequencing results)
4. Changes status to "Finished"
5. Clicks "Publish to Team Library" button
6. App exports JSON + GenBank to configured Sciebo folder
7. Success notification
8. Other team members see it next time they refresh library

Time: 5 minutes (if details already filled)
```

### Workflow 4: Compliance Report

```
1. Lab manager gets audit notice
2. Opens JLab
3. Navigates to "Reports" section
4. Selects "Generate Formblatt-Z"
5. Chooses date range (e.g., Q1 2025)
6. Clicks "Generate"
7. App creates Excel file with all GMOs in German format
8. Manager reviews and emails to authorities

Time: 2-3 minutes
```

### Workflow 5: Adding Detailed Info Later

```
1. Student created plasmid 2 weeks ago (minimal info)
2. Now preparing lab meeting presentation
3. Opens plasmid in JLab
4. Clicks "Edit"
5. Adds:
   - Detailed cloning strategy (purpose field)
   - Which parent plasmid it came from
   - Tags genetic elements
   - Uploads sequencing results as attachment
6. Saves changes
7. Changes status from "Draft" to "In Progress"

Time: 5-10 minutes
```

---

## Data Sharing Architecture

### Local Database

```
Location: ~/JLab/data/jlab.db (SQLite)
Contents:
  - User's personal plasmids
  - Imported team plasmids (cached copies)
  - Glossaries (features, organisms)
  - Settings
```

### Cloud Storage Structure

```
Sciebo/Google Drive folder structure:
/JLab-Team-Library/
  ├── plasmids/
  │   ├── pWF001/
  │   │   ├── plasmid.json          (metadata)
  │   │   ├── pWF001.gb             (sequence)
  │   │   └── attachments/
  │   │       └── sequencing.ab1
  │   ├── pJB042/
  │   │   ├── plasmid.json
  │   │   └── pJB042.gb
  │   └── ...
  ├── glossaries/
  │   ├── features.json
  │   └── organisms.json
  └── metadata.json                  (index of all plasmids)
```

### Publishing Process

```
1. User clicks "Publish"
2. App validates plasmid is "Finished"
3. App creates folder: /plasmids/[plasmid-name]/
4. Exports:
   - plasmid.json (all metadata + creator info)
   - [name].gb (GenBank file)
   - attachments/ folder (if any)
5. Updates metadata.json index
6. Shows success message
```

### Importing from Library

```
1. User opens "Team Library" tab
2. App reads metadata.json from cloud folder
3. Shows list of available plasmids
4. User searches/filters/clicks
5. On "Import":
   - Downloads plasmid.json + .gb file
   - Creates copy in local database
   - Marks as "Imported from [creator]"
   - User can now edit their copy
```

### Glossary Sync

```
- Features and Organisms are team-shared
- App periodically checks glossaries/features.json
- If newer version exists: download and merge
- If user adds new feature: append to local, offer to upload
- Simple last-write-wins (no complex conflict resolution)
```

---

## Technical Constraints

### Must-Have

* ✅ Works offline (local database)
* ✅ No server hosting required
* ✅ Cross-platform (macOS, Windows, Linux)
* ✅ Single installation per user (no admin rights needed)
* ✅ Works with Sciebo (WebDAV) and Google Drive
* ✅ Handles ~1000s of plasmids without slowdown

### Won't-Have (Out of Scope)

* ❌ Real-time collaboration (no simultaneous editing)
* ❌ Server/backend infrastructure
* ❌ Mobile apps
* ❌ Complex permissions/roles (all team members equal)
* ❌ Built-in sequence editing (use SnapGene/Benchling for that)
* ❌ Automated bioinformatics analysis

---

## Success Criteria

### Adoption

* 80%+ of lab members actively use it within 3 months
* Students can create first plasmid without training/help
* Zero training time for basic features

### Speed

* New plasmid entry: < 1 minute
* Search & find plasmid: < 10 seconds
* Generate compliance report: < 5 minutes

### Reliability

* Zero data loss (robust backups)
* Works offline always
* No database corruption

### Compliance

* Formblatt-Z passes biosafety inspection
* All required fields captured
* Audit trail complete

---

## Open Questions (Need Julia's Input)

### 1. GenBank File Parsing

The app can read GenBank files to extract:

* Plasmid name
* Sequence
* Feature annotations (promoters, genes, etc.)

**Question:** Should features be auto-extracted from GenBank, or manually tagged by users?

* **Auto**: Faster, but annotations might be messy/inconsistent
* **Manual**: More work, but cleaner data
* **Hybrid**: Extract suggestions, user confirms/edits

### 2. Status Workflow

Current idea: Draft → In Progress → Finished → Archived

**Question:** Are these statuses helpful? Or too rigid?

* Alternative: Just "Private" vs "Published"?
* Do you need more statuses? (e.g., "Needs Sequencing", "Failed")?

### 3. GMO Documentation Frequency

**Question:** What percentage of plasmids actually get transformed into organisms?

* 100% → GMO tracking is core
* ~50% → GMO is important secondary feature
* <20% → GMO is just for compliance occasionally

### 4. Duplicate Prevention

**Question:** Does it matter if two people independently clone the same construct?

* Yes, warn users if similar plasmid exists
* No, duplicates are fine (different preps, different purposes)

### 5. Attachment Storage

**Question:** Sequencing results and PDFs - where to store?

* **Option A**: In SQLite database (simple, portable, but large DB)
* **Option B**: In cloud folder alongside plasmid (cleaner separation)

### 6. Glossary Management

**Question:** Who maintains the features/organisms glossaries?

* Everyone can add (democratic, might get messy)
* Only lab manager (clean, but bottleneck)
* Anyone adds, manager approves (middle ground)

---

## Next Steps

1. ✅ Define product vision and requirements (this document)
2. 🔄 Get Julia's feedback on open questions
3. ⏳ Design data model based on confirmed requirements
4. ⏳ Create UI mockups for key workflows
5. ⏳ Build MVP (Phase 1 features)
6. ⏳ User testing with 2-3 lab members
7. ⏳ Iterate based on feedback
8. ⏳ Roll out to full team

---

**This document defines WHAT we're building and WHY. Technical architecture comes next, once we confirm this matches the real needs.**