import fs from "fs";
import path from "path";

export const DEFAULT_SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  ".expo",
  "build",
  "dist",
  ".gradle",
  ".idea",
  "__pycache__",
]);

export const DEFAULT_INCLUDE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".txt",
  ".yml",
  ".yaml",
  ".xml",
  ".properties",
  ".gradle",
  ".ps1",
  ".sh",
  ".bat",
  ".py",
]);

export const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

export const DEFAULT_IGNORE_FILE_NAMES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
]);

const CONTROL_CHARS_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
const ESCAPED_UNICODE_PATTERN =
  /(?:\\|\/)u[0-9a-fA-F]{4}|(?:\\|\/)x[0-9a-fA-F]{2}/;

export const SUSPECT_MOJIBAKE_PATTERN =
  /(?:[\u00C2-\u00C5][\u0080-\u024F]|\u00E2[\u0080-\u024F]{1,2}|\u00EF\u00BF\u00BD|\u011F\u0178|\uFFFD)/u;
const SUSPECT_MOJIBAKE_SCORE_PATTERN =
  /(?:[\u00C2-\u00C5]|\u00E2|\u011F\u0178|\u00EF\u00BF\u00BD|\uFFFD)/gu;

const WINDOWS_125X_REVERSE_MAP = {
  "\u20AC": 0x80,
  "\u201A": 0x82,
  "\u0192": 0x83,
  "\u201E": 0x84,
  "\u2026": 0x85,
  "\u2020": 0x86,
  "\u2021": 0x87,
  "\u02C6": 0x88,
  "\u2030": 0x89,
  "\u0160": 0x8a,
  "\u2039": 0x8b,
  "\u0152": 0x8c,
  "\u017D": 0x8e,
  "\u2018": 0x91,
  "\u2019": 0x92,
  "\u201C": 0x93,
  "\u201D": 0x94,
  "\u2022": 0x95,
  "\u2013": 0x96,
  "\u2014": 0x97,
  "\u02DC": 0x98,
  "\u2122": 0x99,
  "\u0161": 0x9a,
  "\u203A": 0x9b,
  "\u0153": 0x9c,
  "\u017E": 0x9e,
  "\u0178": 0x9f,
  "\u011E": 0xd0,
  "\u0130": 0xdd,
  "\u015E": 0xde,
  "\u011F": 0xf0,
  "\u0131": 0xfd,
  "\u015F": 0xfe,
};

function decodeUtf8Bytes(bytes) {
  if (bytes.length === 0) return "";

  try {
    return new TextDecoder("utf-8", { fatal: false }).decode(Uint8Array.from(bytes));
  } catch {
    const encoded = bytes.map((b) => `%${b.toString(16).padStart(2, "0")}`).join("");
    try {
      return decodeURIComponent(encoded);
    } catch {
      return "";
    }
  }
}

function decodeEscapedUnicodeLiterals(text) {
  if (!ESCAPED_UNICODE_PATTERN.test(text)) return text;
  return text
    .replace(/(?:\\|\/)u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/(?:\\|\/)x([0-9a-fA-F]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
}

function decodeLatinMojibake(text) {
  const bytes = [];
  for (const char of text) {
    const codePoint = char.charCodeAt(0);
    if (codePoint > 0xff) return text;
    bytes.push(codePoint);
  }

  const decoded = decodeUtf8Bytes(bytes);
  return decoded || text;
}

function decodeWindowsMojibake(text) {
  const bytes = [];
  for (const char of text) {
    const codePoint = char.charCodeAt(0);
    if (codePoint <= 0xff) {
      bytes.push(codePoint);
      continue;
    }
    const mapped = WINDOWS_125X_REVERSE_MAP[char];
    if (typeof mapped === "number") {
      bytes.push(mapped);
      continue;
    }
    return text;
  }

  const decoded = decodeUtf8Bytes(bytes);
  return decoded || text;
}

function decodeCoercedMojibake(text) {
  const bytes = [];
  for (const char of text) {
    const codePoint = char.charCodeAt(0);
    if (codePoint <= 0xff) {
      bytes.push(codePoint);
      continue;
    }

    const mapped = WINDOWS_125X_REVERSE_MAP[char];
    if (typeof mapped === "number") {
      bytes.push(mapped);
      continue;
    }

    bytes.push(codePoint & 0xff);
  }

  const decoded = decodeUtf8Bytes(bytes);
  return decoded || text;
}

function getMojibakeScore(text) {
  return (text.match(SUSPECT_MOJIBAKE_SCORE_PATTERN) || []).length;
}

function getReadabilityScore(text) {
  const readable = text.length - (text.match(CONTROL_CHARS_PATTERN) || []).length;
  const replacements = (text.match(/\uFFFD/g) || []).length;
  const controls = (text.match(CONTROL_CHARS_PATTERN) || []).length;
  return readable - replacements * 4 - controls * 3;
}

function chooseBetterCandidate(current, candidates, aggressive) {
  let best = current;
  let bestScore = getMojibakeScore(current);
  let bestReadability = getReadabilityScore(current);

  for (const candidate of candidates) {
    if (!candidate || candidate === best) continue;
    const candidateScore = getMojibakeScore(candidate);
    const candidateReadability = getReadabilityScore(candidate);
    const improved =
      candidateScore < bestScore ||
      (candidateScore === bestScore && candidateReadability > bestReadability) ||
      (aggressive &&
        candidate !== current &&
        candidateScore === bestScore &&
        candidateReadability === bestReadability);
    if (!improved) continue;
    best = candidate;
    bestScore = candidateScore;
    bestReadability = candidateReadability;
  }

  return best;
}

export function stripIllegalControlChars(value) {
  return value.replace(CONTROL_CHARS_PATTERN, "");
}

export function hasIllegalControlChars(value) {
  return CONTROL_CHARS_PATTERN.test(value);
}

export function hasReplacementChar(value) {
  return value.includes("\uFFFD");
}

export function hasMojibakePattern(value) {
  return SUSPECT_MOJIBAKE_PATTERN.test(value);
}

export function normalizeMojibakeText(
  value,
  { aggressive = true, removeReplacement = true } = {}
) {
  if (typeof value !== "string" || value.length === 0) return value ?? "";

  const hasEscapedUnicode = ESCAPED_UNICODE_PATTERN.test(value);
  const hasSuspectMojibake = SUSPECT_MOJIBAKE_PATTERN.test(value);

  let normalized = value;
  if (hasEscapedUnicode) {
    normalized = decodeEscapedUnicodeLiterals(normalized);
  }

  if (hasEscapedUnicode || hasSuspectMojibake) {
    for (let i = 0; i < 4; i += 1) {
      const escapedDecoded = decodeEscapedUnicodeLiterals(normalized);
      const decodedLatin = decodeLatinMojibake(normalized);
      const decodedWindows = decodeWindowsMojibake(normalized);
      const decodedCoerced = decodeCoercedMojibake(normalized);
      const chainedEscapedLatin = decodeLatinMojibake(escapedDecoded);
      const chainedEscapedWindows = decodeWindowsMojibake(escapedDecoded);
      const chainedEscapedCoerced = decodeCoercedMojibake(escapedDecoded);
      const sanitizedCurrent = stripIllegalControlChars(normalized).replace(/\uFFFD/g, "");
      const sanitizedCandidates = [
        escapedDecoded,
        decodedLatin,
        decodedWindows,
        decodedCoerced,
        chainedEscapedLatin,
        chainedEscapedWindows,
        chainedEscapedCoerced,
      ].map((candidate) =>
        stripIllegalControlChars(candidate || "").replace(/\uFFFD/g, "")
      );
      const best = chooseBetterCandidate(
        sanitizedCurrent,
        sanitizedCandidates,
        aggressive
      );
      if (best === sanitizedCurrent) break;
      normalized = best;
    }
  }

  normalized = stripIllegalControlChars(normalized);
  if (removeReplacement) normalized = normalized.replace(/\uFFFD/g, "");
  return normalized;
}

export function collectTargetFiles(
  rootDir,
  {
    includeExtensions = DEFAULT_INCLUDE_EXTENSIONS,
    skipDirs = DEFAULT_SKIP_DIRS,
    ignoreNames = DEFAULT_IGNORE_FILE_NAMES,
  } = {}
) {
  const files = [];

  const walk = (dirPath) => {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) continue;
        walk(fullPath);
        continue;
      }

      if (ignoreNames.has(entry.name)) continue;
      if (entry.name === "App.tsx") {
        files.push(fullPath);
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (includeExtensions.has(ext)) files.push(fullPath);
    }
  };

  walk(rootDir);
  return files;
}

export function isCodeFile(filePath) {
  return CODE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

export function detectLineEnding(text) {
  if (text.includes("\r\n")) return "\r\n";
  if (text.includes("\r")) return "\r";
  return "\n";
}
