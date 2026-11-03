#!/usr/bin/env python3
"""
docs/IMAGE_PROMPTS.md 를 catalog.json + 아래 장면 설명(SCENE)으로 만듭니다.
새 게임을 추가하면 SCENE 에 한 줄 넣고 다시 실행: python3 docs/tools/build_image_prompts.py
"""
import json, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CAT = json.load(open(os.path.join(os.path.dirname(__file__), 'catalog.json'), encoding='utf-8'))

STYLE = ("Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, "
         "soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, "
         "vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. "
         "Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; "
         "the bottom 30% should be darker and calm because a title is overlaid there.")

# 게임별 장면 (영문 프롬프트 핵심 + 한국어 설명)
SCENE = {
 'snake': ('a glowing lime-green neon snake made of rounded segments slithering across a dark grid floor toward a shiny red apple, motion trail', '네온 뱀이 사과를 향해 가는 장면'),
 'runner': ('a small glowing violet cube character mid-jump over red neon spikes, running across a synthwave city rooftop at night, giant pink striped sun, purple skyline', '보라색 큐브가 신스웨이브 도시를 달리며 점프'),
 'tower': ('a tall stack of glossy colorful 3D blocks rising into a sunset sky above the clouds, one block sliding in from the side, slight perspective', '노을 하늘로 쌓아 올린 블록 탑'),
 'orbit': ('a tiny white spaceship slingshotting between several glowing planets with rings in deep space, dotted orbit paths, sparkling stars', '행성 사이를 도는 작은 우주선'),
 'dodge': ('a single bright cyan orb of light dodging through dense patterns of red glowing bullets and laser beams on a dark pulsing grid', '붉은 탄막 사이를 피하는 빛 구슬'),
 'blocks': ('an 8x8 dark puzzle board with glossy candy-colored square blocks, a row of blocks bursting into sparkles as it clears', '8x8 블록 퍼즐판, 한 줄이 터지는 순간'),
 'mines': ('a mint-green glowing grid of tiles, some opened showing colorful numbers, a small red flag on one tile, a hidden mine glowing faintly', '숫자가 보이는 민트색 지뢰판과 깃발'),
 'sudoku': ('a sleek 9x9 number puzzle grid glowing lime green, elegant digits, a highlighted row and box, calm and smart mood', '라임색으로 빛나는 스도쿠 판'),
 'cave': ('a small glowing arrow-shaped aircraft flying through a narrow winding neon-green crystal cave, glowing walls above and below, golden gems', '좁은 네온 동굴을 나는 비행체'),
 'ring': ('a large glowing circular ring with a bright pink highlighted arc and a white needle sweeping around it, energy sparks at the moment of a perfect hit', '돌아가는 바늘과 분홍 목표 구간의 링'),
 'archery': ('a stylized archer silhouette drawing a glowing golden bow, an arrow flying toward a colorful bullseye target on a hill at dusk, wind streaks', '석양 언덕에서 과녁을 겨눈 궁수'),
 'lanes': ('a glowing orange sports car speeding down a three-lane neon highway at night, other cars with taillights, golden coins, motion blur', '네온 고속도로를 달리는 주황 스포츠카'),
 'gravity': ('a glowing white-blue cube flipping between the floor and ceiling of a neon corridor, red spikes on both surfaces, gravity arrows', '바닥과 천장을 오가는 큐브'),
 'rocks': ('a sleek white spaceship blasting cyan laser bolts at large tumbling grey asteroids that crack into smaller pieces, golden ore crystals floating', '운석을 쏘아 부수는 우주선'),
 'slash': ('a bright white blade trail slicing through glowing neon geometric shapes (pentagon, triangle, hexagon) splitting in half, one black bomb with a red X', '네온 도형을 베는 칼날 궤적'),
 'hockey': ('a neon air hockey table seen from above, a cyan mallet striking a white puck that leaves a light trail toward a red goal', '네온 에어하키 테이블과 퍽'),
 'keeper': ('a pair of glowing green goalkeeper gloves diving to catch a spinning soccer ball in front of a bright white goal net under stadium lights', '공을 막는 골키퍼 장갑'),
 'whack': ('cute round brown moles popping up from holes in a warm wooden board, one golden mole sparkling, a playful tap burst', '구멍에서 튀어나온 두더지들'),
 'racer': ('a yellow race car seen from above drifting on a winding road through dark green fields, red-white curbs, a glowing fuel canister', '구불구불한 도로를 달리는 노란 레이싱카'),
 'fishy': ('a glowing blue fish swimming among many colorful smaller fish in a deep teal ocean with light rays and bubbles, a large fish looming', '작은 물고기 사이를 헤엄치는 파란 물고기'),
 'defense': ('a neon skyline of small cyan city buildings at night, red missile trails falling from the sky, bright interceptor explosions blooming in the air', '도시 위 미사일을 요격하는 폭발'),
 'survivor': ('a small glowing hero orb in the center surrounded by swarms of red and purple creatures, white auto-fire bullets radiating outward, green experience gems', '적 무리에 둘러싸여 자동 사격하는 주인공'),
 'maze': ('a glowing golden labyrinth seen from above, a bright white ball sliding through corridors, small stars to collect, green exit glow', '황금빛 미로와 빛나는 공'),
 'jumper': ('a cute white blob character bouncing upward on floating platforms in a bright blue sky with fluffy clouds, a spring and a golden coin', '하늘의 발판을 밟고 튀어 오르는 캐릭터'),
 'artillery': ('two small tanks on opposite sides of a dark hill, a glowing cannon shell arcing through a purple dusk sky, explosion crater, wind streaks', '언덕 너머로 포탄을 쏘는 두 탱크'),
 'pinball': ('a vertical neon pinball table with glowing pink bumpers, cyan flippers and a shiny silver ball in motion, sparks on impact', '네온 핀볼 테이블과 은빛 공'),
 'slide': ('a 4x4 sliding number puzzle made of glossy blue tiles with one empty slot, one tile sliding with motion trail', '숫자 슬라이드 퍼즐 타일'),
 'lights': ('a grid of square lights, some glowing warm yellow and some dark, a finger tap causing a cross-shaped toggle ripple', '켜지고 꺼지는 노란 불빛 격자'),
 'gems': ('a board of shiny faceted gemstones in red, yellow, green, blue, purple and pink, three matching gems exploding in sparkles', '반짝이는 보석과 터지는 3매치'),
 'memory': ('a grid of purple playing cards, two flipped face-up showing the same glowing star symbol, sparkle effect', '같은 그림 카드 두 장이 뒤집힌 순간'),
 'sequence': ('a circular four-color pad (mint, red, yellow, blue) with one segment brightly lit, musical note glow, dark center hub', '빛나는 4색 원형 패드'),
 'pipes': ('a grid of glowing teal pipes connecting from a central water tank to small houses, water light flowing through connected pipes', '물이 흐르는 파이프 연결 퍼즐'),
 'nonogram': ('a nonogram picture-logic grid with orange filled cells forming a simple pixel heart, number clues along the edges as abstract marks (no readable text)', '칸을 칠해 그림이 드러나는 네모 로직'),
 'bubbles': ('a ceiling full of glossy colorful bubbles, a shooter at the bottom firing a bubble with a dotted aim line bouncing off the wall, bubbles popping', '버블 슈터 조준과 터지는 버블'),
 'flood': ('a mosaic grid of vivid colored squares with a color flood spreading from the top-left corner like liquid paint', '왼쪽 위부터 퍼지는 색 채우기'),
 'pairs': ('cream-colored mahjong-like tiles with colorful symbols, a glowing green line with two bends connecting two matching tiles', '두 번 꺾인 선으로 이어진 타일 짝'),
 'dots': ('a grid of white dots with cyan and red lines drawn between them, small completed boxes glowing cyan and red', '점과 선, 완성된 상자들'),
 'gomoku': ('a wooden go board with black and white stones, five black stones in a diagonal row glowing golden as a winning line', '오목 판 위 승리한 다섯 돌'),
 'reversi': ('a green felt reversi board with black and white discs, several discs mid-flip in the air, soft glow', '뒤집히는 리버시 돌'),
 'solitaire': ('a fan of classic playing cards on a deep green felt table, a king and queen card cascade, foundation piles with aces', '초록 테이블 위 솔리테어 카드'),
 'blackjack': ('a dark green casino-style card table with two playing cards (ace and king) face up and stacks of colorful poker chips, warm spotlight (game chips only, no money)', '에이스와 킹, 칩이 놓인 카드 테이블'),
 'baseball': ('three glowing number tiles with question-mark silhouettes, a baseball and bat icon glow, hint markers S and B shown as abstract colored dots', '숨은 숫자 추리 (숫자 야구)'),
 'reaction': ('a bold split scene: deep red waiting screen transitioning to bright green with a finger tap burst, a stopwatch glow', '빨강에서 초록으로 바뀌는 순간 탭'),
 'math': ('floating glowing arithmetic symbols (plus, minus, multiply) and abstract digit shapes swirling around a brain-shaped light, golden energy', '빛나는 수학 기호와 두뇌'),
 'stroop': ('large bold abstract word-shaped blocks painted in mismatched bright colors (red, blue, green, yellow), playful brain-teaser mood (no readable letters)', '색과 뜻이 엇갈리는 글자 블록'),
 'aim': ('several red-white bullseye targets floating in a dark grid space, a crosshair hitting the center with a golden burst', '과녁 중앙을 맞히는 조준선'),
 'oddcolor': ('a grid of rounded tiles all in the same soft green except one tile in a slightly different shade, subtle glow on the odd one', '하나만 색이 다른 타일 격자'),
 'schulte': ('a 5x5 grid of tiles with scattered colorful abstract numeral shapes, a quick tap trail connecting them in sequence', '흩어진 숫자를 순서대로 찾는 격자'),
}

def build():
    lines = ['# 이미지 생성 프롬프트 모음', '',
             '> 게임 카드 그림을 이미지 생성 AI(예: Codex, ChatGPT 이미지, Midjourney)로 만들 때 쓰는 프롬프트입니다.',
             '> 지금 사이트에는 실제 게임 화면을 캡처한 임시 그림이 들어가 있습니다. 아래대로 만들어 **같은 파일 이름으로 덮어쓰면** 바로 바뀝니다.',
             '> 이 문서는 `python3 docs/tools/build_image_prompts.py`로 자동 생성합니다. 새 게임은 그 파일의 `SCENE`에 한 줄 추가하세요.', '',
             '## 공통 규격', '',
             '| 항목 | 값 |', '|---|---|',
             '| 크기 | **1200 × 750 px** (16:10) |', '| 형식 | JPG, 품질 80~85 |', '| 용량 | **200KB 이하** |',
             '| 저장 위치 | `assets/<게임id>-card.jpg` (아래 표의 경로 그대로) |',
             '| 금지 | 글자·숫자·로고·UI·워터마크 (제목은 사이트가 위에 얹음) |',
             '| 구도 | 주인공은 위쪽 2/3, 살짝 오른쪽. 아래 30%는 어둡게 (제목이 올라감) |', '',
             '### 모든 프롬프트 뒤에 붙일 공통 스타일 (영문)', '', '```', STYLE, '```', '',
             '### 작업 순서 (Codex 등으로 일괄 작업할 때)', '',
             '1. 아래 표에서 게임 하나를 골라 `프롬프트` + 공통 스타일을 합쳐 이미지 생성',
             '2. 1200×750으로 잘라 JPG 200KB 이하로 저장 (예: `cwebp`가 아닌 **JPG**)',
             '3. `assets/<id>-card.jpg`로 덮어쓰기',
             '4. 다 넣었으면 `docs/tools/catalog.json`에서 해당 게임의 `"art": "capture"`를 `"art": "illust"`로 바꾸기 (다음 캡처 때 덮어쓰지 않도록)',
             '5. 브라우저에서 메인 페이지를 열어 카드가 잘 보이는지 확인', '',
             '### 사이트 공유 이미지 (선택)', '',
             '- 파일: `assets/images/og.jpg` (1200 × 630) — 카카오톡·X 공유 미리보기',
             '- 프롬프트: `a collage of neon arcade game scenes (spaceship, snake, bricks, puzzle grid, cards) arranged around a glowing center, dark background, inviting and energetic, room in the center-left for a title` + 공통 스타일(비율만 1200x630)', '',
             '## 게임별 프롬프트', '',
             '| # | 게임 | 파일 | 현재 그림 | 장면(한국어) |', '|---|---|---|---|---|']
    todo = []
    for i, g in enumerate(CAT):
        sc = SCENE.get(g['id'])
        state = '✅ 일러스트' if g.get('art') == 'illust' else '⬜ 임시 캡처'
        lines.append(f"| {i+1} | {g['name']} | `assets/{g['id']}-card.jpg` | {state} | {sc[1] if sc else '-'} |")
        if g.get('art') != 'illust' and sc: todo.append((i + 1, g, sc))
    lines += ['', '## 프롬프트 (만들어야 할 것만)', '']
    for n, g, sc in todo:
        lines += [f"### {n}. {g['name']} (`{g['id']}`)", '',
                  f"- 파일: `assets/{g['id']}-card.jpg`", f"- 대표색: `{g['accent']}` (이 색이 그림의 주된 빛이 되도록)", f"- 장면: {sc[1]}", '',
                  '```', f"{sc[0]}, dominant glow color {g['accent']}. {STYLE}", '```', '']
    open(os.path.join(ROOT, 'docs', 'IMAGE_PROMPTS.md'), 'w', encoding='utf-8').write('\n'.join(lines))
    missing = [g['id'] for g in CAT if g.get('art') != 'illust' and g['id'] not in SCENE]
    print('IMAGE_PROMPTS.md 생성:', len(todo), '개 프롬프트', ('/ 장면 없음: ' + ', '.join(missing)) if missing else '')

if __name__ == '__main__':
    build()
