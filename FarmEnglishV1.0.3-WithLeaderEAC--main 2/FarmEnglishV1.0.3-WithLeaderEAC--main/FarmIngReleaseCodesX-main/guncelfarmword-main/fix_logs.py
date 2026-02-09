
import os

file_path = r'c:\FarmEnglishV1.0.1\FarmIngReleaseCodesX-main\guncelfarmword-main\src\screens\BattleScreen.tsx'

replacements = {
    975: "                        console.log('[Battle] ℹ️ Cevap gönderilemedi: Savaş zaten bitti.');",
    977: "                        console.error('[Battle] ❌ Cevap sunucuda reddedildi:', result.error);",
    980: "                    console.log(`[Battle] ✅ Cevap onaylandı, Yeni Skor: ${result.newScore}`);",
    983: "                console.error('[Battle] 💥 Kritik hata:', error);",
    989: "                // Savaş bitti - Final sync ve ödül dağıtımı otomatik yapılacak"
}

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Python lists are 0-indexed, file lines are 1-indexed
    for line_num, new_content in replacements.items():
        if line_num - 1 < len(lines):
            # Preserve original indentation if needed, or just use the hardcoded string with indentation
            # My strings above have indentation.
            lines[line_num - 1] = new_content + '\n'
            print(f"Replaced line {line_num}")
        else:
            print(f"Line {line_num} out of range")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
        
    print("Successfully replaced corrupted lines")

except Exception as e:
    print(f"Error: {e}")
