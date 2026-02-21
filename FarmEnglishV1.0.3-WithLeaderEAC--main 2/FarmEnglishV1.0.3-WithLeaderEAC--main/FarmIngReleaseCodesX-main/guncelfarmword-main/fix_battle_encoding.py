#!/usr/bin/env python3
"""
Smart decoder for mixed-encoding battle files.
Files have CP1254 (Windows Turkish) single-byte chars mixed with valid UTF-8 multi-byte sequences.
"""
import os

# Build CP1254 lookup
CP1254_MAP = {}
for b in range(256):
    try:
        CP1254_MAP[b] = bytes([b]).decode('cp1254')
    except:
        CP1254_MAP[b] = None

def is_utf8_cont(b):
    return 0x80 <= b <= 0xBF

def smart_decode(raw):
    result = []
    i = 0
    stats = {'ascii': 0, 'utf8': 0, 'cp1254': 0, 'unknown': 0}
    
    while i < len(raw):
        b = raw[i]
        
        # ASCII
        if b < 0x80:
            result.append(chr(b))
            stats['ascii'] += 1
            i += 1
            continue
        
        # Try UTF-8 multi-byte
        decoded = None
        
        # Known CP1254 Turkish bytes that should NOT be treated as UTF-8 lead bytes:
        # C7=Ç, D6=Ö, D7=×, DC=Ü, DD=İ, DE=Ş, E7=ç, F0=ğ, F6=ö, FC=ü, FD=ı, FE=ş
        cp1254_turkish = {0xC7, 0xD0, 0xD6, 0xD7, 0xDC, 0xDD, 0xDE, 0xE7, 0xF0, 0xF6, 0xFC, 0xFD, 0xFE}
        
        if b not in cp1254_turkish:
            # Try 4-byte UTF-8
            if 0xF0 <= b <= 0xF7 and i + 3 < len(raw):
                if is_utf8_cont(raw[i+1]) and is_utf8_cont(raw[i+2]) and is_utf8_cont(raw[i+3]):
                    try:
                        decoded = raw[i:i+4].decode('utf-8')
                        i += 4
                    except: pass
            # Try 3-byte UTF-8
            if not decoded and 0xE0 <= b <= 0xEF and i + 2 < len(raw):
                if is_utf8_cont(raw[i+1]) and is_utf8_cont(raw[i+2]):
                    try:
                        decoded = raw[i:i+3].decode('utf-8')
                        i += 3
                    except: pass
            # Try 2-byte UTF-8
            if not decoded and 0xC0 <= b <= 0xDF and i + 1 < len(raw):
                if is_utf8_cont(raw[i+1]):
                    try:
                        decoded = raw[i:i+2].decode('utf-8')
                        i += 2
                    except: pass
        else:
            # It's a known CP1254 Turkish byte.
            # BUT: F0 could be ğ or a 4-byte UTF-8 emoji lead.
            # Disambiguate: if F0 is followed by valid 3 continuation bytes forming valid emoji, use UTF-8
            if b == 0xF0 and i + 3 < len(raw):
                if is_utf8_cont(raw[i+1]) and is_utf8_cont(raw[i+2]) and is_utf8_cont(raw[i+3]):
                    try:
                        candidate = raw[i:i+4].decode('utf-8')
                        cp = ord(candidate)
                        if cp >= 0x10000:  # supplementary plane = emoji
                            decoded = candidate
                            i += 4
                    except: pass
            # E7 could be ç or 3-byte UTF-8 (CJK). Prefer ç unless all 3 bytes form a valid UTF-8 char
            # that makes sense (very unlikely in Turkish code)
            if b == 0xE7 and not decoded:
                # Keep as ç (CP1254) - CJK chars shouldn't appear in Turkish code
                pass
        
        if decoded:
            result.append(decoded)
            stats['utf8'] += 1
            continue
        
        # Fall back to CP1254 single byte
        cp_char = CP1254_MAP.get(b)
        if cp_char is not None:
            result.append(cp_char)
            stats['cp1254'] += 1
        else:
            # Undefined byte (0x8F, 0x90, etc.) - use replacement char
            result.append('\ufffd')
            stats['unknown'] += 1
        i += 1
    
    return ''.join(result), stats


def fix_file(filepath):
    print(f"\n{'='*60}")
    print(f"Fixing: {filepath}")
    
    with open(filepath, 'rb') as f:
        raw = f.read()
    
    text, stats = smart_decode(raw)
    print(f"  Stats: {stats}")
    
    turkish = 'şŞğĞüÜöÖçÇıİ'
    tcount = sum(1 for c in text if c in turkish)
    rcount = text.count('\ufffd')
    print(f"  Turkish chars: {tcount}")
    print(f"  Replacement chars: {rcount}")
    
    # Sample Turkish lines
    lines = text.split('\n')
    shown = 0
    for i, line in enumerate(lines, 1):
        if any(c in line for c in turkish) and shown < 10:
            print(f"  L{i}: {line.strip()[:140]}")
            shown += 1
    
    # Lines with replacement chars
    if rcount > 0:
        print(f"\n  Lines with replacement chars (�):")
        rshown = 0
        for i, line in enumerate(lines, 1):
            if '\ufffd' in line and rshown < 15:
                print(f"  L{i}: {line.strip()[:140]}")
                rshown += 1
    
    # Write UTF-8
    with open(filepath, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    
    # Verify
    with open(filepath, 'r', encoding='utf-8') as f:
        verify = f.read()
    vtcount = sum(1 for c in verify if c in turkish)
    print(f"\n  VERIFIED: {vtcount} Turkish chars, UTF-8 readable ✓")
    
    return text

# Fix battle files
for fp in ['src/screens/BattleMenuScreen.tsx', 'src/screens/LeaderboardScreen.tsx']:
    if os.path.exists(fp):
        fix_file(fp)
    else:
        print(f"NOT FOUND: {fp}")

print("\n" + "="*60)
print("DONE!")
