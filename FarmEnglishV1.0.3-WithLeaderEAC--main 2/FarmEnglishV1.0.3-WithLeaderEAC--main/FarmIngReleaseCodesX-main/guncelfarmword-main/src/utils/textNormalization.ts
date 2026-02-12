const SUSPECT_MOJIBAKE_PATTERN =
  /(?:\u00C3.|\u00C2.|\u00E2.|\u00C4.|\u00C5.|\u00F0\u0178|\u011F\u0178|\u00EF\u00BF|\uFFFD)/;
const SUSPECT_MOJIBAKE_SCORE_PATTERN =
  /(?:\u00C3|\u00C2|\u00E2|\u00C4|\u00C5|\u00F0\u0178|\u011F\u0178|\u00EF\u00BF|\uFFFD)/g;
const ESCAPED_UNICODE_PATTERN = /(?:\\|\/)u[0-9a-fA-F]{4}|(?:\\|\/)x[0-9a-fA-F]{2}/;
const CONTROL_CHARS_PATTERN = /[\u0000-\u001F\u007F-\u009F]/g;
const READABLE_CHARS_PATTERN = /[^\u0000-\u001F\u007F-\u009F]/g;

const WINDOWS_125X_REVERSE_MAP: Record<string, number> = {
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

function getMojibakeScore(text: string): number {
  return (text.match(SUSPECT_MOJIBAKE_SCORE_PATTERN) || []).length;
}

function getReadabilityScore(text: string): number {
  const readable = (text.match(READABLE_CHARS_PATTERN) || []).length;
  const controlChars = (text.match(CONTROL_CHARS_PATTERN) || []).length;
  const replacements = (text.match(/\uFFFD/g) || []).length;
  return readable - (controlChars * 3) - (replacements * 4);
}

function decodeUtf8Bytes(bytes: number[]): string {
  if (bytes.length === 0) return "";

  if (typeof TextDecoder !== "undefined") {
    try {
      return new TextDecoder("utf-8", { fatal: false }).decode(Uint8Array.from(bytes));
    } catch {
      // noop, percent-decoder fallback below
    }
  }

  try {
    const encoded = bytes.map((b) => `%${b.toString(16).padStart(2, "0")}`).join("");
    return decodeURIComponent(encoded);
  } catch {
    return "";
  }
}

function decodeEscapedUnicodeLiterals(text: string): string {
  if (!ESCAPED_UNICODE_PATTERN.test(text)) return text;
  return text
    .replace(/(?:\\|\/)u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/(?:\\|\/)x([0-9a-fA-F]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
}

function decodeLatinMojibake(text: string): string {
  const bytes: number[] = [];
  for (const char of text) {
    const codePoint = char.charCodeAt(0);
    if (codePoint > 0xff) return text;
    bytes.push(codePoint);
  }

  try {
    const decoded = decodeUtf8Bytes(bytes);
    return decoded || text;
  } catch {
    return text;
  }
}

function decodeWindowsMojibake(text: string): string {
  const bytes: number[] = [];
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

/**
 * Aggressive fallback:
 * - Works for chained mojibake variants that include >0xFF code points
 * - Keeps emoji/Turkish recovery practical by coercing unknown code points to low-byte
 */
function decodeCoercedMojibake(text: string): string {
  const bytes: number[] = [];
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

function chooseBetterCandidate(current: string, candidates: string[]): string {
  let best = current;
  let bestScore = getMojibakeScore(current);
  let bestReadability = getReadabilityScore(current);

  for (const candidate of candidates) {
    if (!candidate || candidate === current) continue;
    const score = getMojibakeScore(candidate);
    const readability = getReadabilityScore(candidate);
    if (score < bestScore || (score === bestScore && readability > bestReadability)) {
      best = candidate;
      bestScore = score;
      bestReadability = readability;
    }
  }

  return best;
}

export function normalizeDisplayText(value: unknown): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";
  const hasEscapedUnicode = ESCAPED_UNICODE_PATTERN.test(raw);
  const hasSuspectMojibake = SUSPECT_MOJIBAKE_PATTERN.test(raw);

  if (!hasEscapedUnicode && !hasSuspectMojibake) {
    return raw.replace(/\uFFFD/g, "").trim();
  }

  let normalized = hasEscapedUnicode ? decodeEscapedUnicodeLiterals(raw) : raw;
  for (let i = 0; i < 4; i += 1) {
    const escapedDecoded = decodeEscapedUnicodeLiterals(normalized);
    const decodedLatin = decodeLatinMojibake(normalized);
    const decodedWindows = decodeWindowsMojibake(normalized);
    const decodedCoerced = decodeCoercedMojibake(normalized);
    const chainedEscapedLatin = decodeLatinMojibake(escapedDecoded);
    const chainedEscapedWindows = decodeWindowsMojibake(escapedDecoded);
    const chainedEscapedCoerced = decodeCoercedMojibake(escapedDecoded);
    const best = chooseBetterCandidate(normalized, [
      escapedDecoded,
      decodedLatin,
      decodedWindows,
      decodedCoerced,
      chainedEscapedLatin,
      chainedEscapedWindows,
      chainedEscapedCoerced,
    ]);
    if (best === normalized) break;
    normalized = best;
    if (!SUSPECT_MOJIBAKE_PATTERN.test(normalized) && !ESCAPED_UNICODE_PATTERN.test(normalized)) {
      break;
    }
  }

  return normalized
    .replace(/\uFFFD/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
