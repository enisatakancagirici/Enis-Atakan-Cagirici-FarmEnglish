const NICKNAME_BLOCKLIST = [
    'admin',
    'moderator',
    'support',
    'owner',
    'fuck',
    'shit',
    'bitch',
    'asshole',
    'orospu',
    'sik',
    'amk',
    'aq',
    'got',
    'pic',
    'ibne',
    'yarrak',
    'gavat',
    'salak',
    'gerizekali',
    'mal',
];

const NORMALIZATION_MAP: Record<string, string> = {
    '@': 'a',
    '$': 's',
    '0': 'o',
    '1': 'i',
    '3': 'e',
    '4': 'a',
    '5': 's',
    '7': 't',
    '!': 'i',
    '|': 'i',
    '\u011F': 'g',
    '\u0131': 'i',
    '\u015F': 's',
    '\u00F6': 'o',
    '\u00FC': 'u',
    '\u00E7': 'c',
};

export function normalizeNicknameForModeration(value: string): string {
    return value
        .toLowerCase()
        .split('')
        .map((char) => NORMALIZATION_MAP[char] ?? char)
        .join('')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function isNicknameClean(nickname: string): boolean {
    const trimmed = nickname?.trim();
    if (!trimmed) return false;

    const normalized = normalizeNicknameForModeration(trimmed);
    if (!normalized) return false;

    const tokens = normalized.split(' ').filter(Boolean);
    const compact = normalized.replace(/\s+/g, '');

    return !NICKNAME_BLOCKLIST.some((word) => {
        if (word.length <= 3) {
            return tokens.includes(word) || compact === word;
        }
        return compact.includes(word);
    });
}

export default isNicknameClean;
