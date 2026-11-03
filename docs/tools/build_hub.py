#!/usr/bin/env python3
"""
메인 페이지(index.html)의 게임 목록을 docs/tools/catalog.json 으로 다시 만듭니다.
- index.html 안의 <!-- GAMES:START --> ~ <!-- GAMES:END --> 사이와
  /* NAMES:START */ ~ /* NAMES:END */ 사이만 바꿉니다. 나머지는 손대지 않습니다.
- 사용법: python3 docs/tools/build_hub.py
"""
import json, os, html

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CAT = json.load(open(os.path.join(os.path.dirname(__file__), 'catalog.json'), encoding='utf-8'))
ORDER = ['액션', '원탭', '퍼즐', '보드·카드', '두뇌']
e = html.escape


def card(i, g):
    tags = ''.join(f'<li>{e(t)}</li>' for t in g['tags'])
    new = '<span class="gc-new">NEW</span>' if g.get('new') else ''
    alt = e(g['name'] + ' 게임 화면')
    return f'''        <article class="gc" data-cat="{g['cat']}" data-q="{e(g['name'] + ' ' + g['kgenre'] + ' ' + ' '.join(g['tags']))}" style="--c:{g['accent']};--cr:{g['rgb']}">
          <a class="cover" href="{g['id']}/" aria-label="{e(g['name'])} 플레이"></a>
          <div class="gc-art"><span class="gc-no">{i + 1:02d}</span>{new}<img src="assets/{g['id']}-card.jpg" alt="{alt}" loading="lazy" width="1200" height="750"></div>
          <div class="gc-body">
            <p class="gc-genre">{e(g['genre'])}</p>
            <h3>{e(g['name'])}</h3>
            <p>{e(g['desc'])}</p>
            <ul class="tags">{tags}</ul>
            <div class="gc-foot">
              <div class="gc-best"><span>BEST</span><b data-key="neowa_hub_{g['id']}_high">0</b></div>
              <a class="play" href="{g['id']}/">플레이<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z"/></svg></a>
            </div>
          </div>
        </article>'''


def build():
    n = len(CAT)
    counts = {c: sum(1 for g in CAT if g['cat'] == c) for c in ORDER}
    btns = [f'<button class="on" data-f="all" role="tab" aria-selected="true">전체 <b>{n}</b></button>']
    for c in ORDER:
        if counts[c]:
            btns.append(f'<button data-f="{c}" role="tab" aria-selected="false">{c} <b>{counts[c]}</b></button>')
    block = f'''<!-- GAMES:START (docs/tools/build_hub.py 가 자동 생성. 직접 고치지 마세요) -->
      <div class="sec-head">
        <div><p class="eyebrow">ARCADE · {n} GAMES</p><h2>오늘은 뭘 할까요?</h2></div>
        <label class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="gameSearch" type="search" placeholder="게임 찾기 (예: 퍼즐, 원탭)" aria-label="게임 찾기"></label>
      </div>
      <div class="filters" role="tablist" aria-label="게임 종류">
        {"".join(btns)}
      </div>
      <p class="empty" id="emptyMsg" hidden>찾는 게임이 없어요. 다른 말로 찾아보세요.</p>
      <div class="games">
{chr(10).join(card(i, g) for i, g in enumerate(CAT))}
      </div>
      <!-- GAMES:END -->'''
    names = '/* NAMES:START */ var NAMES = ' + json.dumps({g['id']: g['name'] for g in CAT}, ensure_ascii=False) + '; /* NAMES:END */'
    p = os.path.join(ROOT, 'index.html')
    s = open(p, encoding='utf-8').read()
    a, b = s.index('<!-- GAMES:START'), s.index('<!-- GAMES:END -->') + len('<!-- GAMES:END -->')
    s = s[:a] + block + s[b:]
    a, b = s.index('/* NAMES:START */'), s.index('/* NAMES:END */') + len('/* NAMES:END */')
    s = s[:a] + names + s[b:]
    s = s.replace('게임 10종과', f'게임 {n}종과')
    open(p, 'w', encoding='utf-8').write(s)
    print(f'메인 갱신: 게임 {n}개', counts)
    # 랭킹 페이지가 쓰는 게임 목록
    games = [{'id': g['id'], 'name': g['name'], 'cat': g['cat'], 'accent': g['accent']} for g in CAT]
    open(os.path.join(ROOT, 'assets', 'arcade', 'games.js'), 'w', encoding='utf-8').write(
        '/* docs/tools/build_hub.py 가 자동 생성 */\nwindow.NEOWA_GAMES = ' + json.dumps(games, ensure_ascii=False) + ';\n')
    # 랭킹 서버(Supabase) 설정 SQL: 게임별 점수 상한 포함
    tpl = open(os.path.join(ROOT, 'docs', 'ranking', 'schema.sql'), encoding='utf-8').read()
    rows = ',\n'.join(f"  ('{g['id']}', {int(g.get('maxScore', 10000000))})" for g in CAT)
    sql = tpl.replace('-- @LIMITS@', rows)
    open(os.path.join(ROOT, 'docs', 'ranking', 'supabase.sql'), 'w', encoding='utf-8').write(sql)
    print('랭킹 SQL 갱신: docs/ranking/supabase.sql')


if __name__ == '__main__':
    build()
