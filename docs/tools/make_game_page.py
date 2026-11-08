#!/usr/bin/env python3
"""
게임 페이지 틀 생성기
- docs/tools/games/<id>.json (설정) + docs/tools/games/<id>.js (게임 코드)를 합쳐
  <id>/index.html 을 만듭니다. 결과물은 _template 과 같은 구조의 독립 HTML 입니다.
- 사용법:  python3 docs/tools/make_game_page.py runner tower   (생략하면 games/ 안의 전부)
- 손으로 만든 게임(shooting, snake, breakout)은 이 도구를 쓰지 않습니다.
"""
import json, sys, os, html

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
GDIR = os.path.join(os.path.dirname(__file__), 'games')

# 사이트 전체 게임 목록은 docs/tools/catalog.json 한 곳에서 관리 (순서 = 다음 게임 고리 순서 = STAGE 번호)
CATALOG = [(g['id'], g['name'], g['kgenre']) for g in json.load(open(os.path.join(os.path.dirname(__file__), 'catalog.json'), encoding='utf-8'))]
IDS = [c[0] for c in CATALOG]
INFO = {c[0]: c for c in CATALOG}

ICON = {
    'drag': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4"/></svg>',
    'tap': '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>',
    'star': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 9 9H2l6 4.5L5.5 21 12 16.5 18.5 21 16 13.5 22 9h-7z"/></svg>',
    'clock': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    'grid': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>',
}

def more_games(gid):
    i = IDS.index(gid)
    picks = [IDS[(i + 1) % len(IDS)], IDS[(i + 4) % len(IDS)]]
    out = []
    for p in picks:
        _, name, genre = INFO[p]
        out.append(f'<a class="g-more" href="../{p}/"><img src="../assets/{p}-card.jpg" alt=""><span><b>{name}</b><span>{genre}</span></span></a>')
    return '\n        '.join(out)

def build(gid):
    cfg = json.load(open(os.path.join(GDIR, gid + '.json'), encoding='utf-8'))
    code = open(os.path.join(GDIR, gid + '.js'), encoding='utf-8').read()
    no = IDS.index(gid) + 1
    name = INFO[gid][1]
    nxt = IDS[(IDS.index(gid) + 1) % len(IDS)]
    nname = INFO[nxt][1]
    e = html.escape
    chips = '\n          '.join(f'<span>{ICON[c[0]]}{e(c[1])}</span>' for c in cfg['chips'])
    keys = '\n          '.join(f'<div class="{c[0]}">{c[1]}</div>' if c[0] else f'<div>{c[1]}</div>' for c in cfg['keys'])
    rules = '\n          '.join(f'<div>{r}</div>' for r in cfg['rules'])
    hud = cfg['hud']
    diff = ''
    if cfg.get('diff'):
        btns = ''.join(f'<button type="button" data-diff="{i}">{e(d)}</button>' for i, d in enumerate(cfg['diff']))
        diff = f'<div class="ov-diff" data-nostart role="group" aria-label="난이도">{btns}</div>'
    pad = ''
    if cfg.get('pad'):
        pad = open(os.path.join(GDIR, '_pad.html'), encoding='utf-8').read()
    out = f'''<!DOCTYPE html>
<html lang="ko">
<head>
<!-- 이 파일은 docs/tools/make_game_page.py 로 생성했습니다. 게임 코드를 고칠 때는 docs/tools/games/{gid}.js 를 고친 뒤 다시 생성하세요. -->
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#05060c">
<title>{e(name)} · 너와 아케이드</title>
<meta name="description" content="{e(cfg['meta'])}">
<meta property="og:title" content="{e(name)} · 너와 아케이드">
<meta property="og:description" content="{e(cfg['og'])}">
<meta property="og:image" content="https://neowa.kr/assets/{gid}-card.jpg">
<link rel="icon" href="../assets/favicon.png" type="image/png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Chakra+Petch:wght@600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link rel="stylesheet" href="../assets/arcade/arcade.css?v=4">
<style>:root{{--accent:{cfg['accent']};--accent-ink:{cfg['ink']};--ar:{cfg['rgb']}}}</style>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-T386KYRRLK"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','G-T386KYRRLK');</script>
</head>
<body class="g" data-state="ready">
<div class="g-shell">
  <header class="g-top">
    <a class="g-back" href="../"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg><span>아케이드</span></a>
    <div class="g-name"><small>STAGE {no:02d}</small>{e(name)}</div>
    <div class="g-icons">
      <button class="g-ic" data-act="mute" aria-label="소리 켜기/끄기"><svg class="on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg><svg class="off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m22 9-6 6M16 9l6 6"/></svg></button>
      <button class="g-ic" data-act="fs" aria-label="전체 화면"><svg class="enter" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg><svg class="exit" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg></button>
      <button class="g-ic" data-act="pause" aria-label="일시정지"><svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg></button>
    </div>
  </header>

  <main class="g-wrap" id="wrap">
    <aside class="g-side">
      <div class="g-card"><h3>CONTROLS</h3>
        <div class="g-keys">
          {keys}
          <div class="k-only"><kbd>P</kbd> 일시정지 <kbd>M</kbd> 소리 <kbd>F</kbd> 전체</div>
        </div>
      </div>
      <div class="g-card"><h3>RULES</h3>
        <div class="g-keys">
          {rules}
        </div>
      </div>
    </aside>

    <div class="g-stage" id="stage">
      <canvas id="cv"></canvas>
      <div class="g-hud">
        <div class="h-box"><span class="h-lb">{hud[0][0]}</span><span class="h-v" id="hA">0</span><span class="h-mult" id="hMult"></span></div>
        <div class="h-box c"><span class="h-lb">{hud[1][0]}</span><span class="h-v sm" id="hB">{hud[1][1]}</span></div>
        <div class="h-box r"><span class="h-lb">{hud[2][0]}</span><span class="h-v sm" id="hC">{hud[2][1]}</span></div>
      </div>
      <div class="g-banner" id="banner"></div>

      <section class="g-ov" id="ovStart" aria-label="시작 화면">
        <p class="ov-kick">NEOWA ARCADE · {no:02d}</p>
        <h1 class="ov-title">{e(name)}</h1>
        <p class="ov-desc">{e(cfg['desc'])}</p>
        <div class="ov-ctrl">
          {chips}
        </div>
        {diff}
        <button class="btn btn-p ov-start-btn" data-act="start"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z"/></svg>{e(cfg.get('startLabel', '시작하기'))}</button>
        <p class="ov-best">최고기록<b data-best>0</b></p>
        <p class="ov-hint"><span class="k-only" style="display:inline">스페이스 또는 </span>{e(cfg.get('startHint', '화면 아무 곳이나 탭'))}</p>
      </section>

      <section class="g-ov" id="ovPause" aria-label="일시정지">
        <p class="ov-kick">PAUSED</p>
        <h2 class="ov-title">일시정지</h2>
        <div class="ov-col" style="margin-top:14px">
          <button class="btn btn-p" data-act="resume">계속하기</button>
          <button class="btn btn-g" data-act="restart">처음부터</button>
          <a class="btn btn-g" href="../">아케이드 홈</a>
        </div>
      </section>

      <section class="g-ov" id="ovOver" aria-label="게임 종료">
        <p class="ov-kick">GAME OVER</p>
        <span class="ov-new" id="ovNew" hidden>NEW RECORD</span>
        <div class="ov-score" id="ovScore">0</div>
        <div class="ov-meta" id="ovMeta"></div>
        <div class="ov-col">
          <button class="btn btn-p" data-act="restart"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>다시 하기</button>
          <a class="ov-next" href="../{nxt}/"><img src="../assets/{nxt}-card.jpg" alt=""><span class="grow"><b>{e(nname)}</b>다음 게임 해 보기</span><span>→</span></a>
        </div>
        <p class="ov-best">최고기록<b data-best>0</b></p>
      </section>
    </div>

    <aside class="g-side">
      <div class="g-card"><h3>RECORD</h3>
        <div class="g-stat"><span>최고기록</span><b data-best>0</b></div>
        <div class="g-stat"><span>플레이 횟수</span><b data-plays>0</b></div>
      </div>
      <div class="g-card"><h3>MORE GAMES</h3>
        {more_games(gid)}
      </div>
    </aside>
  </main>
  {pad or '<div></div>'}
</div>

<script src="../assets/arcade/arcade.js?v=4"></script>
<script>
{code}
</script>
</body>
</html>
'''
    os.makedirs(os.path.join(ROOT, gid), exist_ok=True)
    open(os.path.join(ROOT, gid, 'index.html'), 'w', encoding='utf-8').write(out)
    print('생성:', gid + '/index.html')

if __name__ == '__main__':
    ids = sys.argv[1:] or sorted(f[:-5] for f in os.listdir(GDIR) if f.endswith('.json'))
    for g in ids:
        build(g)
