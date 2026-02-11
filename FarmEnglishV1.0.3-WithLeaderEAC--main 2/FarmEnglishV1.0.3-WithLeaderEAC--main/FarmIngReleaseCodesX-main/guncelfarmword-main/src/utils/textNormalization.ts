const SUSPECT_MOJIBAKE_PATTERN =
  /(?:\u00C3.|\u00C2.|\u00E2.|\u00C4.|\u00C5.|\u00F0\u0178|\u011F\u0178|\u00EF\u00BF|\uFFFD)/;
const SUSPECT_MOJIBAKE_SCORE_PATTERN =
  /(?:\u00C3|\u00C2|\u00E2|\u00C4|\u00C5|\u00F0\u0178|\u011F\u0178|\u00EF\u00BF|\uFFFD)/g;

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

function decodeLatinMojibake(text: string): string {
  try {
    return decodeURIComponent(escape(text));
  } catch {
    return text;
  }
}

function decodeWindowsMojibake(text: string): string {
  if (typeof TextDecoder === "undefined") return text;

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

  try {
    return new TextDecoder("utf-8", { fatal: false }).decode(Uint8Array.from(bytes));
  } catch {
    return text;
  }
}

function chooseBetterCandidate(current: string, candidates: string[]): string {
  let best = current;
  let bestScore = getMojibakeScore(current);

  for (const candidate of candidates) {
    if (!candidate || candidate === current) continue;
    const score = getMojibakeScore(candidate);
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best;
}

export function normalizeDisplayText(value: unknown): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";

  if (!SUSPECT_MOJIBAKE_PATTERN.test(raw)) {
    return raw.replace(/\uFFFD/g, "").trim();
  }

  let normalized = raw;
  for (let i = 0; i < 3; i += 1) {
    if (!SUSPECT_MOJIBAKE_PATTERN.test(normalized)) break;
    const decodedLatin = decodeLatinMojibake(normalized);
    const decodedWindows = decodeWindowsMojibake(normalized);
    const best = chooseBetterCandidate(normalized, [decodedLatin, decodedWindows]);
    if (best === normalized) break;
    normalized = best;
  }

  return normalized
    .replace(/\uFFFD/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
