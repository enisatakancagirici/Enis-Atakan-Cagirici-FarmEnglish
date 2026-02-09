
import os
import codecs

file_path = r'c:\FarmEnglishV1.0.1\FarmIngReleaseCodesX-main\guncelfarmword-main\src\screens\BattleScreen.tsx'

# Read as binary to check signature or just read as weird encoding
try:
    with open(file_path, 'rb') as f:
        content = f.read()

    # If starts with UTF-8 BOM, strip it
    if content.startswith(codecs.BOM_UTF8):
        content = content[len(codecs.BOM_UTF8):]
    
    # Write back as pure UTF-8
    with open(file_path, 'wb') as f:
        f.write(content)
        
    print("Successfully removed BOM/fixed encoding")
except Exception as e:
    print(f"Error: {e}")
