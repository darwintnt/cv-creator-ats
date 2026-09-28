/**
 * Renders a parsed CV document into an ATS-friendly PDF using PDFKit.
 *
 * ATS constraints honored here:
 *   - exactly one text column, no sidebars, no tables, no images
 *   - PDFKit core fonts (Helvetica) -> no font downloads, real text layer
 *   - selectable, searchable text (never rasterized); bullet glyph is a
 *     text run so list structure survives plain-text extraction
 *   - section ordering copied 1:1 from the markdown source
 */

import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import type { CvDocument, InlineSpan } from "./cv.js";

const PAGE_MARGINS = { top: 46, bottom: 46, left: 54, right: 54 };
const BODY_FONT = "Helvetica";
const BODY_FONT_BOLD = "Helvetica-Bold";
const BULLET_PREFIX = "\u2022  ";

const SIZES = { name: 20, h2: 12, h3: 10.5, body: 10, small: 8.5 } as const;

const COLORS = {
  text: "#1a1a1a",
  muted: "#333333",
  rule: "#999999",
} as const;

// Vertical rhythm. moveDown values are multiplied by the current font's
// line height; keep generous white space per the Harvard MCS guidelines.
const SPACING = {
  afterHeader: 0.35,
  afterParagraph: 0.45,
  beforeH2: 1.1,
  beforeH3: 0.7,
  afterH3: 0.15,
  afterBullet: 0.15,
} as const;
/** Points between the H2 underline rule and the next block. */
const RULE_GAP_BELOW = 10;

function contentWidth(doc: PDFKit.PDFDocument): number {
  return doc.page.width - PAGE_MARGINS.left - PAGE_MARGINS.right;
}

function measureSpan(doc: PDFKit.PDFDocument, span: InlineSpan, size: number): number {
  doc.font(span.bold ? BODY_FONT_BOLD : BODY_FONT).fontSize(size);
  return doc.widthOfString(span.text);
}

/** True when the paragraph looks like the contact line under the name. */
function isProbablyContactLine(spans: InlineSpan[]): boolean {
  const joined = spans.map((s) => s.text).join("");
  const hasSeparator = joined.includes("\u00b7") || joined.includes("|");
  const hasDigital = /@|linkedin|\.co\b|\.com|\+\d/.test(joined.toLowerCase());
  return hasSeparator && hasDigital;
}

/**
 * True for the job-header line that follows a job title: a leading bold run
 * (company) followed by non-bold runs (location, dates).
 */
function isMetaParagraph(spans: InlineSpan[]): boolean {
  return spans.length > 1 && spans[0]!.bold && spans[0]!.text.trim().length > 0;
}

/**
 * Center a single-line paragraph horizontally between the margins (used for
 * the contact line under the name). Falls back to a flowed left paragraph
 * when the content cannot fit on one line.
 */
function writeCenteredParagraph(
  doc: PDFKit.PDFDocument,
  spans: InlineSpan[],
  opts: { size?: number; color?: string } = {},
): void {
  const size = opts.size ?? SIZES.body;
  const color = opts.color ?? COLORS.text;
  const maxW = contentWidth(doc);
  const totalW = spans.reduce((w, s) => w + measureSpan(doc, s, size), 0);
  if (totalW > maxW) {
    writeSpanParagraph(doc, spans, { size, color });
    return;
  }

  const startX = PAGE_MARGINS.left + (maxW - totalW) / 2;
  doc.x = startX;
  doc.y = doc.y;
  spans.forEach((seg, i) => {
    const isLast = i === spans.length - 1;
    doc.font(seg.bold ? BODY_FONT_BOLD : BODY_FONT).fontSize(size).fillColor(color);
    doc.text(seg.text, { continued: !isLast, lineBreak: isLast, underline: false });
  });
  doc.x = PAGE_MARGINS.left;
  doc.moveDown(SPACING.afterParagraph);
}

/**
 * Harvard-style job header: bold company on the left margin, location and
 * dates pushed to the right margin on the same baseline. Falls back to a
 * normal flowed paragraph when both parts cannot share one line.
 */function writeMetaParagraph(doc: PDFKit.PDFDocument, spans: InlineSpan[]): void {
  const size = SIZES.body;
  let firstNonBold = spans.findIndex((s) => !s.bold);
  if (firstNonBold === -1) {
    firstNonBold = spans.length;
  }
  const left = spans.slice(0, firstNonBold);
  const right = spans.slice(firstNonBold);
  const leftW = left.reduce((w, s) => w + measureSpan(doc, s, size), 0);
  const rightW = right.reduce((w, s) => w + measureSpan(doc, s, size), 0);
  const GAP = 12;
  if (left.length === 0 || right.length === 0 || leftW + GAP + rightW > contentWidth(doc)) {
    writeSpanParagraph(doc, spans, {});
    return;
  }

  const baselineY = doc.y;
  const rightX = PAGE_MARGINS.left + contentWidth(doc) - rightW;

  doc.x = PAGE_MARGINS.left;
  doc.y = baselineY;
  left.forEach((seg, i) => {
    const isLastOfLeft = i === left.length - 1;
    doc.font(seg.bold ? BODY_FONT_BOLD : BODY_FONT).fontSize(size).fillColor(COLORS.text);
    doc.text(seg.text, { continued: !isLastOfLeft, lineBreak: false, underline: false });
  });

  doc.x = rightX;
  doc.y = baselineY;
  right.forEach((seg, i) => {
    const isLast = i === right.length - 1;
    doc.font(seg.bold ? BODY_FONT_BOLD : BODY_FONT).fontSize(size).fillColor(COLORS.text);
    doc.text(seg.text, { continued: !isLast, lineBreak: isLast, underline: false });
  });

  doc.x = PAGE_MARGINS.left;
  doc.moveDown(SPACING.afterParagraph);
}

/**
 * Write plain+bold spans as one visual paragraph.
 *
 * PDFKit's `continued` runs keep the cursor x of each run when that run wraps
 * mid-line, so a long run starting past the left margin would keep its
 * continuation lines indented at the run's start x. To avoid that, runs are
 * greedily packed into visual lines first and an explicit line break is
 * emitted before any run that would overflow; a run that starts a line at the
 * left margin wraps back to the left margin naturally.
 *
 * `bulletPrefix` prepends a text bullet and lets the first body run's own
 * internal wrapping provide the hanging indent.
 */
function writeSpanParagraph(
  doc: PDFKit.PDFDocument,
  spans: InlineSpan[],
  opts: { size?: number; color?: string; bulletPrefix?: boolean } = {},
): void {
  const size = opts.size ?? SIZES.body;
  const color = opts.color ?? COLORS.text;
  const bulletPrefix = opts.bulletPrefix ?? false;
  const maxW = contentWidth(doc);

  const prefixW = bulletPrefix ? measureSpan(doc, { text: BULLET_PREFIX, bold: false }, size) : 0;

  interface Run {
    span: InlineSpan;
    breakBefore: boolean;
  }
  const runs: Run[] = [];
  let used = prefixW;
  spans.forEach((span, i) => {
    const w = measureSpan(doc, span, size);
    const breakBefore = i > 0 && used + w > maxW;
    if (breakBefore) {
      used = 0;
    }
    runs.push({ span, breakBefore });
    used += w;
  });

  doc.x = PAGE_MARGINS.left;
  if (bulletPrefix) {
    doc.font(BODY_FONT).fontSize(size).fillColor(color);
    doc.text(BULLET_PREFIX, { continued: true, lineBreak: false, underline: false });
  }
  runs.forEach((run, i) => {
    const isLast = i === runs.length - 1;
    const lineBreakAfter = isLast || runs[i + 1]!.breakBefore;
    doc.font(run.span.bold ? BODY_FONT_BOLD : BODY_FONT).fontSize(size).fillColor(color);
    doc.text(run.span.text, {
      continued: !lineBreakAfter,
      lineBreak: lineBreakAfter,
      underline: false,
    });
  });
  doc.moveDown(SPACING.afterParagraph);
}

function drawRule(doc: PDFKit.PDFDocument): void {
  const y = doc.y + 3;
  doc
    .save()
    .moveTo(PAGE_MARGINS.left, y)
    .lineTo(doc.page.width - PAGE_MARGINS.right, y)
    .lineWidth(0.6)
    .strokeColor(COLORS.rule)
    .stroke()
    .restore();
  doc.y = y + RULE_GAP_BELOW;
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number): void {
  if (doc.y + needed > doc.page.maxY()) {
    doc.addPage();
  }
}

function heading(doc: PDFKit.PDFDocument, level: 2 | 3, spans: InlineSpan[]): void {
  const size = level === 2 ? SIZES.h2 : SIZES.h3;
  // Never leave a heading orphaned at the bottom of a page.
  ensureSpace(doc, level === 2 ? 100 : 76);
  doc.moveDown(level === 2 ? SPACING.beforeH2 : SPACING.beforeH3);
  for (let i = 0; i < spans.length; i++) {
    const isLast = i === spans.length - 1;
    doc.font(BODY_FONT_BOLD).fontSize(size).fillColor(COLORS.text);
    doc.text(spans[i]!.text, {
      continued: !isLast,
      lineBreak: isLast,
      underline: false,
    });
  }
  if (level === 2) {
    drawRule(doc);
  } else {
    doc.moveDown(SPACING.afterH3);
  }
}

export function renderCvToPdf(cv: CvDocument, outPath: string): Promise<void> {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const doc = new PDFDocument({
    // US Letter per Harvard MCS guidelines (also the standard page in Colombia).
    size: "Letter",
    margins: { top: PAGE_MARGINS.top, bottom: PAGE_MARGINS.bottom, left: PAGE_MARGINS.left, right: PAGE_MARGINS.right },
    info: { Title: cv.name, Author: cv.name },
    pdfVersion: "1.7",
  });

  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  // Header: candidate name centered on top of page 1.
  doc.font(BODY_FONT_BOLD).fontSize(SIZES.name).fillColor(COLORS.text);
  doc.text(cv.name, { align: "center", lineBreak: true });
  doc.moveDown(SPACING.afterHeader);

  let contactDone = false;

  for (const block of cv.blocks) {
    // PDFKit leaves the cursor at the last run's inline position after a
    // continued chain; force every block back to the left margin.
    doc.x = PAGE_MARGINS.left;
    switch (block.kind) {
      case "heading": {
        if (block.level === 1) {
          continue; // H1 was already rendered as the header title
        }
        heading(doc, block.level, block.spans);
        break;
      }
      case "paragraph": {
        if (!contactDone && isProbablyContactLine(block.spans)) {
          writeCenteredParagraph(doc, block.spans, { size: SIZES.small, color: COLORS.muted });
          contactDone = true;
        } else if (isMetaParagraph(block.spans)) {
          writeMetaParagraph(doc, block.spans);
        } else if (block.spans.map((s) => s.text).join(" ").toLowerCase().includes("stack")) {
          // Compact keyword line ("Stack tecnológico: ...") rendered muted.
          writeSpanParagraph(doc, block.spans, { size: SIZES.small, color: COLORS.muted });
        } else {
          writeSpanParagraph(doc, block.spans, {});
        }
        break;
      }
      case "bullet": {
        ensureSpace(doc, 34);
        writeSpanParagraph(doc, block.spans, { bulletPrefix: true });
        doc.moveDown(SPACING.afterBullet);
        break;
      }
      default: {
        const exhaustive: never = block;
        void exhaustive;
      }
    }
  }

  doc.end();

  return new Promise<void>((resolve, reject) => {
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });
}
