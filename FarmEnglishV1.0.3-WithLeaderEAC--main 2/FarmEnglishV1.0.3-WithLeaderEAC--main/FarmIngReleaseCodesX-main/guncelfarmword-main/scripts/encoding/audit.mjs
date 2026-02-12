import fs from "fs";
import path from "path";
import {
  collectTargetFiles,
  hasMojibakePattern,
  SUSPECT_MOJIBAKE_PATTERN,
} from "./_core.mjs";

const rootDir = process.cwd();
const args = new Set(process.argv.slice(2));
const jsonOutput = args.has("--json");

const ALLOWLIST = [];
const COLUMN_PATTERN = new RegExp(SUSPECT_MOJIBAKE_PATTERN.source, "u");

function getLineColumn(text, index) {
  let line = 1;
  let column = 1;
  for (let i = 0; i < index; i += 1) {
    if (text.charCodeAt(i) === 10) {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
}

function issueKey(issue) {
  return `${issue.path}:${issue.line}:${issue.column}:${issue.type}`;
}

function isAllowed(issue) {
  const key = issueKey(issue);
  return ALLOWLIST.includes(key);
}

function findAllIssuesInText(relativePath, text) {
  const issues = [];

  if (text.startsWith("\uFEFF")) {
    issues.push({
      path: relativePath,
      line: 1,
      column: 1,
      type: "bom",
      sample: "\\uFEFF",
    });
  }

  for (let i = 0; i < text.length; i += 1) {
    const cp = text.codePointAt(i);
    const ch = text.charCodeAt(i);

    const illegalControl =
      ch < 0x20 && ch !== 0x09 && ch !== 0x0a && ch !== 0x0d;
    if (illegalControl) {
      const pos = getLineColumn(text, i);
      issues.push({
        path: relativePath,
        line: pos.line,
        column: pos.column,
        type: "control-char",
        sample: `U+${ch.toString(16).toUpperCase().padStart(4, "0")}`,
      });
    } else if (cp === 0xfffd) {
      const pos = getLineColumn(text, i);
      issues.push({
        path: relativePath,
        line: pos.line,
        column: pos.column,
        type: "replacement-char",
        sample: "U+FFFD",
      });
    }

    if (cp > 0xffff) i += 1;
  }

  const lines = text.split(/\r\n|\n|\r/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!hasMojibakePattern(line)) continue;
    const firstHit =
      line.search(COLUMN_PATTERN) + 1;
    issues.push({
      path: relativePath,
      line: i + 1,
      column: Math.max(firstHit, 1),
      type: "mojibake-pattern",
      sample: line.slice(0, 140),
    });
  }

  return issues;
}

const files = collectTargetFiles(rootDir);
const issues = [];

for (const filePath of files) {
  // Keep gate focused on project files only, but include docs/scripts too.
  const relativePath = path.relative(rootDir, filePath);
  const text = fs.readFileSync(filePath, "utf8");
  const fileIssues = findAllIssuesInText(relativePath, text).filter((issue) => !isAllowed(issue));
  issues.push(...fileIssues);
}

const summary = {
  scannedFiles: files.length,
  issueCount: issues.length,
  controlCharCount: issues.filter((issue) => issue.type === "control-char").length,
  replacementCharCount: issues.filter((issue) => issue.type === "replacement-char").length,
  mojibakePatternCount: issues.filter((issue) => issue.type === "mojibake-pattern").length,
  bomCount: issues.filter((issue) => issue.type === "bom").length,
};

if (jsonOutput) {
  console.log(JSON.stringify({ summary, issues }, null, 2));
} else {
  console.log(
    `encoding audit: scanned=${summary.scannedFiles} issues=${summary.issueCount} control=${summary.controlCharCount} replacement=${summary.replacementCharCount} mojibake=${summary.mojibakePatternCount} bom=${summary.bomCount}`
  );
  for (const issue of issues.slice(0, 200)) {
    console.log(
      `${issue.path}:${issue.line}:${issue.column} ${issue.type} ${issue.sample}`
    );
  }
  if (issues.length > 200) {
    console.log(`... ${issues.length - 200} more issues omitted`);
  }
}

process.exit(issues.length > 0 ? 1 : 0);
