"""
메인 페이지용 작은 카드 그림(썸네일)을 만듭니다.
- assets/<id>-card.jpg (1200x750) → assets/thumbs/<id>.webp (560x350, 약 20~40KB)
- 메인 카드에는 작은 그림만 필요해서, 첫 화면 로딩이 훨씬 빨라집니다.
- 카드 그림을 바꿨거나 새 게임을 추가했다면 이 파일을 실행한 뒤 build_hub.py 를 다시 실행하세요.
  (썸네일이 없는 게임은 build_hub.py 가 원래 jpg 를 그대로 씁니다)
- 필요: Pillow (pip install pillow)
- 사용법: python3 docs/tools/make_thumbs.py          ← 없거나 오래된 것만
          python3 docs/tools/make_thumbs.py --all    ← 전부 다시
"""
import json, os, sys
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CAT = json.load(open(os.path.join(os.path.dirname(__file__), 'catalog.json'), encoding='utf-8'))
OUT = os.path.join(ROOT, 'assets', 'thumbs')
W, H = 560, 350


def main():
    force = '--all' in sys.argv
    os.makedirs(OUT, exist_ok=True)
    made = 0
    for g in CAT:
        src = os.path.join(ROOT, 'assets', g['id'] + '-card.jpg')
        dst = os.path.join(OUT, g['id'] + '.webp')
        if not os.path.exists(src):
            print('카드 그림 없음:', g['id'])
            continue
        if not force and os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
            continue
        im = Image.open(src).convert('RGB')
        # 16:10 비율로 가운데 맞춰 자르고 줄이기
        r = W / H
        w, h = im.size
        if w / h > r:
            nw = int(h * r); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
        elif w / h < r:
            nh = int(w / r); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
        im = im.resize((W, H), Image.LANCZOS)
        im.save(dst, 'WEBP', quality=72, method=6)
        made += 1
        print('만듦:', g['id'], os.path.getsize(dst) // 1024, 'KB')
    print(f'썸네일 {made}개 만듦')


if __name__ == '__main__':
    main()
