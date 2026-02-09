
import os

# Root directory to scan
root_dir = r'c:\FarmEnglishV1.0.1\FarmIngReleaseCodesX-main\guncelfarmword-main\src'

# Mappings for common double-encoded UTF-8 characters (Mojibake)
replacements = {
    'Ã¼': 'ü',
    'ÅŸ': 'ş',
    'Ã§': 'ç',
    'Ä±': 'ı',
    'Ã¶': 'ö',
    'ÄŸ': 'ğ',
    'Ã‡': 'Ç',
    'Ä°': 'İ',
    'Ã–': 'Ö',
    'Ãœ': 'Ü',
    'Åž': 'Ş',
    'Äž': 'Ğ',
    'â„¹ï¸': 'ℹ️',
    'âœ…': '✅',
    'â Œ': '❌',
    'ğŸ  ': '🏠',
    'ğŸ”„': '🔄',
    'ğŸ’¥': '💥',
    'ğŸ‘‹': '👋',
    'ğŸš€': '🚀',
    'ğŸ˜´': '😴',
    'SavaÅŸ': 'Savaş',
    'MÃ¼thiÅŸ': 'Müthiş',
    'HÄ±z': 'Hız',
    'Ã‡Ä±kÄ±ÅŸ': 'Çıkış',
    'gÃ¶': 'gö',
    'baÅŸlÄ±yor': 'başlıyor',
    'anlamÄ±': 'anlamı',
    'â€¢': '•', 
    'Ã¶dÃ¼l': 'ödül',
    'DaÄŸÄ±tÄ±mÄ±': 'Dağıtımı',
    'gÃ¶nderilemedi': 'gönderilemedi',
    'onaylandÄ±': 'onaylandı',
    'YanlÄ±ÅŸ': 'Yanlış',
    'DoÄŸru': 'Doğru',
    'YÃ¼kleniyor': 'Yükleniyor',
    'BaÄŸlantÄ±': 'Bağlantı',
    'SÄ±fÄ±rla': 'Sıfırla',
    'baÅŸarÄ±lÄ±': 'başarılı',
    'LÃ¼tfen': 'Lütfen',
    'bekleyiniz': 'bekleyiniz',
    'âš¡': '⚡',
    'ğŸ˜°': '😰',
    'ğŸ‘': '👍',
    'ğŸ”¥': '🔥',
    'Yakala!': 'Yakala!', # Just in case
    'Harika!': 'Harika!',
    'Ã–ndesin': 'Öndesin',
    'HÄ±zlan': 'Hızlan',
}

def fix_file(file_path):
    try:
        # Read as binary first
        with open(file_path, 'rb') as f:
            content_bytes = f.read()

        # Try to decode as utf-8, if fails, try greedy decode
        try:
            content = content_bytes.decode('utf-8')
        except UnicodeDecodeError:
            print(f"  ⚠️  UTF-8 decode failed for {os.path.basename(file_path)}, trying loose decode...")
            content = content_bytes.decode('utf-8', errors='ignore')

        original_content = content
        
        # Apply replacements
        for bad, good in replacements.items():
            content = content.replace(bad, good)

        # Check if changes were made
        if content != original_content:
            # Write back as clean UTF-8
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Fixed: {os.path.basename(file_path)}")
        else:
            print(f"   Skipped (Clean): {os.path.basename(file_path)}")

    except Exception as e:
        print(f"❌ Error processing {os.path.basename(file_path)}: {e}")

# Process all .ts and .tsx files recursively
print(f"Scanning {root_dir}...")
for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            full_path = os.path.join(root, file)
            # Skip node_modules just in case
            if 'node_modules' not in full_path:
                fix_file(full_path)

print("Global encoding repair validation complete.")
