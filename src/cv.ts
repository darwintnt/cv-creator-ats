/**
 * Domain model + markdown parser for the ATS-friendly CV.
 *
 * The CV master file (data/cv-master.md) uses a constrained markdown subset:
 *   # H1            -> candidate name
 *   plain paragraph under H1 -> contact line, then professional summary
 *   ## H2           -> top-level CV sections
 *   ### H3          -> job titles / subsections
 *   **Bold** at the start of a following line -> company / institution
 *   - bullets       -> achievements or list items
 *   labeled plain lines (e.g. "Stack tecnológico:") -> compact keyword lines
 *
 * Bold markers may also appear mid-line and are preserved as inline styles.
 */

export interface InlineSpan {
  text: string;
  bold: boolean;
}

export type Block =
  | { kind: 'heading'; level: 1 | 2 | 3; spans: InlineSpan[] }
  | { kind: 'paragraph'; spans: InlineSpan[] }
  | { kind: 'bullet'; spans: InlineSpan[] };

export interface CvDocument {
  /** Candidate name parsed from the H1. Falls back to the file name. */
  name: string;
  blocks: Block[];
}

/** Parse `**bold**` inline markers into styled spans. */
export function parseInlineSpans(raw: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw)) !== null) {
    if (match.index > cursor) {
      spans.push({ text: raw.slice(cursor, match.index), bold: false });
    }
    spans.push({ text: match[1], bold: true });
    cursor = match.index + match[0].length;
  }
  if (cursor < raw.length) {
    spans.push({ text: raw.slice(cursor), bold: false });
  }
  return spans.length > 0 ? spans : [{ text: raw, bold: false }];
}

const stripMarkdown = (line: string): string =>
  line.replace(/^\s*#{1,6}\s+/, '').replace(/^\s*[-*+]\s+/, '').trim();

export function parseCvMarkdown(markdown: string): CvDocument {
  const rawLines = markdown.replace(/\r\n?/g, '\n').split('\n');

  const blocks: Block[] = [];
  let name = '';

  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (line === '') {
      continue;
    }

    if (line.startsWith('#')) {
      const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line);
      if (headingMatch === null) {
        continue;
      }
      const level = Math.min(headingMatch[1].length, 3) as 1 | 2 | 3;
      const text = stripMarkdown(line);
      if (level === 1 && name === '') {
        name = text;
      }
      const spans = parseInlineSpans(text);
      blocks.push({ kind: 'heading', level, spans });
      continue;
    }

    if (/^[-*+]\s/.test(line) || /^\d+\.\s/.test(line)) {
      blocks.push({ kind: 'bullet', spans: parseInlineSpans(stripMarkdown(line)) });
      continue;
    }

    blocks.push({ kind: 'paragraph', spans: parseInlineSpans(stripMarkdown(line)) });
  }

  if (name === '' && blocks.length > 0) {
    const first = blocks[0]!;
    if (first.kind === 'heading' && first.level === 1) {
      name = first.spans.map((span) => span.text).join('');
    }
  }

  if (name === '') {
    name = 'Curriculum Vitae';
  }

  return { name, blocks };
}
