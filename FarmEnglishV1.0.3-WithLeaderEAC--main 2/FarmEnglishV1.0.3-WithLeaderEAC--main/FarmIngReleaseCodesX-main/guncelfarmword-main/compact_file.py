
import os
import re

file_path = r'c:\FarmEnglishV1.0.1\FarmIngReleaseCodesX-main\guncelfarmword-main\src\screens\BattleScreen.tsx'

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace 3 or more newlines with 2 newlines
    compacted_content = re.sub(r'\n{3,}', '\n\n', content)
    
    # Check for duplication marker (e.g., multiple "export default BattleScreen")
    matches = re.findall(r'export default BattleScreen;', compacted_content)
    if len(matches) > 1:
        print(f"Found {len(matches)} export statements! File is likely duplicated.")
        # Find the SECOND occurrence and truncate everything before it? No, truncate after first?
        # Usually duplication stacks at the end.
        # Let's just strip whitespace first.
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(compacted_content)
        
    print(f"Compacted file. Original size: {len(content)}, New size: {len(compacted_content)}")

except Exception as e:
    print(f"Error: {e}")
