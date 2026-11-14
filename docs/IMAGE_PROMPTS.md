# 이미지 생성 프롬프트 모음

> 게임 카드 그림을 이미지 생성 AI(예: Codex, ChatGPT 이미지, Midjourney)로 만들 때 쓰는 프롬프트입니다.
> 지금 사이트에는 실제 게임 화면을 캡처한 임시 그림이 들어가 있습니다. 아래대로 만들어 **같은 파일 이름으로 덮어쓰면** 바로 바뀝니다.
> 이 문서는 `python3 docs/tools/build_image_prompts.py`로 자동 생성합니다. 새 게임은 그 파일의 `SCENE`에 한 줄 추가하세요.

## 공통 규격

| 항목 | 값 |
|---|---|
| 크기 | **1200 × 750 px** (16:10) |
| 형식 | JPG, 품질 80~85 |
| 용량 | **200KB 이하** |
| 저장 위치 | `assets/<게임id>-card.jpg` (아래 표의 경로 그대로) |
| 금지 | 글자·숫자·로고·UI·워터마크 (제목은 사이트가 위에 얹음) |
| 구도 | 주인공은 위쪽 2/3, 살짝 오른쪽. 아래 30%는 어둡게 (제목이 올라감) |

### 모든 프롬프트 뒤에 붙일 공통 스타일 (영문)

```
Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 작업 순서 (Codex 등으로 일괄 작업할 때)

1. 아래 표에서 게임 하나를 골라 `프롬프트` + 공통 스타일을 합쳐 이미지 생성
2. 1200×750으로 잘라 JPG 200KB 이하로 저장 (예: `cwebp`가 아닌 **JPG**)
3. `assets/<id>-card.jpg`로 덮어쓰기
4. 다 넣었으면 `docs/tools/catalog.json`에서 해당 게임의 `"art": "capture"`를 `"art": "illust"`로 바꾸기 (다음 캡처 때 덮어쓰지 않도록)
5. 브라우저에서 메인 페이지를 열어 카드가 잘 보이는지 확인

### 사이트 공유 이미지 (선택)

- 파일: `assets/images/og.jpg` (1200 × 630) — 카카오톡·X 공유 미리보기
- 프롬프트: `a collage of neon arcade game scenes (spaceship, snake, bricks, puzzle grid, cards) arranged around a glowing center, dark background, inviting and energetic, room in the center-left for a title` + 공통 스타일(비율만 1200x630)

## 게임별 프롬프트

| # | 게임 | 파일 | 현재 그림 | 장면(한국어) |
|---|---|---|---|---|
| 1 | 별빛 수호대 | `assets/shooting-card.jpg` | ✅ 일러스트 | - |
| 2 | 네온 스네이크 | `assets/snake-card.jpg` | ✅ 일러스트 | 네온 뱀이 사과를 향해 가는 장면 |
| 3 | 네온 브레이커 | `assets/breakout-card.jpg` | ✅ 일러스트 | - |
| 4 | 네온 대시 | `assets/runner-card.jpg` | ⬜ 임시 캡처 | 보라색 큐브가 신스웨이브 도시를 달리며 점프 |
| 5 | 하늘 탑 쌓기 | `assets/tower-card.jpg` | ⬜ 임시 캡처 | 노을 하늘로 쌓아 올린 블록 탑 |
| 6 | 오빗 점프 | `assets/orbit-card.jpg` | ⬜ 임시 캡처 | 행성 사이를 도는 작은 우주선 |
| 7 | 네온 회피 | `assets/dodge-card.jpg` | ⬜ 임시 캡처 | 붉은 탄막 사이를 피하는 빛 구슬 |
| 8 | 네온 블록 | `assets/blocks-card.jpg` | ⬜ 임시 캡처 | 8x8 블록 퍼즐판, 한 줄이 터지는 순간 |
| 9 | 지뢰 탐색 | `assets/mines-card.jpg` | ⬜ 임시 캡처 | 숫자가 보이는 민트색 지뢰판과 깃발 |
| 10 | 스도쿠 | `assets/sudoku-card.jpg` | ⬜ 임시 캡처 | 라임색으로 빛나는 스도쿠 판 |
| 11 | 네온 동굴 | `assets/cave-card.jpg` | ⬜ 임시 캡처 | 좁은 네온 동굴을 나는 비행체 |
| 12 | 타이밍 링 | `assets/ring-card.jpg` | ⬜ 임시 캡처 | 돌아가는 바늘과 분홍 목표 구간의 링 |
| 13 | 바람 궁수 | `assets/archery-card.jpg` | ⬜ 임시 캡처 | 석양 언덕에서 과녁을 겨눈 궁수 |
| 14 | 네온 하이웨이 | `assets/lanes-card.jpg` | ⬜ 임시 캡처 | 네온 고속도로를 달리는 주황 스포츠카 |
| 15 | 중력 반전 | `assets/gravity-card.jpg` | ⬜ 임시 캡처 | 바닥과 천장을 오가는 큐브 |
| 16 | 우주 광부 | `assets/rocks-card.jpg` | ⬜ 임시 캡처 | 운석을 쏘아 부수는 우주선 |
| 17 | 네온 슬래시 | `assets/slash-card.jpg` | ⬜ 임시 캡처 | 네온 도형을 베는 칼날 궤적 |
| 18 | 에어 하키 | `assets/hockey-card.jpg` | ⬜ 임시 캡처 | 네온 에어하키 테이블과 퍽 |
| 19 | 골키퍼 | `assets/keeper-card.jpg` | ⬜ 임시 캡처 | 공을 막는 골키퍼 장갑 |
| 20 | 두더지 탭 | `assets/whack-card.jpg` | ⬜ 임시 캡처 | 구멍에서 튀어나온 두더지들 |
| 21 | 탑뷰 레이서 | `assets/racer-card.jpg` | ⬜ 임시 캡처 | 구불구불한 도로를 달리는 노란 레이싱카 |
| 22 | 큰 물고기 | `assets/fishy-card.jpg` | ⬜ 임시 캡처 | 작은 물고기 사이를 헤엄치는 파란 물고기 |
| 23 | 도시 방어 | `assets/defense-card.jpg` | ⬜ 임시 캡처 | 도시 위 미사일을 요격하는 폭발 |
| 24 | 네온 서바이버 | `assets/survivor-card.jpg` | ⬜ 임시 캡처 | 적 무리에 둘러싸여 자동 사격하는 주인공 |
| 25 | 네온 미로 | `assets/maze-card.jpg` | ⬜ 임시 캡처 | 황금빛 미로와 빛나는 공 |
| 26 | 구름 점프 | `assets/jumper-card.jpg` | ⬜ 임시 캡처 | 하늘의 발판을 밟고 튀어 오르는 캐릭터 |
| 27 | 포격전 | `assets/artillery-card.jpg` | ⬜ 임시 캡처 | 언덕 너머로 포탄을 쏘는 두 탱크 |
| 28 | 네온 핀볼 | `assets/pinball-card.jpg` | ⬜ 임시 캡처 | 네온 핀볼 테이블과 은빛 공 |
| 29 | 숫자 밀기 | `assets/slide-card.jpg` | ⬜ 임시 캡처 | 숫자 슬라이드 퍼즐 타일 |
| 30 | 불 끄기 | `assets/lights-card.jpg` | ⬜ 임시 캡처 | 켜지고 꺼지는 노란 불빛 격자 |
| 31 | 보석 매치 | `assets/gems-card.jpg` | ⬜ 임시 캡처 | 반짝이는 보석과 터지는 3매치 |
| 32 | 카드 짝 맞추기 | `assets/memory-card.jpg` | ⬜ 임시 캡처 | 같은 그림 카드 두 장이 뒤집힌 순간 |
| 33 | 빛 순서 기억 | `assets/sequence-card.jpg` | ⬜ 임시 캡처 | 빛나는 4색 원형 패드 |
| 34 | 파이프 연결 | `assets/pipes-card.jpg` | ⬜ 임시 캡처 | 물이 흐르는 파이프 연결 퍼즐 |
| 35 | 네모 로직 | `assets/nonogram-card.jpg` | ⬜ 임시 캡처 | 칸을 칠해 그림이 드러나는 네모 로직 |
| 36 | 버블 팡 | `assets/bubbles-card.jpg` | ⬜ 임시 캡처 | 버블 슈터 조준과 터지는 버블 |
| 37 | 색 채우기 | `assets/flood-card.jpg` | ⬜ 임시 캡처 | 왼쪽 위부터 퍼지는 색 채우기 |
| 38 | 타일 짝 잇기 | `assets/pairs-card.jpg` | ⬜ 임시 캡처 | 두 번 꺾인 선으로 이어진 타일 짝 |
| 39 | 점과 상자 | `assets/dots-card.jpg` | ⬜ 임시 캡처 | 점과 선, 완성된 상자들 |
| 40 | 오목 | `assets/gomoku-card.jpg` | ⬜ 임시 캡처 | 오목 판 위 승리한 다섯 돌 |
| 41 | 리버시 | `assets/reversi-card.jpg` | ⬜ 임시 캡처 | 뒤집히는 리버시 돌 |
| 42 | 솔리테어 | `assets/solitaire-card.jpg` | ⬜ 임시 캡처 | 초록 테이블 위 솔리테어 카드 |
| 43 | 블랙잭 | `assets/blackjack-card.jpg` | ⬜ 임시 캡처 | 에이스와 킹, 칩이 놓인 카드 테이블 |
| 44 | 숫자 야구 | `assets/baseball-card.jpg` | ⬜ 임시 캡처 | 숨은 숫자 추리 (숫자 야구) |
| 45 | 반응 속도 | `assets/reaction-card.jpg` | ⬜ 임시 캡처 | 빨강에서 초록으로 바뀌는 순간 탭 |
| 46 | 암산 레이스 | `assets/math-card.jpg` | ⬜ 임시 캡처 | 빛나는 수학 기호와 두뇌 |
| 47 | 색깔 함정 | `assets/stroop-card.jpg` | ⬜ 임시 캡처 | 색과 뜻이 엇갈리는 글자 블록 |
| 48 | 에임 트레이너 | `assets/aim-card.jpg` | ⬜ 임시 캡처 | 과녁 중앙을 맞히는 조준선 |
| 49 | 다른 색 찾기 | `assets/oddcolor-card.jpg` | ⬜ 임시 캡처 | 하나만 색이 다른 타일 격자 |
| 50 | 숫자 순서 찾기 | `assets/schulte-card.jpg` | ⬜ 임시 캡처 | 흩어진 숫자를 순서대로 찾는 격자 |
| 51 | 바둑 묘수풀이 | `assets/baduk-card.jpg` | ⬜ 임시 캡처 | 표시된 백 돌을 잡는 바둑 수읽기 |
| 52 | 떨어지는 블록 | `assets/fall-card.jpg` | ⬜ 임시 캡처 | 떨어지는 블록을 돌려 줄을 지우는 퍼즐 |

## 프롬프트 (만들어야 할 것만)

### 4. 네온 대시 (`runner`)

- 파일: `assets/runner-card.jpg`
- 대표색: `#b48cff` (이 색이 그림의 주된 빛이 되도록)
- 장면: 보라색 큐브가 신스웨이브 도시를 달리며 점프

```
a small glowing violet cube character mid-jump over red neon spikes, running across a synthwave city rooftop at night, giant pink striped sun, purple skyline, dominant glow color #b48cff. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 5. 하늘 탑 쌓기 (`tower`)

- 파일: `assets/tower-card.jpg`
- 대표색: `#ffe066` (이 색이 그림의 주된 빛이 되도록)
- 장면: 노을 하늘로 쌓아 올린 블록 탑

```
a tall stack of glossy colorful 3D blocks rising into a sunset sky above the clouds, one block sliding in from the side, slight perspective, dominant glow color #ffe066. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 6. 오빗 점프 (`orbit`)

- 파일: `assets/orbit-card.jpg`
- 대표색: `#ff7a45` (이 색이 그림의 주된 빛이 되도록)
- 장면: 행성 사이를 도는 작은 우주선

```
a tiny white spaceship slingshotting between several glowing planets with rings in deep space, dotted orbit paths, sparkling stars, dominant glow color #ff7a45. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 7. 네온 회피 (`dodge`)

- 파일: `assets/dodge-card.jpg`
- 대표색: `#ff4d6d` (이 색이 그림의 주된 빛이 되도록)
- 장면: 붉은 탄막 사이를 피하는 빛 구슬

```
a single bright cyan orb of light dodging through dense patterns of red glowing bullets and laser beams on a dark pulsing grid, dominant glow color #ff4d6d. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 8. 네온 블록 (`blocks`)

- 파일: `assets/blocks-card.jpg`
- 대표색: `#7aa2ff` (이 색이 그림의 주된 빛이 되도록)
- 장면: 8x8 블록 퍼즐판, 한 줄이 터지는 순간

```
an 8x8 dark puzzle board with glossy candy-colored square blocks, a row of blocks bursting into sparkles as it clears, dominant glow color #7aa2ff. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 9. 지뢰 탐색 (`mines`)

- 파일: `assets/mines-card.jpg`
- 대표색: `#4dffd2` (이 색이 그림의 주된 빛이 되도록)
- 장면: 숫자가 보이는 민트색 지뢰판과 깃발

```
a mint-green glowing grid of tiles, some opened showing colorful numbers, a small red flag on one tile, a hidden mine glowing faintly, dominant glow color #4dffd2. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 10. 스도쿠 (`sudoku`)

- 파일: `assets/sudoku-card.jpg`
- 대표색: `#c3ff5e` (이 색이 그림의 주된 빛이 되도록)
- 장면: 라임색으로 빛나는 스도쿠 판

```
a sleek 9x9 number puzzle grid glowing lime green, elegant digits, a highlighted row and box, calm and smart mood, dominant glow color #c3ff5e. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 11. 네온 동굴 (`cave`)

- 파일: `assets/cave-card.jpg`
- 대표색: `#5effc8` (이 색이 그림의 주된 빛이 되도록)
- 장면: 좁은 네온 동굴을 나는 비행체

```
a small glowing arrow-shaped aircraft flying through a narrow winding neon-green crystal cave, glowing walls above and below, golden gems, dominant glow color #5effc8. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 12. 타이밍 링 (`ring`)

- 파일: `assets/ring-card.jpg`
- 대표색: `#ff9ecf` (이 색이 그림의 주된 빛이 되도록)
- 장면: 돌아가는 바늘과 분홍 목표 구간의 링

```
a large glowing circular ring with a bright pink highlighted arc and a white needle sweeping around it, energy sparks at the moment of a perfect hit, dominant glow color #ff9ecf. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 13. 바람 궁수 (`archery`)

- 파일: `assets/archery-card.jpg`
- 대표색: `#ffd166` (이 색이 그림의 주된 빛이 되도록)
- 장면: 석양 언덕에서 과녁을 겨눈 궁수

```
a stylized archer silhouette drawing a glowing golden bow, an arrow flying toward a colorful bullseye target on a hill at dusk, wind streaks, dominant glow color #ffd166. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 14. 네온 하이웨이 (`lanes`)

- 파일: `assets/lanes-card.jpg`
- 대표색: `#ff7a45` (이 색이 그림의 주된 빛이 되도록)
- 장면: 네온 고속도로를 달리는 주황 스포츠카

```
a glowing orange sports car speeding down a three-lane neon highway at night, other cars with taillights, golden coins, motion blur, dominant glow color #ff7a45. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 15. 중력 반전 (`gravity`)

- 파일: `assets/gravity-card.jpg`
- 대표색: `#7aa2ff` (이 색이 그림의 주된 빛이 되도록)
- 장면: 바닥과 천장을 오가는 큐브

```
a glowing white-blue cube flipping between the floor and ceiling of a neon corridor, red spikes on both surfaces, gravity arrows, dominant glow color #7aa2ff. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 16. 우주 광부 (`rocks`)

- 파일: `assets/rocks-card.jpg`
- 대표색: `#9be7ff` (이 색이 그림의 주된 빛이 되도록)
- 장면: 운석을 쏘아 부수는 우주선

```
a sleek white spaceship blasting cyan laser bolts at large tumbling grey asteroids that crack into smaller pieces, golden ore crystals floating, dominant glow color #9be7ff. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 17. 네온 슬래시 (`slash`)

- 파일: `assets/slash-card.jpg`
- 대표색: `#ff5ec4` (이 색이 그림의 주된 빛이 되도록)
- 장면: 네온 도형을 베는 칼날 궤적

```
a bright white blade trail slicing through glowing neon geometric shapes (pentagon, triangle, hexagon) splitting in half, one black bomb with a red X, dominant glow color #ff5ec4. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 18. 에어 하키 (`hockey`)

- 파일: `assets/hockey-card.jpg`
- 대표색: `#5ee7ff` (이 색이 그림의 주된 빛이 되도록)
- 장면: 네온 에어하키 테이블과 퍽

```
a neon air hockey table seen from above, a cyan mallet striking a white puck that leaves a light trail toward a red goal, dominant glow color #5ee7ff. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 19. 골키퍼 (`keeper`)

- 파일: `assets/keeper-card.jpg`
- 대표색: `#7dff9b` (이 색이 그림의 주된 빛이 되도록)
- 장면: 공을 막는 골키퍼 장갑

```
a pair of glowing green goalkeeper gloves diving to catch a spinning soccer ball in front of a bright white goal net under stadium lights, dominant glow color #7dff9b. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 20. 두더지 탭 (`whack`)

- 파일: `assets/whack-card.jpg`
- 대표색: `#ffb547` (이 색이 그림의 주된 빛이 되도록)
- 장면: 구멍에서 튀어나온 두더지들

```
cute round brown moles popping up from holes in a warm wooden board, one golden mole sparkling, a playful tap burst, dominant glow color #ffb547. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 21. 탑뷰 레이서 (`racer`)

- 파일: `assets/racer-card.jpg`
- 대표색: `#ffe066` (이 색이 그림의 주된 빛이 되도록)
- 장면: 구불구불한 도로를 달리는 노란 레이싱카

```
a yellow race car seen from above drifting on a winding road through dark green fields, red-white curbs, a glowing fuel canister, dominant glow color #ffe066. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 22. 큰 물고기 (`fishy`)

- 파일: `assets/fishy-card.jpg`
- 대표색: `#4dd8ff` (이 색이 그림의 주된 빛이 되도록)
- 장면: 작은 물고기 사이를 헤엄치는 파란 물고기

```
a glowing blue fish swimming among many colorful smaller fish in a deep teal ocean with light rays and bubbles, a large fish looming, dominant glow color #4dd8ff. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 23. 도시 방어 (`defense`)

- 파일: `assets/defense-card.jpg`
- 대표색: `#ff7a45` (이 색이 그림의 주된 빛이 되도록)
- 장면: 도시 위 미사일을 요격하는 폭발

```
a neon skyline of small cyan city buildings at night, red missile trails falling from the sky, bright interceptor explosions blooming in the air, dominant glow color #ff7a45. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 24. 네온 서바이버 (`survivor`)

- 파일: `assets/survivor-card.jpg`
- 대표색: `#c3ff5e` (이 색이 그림의 주된 빛이 되도록)
- 장면: 적 무리에 둘러싸여 자동 사격하는 주인공

```
a small glowing hero orb in the center surrounded by swarms of red and purple creatures, white auto-fire bullets radiating outward, green experience gems, dominant glow color #c3ff5e. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 25. 네온 미로 (`maze`)

- 파일: `assets/maze-card.jpg`
- 대표색: `#ffd166` (이 색이 그림의 주된 빛이 되도록)
- 장면: 황금빛 미로와 빛나는 공

```
a glowing golden labyrinth seen from above, a bright white ball sliding through corridors, small stars to collect, green exit glow, dominant glow color #ffd166. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 26. 구름 점프 (`jumper`)

- 파일: `assets/jumper-card.jpg`
- 대표색: `#9be7ff` (이 색이 그림의 주된 빛이 되도록)
- 장면: 하늘의 발판을 밟고 튀어 오르는 캐릭터

```
a cute white blob character bouncing upward on floating platforms in a bright blue sky with fluffy clouds, a spring and a golden coin, dominant glow color #9be7ff. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 27. 포격전 (`artillery`)

- 파일: `assets/artillery-card.jpg`
- 대표색: `#ff9e4d` (이 색이 그림의 주된 빛이 되도록)
- 장면: 언덕 너머로 포탄을 쏘는 두 탱크

```
two small tanks on opposite sides of a dark hill, a glowing cannon shell arcing through a purple dusk sky, explosion crater, wind streaks, dominant glow color #ff9e4d. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 28. 네온 핀볼 (`pinball`)

- 파일: `assets/pinball-card.jpg`
- 대표색: `#ff5ec4` (이 색이 그림의 주된 빛이 되도록)
- 장면: 네온 핀볼 테이블과 은빛 공

```
a vertical neon pinball table with glowing pink bumpers, cyan flippers and a shiny silver ball in motion, sparks on impact, dominant glow color #ff5ec4. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 29. 숫자 밀기 (`slide`)

- 파일: `assets/slide-card.jpg`
- 대표색: `#5ee7ff` (이 색이 그림의 주된 빛이 되도록)
- 장면: 숫자 슬라이드 퍼즐 타일

```
a 4x4 sliding number puzzle made of glossy blue tiles with one empty slot, one tile sliding with motion trail, dominant glow color #5ee7ff. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 30. 불 끄기 (`lights`)

- 파일: `assets/lights-card.jpg`
- 대표색: `#ffe066` (이 색이 그림의 주된 빛이 되도록)
- 장면: 켜지고 꺼지는 노란 불빛 격자

```
a grid of square lights, some glowing warm yellow and some dark, a finger tap causing a cross-shaped toggle ripple, dominant glow color #ffe066. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 31. 보석 매치 (`gems`)

- 파일: `assets/gems-card.jpg`
- 대표색: `#ff7aa8` (이 색이 그림의 주된 빛이 되도록)
- 장면: 반짝이는 보석과 터지는 3매치

```
a board of shiny faceted gemstones in red, yellow, green, blue, purple and pink, three matching gems exploding in sparkles, dominant glow color #ff7aa8. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 32. 카드 짝 맞추기 (`memory`)

- 파일: `assets/memory-card.jpg`
- 대표색: `#b48cff` (이 색이 그림의 주된 빛이 되도록)
- 장면: 같은 그림 카드 두 장이 뒤집힌 순간

```
a grid of purple playing cards, two flipped face-up showing the same glowing star symbol, sparkle effect, dominant glow color #b48cff. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 33. 빛 순서 기억 (`sequence`)

- 파일: `assets/sequence-card.jpg`
- 대표색: `#4dffd2` (이 색이 그림의 주된 빛이 되도록)
- 장면: 빛나는 4색 원형 패드

```
a circular four-color pad (mint, red, yellow, blue) with one segment brightly lit, musical note glow, dark center hub, dominant glow color #4dffd2. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 34. 파이프 연결 (`pipes`)

- 파일: `assets/pipes-card.jpg`
- 대표색: `#5effc8` (이 색이 그림의 주된 빛이 되도록)
- 장면: 물이 흐르는 파이프 연결 퍼즐

```
a grid of glowing teal pipes connecting from a central water tank to small houses, water light flowing through connected pipes, dominant glow color #5effc8. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 35. 네모 로직 (`nonogram`)

- 파일: `assets/nonogram-card.jpg`
- 대표색: `#ff9e4d` (이 색이 그림의 주된 빛이 되도록)
- 장면: 칸을 칠해 그림이 드러나는 네모 로직

```
a nonogram picture-logic grid with orange filled cells forming a simple pixel heart, number clues along the edges as abstract marks (no readable text), dominant glow color #ff9e4d. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 36. 버블 팡 (`bubbles`)

- 파일: `assets/bubbles-card.jpg`
- 대표색: `#7aa2ff` (이 색이 그림의 주된 빛이 되도록)
- 장면: 버블 슈터 조준과 터지는 버블

```
a ceiling full of glossy colorful bubbles, a shooter at the bottom firing a bubble with a dotted aim line bouncing off the wall, bubbles popping, dominant glow color #7aa2ff. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 37. 색 채우기 (`flood`)

- 파일: `assets/flood-card.jpg`
- 대표색: `#ff5ec4` (이 색이 그림의 주된 빛이 되도록)
- 장면: 왼쪽 위부터 퍼지는 색 채우기

```
a mosaic grid of vivid colored squares with a color flood spreading from the top-left corner like liquid paint, dominant glow color #ff5ec4. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 38. 타일 짝 잇기 (`pairs`)

- 파일: `assets/pairs-card.jpg`
- 대표색: `#c3ff5e` (이 색이 그림의 주된 빛이 되도록)
- 장면: 두 번 꺾인 선으로 이어진 타일 짝

```
cream-colored mahjong-like tiles with colorful symbols, a glowing green line with two bends connecting two matching tiles, dominant glow color #c3ff5e. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 39. 점과 상자 (`dots`)

- 파일: `assets/dots-card.jpg`
- 대표색: `#5ee7ff` (이 색이 그림의 주된 빛이 되도록)
- 장면: 점과 선, 완성된 상자들

```
a grid of white dots with cyan and red lines drawn between them, small completed boxes glowing cyan and red, dominant glow color #5ee7ff. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 40. 오목 (`gomoku`)

- 파일: `assets/gomoku-card.jpg`
- 대표색: `#ffd166` (이 색이 그림의 주된 빛이 되도록)
- 장면: 오목 판 위 승리한 다섯 돌

```
a wooden go board with black and white stones, five black stones in a diagonal row glowing golden as a winning line, dominant glow color #ffd166. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 41. 리버시 (`reversi`)

- 파일: `assets/reversi-card.jpg`
- 대표색: `#7dff9b` (이 색이 그림의 주된 빛이 되도록)
- 장면: 뒤집히는 리버시 돌

```
a green felt reversi board with black and white discs, several discs mid-flip in the air, soft glow, dominant glow color #7dff9b. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 42. 솔리테어 (`solitaire`)

- 파일: `assets/solitaire-card.jpg`
- 대표색: `#ff7aa8` (이 색이 그림의 주된 빛이 되도록)
- 장면: 초록 테이블 위 솔리테어 카드

```
a fan of classic playing cards on a deep green felt table, a king and queen card cascade, foundation piles with aces, dominant glow color #ff7aa8. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 43. 블랙잭 (`blackjack`)

- 파일: `assets/blackjack-card.jpg`
- 대표색: `#4dffd2` (이 색이 그림의 주된 빛이 되도록)
- 장면: 에이스와 킹, 칩이 놓인 카드 테이블

```
a dark green casino-style card table with two playing cards (ace and king) face up and stacks of colorful poker chips, warm spotlight (game chips only, no money), dominant glow color #4dffd2. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 44. 숫자 야구 (`baseball`)

- 파일: `assets/baseball-card.jpg`
- 대표색: `#9be7ff` (이 색이 그림의 주된 빛이 되도록)
- 장면: 숨은 숫자 추리 (숫자 야구)

```
three glowing number tiles with question-mark silhouettes, a baseball and bat icon glow, hint markers S and B shown as abstract colored dots, dominant glow color #9be7ff. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 45. 반응 속도 (`reaction`)

- 파일: `assets/reaction-card.jpg`
- 대표색: `#ff4d6d` (이 색이 그림의 주된 빛이 되도록)
- 장면: 빨강에서 초록으로 바뀌는 순간 탭

```
a bold split scene: deep red waiting screen transitioning to bright green with a finger tap burst, a stopwatch glow, dominant glow color #ff4d6d. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 46. 암산 레이스 (`math`)

- 파일: `assets/math-card.jpg`
- 대표색: `#ffd166` (이 색이 그림의 주된 빛이 되도록)
- 장면: 빛나는 수학 기호와 두뇌

```
floating glowing arithmetic symbols (plus, minus, multiply) and abstract digit shapes swirling around a brain-shaped light, golden energy, dominant glow color #ffd166. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 47. 색깔 함정 (`stroop`)

- 파일: `assets/stroop-card.jpg`
- 대표색: `#b48cff` (이 색이 그림의 주된 빛이 되도록)
- 장면: 색과 뜻이 엇갈리는 글자 블록

```
large bold abstract word-shaped blocks painted in mismatched bright colors (red, blue, green, yellow), playful brain-teaser mood (no readable letters), dominant glow color #b48cff. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 48. 에임 트레이너 (`aim`)

- 파일: `assets/aim-card.jpg`
- 대표색: `#5ee7ff` (이 색이 그림의 주된 빛이 되도록)
- 장면: 과녁 중앙을 맞히는 조준선

```
several red-white bullseye targets floating in a dark grid space, a crosshair hitting the center with a golden burst, dominant glow color #5ee7ff. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 49. 다른 색 찾기 (`oddcolor`)

- 파일: `assets/oddcolor-card.jpg`
- 대표색: `#7dff9b` (이 색이 그림의 주된 빛이 되도록)
- 장면: 하나만 색이 다른 타일 격자

```
a grid of rounded tiles all in the same soft green except one tile in a slightly different shade, subtle glow on the odd one, dominant glow color #7dff9b. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 50. 숫자 순서 찾기 (`schulte`)

- 파일: `assets/schulte-card.jpg`
- 대표색: `#ff9e4d` (이 색이 그림의 주된 빛이 되도록)
- 장면: 흩어진 숫자를 순서대로 찾는 격자

```
a 5x5 grid of tiles with scattered colorful abstract numeral shapes, a quick tap trail connecting them in sequence, dominant glow color #ff9e4d. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 51. 바둑 묘수풀이 (`baduk`)

- 파일: `assets/baduk-card.jpg`
- 대표색: `#f2c879` (이 색이 그림의 주된 빛이 되도록)
- 장면: 표시된 백 돌을 잡는 바둑 수읽기

```
a glowing wooden go board seen from above with black and white stones, a small group of white stones encircled by a pulsing red target ring and a black stone landing to capture them, dominant glow color #f2c879. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```

### 52. 떨어지는 블록 (`fall`)

- 파일: `assets/fall-card.jpg`
- 대표색: `#5ee7ff` (이 색이 그림의 주된 빛이 되도록)
- 장면: 떨어지는 블록을 돌려 줄을 지우는 퍼즐

```
a tall glowing neon well filled with stacked four-square blocks in pink, cyan, yellow and mint, a bright horizontal row bursting into light as a long bar drops into a gap, dominant glow color #5ee7ff. Style: premium mobile arcade game key art, glossy neon on a very dark navy-black background, soft bloom and glow, subtle film grain, cinematic lighting, high detail, clean composition, vibrant but not oversaturated. No text, no letters, no numbers, no logos, no UI, no watermark. Aspect ratio 16:10 (1200x750). Keep the main subject in the upper two-thirds and slightly right of center; the bottom 30% should be darker and calm because a title is overlaid there.
```
