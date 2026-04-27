# Julia Questionnaire — jLab Feature & Direction

> **Purpose:** This questionnaire maps everything the old GMOCU app does, describes
> its workflows, and asks Julia what she wants changed, improved, or added in the
> new app. Please answer as freely as you like — bullet points, paragraphs, or just
> a few words per question are all fine.

---

## Part 1 — What the old app does (for reference)

Below is a complete inventory of the old GMOCU app's features and workflows.
Read through this before answering Part 2 and Part 3, and feel free to annotate
anything that stands out.

---

### 1.1 — The five tabs

The old app is organised into five tabs:

| Tab | What it contains |
|---|---|
| **Plasmid data** | The main data-entry view. A list of all plasmids on the left; a detail form on the right. |
| **GMO** | Maintenance tools, server upload functions, and report generation. |
| **Nucleic acids** | The features/genetic-parts glossary. |
| **Organisms** | The organisms glossary. |
| **Settings** | User identity, cloud integrations, appearance. |

---

### 1.2 — Plasmid data tab (the core workflow)

**What you can record per plasmid:**

- Name (e.g. `pXX000`) and a short Clone identifier
- One or more **Cassettes** — free-text descriptions of the genetic cassette content,
  linked to the plasmid. Each cassette references features from the Nucleic acids glossary.
- **Alias** — a structured shorthand, auto-built from feature names separated by `-`
- **Purpose** — multi-line free text
- **Cloning summary** — multi-line free text
- **Original backbone vector** name
- **Status** — one of: *Planned / In Progress / Complete / Abandoned*
- **GenBank file** — upload a `.gb` file; the filename is stored and the file is stored
  as text in the database
- **Attachments** — upload any file (sequencing results, PDFs, images) stored as binary
  blobs in the database; can be downloaded back out
- **GMO entries** (see below) — the organisms this plasmid was transformed into

**Plasmid list actions:**

- Search plasmids by name or alias (fuzzy matching)
- Navigate the list with keyboard (Up/Down arrows)
- Duplicate a selected plasmid (optionally copying its GMO entries with today's date)
- Upload the current plasmid immediately to JBEI/ice or Filebrowser/GDrive

**GMO entry per plasmid:**

- Select a target organism from the organisms glossary
- Set a Risk Group (`target_RG`, integer)
- Record an Approval reference
- Record a date made and a date destroyed
- "Add" button creates a GMO entry; "Destroy" button fills in the destruction date
- `:)` button: one-click batch-add of all favourite organisms at once
- Multiple GMO entries can exist per plasmid

**Feature auto-complete:**

- When filling in a cassette, start typing a feature name → dropdown suggests entries
  from the Nucleic acids glossary
- A "Variant" field allows appending a variant suffix to the feature name
- Clicking the `+` button inserts the selected feature into the cassette content

---

### 1.3 — Nucleic acids (features) tab

**What you can do:**

- Browse the full glossary in a table (annotation, alias, risk level, source organism)
- Add, edit, delete entries
- Search by annotation name, alias, or source organism
- Export all features to Excel
- Export only features that are actually used in at least one plasmid to Excel
- Import features from an Excel template
- **Online sync** (Google Sheets): push local new entries up, pull new entries down,
  propagate edits made in the master Google Sheet to local, and cascade annotation
  renames across all existing cassette content

**Per-feature fields:**

- Annotation name (e.g. `AtUBQ10pro`)
- Alias
- Risk level (default: `No Risk`)
- Source organism

---

### 1.4 — Organisms tab

**What you can do:**

- Browse the organism glossary (full name, short name, risk group)
- Add, edit, delete entries
- Export all / export used organisms to Excel
- Import from Excel
- **Online sync** (same Google Sheets mechanism as features)

**Per-organism fields:**

- Full name
- Short name (used in dropdowns)
- Risk group (RG)

---

### 1.5 — GMO tab (maintenance & reports)

**Maintenance checks:**

- Check Nucleic acids glossary for completeness (missing fields, duplicates)
- Check Organisms glossary for completeness
- Check plasmids for duplicates and completeness

**Server upload (batch):**

- Upload/update all plasmids (GenBank files + metadata) to:
  - **JBEI/ice** — a parts registry (optional, requires API token)
  - **Filebrowser** — a local file server (optional)
  - **Google Drive** — a shared folder (optional)
- Each upload can optionally zip files before sending

**Report generation:**

- **Plasmid list** — generates an Excel file listing all plasmids with their key fields
- **Formblatt-Z** — generates the German regulatory GMO documentation form in Excel
  format (both German and English versions), covering the reporting period

**Data import:**

- Import plasmids + their associated features and organisms from another `gmocu.db` file
  (used when combining data from multiple users into one database)

---

### 1.6 — Settings tab

| Setting | Description |
|---|---|
| Name | Your full name (appears as Creator in reports) |
| Initials | Used as folder prefix in JBEI/ice uploads |
| Email | Contact email |
| GMO institute | Az. and Anlage Nr. for Formblatt-Z |
| Server credentials | JBEI/ice API token + Filebrowser URL/user/password |
| GDrive Sheet ID | Google Sheet ID for shared glossary sync |
| GDrive Folder ID | Google Drive folder ID for file uploads |
| Target organisms | The organisms you routinely work with (used in the `:)` quick-add) |
| Favourite organisms | Subset of target organisms used with `:)` batch-add |
| Style / layout | Theme and screen layout options |
| Autosync GSheets | Automatically sync glossaries on startup |

---

### 1.7 — Summary of old app workflows

**Workflow A — Adding a new plasmid**
1. Click New in the plasmid list
2. Enter the plasmid name and clone ID
3. Upload a GenBank file (optional)
4. Add one or more cassette entries using the feature autocomplete
5. Fill in alias, purpose, cloning summary, backbone vector
6. Set status to *Planned* or *In Progress*
7. Save

**Workflow B — Documenting a GMO**
1. Select a plasmid in the list
2. Enter edit mode
3. In the GMO section: pick the target organism, set Risk Group, add approval ref, set date made
4. Click "Add" → creates a GMO record
5. When the GMO is destroyed: click "Destroy" → fills in the destruction date
6. Optionally use `:)` to batch-add all favourite organisms in one click

**Workflow C — Generating a Formblatt-Z**
1. Switch to the GMO tab
2. Click "Run" next to Generate Formblatt Z
3. Choose date range
4. App produces an Excel file in the GMOCU user data folder

**Workflow D — Syncing the shared glossary**
1. Switch to Nucleic acids tab or Organisms tab
2. Click "Online sync"
3. App connects to the shared Google Sheet, pulls new entries, pushes local new entries,
   applies any edits made centrally, and cascades annotation renames to all cassettes

**Workflow E — Uploading to JBEI/ice or GDrive**
1. Switch to GMO tab
2. Click "Run" next to the upload action
3. App uploads GenBank files + plasmid metadata to configured services

**Workflow F — Importing from another GMOCU instance**
1. Switch to GMO tab
2. Click "Run" next to Data import
3. Select another `gmocu.db` file
4. App merges plasmids, features, and organisms, skipping duplicates

---

## Part 2 — What should change?

For each workflow above, please tell us what works well and what should be different
in the new app. Answer only the ones that are relevant to you — skip anything that
doesn't apply.

---

**Q1 — Adding a new plasmid (Workflow A)**

The old app requires you to go through a form with many fields. Is this okay, or
would you prefer a simpler starting point (e.g. just a name and a file, fill in
the rest later)?

> *Your answer:*

---

**Q2 — Cassettes and feature autocomplete**

In the old app, a cassette is a free-text field where you type feature names separated
by `-`, and you can autocomplete from the glossary.

- Does this notation feel natural to you, or is it confusing?
- Do you often have multiple cassettes per plasmid, or almost always just one?
- Would you prefer a more structured approach (e.g. clicking features from a list
  to build the cassette, rather than typing)?

> *Your answer:*

---

**Q3 — The alias field**

The alias is a structured shorthand built from feature names (e.g.
`AtUBQ10pro-GFP-AtRBCS3Ater`). Is this something you actually use in practice,
and do you build it manually or expect the app to generate it automatically?

> *Your answer:*

---

**Q4 — Plasmid status**

Currently: *Planned → In Progress → Complete → Abandoned*

- Does this status flow reflect how you actually work?
- Are there statuses you would add, remove, or rename?
- Is there a status like "Needs sequencing" or "Sequence confirmed" that matters to you?

> *Your answer:*

---

**Q5 — GMO documentation (Workflow B)**

- How often do you transform plasmids into organisms (roughly: most plasmids, about half,
  or a minority)?
- Does the current GMO entry process feel right? Is there anything missing or confusing
  about recording Risk Group, Approval, date made, date destroyed?
- Is the `:)` batch-add of favourite organisms something you use regularly?

> *Your answer:*

---

**Q6 — Formblatt-Z generation (Workflow C)**

- Do you actually generate this report yourself, or does someone else (e.g. lab manager)
  do it?
- Is the current Excel output format acceptable, or would you prefer a different format
  (e.g. PDF)?
- Are there any fields in the current report that are wrong or missing?

> *Your answer:*

---

**Q7 — The shared glossary (Workflow D)**

The old app uses a shared Google Sheet to synchronise feature and organism definitions
across users.

- Does this sync system work reliably for you in practice?
- Is the Google Sheets dependency something you are happy to keep, or would you prefer
  a different sharing mechanism (e.g. a shared folder, or a simple export/import)?
- Who in the lab is responsible for curating the glossary?

> *Your answer:*

---

**Q8 — Uploads to JBEI/ice, Filebrowser, Google Drive (Workflow E)**

- Do you actively use JBEI/ice? If so, for what?
- Do you use the Filebrowser upload? If so, what do you upload?
- Do you use the Google Drive upload? If so, what do you upload?
- If none of these are used, what *do* you do with your GenBank files and attachments
  after entering them into GMOCU?

> *Your answer:*

---

**Q9 — Importing from another GMOCU instance (Workflow F)**

- Have you ever used this feature?
- If yes: how often does your lab need to merge databases from different people?

> *Your answer:*

---

**Q10 — Attachments**

Currently, attachments (sequencing results, PDFs, images) are stored inside the SQLite
database as binary blobs.

- How important is attachment storage to you — a core feature or occasionally useful?
- What kinds of files do you typically attach?
- Would you be okay with attachments being stored as files on disk next to the database,
  rather than embedded in the database?

> *Your answer:*

---

**Q11 — Search and navigation**

- In the old app you search by name and alias. Are there other things you regularly want
  to search by (e.g. creator, genetic element, date, organism)?
- How large is your plasmid collection — roughly how many entries are in the database?

> *Your answer:*

---

**Q12 — Anything in the old app that you find annoying, confusing, or broken?**

> *Your answer:*

---

## Part 3 — What should the new app add?

These questions are about features the old app does not have at all.

---

**Q13 — Team library / sharing finished plasmids**

The new app is planned to have a way to "publish" a finished plasmid to a shared team
library so other lab members can find and import it.

- Is this a feature you would actively use?
- How do you currently share plasmids with other people in the lab?
- Who should be allowed to publish to the team library — everyone, or only certain people?

> *Your answer:*

---

**Q14 — Plasmid origin / lineage**

- Do you regularly need to record which parent plasmid or backbone a new plasmid was
  derived from?
- Would a visual "family tree" of plasmid lineage be useful to you?

> *Your answer:*

---

**Q15 — Plasmid map / visual**

The old app stores GenBank files but does not show a circular plasmid map.

- Would a visual plasmid map inside the app be useful to you (like what you see in
  SnapGene or Benchling)?
- Or is it acceptable to just open the file in SnapGene externally?

> *Your answer:*

---

**Q16 — Sequence storage**

- The old app stores the GenBank file content as text in the database. Is it important
  to you that the sequence is searchable (e.g. "find all plasmids containing this
  primer binding site")?
- Or is the GenBank file mostly just for archiving and export?

> *Your answer:*

---

**Q17 — Multiple users on one computer**

The old app is a single-user app — there is one "Settings" entry with one person's
name and initials.

- Does more than one person in your lab share a single computer to use GMOCU?
- Should the new app support multiple user profiles on one machine?

> *Your answer:*

---

**Q18 — Notifications / awareness of what others are doing**

- Would you find it useful to get a notification inside the app when someone else
  publishes a new plasmid to the team library?
- Or is a manual "refresh" when you need it sufficient?

> *Your answer:*

---

**Q19 — Plasmid duplication detection**

- If you or a colleague creates a plasmid that looks very similar to an existing one
  (same backbone, same genes), would you want the app to warn you?
- Or is it fine to have duplicates?

> *Your answer:*

---

**Q20 — Batch operations**

- Do you ever need to import a large batch of GenBank files at once (e.g. from a
  folder of 20+ files)?
- Do you ever need to change the status of many plasmids at once?

> *Your answer:*

---

**Q21 — Comments / notes on plasmids**

- Would it be useful to add short notes or comments to a plasmid entry (e.g.
  "this didn't work — try with a different promoter")?
- Should comments be personal (only you see them) or shared with the whole team?

> *Your answer:*

---

**Q22 — Any other features you would love to have that aren't listed above?**

> *Your answer:*

---

## Part 4 — Priorities

**Q23 — If you could only have three new features in jLab that don't exist in
the old app, what would they be?**

> *Your answer:*

---

**Q24 — What is the single most painful thing about using the old app day-to-day
that you most want the new app to fix?**

> *Your answer:*

---

*Thank you, Julia! Your answers will directly shape the design of jLab.*