#!/usr/bin/env python3
"""
Tüm $((X * 20)) hatalarını düzelten script
"""
import re

file_path = 'FarmIngReleaseCodesX-main/guncelfarmword-main/src/store/farmStore.ts'

# Dosyayı oku
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# $((X * 20)) paternini bul ve hesapla
def replace_coin(match):
    original_value = int(match.group(1))
    calculated_value = original_value * 20
    return f'coins: {calculated_value}'

# Regex ile değiştir
# Pattern: coins: $((SAYI * 20))
pattern = r'coins: \$\(\((\d+) \* 20\)\)'
new_content = re.sub(pattern, replace_coin, content)

# Kaç değişiklik yapıldığını say
changes = len(re.findall(pattern, content))
print(f"✅ {changes} adet coin değeri düzeltildi!")

# Dosyayı yaz
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("🎉 Tamamlandı!")

