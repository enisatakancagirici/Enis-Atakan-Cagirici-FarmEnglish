#!/usr/bin/env python3
"""
yds_word_forms.json düzeltme scripti:
1. 4 şıkka indir (5'ten)
2. Cevabı rastgele pozisyona koy (0-3 arası eşit dağılım)
"""
import json
import random

# JSON'u oku
with open('assets/data/yds_word_forms.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Her soru için:
for q in data['questions']:
    answer = q['answer']
    options = q['options']
    
    # Cevabı çıkar
    other_options = [opt for opt in options if opt != answer]
    
    # 3 yanlış seçenek al (rastgele)
    random.shuffle(other_options)
    wrong_options = other_options[:3]
    
    # Yeni 4 şıklık liste oluştur
    new_options = wrong_options + [answer]
    
    # Karıştır (cevap rastgele pozisyona gelsin)
    random.shuffle(new_options)
    
    q['options'] = new_options

# Meta'yı güncelle
data['meta']['options_per_question'] = 4

# Yeni dağılımı kontrol et
from collections import Counter
answer_positions = [q['options'].index(q['answer']) for q in data['questions']]
print('Yeni dağılım (0=A, 1=B, 2=C, 3=D):', dict(Counter(sorted(answer_positions))))

# Kaydet
with open('assets/data/yds_word_forms.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('✅ yds_word_forms.json güncellendi: 4 şık, rastgele cevap dağılımı')
