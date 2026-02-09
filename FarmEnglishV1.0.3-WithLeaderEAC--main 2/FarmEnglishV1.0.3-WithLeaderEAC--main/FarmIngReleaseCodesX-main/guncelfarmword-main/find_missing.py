import json
import os

base_path = r"C:\guncelfarmword-main\guncelfarmword-main\assets\data"

# Load ensaglamdata - format: { "items": [{ "word": "...", "tr": "...", "cefr": "..." }] }
with open(os.path.join(base_path, "ensaglamdata.json"), "r", encoding="utf-8") as f:
    ensaglam_data = json.load(f)
    ensaglam = ensaglam_data.get("items", [])

ensaglam_words = {w["word"].lower() for w in ensaglam}
print(f"ensaglamdata kelime sayisi: {len(ensaglam)}")

# Load 1-5.json - format: { "word": "meaning", ... } (key-value dictionary)
all_other = {}
for i in range(1, 6):
    with open(os.path.join(base_path, f"{i}.json"), "r", encoding="utf-8") as f:
        data = json.load(f)
        all_other.update(data)

print(f"1-5.json toplam kelime: {len(all_other)}")

# Find missing words
missing = [(word, meaning) for word, meaning in all_other.items() if word.lower() not in ensaglam_words]
print(f"Eksik kelime sayisi: {len(missing)}")

# CEFR tahmini - yaygın kelimelere A1/A2, diğerlerine B1/B2
basic_words = {"black", "blue", "bird", "birthday", "bite", "block", "blood", "boat", "body", "book", 
               "born", "boss", "both", "bottle", "bottom", "box", "boy", "brain", "branch", "bread",
               "break", "breakfast", "breath", "breathe", "bridge", "bright", "bring", "broad",
               "brother", "brown", "brush", "budget", "build", "building", "burn", "bus", "busy",
               "butter", "button", "buy", "buyer", "biscuit", "blanket", "borrow"}

# Eksik kelimeleri ensaglamdata formatına dönüştür
new_items = []
for word, meaning in missing:
    cefr = "A2" if word.lower() in basic_words else "B1"
    new_item = {
        "word": word,
        "cefr": cefr,
        "tr": meaning,
        "example": f"Example sentence for {word}."  # Placeholder example
    }
    new_items.append(new_item)

# Mevcut listeye ekle
ensaglam.extend(new_items)

# Alfabetik sırala
ensaglam.sort(key=lambda x: x["word"].lower())

# Kaydet
ensaglam_data["items"] = ensaglam
with open(os.path.join(base_path, "ensaglamdata.json"), "w", encoding="utf-8") as f:
    json.dump(ensaglam_data, f, ensure_ascii=False, indent=2)

print(f"\n{len(new_items)} kelime eklendi!")
print(f"Yeni toplam: {len(ensaglam)} kelime")
