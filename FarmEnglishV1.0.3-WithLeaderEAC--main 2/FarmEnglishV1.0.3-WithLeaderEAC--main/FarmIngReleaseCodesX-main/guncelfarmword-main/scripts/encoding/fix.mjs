import fs from "fs";
import path from "path";
import ts from "typescript";
import {
  collectTargetFiles,
  detectLineEnding,
  hasIllegalControlChars,
  hasMojibakePattern,
  hasReplacementChar,
  isCodeFile,
  normalizeMojibakeText,
  stripIllegalControlChars,
} from "./_core.mjs";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const verbose = args.has("--verbose");
const aggressive = !args.has("--no-aggressive");
const rootDir = process.cwd();

function escapeForSingleQuotedString(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t")
    .replace(/'/g, "\\'");
}

function escapeForDoubleQuotedString(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t")
    .replace(/"/g, '\\"');
}

function escapeForTemplateLiteral(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

function normalizeSegment(rawText) {
  let next = normalizeMojibakeText(rawText, { aggressive, removeReplacement: true });
  next = stripIllegalControlChars(next).replace(/\uFFFD/g, "");
  return next;
}

function serializeStringLiteral(rawValue, originalTokenText) {
  const quote = originalTokenText[0] === '"' ? '"' : "'";
  if (quote === '"') return `"${escapeForDoubleQuotedString(rawValue)}"`;
  return `'${escapeForSingleQuotedString(rawValue)}'`;
}

function sanitizeCommentToken(tokenText) {
  if (tokenText.startsWith("//")) {
    const body = tokenText.slice(2);
    const nextBody = normalizeSegment(body);
    return `//${nextBody}`;
  }

  if (tokenText.startsWith("/*") && tokenText.endsWith("*/")) {
    const body = tokenText.slice(2, -2);
    const nextBody = normalizeSegment(body);
    return `/*${nextBody}*/`;
  }

  return tokenText;
}

function sanitizeRegexToken(tokenText) {
  return tokenText.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "").replace(/\uFFFD/g, "");
}

function applyReplacements(text, replacements) {
  if (replacements.length === 0) return text;
  const sorted = [...replacements].sort((a, b) => b.start - a.start);
  let output = text;
  for (const replacement of sorted) {
    output =
      output.slice(0, replacement.start) +
      replacement.value +
      output.slice(replacement.end);
  }
  return output;
}

function fixCodeFileText(filePath, text) {
  const scriptKind = filePath.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : filePath.endsWith(".ts")
      ? ts.ScriptKind.TS
      : filePath.endsWith(".jsx")
        ? ts.ScriptKind.JSX
        : ts.ScriptKind.JS;
  const languageVariant =
    scriptKind === ts.ScriptKind.TSX || scriptKind === ts.ScriptKind.JSX
      ? ts.LanguageVariant.JSX
      : ts.LanguageVariant.Standard;

  const sourceFile = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  );
  const replacements = [];

  const addReplacement = (start, end, value) => {
    if (text.slice(start, end) === value) return;
    replacements.push({ start, end, value });
  };

  const visit = (node) => {
    if (ts.isStringLiteral(node)) {
      const tokenStart = node.getStart(sourceFile);
      const tokenEnd = node.getEnd();
      const tokenText = text.slice(tokenStart, tokenEnd);
      const normalized = normalizeSegment(node.text);
      if (normalized !== node.text) {
        addReplacement(
          tokenStart,
          tokenEnd,
          serializeStringLiteral(normalized, tokenText)
        );
      }
    } else if (ts.isNoSubstitutionTemplateLiteral(node)) {
      const tokenStart = node.getStart(sourceFile);
      const tokenEnd = node.getEnd();
      const normalized = normalizeSegment(node.text);
      if (normalized !== node.text) {
        addReplacement(tokenStart, tokenEnd, `\`${escapeForTemplateLiteral(normalized)}\``);
      }
    } else if (ts.isJsxText(node)) {
      const tokenStart = node.getStart(sourceFile);
      const tokenEnd = node.getEnd();
      const raw = text.slice(tokenStart, tokenEnd);
      const normalized = normalizeSegment(raw);
      if (normalized !== raw) {
        addReplacement(tokenStart, tokenEnd, normalized);
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    languageVariant,
    text
  );
  let token = scanner.scan();
  while (token !== ts.SyntaxKind.EndOfFileToken) {
    if (
      token === ts.SyntaxKind.SingleLineCommentTrivia ||
      token === ts.SyntaxKind.MultiLineCommentTrivia
    ) {
      const start = scanner.getTokenPos();
      const end = scanner.getTextPos();
      const tokenText = text.slice(start, end);
      const sanitized = sanitizeCommentToken(tokenText);
      if (sanitized !== tokenText) {
        addReplacement(start, end, sanitized);
      }
    } else if (token === ts.SyntaxKind.RegularExpressionLiteral) {
      const start = scanner.getTokenPos();
      const end = scanner.getTextPos();
      const tokenText = text.slice(start, end);
      const sanitized = sanitizeRegexToken(tokenText);
      if (sanitized !== tokenText) {
        addReplacement(start, end, sanitized);
      }
    }
    token = scanner.scan();
  }

  if (replacements.length === 0) return { changed: false, text };
  return { changed: true, text: applyReplacements(text, replacements) };
}

function fixPlainText(text) {
  const lineEnding = detectLineEnding(text);
  const parts = text.split(/\r\n|\n|\r/);
  const normalizedParts = parts.map((line) => normalizeSegment(line));
  return normalizedParts.join(lineEnding);
}

function cleanStartBom(text) {
  return text.startsWith("\uFEFF") ? text.slice(1) : text;
}

const files = collectTargetFiles(rootDir);
let touchedCount = 0;
let scannedCount = 0;

for (const filePath of files) {
  scannedCount += 1;
  const original = fs.readFileSync(filePath, "utf8");
  let next = cleanStartBom(original);

  if (isCodeFile(filePath)) {
    const result = fixCodeFileText(filePath, next);
    next = result.text;
  } else {
    next = fixPlainText(next);
  }

  // Scanner context can miss some TSX comment trivia; finish with safe line-level decode
  // only when mojibake is still present after token-aware transforms.
  if (hasMojibakePattern(next)) {
    next = fixPlainText(next);
  }

  // Final hard guard for illegal control and replacement chars.
  if (hasIllegalControlChars(next)) {
    next = next.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "");
  }
  if (hasReplacementChar(next)) {
    next = next.replace(/\uFFFD/g, "");
  }

  if (next === original) continue;
  touchedCount += 1;
  if (!dryRun) {
    fs.writeFileSync(filePath, next, "utf8");
  }
  if (verbose) {
    console.log(`${dryRun ? "[dry-run] " : ""}fixed ${path.relative(rootDir, filePath)}`);
  }
}

console.log(
  `${dryRun ? "[dry-run] " : ""}encoding fix completed: scanned=${scannedCount} changed=${touchedCount} aggressive=${aggressive}`
);
