# cv-creator — Markdown CV to ATS-friendly PDF

Turns a markdown CV master into a single-column, selectable-text PDF. The layout follows the Harvard Mignone Center for Career Success resume guidelines and stays ATS-parseable: US Letter, one text column, standard fonts, real text layer, no images, tables, or text boxes.

The repository ships neutral **example templates** (`data/examples/`) so anyone can fork it and generate their own CV. A `private/` folder — Git-ignored — is where each user keeps their own personal master copies.

## Quick path

1. `pnpm install`
2. `pnpm cv`
3. Open `out/CV_ES_example.pdf` — Letter, text extractable (output length varies with your content).

Requires Node 22+. Works with pnpm (recommended) or npm — the scripts call `tsc` directly, so any package manager can run them.

## Usage

| Command | What it does |
|---------|--------------|
| `pnpm cv` (or `npm run cv`) | Compiles TypeScript (`dist/`) and generates **both** example PDFs (Spanish + English) |
| `pnpm cv:es` / `pnpm cv:en` | Generate only the Spanish / English example PDF |
| `pnpm cv:tsx` (or `npm run cv:tsx`) | Generate both example PDFs without compiling (tsx, slower startup) |
| `pnpm cv:private` | Generate PDFs from your personal masters at `private/cv-master.md` and `private/cv-master-en.md` → `private/out/` (never committed) |
| `pnpm exec tsx src/cli.ts <input.md> [--out <file.pdf>]` (npm: `npx tsx …`) | Convert any markdown file; default output is `out/<input-stem>.pdf` |
| `pnpm build` (or `npm run build`) | Compile only |

## Your own CV (instead of the examples)

1. Copy the example for your language:
   ```bash
   mkdir -p private
   cp data/examples/cv-example-es.md private/cv-master.md        # Spanish
   cp data/examples/cv-example-en.md private/cv-master-en.md     # English
   ```
2. Edit the copies in `private/` with your real data. Keep both languages in sync if you use both.
3. `pnpm cv:private` → your PDFs land in `private/out/`.

`private/` is fully Git-ignored, so your personal data never leaves your machine.

## Editing the CV

The generator understands a constrained markdown subset — edit your master file:

| Markdown | Renders as |
|----------|------------|
| `# Name` | Centered page-1 title |
| First paragraph after the name containing `·`/`\|` plus an email/phone/link | Centered, small contact line |
| `## SECTION` | Bold uppercase section heading with a hairline rule |
| `### Company` | Job heading (company first, per the Harvard template) |
| `**Job Title** · Location · Dates` (line after a `###`) | Bold job title on the left, location/dates right-aligned on the same baseline |
| `- bullet text` | Bullet with hanging indent (bullet is a text glyph, so ATS extractors keep it) |
| Any paragraph containing "stack" | Muted, smaller keyword line |
| `**bold**` inline | Bold spans inside paragraphs, meta lines, and bullets |

Order of sections in the PDF mirrors the markdown exactly, so reordering sections is a data edit, not a code change.

## Format guarantees

- US Letter, equal 0.75 in margins (Harvard MCS: 3/4–1 in)
- Helvetica 10 pt body, bold/MAYUS emphasis only (no text boxes, underlining, or shading)
- Single column, reverse-chronological content, no photo/references/pronouns
- PDF text layer only — never rasterized; fonts are PDFKit core fonts (no downloads)

## Project structure

```
src/cv.ts         Markdown parser → block model (headings, paragraphs, bullets, bold spans)
src/cv-pdf.ts     PDFKit renderer (layout, spacing, Harvard-style meta lines)
src/cli.ts        CLI entry point
data/examples/    Neutral example masters (ES + EN) — commit-friendly
private/cv-*.md   Your personal masters — Git-ignored, never shared
private/out/      Your generated PDFs — Git-ignored
out/              Generated example PDFs
odd/tasks/        Feature log with decisions and verification evidence
```

Tuning tip: all vertical rhythm lives in the `SPACING` constant (and `RULE_GAP_BELOW`) at the top of `src/cv-pdf.ts` — change one number, regenerate. Keep the result at 2 pages; the orphan-heading guard may push content otherwise.

## Next step

To try the generator, run `pnpm cv` with the shipped examples. For your own CV, copy an example into `private/`, edit it, and run `pnpm cv:private`. To change the look, edit the constants in `src/cv-pdf.ts`.
