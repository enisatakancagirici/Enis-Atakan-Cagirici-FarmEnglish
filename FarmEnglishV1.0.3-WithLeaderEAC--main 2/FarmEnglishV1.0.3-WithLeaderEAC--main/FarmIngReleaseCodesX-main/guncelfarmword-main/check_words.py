import json

data = json.load(open('C:/guncelfarmword-main/guncelfarmword-main/assets/data/ensaglamdata.json', 'r', encoding='utf-8'))
print(f'Yeni toplam: {len(data["items"])} kelime')

words = [w['word'].lower() for w in data['items']]
for check in ['build', 'building', 'black', 'blue', 'bird', 'blood']:
    print(f'{check}: {"VAR" if check in words else "YOK"}')
