(function () {
  'use strict';
  // 한글 타자 레이스: 떨어지는 낱말을 입력창에 쳐서(Enter·Space) 없애기. 바닥에 닿으면 목숨 −1
  var A = Arcade, W = 540, H = 960;
  var fx = new A.FX();
  var POOL = { 2: [], 3: [], 4: [], 5: [] }, ready = false;
  var words, lives, score, elapsed, spawnT, typed, strokes, combo, best, phase, tim = 0, count, mobile = false, flash = 0;

  // ---------- 낱말 ----------
  function jamoCount(w) {
    var n = 0;
    for (var i = 0; i < w.length; i++) { var c = w.charCodeAt(i) - 0xAC00; if (c < 0 || c > 11171) { n++; continue; } var jo = c % 28, ju = ((c - jo) / 28) % 21; n += 2 + (jo ? 1 : 0) + ([9, 10, 11, 14, 15, 16, 19].indexOf(ju) >= 0 ? 1 : 0); }
    return n;
  }
  function load() {
    var src = window.NEOWA_WORDS; if (!src) return;
    (src.words + ' ' + src.answers).split(' ').forEach(function (w) { var L = Math.min(5, w.length); if (L >= 2 && POOL[L].indexOf(w) < 0) POOL[L].push(w); });
    ready = true;
  }
  (function () { if (window.NEOWA_WORDS) { load(); return; } var s = document.createElement('script'); s.src = '../assets/arcade/hangul-words.js?v=1'; s.onload = load; document.head.appendChild(s); })();
  function pickWord() {
    // 시간이 지날수록 긴 낱말
    var lv = elapsed / 25, r = Math.random(), L = 2;
    if (lv > 0.6 && r < 0.45) L = 3; if (lv > 1.5 && r < 0.25) L = 4; if (lv > 2.5 && r < 0.12) L = 5;
    var p = POOL[L].length ? POOL[L] : POOL[2], w, tries = 0;
    do { w = p[Math.floor(Math.random() * p.length)]; tries++; } while (tries < 20 && words.some(function (o) { return o.w === w; }));
    return w;
  }
  function groundY() { return mobile ? 440 : 820; }
  function spawn() {
    var w = pickWord(); count++;
    var tw = w.length * 30 + 40, x = A.rand(20 + tw / 2, W - 20 - tw / 2);
    var sp = (mobile ? 20 : 34) + elapsed * (mobile ? 0.45 : 0.75);
    words.push({ w: w, x: x, y: 112, sp: sp * A.rand(0.85, 1.15), tw: tw, gold: count % 15 === 0, hit: 0 });
  }

  // ---------- 진행 ----------
  function reset() {
    mobile = document.body.classList.contains('touch');
    words = []; lives = 5; score = 0; elapsed = 0; spawnT = 0.6; typed = 0; strokes = 0; combo = 0; best = 0; phase = ready ? 'play' : 'wait'; count = 0; fx.clear(); hud();
    inp.value = ''; showInput(); setTimeout(function () { try { inp.focus(); } catch (e) {} }, 0);
  }
  function submit(v) {
    v = (v || '').replace(/\s+/g, '');
    if (!v || phase !== 'play' || S.state !== 'playing') return;
    var idx = -1, low = -1;
    words.forEach(function (o, i) { if (o.w === v && o.y > low) { low = o.y; idx = i; } });
    if (idx < 0) { combo = 0; flash = 0.3; A.sfx('hurt'); A.vibrate(15); fx.text(W / 2, groundY() - 20, '없는 낱말', '#ff8a9a', 20); hud(); return; }
    var o = words[idx]; words.splice(idx, 1);
    combo++; best = Math.max(best, combo); typed++; strokes += jamoCount(o.w);
    var mult = 1 + elapsed / 60, pts = Math.round(o.w.length * 10 * mult * (1 + Math.min(combo, 20) * 0.05)); score += pts;
    fx.burst(o.x, o.y, o.gold ? '#ffd166' : '#7aa2ff', o.gold ? 30 : 16, 260, 0.5, 3); fx.text(o.x, o.y - 18, '+' + pts, '#cfe0ff', 18);
    A.sfx(o.gold ? 'power' : 'coin', 1 + Math.min(combo, 10) * 0.03); A.vibrate(8);
    if (o.gold) {
      // 황금 낱말: 화면의 낱말을 모두 터뜨림
      words.forEach(function (q) { var p2 = Math.round(q.w.length * 10 * mult); score += p2; fx.burst(q.x, q.y, '#ffd166', 12, 220, 0.5, 2.5); });
      words = []; S.banner('황금 낱말!', '화면의 낱말을 모두 지웠어요'); fx.flashIt('#ffd166', 0.3);
    }
    hud();
  }
  function update(dt) {
    tim += dt; fx.update(dt); if (flash > 0) flash -= dt;
    if (phase === 'wait') { if (ready) phase = 'play'; return; }
    if (phase !== 'play') return;
    elapsed += dt; spawnT -= dt;
    var interval = Math.max(0.9, 2.6 - elapsed * 0.02) * (mobile ? 1.25 : 1);
    if (spawnT <= 0) { spawn(); spawnT = interval; }
    var gy = groundY();
    for (var i = words.length - 1; i >= 0; i--) {
      var o = words[i]; o.y += o.sp * dt;
      if (o.y >= gy) {
        words.splice(i, 1); lives--; combo = 0; fx.burst(o.x, gy, '#ff4d6d', 18, 240, 0.5, 3); fx.shake(6, 0.2); A.sfx('hurt'); A.vibrate(30); hud();
        if (lives <= 0) { phase = 'over'; hideInput(); S.gameOver(score, [['지운 낱말', String(typed)], ['분당 타수', String(wpm())], ['최고 연속', String(best)]]); return; }
      }
    }
    if (Math.floor(tim * 2) !== Math.floor((tim - dt) * 2)) hud();
  }
  function wpm() { return elapsed > 3 ? Math.round(strokes / (elapsed / 60)) : 0; }

  // ---------- 그리기 ----------
  function render(c, t) {
    c.fillStyle = '#050a1a'; c.fillRect(0, 0, W, H);
    var o = fx.offset(); c.save(); c.translate(o[0], o[1]);
    var gy = words ? groundY() : 820;
    // 배경 줄
    c.strokeStyle = 'rgba(122,162,255,.06)'; c.lineWidth = 1; for (var y = 130; y < gy; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    // 바닥선
    c.fillStyle = 'rgba(255,77,109,.18)'; c.fillRect(0, gy, W, 6); c.fillStyle = '#ff4d6d'; c.fillRect(0, gy, W, 2);
    if (!words) { c.restore(); return; }
    var v = (inp.value || '').replace(/\s+/g, '');
    c.textAlign = 'center'; c.textBaseline = 'middle';
    words.forEach(function (w) {
      var danger = A.clamp((w.y - 112) / (gy - 112), 0, 1), match = v && w.w.indexOf(v) === 0;
      var col = w.gold ? '#ffd166' : danger > 0.75 ? '#ff4d6d' : danger > 0.5 ? '#ffb27a' : '#7aa2ff';
      c.fillStyle = match ? 'rgba(122,162,255,.28)' : 'rgba(10,18,40,.85)'; A.rr(c, w.x - w.tw / 2, w.y - 22, w.tw, 44, 14); c.fill();
      c.strokeStyle = col; c.lineWidth = match ? 3 : 2; A.rr(c, w.x - w.tw / 2, w.y - 22, w.tw, 44, 14); c.stroke();
      c.font = '800 26px "Pretendard Variable",system-ui';
      if (match) {
        var full = c.measureText(w.w).width, done = c.measureText(v).width, x0 = w.x - full / 2;
        c.textAlign = 'left'; c.fillStyle = '#7dff9b'; c.fillText(v, x0, w.y + 1); c.fillStyle = '#ffffff'; c.fillText(w.w.slice(v.length), x0 + done, w.y + 1); c.textAlign = 'center';
      } else { c.fillStyle = '#ffffff'; c.fillText(w.w, w.x, w.y + 1); }
      if (w.gold) { c.fillStyle = '#ffd166'; c.font = '800 12px "Pretendard Variable",system-ui'; c.fillText('★ 황금', w.x, w.y - 30); }
    });
    // 목숨
    c.textAlign = 'left'; c.font = '800 20px "Pretendard Variable",system-ui';
    for (var i = 0; i < 5; i++) { c.fillStyle = i < lives ? '#ff4d6d' : 'rgba(255,77,109,.18)'; c.fillText('♥', 20 + i * 24, gy + 30); }
    c.textAlign = 'right'; c.fillStyle = 'rgba(207,224,255,.7)'; c.font = '700 16px "Pretendard Variable",system-ui';
    c.fillText(combo > 1 ? combo + '연속 · 속도 ×' + (1 + elapsed / 60).toFixed(1) : '속도 ×' + (1 + elapsed / 60).toFixed(1), W - 20, gy + 30);
    if (phase === 'wait') { c.textAlign = 'center'; c.fillStyle = '#7aa2ff'; c.fillText('낱말을 불러오는 중…', W / 2, 300); }
    if (flash > 0) { c.fillStyle = 'rgba(255,77,109,' + flash + ')'; c.fillRect(0, gy - 4, W, 10); }
    c.textBaseline = 'alphabetic';
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
    placeInput();
  }
  var lastHud = '';
  function hud() {
    var k = score + '|' + lives + '|' + wpm(); if (k === lastHud) return; lastHud = k;
    document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = lives; document.getElementById('hC').textContent = wpm();
    document.getElementById('hMult').textContent = '';
  }

  // ---------- 입력창(실제 input, 한글 입력기 사용) ----------
  var inp = document.createElement('input');
  inp.type = 'text'; inp.id = 'typeIn'; inp.setAttribute('autocomplete', 'off'); inp.setAttribute('autocorrect', 'off'); inp.setAttribute('autocapitalize', 'off'); inp.setAttribute('spellcheck', 'false');
  inp.setAttribute('enterkeyhint', 'done'); inp.setAttribute('lang', 'ko'); inp.setAttribute('aria-label', '낱말 입력'); inp.placeholder = '낱말을 치고 Enter';
  inp.style.cssText = 'position:fixed;z-index:30;display:none;box-sizing:border-box;border-radius:14px;border:2px solid #7aa2ff;background:rgba(6,15,42,.95);color:#fff;font:800 22px "Pretendard Variable",system-ui;text-align:center;outline:none;padding:0 12px;box-shadow:0 0 18px rgba(122,162,255,.35)';
  document.body.appendChild(inp);
  var lastPos = '';
  function placeInput() {
    if (inp.style.display === 'none') return;
    var cv = document.getElementById('cv'), r = cv.getBoundingClientRect(), s = r.width / W, gy = words ? groundY() : 820;
    var top = r.top + (gy + 50) * s, h = Math.max(40, 58 * s), left = r.left + 40 * s, w = r.width - 80 * s, key = [top, h, left, w].map(Math.round).join(',');
    if (key === lastPos) return; lastPos = key;
    inp.style.top = Math.round(top) + 'px'; inp.style.left = Math.round(left) + 'px'; inp.style.width = Math.round(w) + 'px'; inp.style.height = Math.round(h) + 'px'; inp.style.fontSize = Math.round(Math.max(16, 26 * s)) + 'px';
  }
  function showInput() { inp.style.display = 'block'; lastPos = ''; placeInput(); }
  function hideInput() { inp.style.display = 'none'; try { inp.blur(); } catch (e) {} }
  var pending = false;
  function doSubmit() { var v = inp.value; submit(v); setTimeout(function () { inp.value = ''; }, 0); }
  inp.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); S.togglePause(); return; }
    if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      if (e.isComposing || e.keyCode === 229) { pending = true; return; } // 조합 중이면 글자가 확정된 뒤 처리
      doSubmit();
    }
  });
  inp.addEventListener('compositionend', function () { if (pending) { pending = false; setTimeout(doSubmit, 0); } });
  inp.addEventListener('input', function () { if (/\s$/.test(inp.value)) doSubmit(); });
  document.getElementById('stage').addEventListener('click', function () { if (S.state === 'playing') try { inp.focus(); } catch (e) {} });
  var S = new A.Shell({ id: 'typing', W: W, H: H, reset: reset, update: update, idle: function (dt) { tim += dt; fx.update(dt); }, render: render });
  // 일시정지·끝나면 입력창 숨김, 다시 시작하면 보임
  setInterval(function () {
    if (S.state === 'playing' && phase !== 'over') { if (inp.style.display === 'none') { showInput(); try { inp.focus(); } catch (e) {} } }
    else if (inp.style.display !== 'none') hideInput();
  }, 150);
})();
