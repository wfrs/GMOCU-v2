# jLab — Requirements Synthesis from Julia's Interviews
> Compiled from three rounds of questionnaires (v1, v2, v3).
> This document represents the confirmed, resolved picture of what jLab must do.
> It supersedes the earlier REQUIREMENTS.md where the two conflict.

---

## 1. The Core Philosophy (Julia's words)

> "I kinda just really want a plasmid and GMO organisation app, so that I have one
> program where I can store all my relevant plasmid and GMO data instead of a big
> Excel file, but that also automatically generates a Formblatt Z."

jLab must feel like a smart, autosaving spreadsheet — not a form-based desktop app.
The primary interaction model is a **table you can type in directly**, copy/paste
across, drag to fill, and filter/sort freely. Clicking a row opens a **detail panel**
(side or bottom) showing all fields in a form-style layout for users who prefer that
mode — but the table is always the home base and both views stay in sync.

---

## 2. The Main Plasmid Table

### 2.1 — Essential columns (filled for almost every plasmid)

| Column | Notes |
|---|---|
| **ID** | e.g. `pJM0001`. Auto-increment drag-fill supported (optional, not forced). |
| **Name** | Free text plasmid name. |
| **Insert / Cassette** | The genetic cassette. Same concept as GMOCU's "cassette". See §4. |
| **Details** | Free text, equivalent to "purpose" + "cloning summary" merged. |
| **Category** | User-defined dropdown (configured in Settings). Examples: entry vector, CDS, terminator, cassette, addgene. |
| **Markers** | Antibiotic resistance markers (bacteria) or selection markers (plants/other organisms). Free text or tag-style. |
| **Concentration [ng/µL]** | Current prep concentration. One value per plasmid — updated in place when re-prepped. |
| **Date plasmid** | Date of the current miniprep. Updated when concentration is updated. |
| **Sequenced?** | Yes / No. |
| **Seq method** | Dropdown: Sanger / ONT / other. Only relevant if Sequenced = Yes. |
| **Date sequencing** | Date of sequencing. Only relevant if Sequenced = Yes. |
| **Glycerol stock ID** | Free text. E.g. `CJM001` (E. coli) or `AJM001` (Agrobacterium). |
| **Date glycerol stock** | Date the glycerol stock was made. |
| **Box** | Free text. Physical freezer box name/number where the glycerol stock lives. |
| **Status** | See §3. |
| **Comment** | Free text personal note. Not visible in team library. |

### 2.2 — Optional columns (nice to have, not always filled)

| Column | Notes |
|---|---|
| **Total size [bp]** | Used for Golden Gate calculations — Julia does this elsewhere, so not essential. |
| **Insert size [bp]** | Same as above. |
| **Backbone vector** | Original backbone. Free text. |
| **Alias** | Auto-generated or manually edited. See §5. |
| **Other comment** | Second comment field — lower priority. |

### 2.3 — Column behaviour

- **Autosave** — every edit saves immediately. No save button anywhere in the app.
- **Copy/paste** — cells, rows, and ranges must be copy/pasteable like Excel.
- **Drag-to-fill** — dragging down an ID cell auto-increments the number portion.
- **Sort and filter** — every column sortable; filter bar at the top of each column.
- **Global search** — Ctrl+F style search across all visible columns simultaneously.
- **Colour coding** — row background reflects Status (see §3). User can define colours per status.
- **Formblatt-Z readiness flag** — rows that cannot be included in a Formblatt-Z (due to missing required fields or unresolved cassette mismatches) get a distinct row-level visual indicator (e.g. a coloured left border or warning icon). This is always visible in the table — not only surfaced at report generation time. Filterable: user can filter to show only "not Formblatt-Z ready" rows.

---

## 3. Plasmid Status

Five statuses. Colours are user-configurable per status.

| Status | Meaning |
|---|---|
| Planned | Not yet made. |
| In Progress | Currently being cloned / assembled. |
| Complete | Sequence confirmed, ready for downstream use. |
| Trouble in Paradise | Something is wrong — cloning failed, sequence off, bad expression, etc. Explanation goes in Comment. |
| Abandoned | Will not be pursued further. |

- Sequencing confirmation is separate from Status — it is tracked via the Sequenced / Seq method / Date sequencing columns, not encoded into the status.
- "Complete" implies sequence confirmed AND a label/glycerol stock is ready. Julia's definition.

---

## 4. The Cassette / Insert Field

This is the most important UX problem to solve. Julia's requirements:

- **Free text entry** — type feature names directly, separated by `-` (existing convention).
- **Autocomplete** — as you type, suggest matching feature names from the Nucleic Acids glossary.
- **Copy/paste** — must be able to paste a cassette from another row and edit a single part.
- **Inline editing** — edit any part of a cassette without deleting and recreating the whole thing.
- **Validation highlight — two levels:**
  - **Token level:** individual feature names that don't match the glossary are highlighted inside the cassette cell (coloured underline or background on the specific token). Soft warning — row still saves.
  - **Row level:** if any cassette token is unresolved, the entire row gets a prominent Formblatt-Z readiness flag (see §2.3). This makes it immediately obvious in the table that this plasmid cannot go into a Formblatt-Z without fixing the cassette first. Filterable.
- **Filterable** — in the table, filter/search by cassette content (e.g. show all plasmids
  containing `GFP`).
- **Multiple cassettes per plasmid** — supported (some plasmids have more than one expression
  cassette). Represented as additional sub-rows or a secondary panel — not multiple main rows.
  Julia personally rarely uses this but it must exist for other users.

What NOT to do: do not replicate GMOCU's click-to-build cassette system. No separate
cassette form, no "Add feature" button workflow, no variant field popup.

---

## 5. The Alias Field

- Format: `backbone_cassette` — e.g. `pMiso111_AtUBQ10pro-GFP-AtRBCS3Ater`
- Optionally prefixed with plasmid ID: `pJM0042_pMiso111_AtUBQ10pro-GFP-AtRBCS3Ater`
- The **auto-generation format is user-configurable** in Settings (e.g. choose whether
  to include the ID prefix, which separator to use).
- Always **manually editable** — auto-generated alias is just a starting point.
- Alias should be a searchable/filterable column in the main table.

---

## 6. GMO Documentation

### 6.1 — GMO entries in the table

Julia's preferred layout: **separate columns for each target organism** on the plasmid row.
e.g. `E. coli date made`, `E. coli date destroyed`, `Agro date made`, `Agro date destroyed`.

This is only practical for a small fixed set of target organisms. For users with many
target organisms, fall back to **Option A: expandable sub-row** (click to expand GMO entries
under a plasmid row). Recommend making this configurable — users with ≤ 3–4 organisms
can use the column view; others use the expandable view.

### 6.2 — GMO entry fields (per organism per plasmid)

| Field | Notes |
|---|---|
| **Organism** | From the Organisms glossary. |
| **Strain** | Free text. E.g. `TOP10`, `GV3101`. Not in glossary — not needed for Formblatt-Z. |
| **Date generated** | Date the GMO was created. |
| **Date destroyed** | Date the GMO was destroyed (if applicable). |
| **Glycerol stock ID** | E.g. `CJM001` or `AJM001`. Free text. |
| **Date glycerol stock** | Date the glycerol stock was made. |
| **Box** | Physical freezer box where the glycerol stock lives. Free text. |
| **Approval** | Keep field — purpose unclear but may be required for Formblatt-Z compliance. |

**Risk Group** is inherited automatically from the Organisms glossary — it is NOT
a per-GMO-entry field. The organism's RG never changes.

### 6.3 — Auto-create GMO on new plasmid

Optional setting in preferences: "Automatically create a GMO entry for [user-defined organism] when a new plasmid is saved." The organism is configurable — it is not hardcoded to E. coli. The user sets their default auto-create organism and strain in Settings. Default: off. Not a built-in forced behaviour — documentation often runs behind lab work.

### 6.4 — Batch GMO creation

The table-style interaction handles this naturally: paste organism names, paste dates,
copy/drag. No special batch-mode needed beyond standard table editing.

### 6.5 — Batch-add favourite organisms

Keep the `:)` concept from GMOCU — one click to add all favourite organisms as GMO entries
for the current plasmid. Must have a **proper labelled button**, not a smiley-face icon.
Favourite organisms configured in Settings.

---

## 7. Nucleic Acids (Features) Glossary

- Fields: annotation name, alias, risk level (default: No Risk), source organism.
- Autocomplete for the cassette field is driven by this glossary.
- Feature names that appear in cassettes but don't match any glossary entry are highlighted
  at token level and trigger a row-level Formblatt-Z readiness flag (see §2.3 and §4).
- Export all / export used to Excel.
- Import from Excel template.
- **Online sync via Google Sheets** — keep this mechanism. Push/pull/cascade renames.
  Julia never had it set up (supervisor didn't configure it), but it's the right approach.
  Nobody in the Jores lab curates it formally right now — make it easy to self-manage.
- **Rename approval on sync:** when someone with edit rights changes a feature annotation
  name in the shared Google Sheet, other users are NOT silently updated. Instead, on next
  sync they see a prompt: *"Feature 'X' was renamed to 'Y' by [initials] — accept this
  change? This will update all cassettes that reference 'X'."* The user approves or rejects
  before any cascade happens. Silent auto-cascade only applies to non-rename changes
  (risk level, alias, organism source).

---

## 8. Organisms Glossary

- Fields: full name, short name, risk group.
- Export / import Excel.
- Online sync via Google Sheets (same mechanism as features).
- RG is fixed per organism — never overridden per GMO entry.
- Strain is free text per GMO entry, not in glossary.

---

## 9. Formblatt-Z

- **Do not change the output format.** The generated Excel file must look identical to
  what the old GMOCU app produced. This is a legal/regulatory document.
- **Validation is table-based, not popup-based.** Before (and independently of) generating
  the report, the table permanently shows which rows are not Formblatt-Z ready via the
  row-level readiness flag (see §2.3). When the user clicks "Generate Formblatt-Z", if
  there are unready rows in the selected date range, the app does not show a blocking
  popup — it scrolls to and highlights those rows in the table with a clear summary
  banner: *"3 plasmids cannot be included — see highlighted rows."* The user can then
  fix the issues and regenerate. No dialog-based error lists.
- Julia generates the report herself (not a lab manager).
- Keep both German and English versions.
- Date range selection stays.

---

## 10. Plasmid List Export

- Export plasmid table to Excel.
- Columns in export should be configurable (pick which columns to include).

---

## 11. Label Printing

This is a **new feature** not in GMOCU. Julia's examples:

**Miniprep tube label:**
```
pJM0323                    ← plasmid ID, bold
pMisoMFG_virEp-PhiC-FLAG-GALLS(41C)-rnpBt   ← alias/name
JM  25.03.2026              ← initials + date
49.0 ng/µL                  ← concentration
```

**Glycerol stock label:**
```
CJM323                     ← glycerol stock ID, bold
E. coli TOP10  JM           ← organism + strain + initials
pMisoMFG_virEp-PhiC-FLAG-GALLS(41C)-rnpBt   ← alias/name
26.03.2026                  ← date glycerol stock
```

**Label printing requirements:**
- User defines which fields appear on each label type (configurable template).
- User defines label dimensions (width × height in mm).
- Font size auto-scales to fit the label dimensions.
- Output: printable PDF laid out as a grid of labels per page.
- No specific label brand required — Julia prints on plain paper and cuts with tape.
- Two label types minimum: miniprep label, glycerol stock label. Both user-configurable.
- Print multiple labels at once (select multiple plasmid rows → print all).

---

## 12. Team Library

- A shared "lab plasmid glossary" — searchable by all lab members.
- Publish a plasmid to the team library whenever you feel like (no mandatory gating for
  small groups like Jores lab).
- Future nice-to-have: group admin can define required fields before publishing is allowed.
  **Not needed for v1.**
- When browsing the team library, the most useful at-a-glance info is: backbone, cassette
  content, and which specific genetic parts are in it.
- Private comments are never published to the team library. Only public-facing info is shared.

---

## 13. Sharing and Syncing Architecture

- Sciebo or Google Drive folder for the team library (folder-based, not server-based).
- Google Sheets for glossary sync (keep from GMOCU).
- JBEI/ice integration: keep, not actively used by Julia right now but may become relevant.
- Filebrowser integration: keep.
- Google Drive folder upload: keep.
- GenBank **auto-matching**: if a `.gb` file name contains the plasmid ID (e.g. `pJM0001`
  is in the filename `pJM0001_pMiso000_Tetp-TGA2.2-FLAG-rnpBt.gb`), automatically link
  that file to the plasmid entry. This is a high-priority feature.

---

## 14. Attachments

- Primarily: `.gb` GenBank files (auto-matched, see §13) and `.ab1` sequencing files.
- Not always attached (Julia uses Benchling for sequencing, so `.ab1` not always worth it).
- Store as files on disk next to the database (not as BLOBs in the database).
- Downloadable from within the app.

---

## 15. Comments

| Type | Visibility |
|---|---|
| **Personal comment** | Only visible to the current user. Never published. E.g. "stupid shit thing" |
| **Public comment** | Visible to team when plasmid is published to library. E.g. "gives nice GFP expression in tobacco" |

---

## 16. Data Import from Old GMOCU

- **Backwards compatibility with existing `gmocu.db` files is required.**
- Users must be able to import their existing GMOCU database into jLab without losing data.
- Import from another jLab database file (merging instances) — keep this feature.

---

## 17. Settings

| Setting | Notes |
|---|---|
| Name / Initials | Used in labels and as creator in reports. |
| Email | Contact. |
| GMO institute | Az. and Anlage Nr. for Formblatt-Z. |
| Auto-create GMO organism | The organism to auto-create a GMO entry for on new plasmid save. Free text, any organism. |
| Auto-create GMO strain | Strain for the auto-create GMO. Free text. |
| Auto-create GMO on save | Toggle. Default off. |
| User-defined categories | The list for the Category dropdown. |
| Alias format | Configure which components go into the auto-generated alias and in which order. |
| Status colours | User assigns a colour to each status. |
| Favourite organisms | Used for batch-add GMO button. |
| Target organisms | Full set of organisms the user works with (drives GMO column generation). |
| Label templates | Configurable fields and dimensions for each label type. |
| Cloud integrations | JBEI/ice, Filebrowser, Google Drive, Google Sheets IDs. |
| Theme / appearance | Light/dark, font size, etc. |

---

## 18. Benchling Relationship

jLab is a **documentation and compliance tool**, not a sequence design tool.
Benchling handles: sequence design, annotation, sequencing result analysis.
jLab handles: plasmid inventory, GMO documentation, Formblatt-Z, team sharing, labels.

The two tools coexist. Julia exports `.gb` files from Benchling and imports into jLab.
The auto-match feature (§13) is specifically designed to reduce the friction of this step,
since manual import was so tedious that Julia stopped doing it.

---

## 19. Features NOT Needed (Confirmed by Julia)

| Feature | Decision |
|---|---|
| Parent-child plasmid relationships | Never used — remove entirely |
| Multi-user profiles on one machine | Not needed for Jores lab |
| Real-time notifications of team activity | Skip — too spammy |
| Sequence search (primer binding sites etc.) | Not needed — Benchling handles this |
| In-app plasmid map viewer | Nice-to-have only, not v1 |
| Publishing requirements gating | Nice-to-have only, not v1 |
| Multiple concurrent miniprep records | Not needed — update in place |

---

## 20. Julia's Top 3 Priority New Features

1. **Copy/paste everything** — the whole interaction model must be clipboard-friendly.
2. **Table-style layout** — primary interface is a spreadsheet, not a form.
3. **Auto-match `.gb` files** — detect and link GenBank files by plasmid ID in filename.

## 21. The Single Most Important Fix vs. GMOCU

> "The constant saving button clicking and this horrible way of creating genetic cassettes.
> I hate it to the core."

**Autosave** and a **rethought cassette editing experience** are the two non-negotiable
improvements over the old app.

---

*Document compiled from: julia-questionnaire.md (Round 1), julia-followup-questions_awnsers_v2.md (Round 2), julia-followup-questions-r3.md (Round 3), Julia's addendum comments (Round 3 follow-up).*
