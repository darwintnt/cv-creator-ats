/**
 * CLI entry point.
 *
 * Usage:
 *   tsx src/cli.ts <input.md> [--out output.pdf]
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { parseCvMarkdown } from "./cv.js";
import { renderCvToPdf } from "./cv-pdf.js";

interface CliArgs {
  inputPath: string;
  outPath: string;
}

function slugifyFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/__+/g, "_");
}

function parseArgs(argv: string[]): CliArgs {
  const positional: string[] = [];
  let outPath = "";

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--out") {
      outPath = argv[++i] ?? "";
    } else if (arg.startsWith("--out=")) {
      outPath = arg.slice("--out=".length);
    } else {
      positional.push(arg);
    }
  }

  const inputPath = positional[0];
  if (inputPath === undefined || inputPath === "") {
    console.error("Usage: cv-pdf <input.md> [--out output.pdf]");
    process.exit(2);
  }

  const resolvedInput = path.resolve(inputPath);
  if (!fs.existsSync(resolvedInput)) {
    console.error(`Input file not found: ${resolvedInput}`);
    process.exit(1);
  }

  if (outPath === "") {
    const stem = path.basename(resolvedInput).replace(/\.md$/i, "");
    outPath = path.resolve("out", `${stem}.pdf`);
  }

  return { inputPath: resolvedInput, outPath: path.resolve(outPath) };
}

async function main(): Promise<void> {
  const { inputPath, outPath } = parseArgs(process.argv.slice(2));

  const markdown = fs.readFileSync(inputPath, "utf8");
  const cv = parseCvMarkdown(markdown);

  await renderCvToPdf(cv, outPath);

  const bytes = fs.statSync(outPath).size;
  console.log(`CV parsed: ${cv.blocks.length} blocks, name="${cv.name}"`);
  console.log(`PDF written: ${outPath} (${bytes} bytes)`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
