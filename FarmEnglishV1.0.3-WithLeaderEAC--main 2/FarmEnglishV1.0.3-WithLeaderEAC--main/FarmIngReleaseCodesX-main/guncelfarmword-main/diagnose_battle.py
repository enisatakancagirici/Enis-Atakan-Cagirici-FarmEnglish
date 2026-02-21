#!/usr/bin/env python3
"""Diagnose encoding of battle files"""
import os

files = [
    'src/screens/BattleMenuScreen.tsx',
    'src/screens/LeaderboardScreen.tsx',
    'src/utils/firebaseBattle.ts',
    'src/screens/BattleScreen.tsx',
]

for fp in files:
    if not os.path.exists(fp):
        print(f"MISSING: {fp}")
        continue
    with open(fp, 'rb') as f:
        raw = f.read(20)
    
    has_bom = raw[:3] == b'\xef\xbb\xbf'
    print(f"\n{fp}:")
    print(f"  BOM: {has_bom}")
    print(f"  First 20 bytes: {raw.hex()}")
    
    with open(fp, 'rb') as f:
        data = f.read()
    
    # Check for double-encoded UTF-8 patterns
    double_patterns = {
        'Ã+char (C3 83)': data.count(b'\xc3\x83'),
        'Ä+char (C3 84)': data.count(b'\xc3\x84'),
        'Å+char (C3 85)': data.count(b'\xc3\x85'),
        'â+char (C3 A2)': data.count(b'\xc3\xa2'),
    }
    
    # Check for replacement chars (EF BF BD = U+FFFD)
    replacement_chars = data.count(b'\xef\xbf\xbd')
    
    # Check for Windows-1252 encoded Turkish
    win1252_patterns = {
        'ş as 0x9F': data.count(bytes([0x9F])),
        'Ö as 0xD6': data.count(bytes([0xD6])),
        'ö as 0xF6': data.count(bytes([0xF6])),  
        'ü as 0xFC': data.count(bytes([0xFC])),
        'ç as 0xE7': data.count(bytes([0xE7])),
    }
    
    total_double = sum(double_patterns.values())
    total_replacement = replacement_chars
    
    print(f"  Double-encoded patterns: {total_double}")
    for k, v in double_patterns.items():
        if v > 0:
            print(f"    {k}: {v}")
    print(f"  Replacement chars (U+FFFD): {total_replacement}")
    
    # Check if valid UTF-8
    try:
        text = data.decode('utf-8-sig' if has_bom else 'utf-8')
        # Count Turkish chars
        turkish = sum(1 for c in text if c in 'şŞğĞüÜöÖçÇıİ')
        print(f"  Valid UTF-8: YES, Turkish chars: {turkish}")
        
        # Check for mojibake indicators in decoded text
        mojibake_chars = sum(1 for c in text if ord(c) in (0xC3, 0xC4, 0xC5, 0xC2))
        if mojibake_chars > 0:
            print(f"  MOJIBAKE indicators (Ã/Ä/Å/Â chars): {mojibake_chars}")
    except UnicodeDecodeError as e:
        print(f"  Valid UTF-8: NO - {e}")
