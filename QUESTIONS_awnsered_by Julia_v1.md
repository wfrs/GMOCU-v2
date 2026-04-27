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
JULIAS comment: ALIAS is not auto built in the old GMOCU
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

JULIAS comment: YOu also have some kind of children of plasmids, and when you delete one, all of the children of that plasmid are deleted. I dont know which purpose this has though. I never found it handy. 

**GMO entry per plasmid:**

- Select a target organism from the organisms glossary
- Set a Risk Group (`target_RG`, integer) JULIAS comment: the risk group is defined in the organism glossary though
- Record an Approval reference
- Record a date made and a date destroyed
- "Add" button creates a GMO entry; "Destroy" button fills in the destruction date
- `:)` button: one-click batch-add of all favourite organisms at once
- Multiple GMO entries can exist per plasmid

**Feature auto-complete:**

- When filling in a cassette, start typing a feature name → dropdown suggests entries
  from the Nucleic acids glossary
  Julias comment: Yes but it's very shitty executed and I hate everything about it
- A "Variant" field allows appending a variant suffix to the feature name
- Clicking the `+` button inserts the selected feature into the cassette content
Julias comment: also fucking annoying is that you cant only replace a certain part of genetic cassette, you always have to completely delete the wrong one and start with a new one completely
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
4. Add one or more cassette entries using the feature autocomplete JULIAS comment: worst user experienc ever
5. Fill in alias, purpose, cloning summary, backbone vector
6. Set status to *Planned* or *In Progress*
7. Save
Julias comment: Actually you have to save every step of the way, otherwise things get lost

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
Julias comment: It does check if all your entries are actually suitable for creating a FOrmblatt Z, otherwise it gives an error which is quite nice. 

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

Julias comment: Nothing really works well. the worst things are that you have to click save for everything and that you have to manually create each genetic cassette from scratch. it would be way easier to copy paste and change by writing and somehow get a warning if your written genetic part does not fit the entry in the parts database. 
Adding plasmids and threir contents should be way easier. I like the idea of autocomplete but not the way it is executed in the app. It should not be so much clicking around, it is horribly tedious. 

I image it more like an excel spreadsheet that I can edit and still get this pop up window with the details if needed, but i wanna be able to copy paste way more and deffo have autosave and not have to manually save all the time. And let the program tell me if i inserted a genetic part that is not in my parts list for the formblatt Z. I also want to be able to put more info in this excel kind of list, like concentration of th plasmid in ng/µL, date sequenced, method sequenced, in which box it is stored etc,this is how i currently organise my excel sheet: ID	name	insert	details	category	markers	concentration [ng/µL]	total size [bp]	insert size [bp]	comment	Sequencing? (ONT/Sanger?)	date sequencing	box	date plasmid	Glycerol stock ID	Date Glycerol Stock	Organism	Strain	other comment
Glycerol stock could of course then just be the "GMO generation date"


 maybe even attach the .ab1 file. also attach the gb file. maybe be able to match the .gb file automatically if the plasmid ID matches part of the name of the .gb file. FOr example plasmid ID is pJM0001 and the .gb file name is pJM0001_pMiso000_Tetp-TGA2.2-FLAG-rnpBt that it is able to match this and attach it to the correct entry. 

I kinda want it to be a plasmid and GMO organization app, so that i have one program where i can store all my relevant plasmid and GMO data instead of a big excel file but that also automatically generates a FOrmblatt Z because of the glossaries of the organisms and genetic parts. I would also like it to be able to create a word document/pdf file with plasmid labels and glycerol stock labels where i can predefine how wide and long the label is and what information from the plasmid list should go on there and then i generates me a table kind of thing that i can print and cut out and stick on my tubes. 

Uuuh also colour coding for plasmids in progress, planned and finished would be great and also for troubles with this plasmid (colours can be defined by user)

---

**Q1 — Adding a new plasmid (Workflow A)**

The old app requires you to go through a form with many fields. Is this okay, or
would you prefer a simpler starting point (e.g. just a name and a file, fill in
the rest later)?

> *Your answer* m answer is, the form is nice to have if you like to work with a form but i like a copy and paste excel style way better. you should keep the form though. also it does not require you right now to fill out everything. 
---

**Q2 — Cassettes and feature autocomplete**

In the old app, a cassette is a free-text field where you type feature names separated
by `-`, and you can autocomplete from the glossary.

- Does this notation feel natural to you, or is it confusing?
- Do you often have multiple cassettes per plasmid, or almost always just one?
- Would you prefer a more structured approach (e.g. clicking features from a list
  to build the cassette, rather than typing)?

> *Your answer:*
As written above this is highly annoying because it is a very slow process. especially because you cant copy paste a plasmid and just switch out one part of the cassette, you have to create each cassette new. it is horrible. of course plasmids should still be allowed to contain multiple cassettes. that is nice about the old app (it's just something i personally dont really use or need, but I bet other people with other use cases would). 

I would love to be able to copy paste stuff and just get a little notification if my feature name does not correspond to anything in the glossary. autocomplete is still fine in case you need to create a new cassette. 

Also for the alias, I have a very simple way for the alias that it is just the ID_plasmid-cassette. If you could set this up in preferences, so it just creates this automatically, would be nice, otherwise copy paste also fine. 

I kinda just really want a excel list kind of thing where i can drag down copy and count down stuff (pJM0001 --> drag down to pJM00XX you get what i mean), just excel features. 

---

**Q3 — The alias field**

The alias is a structured shorthand built from feature names (e.g.
`AtUBQ10pro-GFP-AtRBCS3Ater`). Is this something you actually use in practice,
and do you build it manually or expect the app to generate it automatically?

> *Your answer:*
I will copy from the answer above: Also for the alias, I have a very simple way for the alias that it is just the ID_plasmid-cassette. If you could set this up in preferences, so it just creates this automatically, would be nice, otherwise copy paste also fine. 

BUt in general the alias should be free to choose. just maybe give the option to define a certain structure to automatically generate it in a certain way always. 
---

**Q4 — Plasmid status**

Currently: *Planned → In Progress → Complete → Abandoned*

- Does this status flow reflect how you actually work?
- Are there statuses you would add, remove, or rename?
- Is there a status like "Needs sequencing" or "Sequence confirmed" that matters to you?

> *Your answer:*
i would like to add the status: trouble in paradise haha and also have these colour coded, so you know where you need to invest some work in. the other status are fine. 
i would really like to have sequenced yes no, method (sanger or whole plasmid seq or so)
---

**Q5 — GMO documentation (Workflow B)**

- How often do you transform plasmids into organisms (roughly: most plasmids, about half,
  or a minority)?
- Does the current GMO entry process feel right? Is there anything missing or confusing
  about recording Risk Group, Approval, date made, date destroyed?
- Is the `:)` batch-add of favourite organisms something you use regularly?

> *Your answer:*
essentially all of them, otherwise i dont need to create a plasmid, quite some plasmids also in two or three different organisms. 
the current gmo entry is again annoying because a lot of clicking and saving. copy, paste drag drop would be great here again because a lot of my gmos are also created in batches, so a lot are created on the same day. and if i could just copy paste this in this excel style table and it updates the data for the GMO like this would be great. 
the batch add is actually handy, i like this, just should be more obvious than a fucking smiley.
---

**Q6 — Formblatt-Z generation (Workflow C)**

- Do you actually generate this report yourself, or does someone else (e.g. lab manager)
  do it?
- Is the current Excel output format acceptable, or would you prefer a different format
  (e.g. PDF)?
- Are there any fields in the current report that are wrong or missing?

> *Your answer:*
i generate it myself. the form is how they want it, so we should keep it like this. like in general how the sheet is structured should stay the same. 
---

**Q7 — The shared glossary (Workflow D)**

The old app uses a shared Google Sheet to synchronise feature and organism definitions
across users.

- Does this sync system work reliably for you in practice?
- Is the Google Sheets dependency something you are happy to keep, or would you prefer
  a different sharing mechanism (e.g. a shared folder, or a simple export/import)?
- Who in the lab is responsible for curating the glossary?

> *Your answer:*
i think it works fine, i never had it set up because my supervisor was too lazy to do something about it, so i only had my glossaries locally. but i think this works well and should be an option. 
nobody right now haha
---

**Q8 — Uploads to JBEI/ice, Filebrowser, Google Drive (Workflow E)**

- Do you actively use JBEI/ice? If so, for what?
- Do you use the Filebrowser upload? If so, what do you upload?
- Do you use the Google Drive upload? If so, what do you upload?
- If none of these are used, what *do* you do with your GenBank files and attachments
  after entering them into GMOCU?

> *Your answer:*
I dont but i think it should stay included in case this becomes necessary. right now this is only for documentation for myself, but i could see myself uploading this stuff somewhere. 
---

**Q9 — Importing from another GMOCU instance (Workflow F)**

- Have you ever used this feature?
- If yes: how often does your lab need to merge databases from different people?

> *Your answer:*
never did but it cant hurt to have it tbh. 
---

**Q10 — Attachments**

Currently, attachments (sequencing results, PDFs, images) are stored inside the SQLite
database as binary blobs.

- How important is attachment storage to you — a core feature or occasionally useful?
- What kinds of files do you typically attach?
- Would you be okay with attachments being stored as files on disk next to the database,
  rather than embedded in the database?

> *Your answer:*
dont know how important. i could imagine myself mainly attaching the gb file and the ab1 file (but sometimes that is too much work, so if i could automatch the gb file, then i would deffo do it, the seq result probably not always because i also have this all in benchling of course.) 
---

**Q11 — Search and navigation**

- In the old app you search by name and alias. Are there other things you regularly want
  to search by (e.g. creator, genetic element, date, organism)?
- How large is your plasmid collection — roughly how many entries are in the database?

> *Your answer:*
i just wanna have a table strucure where i can just search in for everything. sort and filter. like control + f and off it goes. 
---

**Q12 — Anything in the old app that you find annoying, confusing, or broken?**

> *Your answer:*
the constant need to save everything. having to click everything. the ui is the most hideous, the scaling of the app, the fact that it is not possible to copy anything really. just overall shitty this app. 
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
hmm i like the idea, kind of like a lab plasmid glossary in the end, so you can see which person owns which kind of plasmid. currently it's more asking "hey do you have xy genetic part in one of your plasmids" or checking benchling and hoping to find a plasmid that has a correct enough name to find what you were looking for. 
---

**Q14 — Plasmid origin / lineage**

- Do you regularly need to record which parent plasmid or backbone a new plasmid was
  derived from?
- Would a visual "family tree" of plasmid lineage be useful to you?

> *Your answer:*
hmm could be handy. for me personally not so important but i see the use in it for other people. 
---

**Q15 — Plasmid map / visual**

The old app stores GenBank files but does not show a circular plasmid map.

- Would a visual plasmid map inside the app be useful to you (like what you see in
  SnapGene or Benchling)?
- Or is it acceptable to just open the file in SnapGene externally?

> *Your answer:*
not per se necessary, but good gimick, nice to have. esp when i wanna check out a plasmid from another person (oping they would have uploaded a .gb file haha)
---

**Q16 — Sequence storage**

- The old app stores the GenBank file content as text in the database. Is it important
  to you that the sequence is searchable (e.g. "find all plasmids containing this
  primer binding site")?
- Or is the GenBank file mostly just for archiving and export?

> *Your answer:*
i guess there a better applications to actually work with your plasmids, like benchling or snapgene or whatever, so i think it is just for archiving and exporting and maybe for sharing with your team mates, so they find what they are looking for easier. 
---

**Q17 — Multiple users on one computer**

The old app is a single-user app — there is one "Settings" entry with one person's
name and initials.

- Does more than one person in your lab share a single computer to use GMOCU?
- Should the new app support multiple user profiles on one machine?

> *Your answer:*
i dont think this is necessary. but it is nice to have thinking about maybe a student computer where this app would be installed. but in general i think most people would use their own computer, so probably not necessary. 
---

**Q18 — Notifications / awareness of what others are doing**

- Would you find it useful to get a notification inside the app when someone else
  publishes a new plasmid to the team library?
- Or is a manual "refresh" when you need it sufficient?

> *Your answer:*
hmm i think that you could get quickly spammed with notifications. dont know if this is handy. 
---

**Q19 — Plasmid duplication detection**

- If you or a colleague creates a plasmid that looks very similar to an existing one
  (same backbone, same genes), would you want the app to warn you?
- Or is it fine to have duplicates?

> *Your answer:*
it is fine to have duplicates but it would be amazing if you were to create a plasmid in there and the app would be like "wait my friend, colleague xy already made exactly this plasmid, are you sure you need to make this?" but i dont think this would happen super often. 
---

**Q20 — Batch operations**

- Do you ever need to import a large batch of GenBank files at once (e.g. from a
  folder of 20+ files)?
- Do you ever need to change the status of many plasmids at once?

> *Your answer:*
yes so copy paste super important and also as metioned earlier, auto match for gb files if they contain the ID in the name would be fancy schmancy. 
---

**Q21 — Comments / notes on plasmids**

- Would it be useful to add short notes or comments to a plasmid entry (e.g.
  "this didn't work — try with a different promoter")?
- Should comments be personal (only you see them) or shared with the whole team?

> *Your answer:*
i think public comment and personal comment would be great. i would see myself write in a plasmid "stupid shit thing" but i wouldnt want my colleagues to see this. also i guess mostly you would only share finished plasmids with your colleagues. but then a comment after using like "this gives nice GFP expression in tobacco" would be handy maybe, so yeah. 
---

**Q22 — Any other features you would love to have that aren't listed above?**

> *Your answer:*
cant think of anything right now. except one thing that i should have mentioned earlier probably. but it needs to be documented somewhere the name of the glycerol stock because pJM0001 is mostly CJM001 (E. coli gylcerol stock naming system of me) but for agros i dont have all of them as glycerol stocks, so pJM0220 might be AJM001 (agro glycerol stock naming system from me personally) or sth like this. 
---

## Part 4 — Priorities

**Q23 — If you could only have three new features in jLab that don't exist in
the old app, what would they be?**

> *Your answer:*
copy paste everything, table style layout, automatch .gb files. 
---

**Q24 — What is the single most painful thing about using the old app day-to-day
that you most want the new app to fix?**

> *Your answer:*
the constant saving button clicking and this horrible way of creating genetic cassettes. i hate it to the core. 
---

*Thank you, Julia! Your answers will directly shape the design of jLab.*