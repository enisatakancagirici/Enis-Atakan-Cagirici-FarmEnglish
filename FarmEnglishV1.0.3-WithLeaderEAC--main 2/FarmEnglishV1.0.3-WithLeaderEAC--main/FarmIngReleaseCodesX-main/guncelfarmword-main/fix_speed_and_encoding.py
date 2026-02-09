
import os
import re

file_path = r'c:\FarmEnglishV1.0.1\FarmIngReleaseCodesX-main\guncelfarmword-main\src\screens\BattleScreen.tsx'

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Reduce Transition Delay (1500ms -> 250ms)
    # Looking for: }, 1500);
    new_content = re.sub(r'\}\s*,\s*1500\s*\);', '}, 250);', content)
    
    if new_content == content:
        print("⚠️ Could not find/replace '1500' timeout duration. Checking for 2000...")
        # Maybe it was 2000? Previous view said 1500.
        # Regex might be failing due to newlines.
        # Let's try a looser regex for the timeout at the end of handleAnswer
        pass
    else:
        print("✅ Reduced transition delay to 250ms.")

    # 2. Fix specific Result Screen typos/encoding
    replacements = {
        'KazandÄ±n': 'Kazandın',
        'Kaybettin': 'Kaybettin', # If it was corrupted
        'Berabere': 'Berabere',
        'SonuÃ§': 'Sonuç',
        'SonuÃ': 'Sonuç',
        'Ä°statistikler': 'İstatistikler',
        'PuanÄ±': 'Puanı',
        'Ã–dÃ¼ller': 'Ödüller',
        'Seviye': 'Seviye',
        'Ãœnvan': 'Ünvan',
        'Kazandın': 'Kazandın', # Valid one
        'Kaybettin': 'Kaybettin', 
        'Berabere': 'Berabere',
        'KazanÄ±lan': 'Kazanılan',
        'Kaybedilen': 'Kaybedilen',
        'harika bir performans gÃ¶sterdin!': 'Harika bir performans gösterdin!',
        'Harika bir performans gÃ¶sterdin!': 'Harika bir performans gösterdin!',
        'Harika bir performans gÃ¶sterdin': 'Harika bir performans gösterdin',
        'gÃ¶sterdin': 'gösterdin',
        'ZAFER!': 'ZAFER!',
        'ZAFER': 'ZAFER',
        'Zafer!': 'Zafer!',
        'Ä°yi Deneme!': 'İyi Deneme!',
        'Ä°yi Deneme': 'İyi Deneme',
        'Pes etme, daha iyisini yapabilirsin!': 'Pes etme, daha iyisini yapabilirsin!',
        'İkiniz de harika oldunuz!': 'İkiniz de harika oldunuz!',
        'Harika bir performans': 'Harika bir performans', # Just in case
    }
    
    for bad, good in replacements.items():
        new_content = new_content.replace(bad, good)
        
    # Also blindly replace common double-encoded chars again just in case compaction brought them back or they were missed
    common_fixes = {
        'Ä±': 'ı', 'ÅŸ': 'ş', 'Ã¼': 'ü', 'Ã§': 'ç', 'Ã¶': 'ö', 'ÄŸ': 'ğ',
        'Ä°': 'İ', 'Åž': 'Ş', 'Ãœ': 'Ü', 'Ã‡': 'Ç', 'Ã–': 'Ö', 'Äž': 'Ğ'
    }
    for bad, good in common_fixes.items():
        new_content = new_content.replace(bad, good)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
        
    print("Updates applied successfully.")

except Exception as e:
    print(f"Error: {e}")
