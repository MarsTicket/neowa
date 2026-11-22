/* 너와 아케이드: 배경음악 라디오 (외부 무료 음원)
   - 곡을 사이트에 담지 않고, 공개 무료 음원(incompetech.com, Kevin MacLeod)을 브라우저 <audio>로 그대로 흘려 듣습니다.
     라이선스: Creative Commons Attribution 4.0 (CC BY 4.0) → 화면에 '음악: Kevin MacLeod · incompetech.com · CC BY 4.0' 을 늘 보여 줍니다.
   - 테마: 90·00 레트로(신스팝·디스코) / 최신 일렉·팝(EDM·팝 비트) / 로파이·칠(잔잔한 전자음) / 오리지널(게임마다 즉석 작곡, sound.js)
   - 외부 음원이 막히면(핫링크 차단·404·시간 초과) 다음 곡을 시도하고, 모두 안 되면 '오리지널'로 자동 전환합니다.
   - 소리 크기·끄기는 게임과 같은 저장 키(neowa_mute, neowa_vol_bgm)를 따릅니다.
   - 쓰는 곳: 게임 페이지는 sound.js 가, 메인 화면은 hub-music.js 가 부릅니다. */
(function () {
  'use strict';
  if (window.NeowaRadio) return;

  var BASE = 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/';
  var CREDIT = '음악: Kevin MacLeod · incompetech.com · CC BY 4.0';
  var KEY_THEME = 'neowa_bgm_theme', KEY_MUTE = 'neowa_mute', KEY_VOL = 'neowa_vol_bgm';

  /* 곡 목록: t 제목 · f 파일 이름 · s 장르 한마디 · d 어떤 곡인지 */
  var TRACKS = {
    retro: [
      { t: 'Newer Wave', f: 'Newer Wave', s: '신스팝', d: '80년대 갤럽 리듬의 신스팝' },
      { t: 'Voltaic', f: 'Voltaic', s: '80년대 댄스', d: '80년대 댄스의 질주하는 베이스' },
      { t: 'Laser Groove', f: 'Laser Groove', s: '레이저 그루브', d: '80년대 사운드를 현대적으로 다듬은 그루브' },
      { t: 'Digital Lemonade', f: 'Digital Lemonade', s: '아날로그 신스', d: '아날로그 신스가 통통 튀는 경쾌한 곡' },
      { t: 'Stringed Disco', f: 'Stringed Disco', s: '디스코', d: '와우 기타·스트링·디스코 비트' },
      { t: 'Ouroboros', f: 'Ouroboros', s: '신스웨이브', d: '1980년대와 2010년대 사이의 두꺼운 신스' },
      { t: 'Pinball Spring', f: 'Pinball Spring', s: '아케이드', d: '오락실 그루브, 밝고 신나는 곡' }
    ],
    modern: [
      { t: 'Show Your Moves', f: 'Show Your Moves', s: '댄스 팝', d: '베이스 드럼이 통통 튀는 밝은 댄스' },
      { t: 'Getting it Done', f: 'Getting it Done', s: '일렉트로 팝', d: '깔끔한 블립 신스의 가벼운 댄스' },
      { t: 'Brain Dance', f: 'Brain Dance', s: '모던 일렉', d: '맥동하는 비트의 현대적인 전자음악' },
      { t: 'Cloud Dancer', f: 'Cloud Dancer', s: 'EDM', d: '빠르고 밝은 EDM, 즐겁고 낙천적인 곡' },
      { t: 'Dance Monster', f: 'Dance Monster', s: '클럽 댄스', d: '힘차게 밀고 나가는 클럽 사운드' },
      { t: 'Aerosol of my Love', f: 'Aerosol of my Love', s: '팝', d: '밝고 편안한 현대 팝' }
    ],
    chill: [
      { t: 'Hypnothis', f: 'Hypnothis', s: '칠 아웃', d: '달콤하게 가라앉는 칠 아웃 전자음' },
      { t: 'One Sly Move', f: 'One Sly Move', s: '로파이', d: '전자피아노와 신스의 느긋한 곡' },
      { t: 'Pamgaea', f: 'Pamgaea', s: '로파이', d: '배경으로 흐르기 좋은 편안한 연주' },
      { t: 'Limit 70', f: 'Limit 70', s: '칠 그루브', d: '차분하게 굴러가는 그루브' },
      { t: 'Deliberate Thought', f: 'Deliberate Thought', s: '앰비언트', d: '느린 전자음과 은은한 울림' }
    ]
  };

  var THEMES = [
    { id: 'retro', name: '90·00 레트로', short: '레트로', note: '신스팝 · 디스코' },
    { id: 'modern', name: '최신 일렉·팝', short: '최신', note: 'EDM · 팝 비트' },
    { id: 'chill', name: '로파이·칠', short: '로파이', note: '잔잔한 전자음' },
    { id: 'original', name: '오리지널', short: '오리지널', note: '게임마다 즉석 작곡' }
  ];
  function themeInfo(id) { for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i]; return THEMES[0]; }
  function validTheme(id) { for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return id; return null; }

  function get(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }
  function curve(v) { return Math.pow(v / 100, 1.6); } // 게임 엔진과 같은 볼륨 곡선
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  var S = {
    theme: null, idx: -1, playing: false, want: false, el: null,
    level: null, low: 1, duckV: 1, ramp: 0, watch: 0, pauseT: 0,
    dead: {}, order: {}, cursor: {}, fails: 0, uis: [], lastFail: 0
  };
  S.theme = validTheme(get(KEY_THEME, 'retro')) || 'retro';

  function emit() {
    for (var i = 0; i < S.uis.length; i++) { try { S.uis[i].update(); } catch (e) {} }
  }
  function track() {
    var list = TRACKS[S.theme];
    if (!list || S.idx < 0 || S.idx >= list.length) return null;
    return list[S.idx];
  }
  function url(tr) { return BASE + encodeURIComponent(tr.f) + '.mp3'; }

  /* ---------- 소리 크기 ---------- */
  function baseLevel() {
    if (get(KEY_MUTE, '0') === '1') return 0;
    var v = parseInt(get(KEY_VOL, '50'), 10); if (isNaN(v)) v = 50;
    if (v <= 0) return 0;
    return 0.45 * curve(v) / curve(50);
  }
  function targetVol() {
    var lv = S.level == null ? baseLevel() : S.level;
    return clamp01(lv * S.low * S.duckV);
  }
  function applyVol(dur) {
    if (!S.el) return;
    var to = targetVol(), from = S.el.volume;
    if (S.ramp) { clearInterval(S.ramp); S.ramp = 0; }
    if (!dur || Math.abs(to - from) < 0.002) { S.el.volume = to; return; }
    var t0 = Date.now();
    S.ramp = setInterval(function () {
      var k = Math.min(1, (Date.now() - t0) / dur);
      try { S.el.volume = from + (to - from) * k; } catch (e) {}
      if (k >= 1) { clearInterval(S.ramp); S.ramp = 0; }
    }, 40);
  }

  /* ---------- 곡 고르기 ---------- */
  function deck(t) {
    var list = TRACKS[t] || [], n = list.length;
    if (!S.order[t]) {
      var arr = [], i, j, tmp;
      for (i = 0; i < n; i++) arr.push(i);
      for (i = n - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp; }
      S.order[t] = arr; S.cursor[t] = -1;
    }
    return S.order[t];
  }
  function alive(t) {
    var list = TRACKS[t] || [], n = 0;
    for (var i = 0; i < list.length; i++) if (!S.dead[t + ':' + i]) n++;
    return n;
  }
  function stepIdx(t, dir) {
    var d = deck(t), n = d.length;
    if (!n || S.cursor[t] == null) S.cursor[t] = -1;
    for (var s = 1; s <= n; s++) {
      var k = ((S.cursor[t] + dir * s) % n + n) % n, i = d[k];
      if (!S.dead[t + ':' + i]) { S.cursor[t] = k; return i; }
    }
    return -1;
  }

  /* ---------- 재생 ---------- */
  function el() {
    if (S.el) return S.el;
    var a = new Audio();
    a.preload = 'none';
    a.volume = 0;
    a.setAttribute('data-neowa-bgm', '');
    a.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
    try { document.body.appendChild(a); } catch (e) {}
    a.addEventListener('ended', function () { if (S.want) next(true); });
    a.addEventListener('playing', function () {
      S.playing = true; S.fails = 0; clearTimeout(S.watch); S.watch = 0;
      applyVol(500);
      var tr = track();
      if (tr && S.announced !== tr.f) { // 곡이 바뀌었을 때만 곡명을 알려 줍니다
        S.announced = tr.f;
        toast('♪ ' + tr.t + ' · ' + themeInfo(S.theme).name);
      }
      emit();
    });
    a.addEventListener('pause', function () { S.playing = false; emit(); });
    a.addEventListener('error', function () { if (!S.want) return; fail('error'); });
    S.el = a;
    return a;
  }
  function clearWatch() { if (S.watch) { clearTimeout(S.watch); S.watch = 0; } }
  function watch() {
    clearWatch();
    S.watch = setTimeout(function () {
      S.watch = 0;
      if (S.want && !S.playing) fail('timeout');
    }, 12000);
  }
  function load(i, autoplay) {
    var tr = (TRACKS[S.theme] || [])[i];
    if (!tr) return fail('none');
    var a = el();
    S.idx = i;
    S.playing = false;
    try { a.src = url(tr); } catch (e) { return fail('src'); }
    emit();
    if (autoplay !== false) start();
  }
  function start() {
    if (!S.want || !track()) return;
    if (targetVol() <= 0.0005) { S.playing = false; emit(); return; } // 소리를 꺼 둠 → 받지도 재생하지도 않음
    var a = el();
    a.volume = 0;
    applyVol(700);
    var p = a.play();
    if (p && p.catch) p.catch(function (err) {
      /* 화면을 옮기는 등으로 끊긴 것(AbortError)은 고장이 아닙니다. 자동재생 금지(NotAllowedError)도 곡 탓이 아닙니다. */
      var nm = err && err.name;
      if (nm === 'AbortError') return;
      if (nm === 'NotAllowedError') { S.playing = false; emit(); return; }
      fail('play');
    });
    watch();
  }
  function next(autoplay) {
    if (!TRACKS[S.theme]) return fail('none');
    var i = stepIdx(S.theme, 1);
    if (i < 0) return fail('none');
    load(i, autoplay !== false);
  }
  function prev() {
    if (!TRACKS[S.theme]) return;
    var i = stepIdx(S.theme, -1);
    if (i < 0) return;
    load(i, S.want);
  }
  function fail(reason) {
    clearWatch();
    S.playing = false;
    if (S.bye || S.theme === 'original' || !S.want) { emit(); return; }
    if (S.idx >= 0) S.dead[S.theme + ':' + S.idx] = 1;
    S.fails++;
    if (S.fails <= 3 && alive(S.theme) > 0) {
      if (window.console && console.warn) console.warn('[neowa radio] 곡을 못 불러와 다음 곡으로 넘어갑니다 · ' + reason);
      next(true); return;
    }
    /* 이 테마의 곡이 전부 안 됨 → 오리지널(즉석 작곡)로 */
    S.theme = 'original'; set(KEY_THEME, 'original');
    S.want = false; stop();
    S.lastFail = Date.now();
    emit();
    if (S.onFallback) { try { S.onFallback(); } catch (e) {} }
  }
  function stop() {
    clearWatch();
    if (S.pauseT) { clearTimeout(S.pauseT); S.pauseT = 0; }
    if (S.el) {
      try { S.el.pause(); S.el.removeAttribute('src'); S.el.load(); } catch (e) {}
    }
    S.playing = false; S.idx = -1;
    emit();
  }

  var API = {
    themes: THEMES, credit: CREDIT,
    theme: function () { return S.theme; },
    track: function () { var tr = track(); return tr ? { title: tr.t, style: tr.s, note: tr.d, theme: S.theme, url: url(tr) } : null; },
    active: function () { return S.theme !== 'original'; },
    playing: function () { return !!(S.el && !S.el.paused && S.idx >= 0); },
    wantPlay: function () { return S.want; },

    setTheme: function (id) {
      var v = validTheme(id); if (!v) return;
      var before = S.theme;
      S.theme = v; set(KEY_THEME, v);
      S.dead = {}; S.fails = 0; S.cursor[v] = -1;
      if (v === 'original') {
        S.want = false; stop();
        if (S.onTheme) { try { S.onTheme(v); } catch (e) {} }
        emit();
        return;
      }
      S.idx = -1;
      if (S.want) next(true);
      if (S.onTheme) { try { S.onTheme(v); } catch (e) {} }
      emit();
    },
    play: function () {
      if (S.theme === 'original') return; // 오리지널은 게임 엔진(sound.js)이 직접 칩니다
      S.want = true;
      if (S.pauseT) { clearTimeout(S.pauseT); S.pauseT = 0; }
      if (!S.el || S.idx < 0 || S.dead[S.theme + ':' + S.idx]) { next(true); return; }
      if (S.el.paused) start(); else applyVol(200);
      emit();
    },
    pause: function () {
      S.want = false;
      if (S.pauseT) { clearTimeout(S.pauseT); S.pauseT = 0; }
      if (S.el && !S.el.paused) {
        applyVol(220);
        S.pauseT = setTimeout(function () { S.pauseT = 0; try { if (S.el && !S.want) S.el.pause(); } catch (e) {} }, 260);
      }
      emit();
    },
    stop: function () { S.want = false; stop(); },
    next: function () { S.want = true; next(true); },
    prev: prev,
    toggle: function () { if (S.playing || (S.el && !S.el.paused)) API.pause(); else API.play(); },

    /* 크기: v 를 주면 그 값을 최종 크기로 씁니다(게임 엔진이 계산). v 를 빼면 저장된 설정을 다시 읽습니다. */
    setLevel: function (v) {
      S.level = (v == null ? null : clamp01(v));
      applyVol(150);
      if (S.level !== null && S.level <= 0.0001) { if (S.el && !S.el.paused) API.pause(); }
      else if (S.want && S.el && S.el.paused) start();
    },
    setLow: function (v) { S.low = (v == null ? 1 : clamp01(v)); applyVol(250); },
    duck: function (to, dur) {
      if (!S.playing) return;
      var t = to == null ? 0.4 : clamp01(to), d = dur == null ? 0.6 : dur;
      S.duckId = (S.duckId || 0) + 1;
      var my = S.duckId;
      S.duckV = t; applyVol(60);
      setTimeout(function () {
        if (S.duckId !== my) return; // 그 사이 다른 소리가 또 줄였으면 그쪽에 맡깁니다
        S.duckV = 1; applyVol(Math.max(200, d * 700));
      }, Math.max(150, d * 1000));
    },
    refresh: function () { S.level = null; applyVol(150); if (baseLevel() <= 0.0001 && S.el && !S.el.paused) API.pause(); },

    onTheme: null, onFallback: null,
    _state: S
  };

  /* ---------- 화면(UI) ---------- */
  function css() {
    if (document.getElementById('nw-bgm-css')) return;
    var st = document.createElement('style'); st.id = 'nw-bgm-css';
    st.textContent =
      '.nw-bgm{display:inline-flex;align-items:center;gap:7px;height:44px;padding:0 10px;border-radius:14px;color:var(--sub,#aab0d4);font:inherit;font-size:13px;font-weight:700;background:none;border:0;cursor:pointer;max-width:190px}' +
      '.nw-bgm:hover{background:rgba(255,255,255,.06);color:var(--ink,#fff)}' +
      '.nw-bgm svg{width:20px;height:20px;flex:none}' +
      '.nw-bgm .nw-t{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px}' +
      '.nw-bgm .nw-eq{display:none;width:3px;height:12px;border-radius:2px;background:var(--accent,#5ee7ff)}' +
      '.nw-bgm.on .nw-eq{display:block;animation:nw-eq .9s ease-in-out infinite}' +
      '@keyframes nw-eq{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}' +
      '.nw-bgm.solo{padding:0;width:44px;justify-content:center}' +
      '.nw-bgm.solo .nw-t{display:none}' +
      '.touch .nw-bgm.solo{width:52px}' +
      '.nw-pop{position:fixed;z-index:4000;width:284px;max-width:calc(100vw - 16px);padding:12px;border-radius:16px;background:#111528;border:1px solid rgba(255,255,255,.14);box-shadow:0 18px 48px rgba(0,0,0,.6);color:#f4f5fb;font-size:13px;text-align:left}' +
      '.nw-pop[hidden]{display:none}' +
      '.nw-h{display:flex;align-items:center;justify-content:space-between;font-family:var(--f-num,system-ui);font-size:11px;letter-spacing:2px;color:#8b93bd;margin-bottom:8px}' +
      '.nw-x{border:0;background:none;color:#8b93bd;font-size:16px;line-height:1;padding:2px 4px;cursor:pointer}' +
      '.nw-themes{display:grid;grid-template-columns:1fr 1fr;gap:5px}' +
      '.nw-tb{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#c8cdea;border-radius:10px;padding:7px 4px;font:inherit;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap}' +
      '.nw-tb small{display:block;font-size:10px;font-weight:600;color:#8b93bd;margin-top:2px;letter-spacing:0}' +
      '.nw-tb.on{background:var(--accent,#5ee7ff);border-color:transparent;color:var(--accent-ink,#03161c)}' +
      '.nw-tb.on small{color:rgba(3,22,28,.7)}' +
      '.nw-now{display:flex;align-items:center;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.1)}' +
      '.nw-now .nw-nt{flex:1;min-width:0}' +
      '.nw-now b{display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.nw-now span{display:block;font-size:11px;color:#8b93bd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.nw-btns{display:flex;gap:2px;flex:none}' +
      '.nw-sq{width:32px;height:32px;border-radius:9px;border:0;background:rgba(255,255,255,.08);color:#f4f5fb;display:grid;place-items:center;cursor:pointer;padding:0}' +
      '.nw-sq:hover{background:rgba(255,255,255,.16)}.nw-sq svg{width:16px;height:16px}' +
      '.nw-sq[hidden]{display:none}' +
      '.g-top .nw-bgm,.g-panel .nw-bgm{height:44px;border-radius:14px}' +
      '.g-top .nw-bgm.solo,.g-panel .nw-bgm.solo{width:44px;min-width:44px;padding:0}' +
      '.touch .g-top .nw-bgm,.touch .g-panel .nw-bgm{height:52px}' +
      '.touch .g-top .nw-bgm.solo,.touch .g-panel .nw-bgm.solo{width:52px;min-width:52px}' +
      '.nw-credit{margin-top:8px;font-size:10px;line-height:1.4;color:#6f7699}' +
      '.nw-credit a{color:#8b93bd;text-decoration:underline}' +
      '.nw-block{margin-top:10px;width:100%}' +
      '.nw-block .nw-themes{gap:4px}' +
      '.nw-block .nw-tb{font-size:11px;padding:6px 2px}' +
      '.nw-block .nw-tb small{display:none}' +
      '.nw-block .nw-now{margin-top:8px;padding-top:8px}' +
      '.nw-toast{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:4500;background:rgba(12,16,32,.94);border:1px solid rgba(255,255,255,.14);color:#f4f5fb;padding:9px 14px;border-radius:12px;font-size:12px;font-weight:700;pointer-events:none;opacity:0;transition:opacity .25s}' +
      '.nw-toast.on{opacity:1}';
    document.head.appendChild(st);
  }

  var ICON_NOTE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></svg>';
  var SVG_PREV = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h2v14H7zM20 5v14L9 12z"/></svg>';
  var SVG_NEXT = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15 5h2v14h-2zM4 5v14l11-7z"/></svg>';
  var SVG_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z"/></svg>';
  var SVG_STOP = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>';

  function toast(msg) {
    css();
    var t = document.getElementById('nw-bgm-toast');
    if (!t) { t = document.createElement('div'); t.id = 'nw-bgm-toast'; t.className = 'nw-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.classList.remove('on'); }, 2600);
  }

  /* 테마 버튼 묶음 + 지금 곡 + 앞뒤 버튼을 담은 한 덩어리. where: 'pop' | 'block' */
  function body(where) {
    var box = document.createElement('div');
    var themes = document.createElement('div'); themes.className = 'nw-themes'; themes.setAttribute('role', 'group'); themes.setAttribute('aria-label', '배경음악 종류');
    THEMES.forEach(function (th) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'nw-tb'; b.setAttribute('data-nw-theme', th.id);
      b.innerHTML = th.name + (where === 'pop' ? '<small>' + th.note + '</small>' : '');
      b.addEventListener('click', function (e) { e.stopPropagation(); API.setTheme(th.id); });
      themes.appendChild(b);
    });
    box.appendChild(themes);

    var now = document.createElement('div'); now.className = 'nw-now';
    var txt = document.createElement('div'); txt.className = 'nw-nt';
    var b = document.createElement('b'); var s = document.createElement('span');
    txt.appendChild(b); txt.appendChild(s);
    var btns = document.createElement('div'); btns.className = 'nw-btns';
    var pv = document.createElement('button'); pv.type = 'button'; pv.className = 'nw-sq'; pv.setAttribute('aria-label', '이전 곡'); pv.innerHTML = SVG_PREV;
    var pp = document.createElement('button'); pp.type = 'button'; pp.className = 'nw-sq'; pp.setAttribute('aria-label', '재생/멈춤'); pp.innerHTML = SVG_PLAY;
    var nx = document.createElement('button'); nx.type = 'button'; nx.className = 'nw-sq'; nx.setAttribute('aria-label', '다음 곡'); nx.innerHTML = SVG_NEXT;
    pv.addEventListener('click', function (e) { e.stopPropagation(); API.prev(); });
    pp.addEventListener('click', function (e) { e.stopPropagation(); API.toggle(); });
    nx.addEventListener('click', function (e) { e.stopPropagation(); API.next(); });
    btns.appendChild(pv); btns.appendChild(pp); btns.appendChild(nx);
    now.appendChild(txt); now.appendChild(btns);
    box.appendChild(now);

    var credit = document.createElement('div'); credit.className = 'nw-credit';
    credit.innerHTML = CREDIT + ' <a href="https://incompetech.com/music/royalty-free/music.html" target="_blank" rel="noopener noreferrer">출처</a>';
    box.appendChild(credit);

    var ui = {
      update: function () {
        var cur = S.theme, tr = track(), info = themeInfo(cur);
        var tbs = themes.querySelectorAll('[data-nw-theme]');
        for (var i = 0; i < tbs.length; i++) tbs[i].classList.toggle('on', tbs[i].getAttribute('data-nw-theme') === cur);
        if (cur === 'original') {
          b.textContent = '게임마다 즉석 작곡';
          s.textContent = '지금 게임에 맞춰 새로 만든 곡';
          pv.hidden = true; nx.hidden = true; pp.hidden = true;
          pp.innerHTML = SVG_PLAY;
        } else {
          pv.hidden = false; nx.hidden = false; pp.hidden = false;
          b.textContent = tr ? (S.playing ? '♪ ' : '❚❚ ') + tr.t : '준비 중…';
          s.textContent = tr ? tr.s + ' · ' + info.name : info.note;
          pp.innerHTML = S.playing ? SVG_STOP : SVG_PLAY;
          pp.setAttribute('aria-label', S.playing ? '멈춤' : '재생');
        }
      }
    };
    S.uis.push(ui);
    ui.update();
    return box;
  }

  var pop = null, popOwner = null;
  function closePop() {
    if (pop) pop.hidden = true;
    if (popOwner) { popOwner.setAttribute('aria-expanded', 'false'); popOwner.classList.remove('is-open'); }
    popOwner = null;
  }
  function openPop(btn) {
    css();
    if (!pop) {
      pop = document.createElement('div'); pop.className = 'nw-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', '배경음악 설정');
      pop.setAttribute('data-nostart', '');
      pop.innerHTML = '<div class="nw-h"><span>BGM · 배경음악</span></div>';
      pop.insertBefore(body('pop'), pop.firstChild.nextSibling);
      var x = document.createElement('button'); x.type = 'button'; x.className = 'nw-x'; x.setAttribute('aria-label', '닫기'); x.textContent = '✕';
      x.addEventListener('click', function (e) { e.stopPropagation(); closePop(); });
      pop.querySelector('.nw-h').appendChild(x);
      pop.addEventListener('click', function (e) { e.stopPropagation(); });
      document.body.appendChild(pop);
      document.addEventListener('pointerdown', function (e) {
        if (!pop || pop.hidden) return;
        if (pop.contains(e.target) || (popOwner && popOwner.contains(e.target))) return;
        closePop();
      }, true);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePop(); }, true);
    }
    if (popOwner === btn && !pop.hidden) { closePop(); return; }
    closePop();
    pop.hidden = false;
    popOwner = btn;
    btn.setAttribute('aria-expanded', 'true');
    btn.classList.add('is-open');
    positionPop(btn);
  }
  function positionPop(btn) {
    if (!pop) return;
    var r = btn.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
    var left = Math.min(window.innerWidth - w - 8, Math.max(8, r.right - w));
    var top = r.bottom + 8;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 8);
    pop.style.left = Math.round(left) + 'px';
    pop.style.top = Math.round(top) + 'px';
  }
  window.addEventListener('resize', function () { if (pop && !pop.hidden && popOwner) positionPop(popOwner); });

  /* 게임 위 메뉴줄에 붙는 버튼. 좁은 화면에서는 아이콘만(solo) */
  API.chip = function (parent, opts) {
    if (!parent) return null;
    css();
    opts = opts || {};
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'nw-bgm' + (opts.solo ? ' solo' : '');
    btn.setAttribute('aria-label', '배경음악 설정'); btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = ICON_NOTE + '<i class="nw-eq"></i><span class="nw-t"></span>';
    btn.addEventListener('click', function (e) { e.stopPropagation(); openPop(btn); });
    parent.appendChild(btn);
    var ui = {
      update: function () {
        var tr = track(), on = S.playing;
        btn.classList.toggle('on', on && S.theme !== 'original');
        var t = btn.querySelector('.nw-t');
        t.textContent = S.theme === 'original' ? '오리지널' : (tr ? tr.t : '배경음악');
        btn.title = S.theme === 'original' ? '배경음악: 게임마다 즉석 작곡' : '배경음악: ' + (tr ? tr.t : '') + ' · ' + themeInfo(S.theme).name;
      }
    };
    S.uis.push(ui); ui.update();
    return btn;
  };

  /* 일시정지 화면 '소리 설정' 칸에 붙는 덩어리 (테마 고르기 + 곡명) */
  API.block = function (parent) {
    if (!parent) return null;
    css();
    var box = document.createElement('div'); box.className = 'nw-block'; box.setAttribute('data-nostart', '');
    box.appendChild(body('block'));
    box.addEventListener('click', function (e) { e.stopPropagation(); });
    parent.appendChild(box);
    return box;
  };

  API.toast = toast;

  /* 화면이 가려지면 잠시 멈추고, 돌아오면 이어서 (데이터·배터리 절약) */
  /* 화면을 떠나는 중에는 '못 불러옴'으로 세지 않습니다(이동 때문에 곡이 끊긴 것을 고장으로 오해하지 않게) */
  window.addEventListener('pagehide', function () { S.bye = true; });
  document.addEventListener('visibilitychange', function () {
    if (!S.el || S.theme === 'original') return;
    if (document.hidden) {
      if (!S.el.paused) { try { S.el.pause(); } catch (e) {} }
    } else if (S.want) { start(); }
  });

  window.NeowaRadio = API;
})();
