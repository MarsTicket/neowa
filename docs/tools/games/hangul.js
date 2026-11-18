(function () {
  'use strict';
  // 한글 단어 맞히기: 2음절 낱말을 자모 칸으로 풀어 6번 안에 맞히기. 초록 = 자리까지 맞음, 노랑 = 다른 자리에 있음, 회색 = 없음
  var A = Arcade, W = 540, H = 960;
  var CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ', JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ', JONG = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ';
  var DBL_FINAL = 'ㄳㄵㄶㄺㄻㄼㄽㄾㄿㅀㅄ';
  var VCOMB = { 'ㅗㅏ': 'ㅘ', 'ㅗㅐ': 'ㅙ', 'ㅗㅣ': 'ㅚ', 'ㅜㅓ': 'ㅝ', 'ㅜㅔ': 'ㅞ', 'ㅜㅣ': 'ㅟ', 'ㅡㅣ': 'ㅢ' }, VSPLIT = {};
  Object.keys(VCOMB).forEach(function (k) { VSPLIT[VCOMB[k]] = k.charAt(0); });
  var SHIFT = { 'ㅂ': 'ㅃ', 'ㅈ': 'ㅉ', 'ㄷ': 'ㄸ', 'ㄱ': 'ㄲ', 'ㅅ': 'ㅆ', 'ㅐ': 'ㅒ', 'ㅔ': 'ㅖ' };
  var CODE = { KeyQ: 'ㅂ', KeyW: 'ㅈ', KeyE: 'ㄷ', KeyR: 'ㄱ', KeyT: 'ㅅ', KeyY: 'ㅛ', KeyU: 'ㅕ', KeyI: 'ㅑ', KeyO: 'ㅐ', KeyP: 'ㅔ', KeyA: 'ㅁ', KeyS: 'ㄴ', KeyD: 'ㅇ', KeyF: 'ㄹ', KeyG: 'ㅎ', KeyH: 'ㅗ', KeyJ: 'ㅓ', KeyK: 'ㅏ', KeyL: 'ㅣ', KeyZ: 'ㅋ', KeyX: 'ㅌ', KeyC: 'ㅊ', KeyV: 'ㅍ', KeyB: 'ㅠ', KeyN: 'ㅜ', KeyM: 'ㅡ' };
  var ROWS = [['ㅂ', 'ㅈ', 'ㄷ', 'ㄱ', 'ㅅ', 'ㅛ', 'ㅕ', 'ㅑ', 'ㅐ', 'ㅔ'], ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ', 'ㅗ', 'ㅓ', 'ㅏ', 'ㅣ'], ['SH', 'ㅋ', 'ㅌ', 'ㅊ', 'ㅍ', 'ㅠ', 'ㅜ', 'ㅡ', 'BS'], ['OK']];
  var fx = new A.FX();
  var ANS = [], DICT = {}, ready = false;
  var won = false, target, cells, rows, cur, keyState, shift, tries, score, streak, best, solved, phase, phaseT, shakeT, msg, msgT, mode = +A.get('neowa_hangul_mode', 0) || 0, daily, revealT, tim = 0;

  // ---------- 낱말 목록 불러오기(공용 파일) ----------
  function isV(j) { return JUNG.indexOf(j) >= 0; }
  function split(word) {
    // 낱말 → 자모 칸(겹모음은 한 칸, 겹받침이 있으면 null)
    var out = [];
    for (var i = 0; i < word.length; i++) {
      var c = word.charCodeAt(i) - 0xAC00; if (c < 0 || c > 11171) return null;
      var jo = c % 28, ju = ((c - jo) / 28) % 21, ch = Math.floor(c / 588);
      out.push(CHO.charAt(ch), JUNG.charAt(ju)); if (jo) { var f = JONG.charAt(jo); if (DBL_FINAL.indexOf(f) >= 0) return null; out.push(f); }
    }
    return out;
  }
  function compose(cl) {
    // 자모 칸 → 글자(규칙에 맞지 않으면 null)
    var s = '', i = 0;
    while (i < cl.length) {
      var ch = CHO.indexOf(cl[i]), ju = i + 1 < cl.length ? JUNG.indexOf(cl[i + 1]) : -1; if (ch < 0 || ju < 0) return null;
      i += 2; var jo = 0;
      if (i < cl.length && !isV(cl[i]) && !(i + 1 < cl.length && isV(cl[i + 1]))) { jo = JONG.indexOf(cl[i]); if (jo <= 0) return null; i++; }
      s += String.fromCharCode(0xAC00 + (ch * 21 + ju) * 28 + jo);
    }
    return s;
  }
  function load() {
    var W0 = window.NEOWA_WORDS; if (!W0) return;
    W0.answers.split(' ').forEach(function (w) { if (w.length === 2 && split(w)) ANS.push(w); });
    W0.words.split(' ').forEach(function (w) { if (w.length === 2 && split(w)) DICT[w] = 1; });
    ANS.forEach(function (w) { DICT[w] = 1; }); ready = true;
  }
  (function () {
    if (window.NEOWA_WORDS) { load(); return; }
    var s = document.createElement('script'); s.src = '../assets/arcade/hangul-words.js?v=1'; s.onload = load; document.head.appendChild(s);
  })();

  // ---------- 진행 ----------
  function kstDay() { return Math.floor((Date.now() + 9 * 3600e3) / 86400e3); }
  function pickTarget() {
    if (mode === 1) { var d = kstDay(); return ANS[(d * 7919 + 13) % ANS.length]; }
    var w; do { w = ANS[Math.floor(Math.random() * ANS.length)]; } while (w === target && ANS.length > 1); return w;
  }
  function newWord() {
    target = pickTarget(); cells = split(target); rows = []; cur = []; keyState = {}; shift = false; tries = 0; phase = 'play'; revealT = 0; hud();
  }
  function reset() {
    score = 0; streak = 0; best = 0; solved = 0; msg = ''; msgT = 0; shakeT = 0; fx.clear();
    if (!ready) load();
    daily = mode === 1; won = false;
    if (daily && A.get('neowa_hangul_daily', '') === String(kstDay())) say('오늘의 단어는 이미 풀었어요 · 연습으로 한 번 더!', 3);
    if (ready) newWord(); else { phase = 'wait'; cells = null; }
  }
  function say(t, d) { msg = t; msgT = d || 1.6; }
  function typeJamo(j) {
    if (phase !== 'play' || revealT > 0) return;
    if (shift && SHIFT[j]) j = SHIFT[j]; shift = false;
    var last = cur[cur.length - 1];
    if (isV(j) && last && VCOMB[last + j]) { cur[cur.length - 1] = VCOMB[last + j]; A.sfx('tick'); return; }
    if (cur.length >= cells.length) { shakeT = 0.3; A.sfx('wall'); return; }
    cur.push(j); A.sfx('tick');
  }
  function backspace() {
    if (phase !== 'play' || revealT > 0 || !cur.length) return;
    var last = cur[cur.length - 1]; if (VSPLIT[last]) cur[cur.length - 1] = VSPLIT[last]; else cur.pop(); A.sfx('turn');
  }
  function submit() {
    if (phase !== 'play' || revealT > 0) return;
    if (cur.length < cells.length) { shakeT = 0.4; say('칸을 모두 채워 주세요'); A.sfx('hurt'); A.vibrate(20); return; }
    var w = compose(cur);
    if (!w || w.length !== 2) { shakeT = 0.4; say('글자가 만들어지지 않아요'); A.sfx('hurt'); A.vibrate(20); return; }
    if (!DICT[w]) { shakeT = 0.4; say('「' + w + '」은(는) 사전에 없는 낱말이에요'); A.sfx('hurt'); A.vibrate(20); return; }
    // 판정: 초록 먼저, 남은 개수만큼만 노랑
    var res = [], left = {}, i;
    for (i = 0; i < cells.length; i++) { if (cur[i] === cells[i]) res[i] = 2; else { res[i] = 0; left[cells[i]] = (left[cells[i]] || 0) + 1; } }
    for (i = 0; i < cells.length; i++) if (res[i] === 0 && left[cur[i]]) { res[i] = 1; left[cur[i]]--; }
    rows.push({ j: cur.slice(), r: res, w: w }); cur = []; tries++; revealT = cells.length * 0.13 + 0.25;
    res.forEach(function (v, k) { var jm = rows[rows.length - 1].j[k]; keyState[jm] = Math.max(keyState[jm] == null ? -1 : keyState[jm], v); });
    A.sfx('click'); hud();
  }
  function afterReveal() {
    var last = rows[rows.length - 1], win = last.r.every(function (v) { return v === 2; });
    won = win;
    if (win) {
      streak++; best = Math.max(best, streak); solved++;
      var mult = Math.min(3, 1 + (streak - 1) * 0.1), pts = Math.round((7 - tries) * 100 * mult); score += pts;
      S.banner(tries === 1 ? '한 번에!' : '정답!', target + ' · +' + pts + (streak > 1 ? ' (연속 ' + streak + ')' : ''));
      A.sfx(tries <= 2 ? 'record' : 'level'); A.vibrate([20, 30, 20]); fx.burst(W / 2, 300, '#7dff9b', 34, 380, 0.8, 3.5); fx.burst(W / 2, 300, '#ffd166', 20, 300, 0.8, 3);
      phase = 'win'; phaseT = 0; hud();
    } else if (tries >= 6) {
      phase = 'lose'; phaseT = 0; A.sfx('over'); say('정답은 「' + target + '」 (' + cells.join(' ') + ')', 4);
    }
  }
  function update(dt) {
    tim += dt; fx.update(dt); if (phase === 'wait') { if (ready) newWord(); return; } if (shakeT > 0) shakeT -= dt; if (msgT > 0) msgT -= dt;
    if (revealT > 0) { revealT -= dt; if (revealT <= 0) { revealT = 0; afterReveal(); } }
    if (phase === 'win' || phase === 'lose') {
      phaseT += dt;
      if (phase === 'win' && phaseT > 1.6) { if (daily) finish(); else newWord(); }
      if (phase === 'lose' && phaseT > 2.6) finish();
    }
  }
  function finish() {
    phase = 'done';
    var again = daily && A.get('neowa_hangul_daily', '') === String(kstDay());
    if (daily) A.set('neowa_hangul_daily', kstDay());
    S.gameOver(score, daily ? [['오늘의 단어', target], ['시도', tries + '/6']] : [['맞힌 낱말', String(solved)], ['최고 연속', String(best)], ['마지막 정답', target]], daily ? { noRecord: again, win: won, title: won ? '오늘의 단어 성공!' : '아쉬워요' } : {});
  }

  // ---------- 그리기 ----------
  var COL = ['#3a3a44', '#e0b43c', '#3fbf6a'];
  var BY = 118, CW = 58, CG = 8, RH = 66;
  function boardX() { return (W - (cells.length * CW + (cells.length - 1) * CG)) / 2; }
  var KY = 572, KH = 62, KG = 6;
  function keyRects() {
    var out = [];
    ROWS.forEach(function (row, ri) {
      var y = KY + ri * (KH + KG);
      if (ri === 3) { out.push({ k: 'OK', x: 70, y: y, w: 400, h: KH }); return; }
      var units = row.reduce(function (s, k) { return s + (k === 'SH' || k === 'BS' ? 1.5 : 1); }, 0), uw = (W - 24 - (row.length - 1) * KG) / Math.max(units, 10), tw = units * uw + (row.length - 1) * KG, x = (W - tw) / 2;
      row.forEach(function (k) { var w = (k === 'SH' || k === 'BS' ? 1.5 : 1) * uw; out.push({ k: k, x: x, y: y, w: w, h: KH }); x += w + KG; });
    });
    return out;
  }
  function cellBox(c, x, y, ch, state, flip) {
    var sc = flip == null ? 1 : Math.abs(Math.cos(flip * Math.PI));
    var fill = state == null ? 'rgba(255,255,255,.05)' : COL[state];
    c.save(); c.translate(x + CW / 2, y + CW / 2); c.scale(1, Math.max(0.05, sc));
    c.fillStyle = fill; A.rr(c, -CW / 2, -CW / 2, CW, CW, 10); c.fill();
    if (state == null) { c.strokeStyle = ch ? 'rgba(125,255,155,.75)' : 'rgba(255,255,255,.18)'; c.lineWidth = 2; A.rr(c, -CW / 2 + 1, -CW / 2 + 1, CW - 2, CW - 2, 9); c.stroke(); }
    if (ch) { c.fillStyle = '#ffffff'; c.font = '800 30px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, 0, 2); }
    c.restore();
  }
  function render(c, t) {
    c.fillStyle = '#06120a'; c.fillRect(0, 0, W, H);
    var o = fx.offset(); c.save(); c.translate(o[0], o[1]);
    if (!ready || !cells) {
      c.fillStyle = '#7dff9b'; c.font = '700 20px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.fillText(ready ? '' : '낱말 목록을 불러오는 중…', W / 2, 400);
      c.restore(); return;
    }
    var bx = boardX();
    for (var r = 0; r < 6; r++) {
      var y = BY + r * RH, row = rows[r], isCur = r === rows.length && phase === 'play', dx = isCur && shakeT > 0 ? Math.sin(shakeT * 60) * 8 * shakeT / 0.4 : 0;
      for (var i = 0; i < cells.length; i++) {
        var x = bx + i * (CW + CG) + dx;
        if (row) {
          var isLast = r === rows.length - 1 && revealT > 0, tStart = i * 0.13, el = cells.length * 0.13 + 0.25 - revealT - tStart;
          if (isLast && el < 0) cellBox(c, x, y, row.j[i], null);
          else if (isLast && el < 0.25) cellBox(c, x, y, row.j[i], el < 0.125 ? null : row.r[i], el / 0.25);
          else cellBox(c, x, y, row.j[i], row.r[i]);
        } else cellBox(c, x, y, isCur ? cur[i] : '', null);
      }
      // 만들어지는 글자 미리보기
      var wtxt = row ? row.w : '';
      if (isCur && cur.length) { var part = cur.slice(); while (part.length && !compose(part)) part.pop(); wtxt = part.length ? compose(part) : ''; }
      if (wtxt) { c.fillStyle = row ? 'rgba(255,255,255,.55)' : 'rgba(125,255,155,.8)'; c.font = '800 20px "Pretendard Variable",system-ui'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(wtxt, bx + cells.length * (CW + CG) + 4, y + CW / 2); }
    }
    // 안내 문구
    c.textAlign = 'center'; c.textBaseline = 'middle';
    var line = msgT > 0 ? msg : phase === 'play' ? (daily ? '오늘의 단어 · ' : '') + '자모 ' + cells.length + '칸 · 2글자 낱말' : '';
    c.fillStyle = msgT > 0 ? '#ffe9a8' : 'rgba(200,255,215,.6)'; c.font = '700 18px "Pretendard Variable",system-ui'; c.fillText(line, W / 2, BY + 6 * RH + 14);
    // 자판
    keyRects().forEach(function (k) {
      var st = keyState[k.k], lbl = k.k === 'SH' ? '쌍' : k.k === 'BS' ? '⌫' : k.k === 'OK' ? '입력' : (shift && SHIFT[k.k] ? SHIFT[k.k] : k.k);
      c.fillStyle = k.k === 'OK' ? (cur.length === cells.length ? '#7dff9b' : 'rgba(125,255,155,.25)') : k.k === 'SH' && shift ? '#7dff9b' : st == null ? 'rgba(255,255,255,.12)' : st < 0 ? '#1d1d24' : COL[st];
      if (st === 0) c.fillStyle = '#121216';
      A.rr(c, k.x, k.y, k.w, k.h, 10); c.fill();
      c.fillStyle = k.k === 'OK' && cur.length === cells.length ? '#04170a' : k.k === 'SH' && shift ? '#04170a' : st === 0 ? 'rgba(255,255,255,.22)' : '#ffffff';
      c.font = '800 ' + (k.k === 'OK' ? 24 : 24) + 'px "Pretendard Variable",system-ui'; c.fillText(lbl, k.x + k.w / 2, k.y + k.h / 2 + 1);
    });
    c.textBaseline = 'alphabetic';
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var lastHud = '';
  function hud() {
    var k = score + '|' + tries + '|' + streak; if (k === lastHud) return; lastHud = k;
    document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = Math.min(6, tries + (phase === 'play' ? 1 : 0)) + '/6'; document.getElementById('hC').textContent = streak;
    document.getElementById('hMult').textContent = streak > 1 ? '×' + Math.min(3, 1 + (streak - 1) * 0.1).toFixed(1) : '';
  }

  // ---------- 입력 ----------
  function pressKey(k) { if (k === 'SH') { shift = !shift; A.sfx('tick'); } else if (k === 'BS') backspace(); else if (k === 'OK') submit(); else typeJamo(k); }
  document.getElementById('stage').addEventListener('click', function (e) {
    if (S.state !== 'playing' || !cells) return; var p = S.toLocal(e), ks = keyRects();
    for (var i = 0; i < ks.length; i++) { var k = ks[i]; if (p.x > k.x - 3 && p.x < k.x + k.w + 3 && p.y > k.y - 3 && p.y < k.y + k.h + 3) { pressKey(k.k); A.vibrate(6); return; } }
  });
  // 2벌식 자판을 직접 처리(운영체제 한/영 상태와 관계없이 같은 자리 = 같은 자모). P·M·F 키도 글자로 씀
  window.addEventListener('keydown', function (e) {
    if (S.state !== 'playing' || !cells || e.ctrlKey || e.metaKey || e.altKey) return;
    var j = CODE[e.code];
    if (j) { e.preventDefault(); e.stopImmediatePropagation(); if (e.shiftKey && SHIFT[j]) j = SHIFT[j]; typeJamo(j); return; }
    if (e.key === 'Backspace') { e.preventDefault(); e.stopImmediatePropagation(); backspace(); return; }
    if (e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); submit(); }
  }, true);
  // 이 게임에서는 P·M·F가 자모(ㅔ·ㅡ·ㄹ)이므로 안내 문구를 바꿈
  Array.prototype.forEach.call(document.querySelectorAll('.k-only'), function (el) { if (/일시정지/.test(el.textContent) && el.querySelector('kbd') && el.querySelector('kbd').textContent === 'P') el.innerHTML = '<kbd>Esc</kbd> 일시정지 · 소리·전체 화면은 위 단추'; });
  var dbtns = document.querySelectorAll('[data-diff]');
  function paintDiff() { dbtns.forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-diff') === mode); }); }
  dbtns.forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); mode = +b.getAttribute('data-diff'); A.set('neowa_hangul_mode', mode); A.sfx('click'); paintDiff(); }); });
  paintDiff();
  var S = new A.Shell({ id: 'hangul', W: W, H: H, reset: reset, update: update, idle: function (dt) { tim += dt; fx.update(dt); }, render: render });
})();
