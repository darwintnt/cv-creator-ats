# MD to PDF CV (ATS-friendly)

## Objective
TypeScript script reads `data/cv-master.md` (ATS-friendly CV, Spanish) and renders a single-column, selectable-text PDF via PDFKit.

## Problem / Why
User keeps CV as markdown master; needs a repeatable local generator producing an ATS-parseable PDF (no images, no multi-column, selectable text layer).

## Scope (authorized)
- `data/cv-master.md` → `out/CV_ES_output.pdf` (filename derives from the H1 name).
- Parser supports the constructs actually present in the MD: H1/H2/H3, paragraphs, `**bold**` leading fragments, `-` bullets, plain lines ("Stack tecnológico:", contact line).
- TypesScript CLI: `pnpm build` compiles to `dist/`; run via `node dist` and via tsx.

## Constraints
- No repo exists yet: bootstrap `package.json` + `tsconfig` with pnpm.
- USER DECISION (closes T5): the project will not be a git repository; no commits. Traceability = this document + engram mirror. (Later, user requested a .gitignore — T13 — so the project is git-ready if they ever change their mind; still no repo initialized.)
- PDFKit std fonts (Helvetica/Times) only — no font downloads in CI.
- Single column, 1–2 pages, selectable text ("real" PDF text, not raster).
- No tests demanded by user; verification is: generate PDF, extract text, inspect.

## Tasks
- [x] T1: ODD doc + engram mirror (this).
- [x] T2: pnpm scaffold (`package.json`, `tsconfig.json`, pdfkit 0.20.2 + tsx + typescript).
- [x] T3: Implement `src/cv.ts` (parser) + `src/cv-pdf.ts` (renderer) + `src/cli.ts` (CLI).
- [x] T4: Generated `out/CV_ES_output.pdf`; verified with pypdf (2 pages, all 14 content checks, 25 bullets extractable, fonts Helvetica/Helvetica-Bold only, zero ops beyond margins) + visual qlmanage thumbnails of both pages.
- [x] T5: Work-unit commits — CANCELLED by user decision: this project will NOT use git. Traceability lives in this ODD document and the engram mirror instead.
- [x] T6: Harvard MCS alignment (user-requested after format research): page A4 → US Letter, job-header meta lines rendered Harvard-style (bold company left, location·dates right-aligned, same baseline; fallback to flowed paragraph when both parts don't fit), output filename → out/GomezD_CV_ES.pdf (HKS convention ApellidoInicial). Verified: Letter mediabox 612x792, 10/10 content checks, 25 bullets, zero margin overflow, both pages visually inspected.
- [x] T7: Vertical rhythm tuning (user feedback: text too tight). Spacing centralized in SPACING const + RULE_GAP_BELOW: afterParagraph 0.25→0.45, beforeH2 0.6→1.1, beforeH3 0.35→0.7, afterH3 0.1→0.15, afterBullet 0.12→0.15, rule gap 8→10pt. First attempt (1.2/0.2) overflowed to 3 pages; trimmed beforeH2→1.1 and afterBullet→0.15 restored exactly 2 pages. Verified: 8/8 checks, 25 bullets, 0 overflow, dist build in sync.
- [x] T8: Contact line centered under the name (user feedback). New writeCenteredParagraph measures total span width and offsets startX = left + (contentWidth - width)/2; falls back to flowed left paragraph if it can't fit one line. Verified: contact Tm x=72.76 (centered), 2 pages, dist in sync.
- [x] T9: Company before job title in EXPERIENCIA (user feedback; matches Harvard template's Organization-first order). Content swap in data/cv-master.md for all 6 jobs: H3 = company, bold lead of meta line = job title (right-aligned dates unchanged). No renderer changes needed. Verified: company-first for all 6 jobs in extracted text, 2 pages, 0 overflow, both pages visually inspected.
- [x] T10: README.md (explicit user request): quick path first, usage table, markdown-subset table, format guarantees, project structure, SPACING tuning tip.
- [x] T11: Fixed EBADDEVENGINES on `pnpm run cv` (user report; npm 10.9.8 / Node 22.22.3). Root cause: nested `npm run build` inside the cv script triggered npm's enforcement of devEngines.packageManager (pnpm pinned, npm executing). Fix: removed devEngines pin, added engines.node >=22 (compatibility goal: Node 22 onward), cv script calls tsc directly (no nested package-manager invocation). Verified: `npm run cv` AND `pnpm run cv` both generate the PDF on Node v22.22.3. README requirements/commands updated.
- [x] T12: English CV master (data/cv-master-en.md) + single command generating both languages. `pnpm cv` chains ES+EN conversions; `cv:es`/`cv:en` for individual regeneration; `cv:tsx` updated to both. Translation follows Harvard conventions (no pronouns, action verbs) and the same markdown subset (Tech stack lines keep the muted heuristic via "stack"). Verified: both PDFs 2 pages Letter, 25 bullets each, EN 10/10 content checks, 0 overflow, EN page 1 visually inspected. Degree rendering (user choice): "Tecnólogo en Sistemas" → "Associate Degree in Systems" (US-recruiter-friendly) rather than the literal "Systems Technologist".
- [x] T13: Added .gitignore (user request): node_modules/, dist/, out/, .DS_Store, logs, .env, editor dirs.

## Route evidence
- Route: direct inline implementation (greenfield 3-file scaffold, no codebase context to load).
- TDD: no project test config exists; mode unknown -> ordinary functional checks (tsc --noEmit, generated-PDF structural assertions, visual thumbnail review). Disclosed in closing report.

## Result
DONE. `pnpm cv` (build+dist) and `pnpm cv:tsx` both generate a 2-page A4, single-column, selectable-text PDF from data/cv-master.md. Output default `out/<input-stem>.pdf`; `--out` overrides.

## Key learnings (PDFKit 0.20)
1. Continued-run chains: the LAST run of a `continued` chain creates a fresh LineWrapper at the inline carry x -> cursor x leaks to the next block. Fix: reset `doc.x` per block.
2. A continued run starting mid-line keeps that x on its wrapped continuation lines. Fix: greedy pack runs into lines; emit explicit break before a run that would overflow.
3. Bullet glyph as text run (u2022) + internal wrap of the body run gives a natural hanging indent AND keeps the bullet in the text-extraction layer (ATS-friendly).
4. `**bold**` at line start must not be classified as a bullet: require whitespace after the `-`/`*` marker.
