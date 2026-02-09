
import os
import re

file_path = r'c:\FarmEnglishV1.0.1\FarmIngReleaseCodesX-main\guncelfarmword-main\src\screens\BattleScreen.tsx'

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # We want to change how oppProgress is calculated in the listener
    # Search for: const oppProgress = isUserHost ? battle.guestProgress : battle.hostProgress;
    
    old_line = "const oppProgress = isUserHost ? battle.guestProgress : battle.hostProgress;"
    
    # We want to replace it with logic that prefers answers.length if available
    new_block = """const oppAnsList = isUserHost ? battle.guestAnswers : battle.hostAnswers;
            const oppProgress = oppAnsList ? oppAnsList.length : (isUserHost ? battle.guestProgress : battle.hostProgress);"""

    if old_line in content:
        new_content = content.replace(old_line, new_block)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Updated oppProgress logic to use answers length.")
    else:
        # Try regex if exact match fails due to whitespace
        pattern = r'const\s+oppProgress\s*=\s*isUserHost\s*\?\s*battle\.guestProgress\s*:\s*battle\.hostProgress;'
        match = re.search(pattern, content)
        if match:
            print("Found via regex, replacing...")
            new_content = content[:match.start()] + new_block + content[match.end():]
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print("Updated oppProgress logic via regex.")
        else:
            print("Could not find oppProgress line.")

except Exception as e:
    print(f"Error: {e}")
