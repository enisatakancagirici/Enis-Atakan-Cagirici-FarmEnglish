#!/usr/bin/env python3
"""Deep byte analysis of battle files to determine encoding."""
import os

def analyze_file(filepath):
    print(f"\n{'='*60}")
    print(f"File: {filepath}")
    
    with open(filepath, 'rb') as f:
        raw = f.read()
    
    print(f"Size: {len(raw)} bytes")
    
    # Find all non-ASCII bytes and their positions
    non_ascii = {}
    for i, b in enumerate(raw):
        if b > 127:
            if b not in non_ascii:
                non_ascii[b] = []
            non_ascii[b].append(i)
    
    print(f"\nNon-ASCII bytes found: {len(non_ascii)} unique values")
    print(f"Total non-ASCII bytes: {sum(len(v) for v in non_ascii.values())}")
    
    for byte_val in sorted(non_ascii.keys()):
        positions = non_ascii[byte_val]
        # Show context around first occurrence
        first_pos = positions[0]
        start = max(0, first_pos - 20)
        end = min(len(raw), first_pos + 20)
        context = raw[start:end]
        
        # Try to interpret: check if this is part of a multi-byte UTF-8 sequence
        # UTF-8 lead bytes: 110xxxxx (0xC0-0xDF), 1110xxxx (0xE0-0xEF), 11110xxx (0xF0-0xF7)
        # UTF-8 continuation: 10xxxxxx (0x80-0xBF)
        
        utf8_role = ""
        if 0x80 <= byte_val <= 0xBF:
            utf8_role = "UTF-8 continuation"
        elif 0xC0 <= byte_val <= 0xDF:
            utf8_role = "UTF-8 2-byte lead"
        elif 0xE0 <= byte_val <= 0xEF:
            utf8_role = "UTF-8 3-byte lead"
        elif 0xF0 <= byte_val <= 0xF7:
            utf8_role = "UTF-8 4-byte lead"
        else:
            utf8_role = "INVALID UTF-8"
        
        # Show context as printable chars where possible
        context_str = ''
        for b2 in context:
            if 32 <= b2 < 127:
                context_str += chr(b2)
            else:
                context_str += f'[{b2:02X}]'
        
        print(f"  0x{byte_val:02X} ({byte_val:3d}): {len(positions):3d} occurrences | {utf8_role:20s} | first@{first_pos}: ...{context_str}...")
    
    # Check if it could be double-encoded UTF-8
    # Double-encoded pattern: C3 followed by 80-BF (which maps to Latin chars that are actually UTF-8 lead bytes)
    double_encoded_count = 0
    for i in range(len(raw) - 1):
        if raw[i] == 0xC3 and 0x80 <= raw[i+1] <= 0xBF:
            double_encoded_count += 1
    print(f"\nDouble-encoded UTF-8 patterns (C3 xx): {double_encoded_count}")
    
    # Check C4, C5 patterns (common for Turkish double-encoding)
    for lead in [0xC3, 0xC4, 0xC5]:
        count = 0
        for i in range(len(raw) - 1):
            if raw[i] == lead and 0x80 <= raw[i+1] <= 0xBF:
                count += 1
        if count > 0:
            print(f"  {lead:02X} xx patterns: {count}")
            # Show first 5
            shown = 0
            for i in range(len(raw) - 1):
                if raw[i] == lead and 0x80 <= raw[i+1] <= 0xBF and shown < 5:
                    pair = raw[i:i+2]
                    try:
                        char = pair.decode('utf-8')
                        print(f"    @{i}: {lead:02X} {raw[i+1]:02X} -> '{char}' (U+{ord(char):04X})")
                    except:
                        print(f"    @{i}: {lead:02X} {raw[i+1]:02X} -> decode error")
                    shown += 1
    
    # Try to decode as UTF-8 in chunks to find where it breaks
    chunk_size = 1000
    for start in range(0, len(raw), chunk_size):
        chunk = raw[start:start+chunk_size]
        try:
            chunk.decode('utf-8')
        except UnicodeDecodeError as e:
            pos = start + e.start
            bad_bytes = raw[pos:pos+10]
            context_start = max(0, pos-30)
            context_end = min(len(raw), pos+30)
            ctx = raw[context_start:context_end]
            ctx_str = ''
            for b2 in ctx:
                if 32 <= b2 < 127:
                    ctx_str += chr(b2)
                else:
                    ctx_str += f'[{b2:02X}]'
            print(f"\n  UTF-8 break @{pos}: byte 0x{raw[pos]:02X}")
            print(f"    Context: {ctx_str}")
            break  # just show first break
    
    # NEW: Check if it might be a mixed encoding where some parts are UTF-8 
    # and some parts got double-encoded or triple-encoded
    # Let's try: decode as latin-1 first, then re-encode as latin-1, then decode as UTF-8
    try:
        text_latin1 = raw.decode('latin-1')  # latin-1 never fails
        # Check if re-encoding as latin-1 then decoding as utf-8 works
        try:
            text_fixed = text_latin1.encode('latin-1').decode('utf-8')
            print(f"\n  latin-1 -> utf-8 WORKS! This is a single-layer double encoding.")
        except:
            pass
    except:
        pass
    
    # Try: decode as UTF-8 with errors='replace' to see what we get
    text_replaced = raw.decode('utf-8', errors='replace')
    replacement_count = text_replaced.count('\ufffd')
    print(f"\n  UTF-8 with replacement: {replacement_count} replacement chars (�)")

    # Let's look at the bytes around position 0x8F and 0x90 specifically
    for target_byte in [0x8F, 0x90, 0x9F]:
        if target_byte in non_ascii:
            print(f"\n  Detailed look at 0x{target_byte:02X}:")
            for pos in non_ascii[target_byte][:3]:
                start = max(0, pos-5)
                end = min(len(raw), pos+5)
                bytes_around = raw[start:end]
                print(f"    @{pos}: {' '.join(f'{b:02X}' for b in bytes_around)}")
                # Check if this is part of a multi-byte sequence
                # Look at preceding byte
                if pos > 0:
                    prev = raw[pos-1]
                    if 0xC0 <= prev <= 0xDF:
                        try:
                            pair = bytes([prev, target_byte])
                            char = pair.decode('utf-8')
                            print(f"      As UTF-8 pair with prev byte: '{char}' (U+{ord(char):04X})")
                        except:
                            print(f"      NOT valid UTF-8 pair with 0x{prev:02X}")

files = [
    'src/screens/BattleMenuScreen.tsx',
    'src/screens/LeaderboardScreen.tsx',
]

for fp in files:
    if os.path.exists(fp):
        analyze_file(fp)
