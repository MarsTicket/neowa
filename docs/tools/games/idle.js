(function () {
  'use strict';
  // 네온 공장: 탭해서 에너지를 모으고 기계를 사서 자동 생산. 100만을 넘기면 프레스티지로 영구 배율
  var A = Arcade, W = 540, H = 960, KEY = 'neowa_idle_save';
  var M = [
    { n: '반딧불 전지', base: 15, ps: 0.2, col: '#c3ff5e' }, { n: '바람개비', base: 110, ps: 1.2, col: '#7dff9b' },
    { n: '물레방아', base: 1200, ps: 9, col: '#5ee7ff' }, { n: '번개 수집기', base: 13000, ps: 50, col: '#7aa2ff' },
    { n: '지열 펌프', base: 140000, ps: 280, col: '#b48cff' }, { n: '핵융합로', base: 1.6e6, ps: 1500, col: '#ff7ad9' },
    { n: '별빛 망원경', base: 2.2e7, ps: 8200, col: '#ffd166' }, { n: '블랙홀 발전소', base: 3.4e8, ps: 47000, col: '#ff7a45' }
  ];
  var TH = [10, 25, 50, 100];
  var fx = new A.FX();
  var st, tapTimes = [], saveT = 0, pulse = 0, floats = [], offlineMsg = null, tim = 0;

  // ---------- 숫자 표기 ----------
  var UNITS = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  function big(n) {
    if (!isFinite(n)) return '∞'; if (n < 1000) return n < 10 && n % 1 ? n.toFixed(1) : String(Math.floor(n));
    var e = Math.min(UNITS.length - 1, Math.floor(Math.log10(n) / 3)), v = n / Math.pow(1000, e);
    return (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)) + UNITS[e];
  }

  // ---------- 상태·저장 ----------
  function fresh(keep) {
    return { e: 0, run: 0, life: keep ? keep.life : 0, own: [0, 0, 0, 0, 0, 0, 0, 0], up: {}, tapLv: 0, pp: keep ? keep.pp : 0, t: Date.now(), taps: keep ? keep.taps : 0 };
  }
  function load() {
    var raw = A.get(KEY, ''), s = null;
    try { s = raw ? JSON.parse(raw) : null; } catch (e) { s = null; }
    if (!s || typeof s.e !== 'number' || !s.own || s.own.length !== 8 || !isFinite(s.e)) s = fresh(); // 깨진 저장은 새로 시작
    s.up = s.up || {}; s.pp = +s.pp || 0; s.life = +s.life || 0; s.run = +s.run || 0; s.tapLv = +s.tapLv || 0; s.taps = +s.taps || 0;
    return s;
  }
  function save() { st.t = Date.now(); A.set(KEY, JSON.stringify(st)); }
  function mult() { return 1 + st.pp * 0.1; }
  function machinePs(i) { var m = 1; TH.forEach(function (t, k) { if (st.up[i + '_' + k]) m *= 2; }); return M[i].ps * m * mult(); }
  function perSec() { var s = 0; for (var i = 0; i < 8; i++) s += st.own[i] * machinePs(i); return s; }
  function tapPower() { return Math.max(1, Math.pow(2, st.tapLv) * mult() + perSec() * 0.01 * st.tapLv); }
  function cost(i) { return Math.ceil(M[i].base * Math.pow(1.15, st.own[i])); }
  function gain(v) { st.e += v; st.run += v; st.life += v; }
  function scoreNow() { return st.life >= 1 ? Math.min(100000, Math.floor(Math.log10(st.life) * 1000)) : 0; }
  function ppGain() { return Math.floor(Math.sqrt(st.run / 1e6)); }
  function upgrades() {
    // 살 수 있는(조건을 채운) 업그레이드 목록, 싼 것부터
    var out = [];
    for (var i = 0; i < 8; i++) TH.forEach(function (t, k) { var id = i + '_' + k; if (!st.up[id] && st.own[i] >= t) out.push({ id: id, n: M[i].n + ' ×2', c: M[i].base * 12 * t * (k + 1), col: M[i].col }); });
    var tc = 100 * Math.pow(12, st.tapLv); if (st.run >= tc / 3 || st.tapLv === 0) out.push({ id: 'tap', n: '탭 힘 ×2', c: tc, col: '#ffffff' });
    return out.sort(function (a, b) { return a.c - b.c; });
  }

  // ---------- 행동 ----------
  function tap(x, y) {
    var now = performance.now(); tapTimes = tapTimes.filter(function (t) { return now - t < 1000; });
    if (tapTimes.length >= 15) return; // 연타 매크로 방지: 초당 15회까지만
    tapTimes.push(now); var v = tapPower(); gain(v); st.taps++; pulse = 1;
    floats.push({ x: x + A.rand(-20, 20), y: y, v: '+' + big(v), t: 0.9 });
    fx.burst(x, y, '#c3ff5e', 6, 180, 0.35, 2.2); A.sfx('tap', 1 + Math.random() * 0.2); A.vibrate(5); hud();
  }
  function buy(i) {
    var c = cost(i); if (st.e < c) { A.sfx('wrong'); return; }
    st.e -= c; st.own[i]++; var r = rowRect(i); fx.burst(r.x + 30, r.y + r.h / 2, M[i].col, 10, 160, 0.35, 2); A.sfx('chip');
    if ([1, 10, 25, 50, 100].indexOf(st.own[i]) >= 0 && st.own[i] > 1) A.sfx('gold');
    if ([1, 10, 25, 50, 100].indexOf(st.own[i]) >= 0 && st.own[i] > 1) S.banner(M[i].n + ' ' + st.own[i] + '대', '업그레이드가 열렸어요');
    hud();
  }
  function buyUp() {
    var u = upgrades()[0]; if (!u) return; if (st.e < u.c) { A.sfx('wrong'); return; }
    st.e -= u.c; if (u.id === 'tap') st.tapLv++; else st.up[u.id] = 1; A.sfx('power'); fx.flashIt('#c3ff5e', 0.15); hud();
  }
  function prestige() {
    var g = ppGain(); if (g < 1) return;
    var keep = { life: st.life, pp: st.pp + g, taps: st.taps }; st = fresh(keep); save();
    S.banner('프레스티지 +' + g, '이제 모든 생산 ×' + mult().toFixed(1)); A.sfx('level'); fx.flashIt('#ffffff', 0.5); fx.burst(W / 2, 300, '#c3ff5e', 60, 500, 1, 4); hud();
  }
  function saveRecord() { save(); S.gameOver(scoreNow(), [['누적 생산', big(st.life)], ['초당 생산', big(perSec())], ['프레스티지', String(st.pp)]], { title: '기록 저장!', win: true }); }

  // ---------- 진행 ----------
  function reset() {
    st = load(); floats = []; fx.clear();
    var away = Math.min(8 * 3600, Math.max(0, (Date.now() - (st.t || Date.now())) / 1000));
    if (away > 30 && perSec() > 0) { var g = perSec() * away; gain(g); offlineMsg = { t: 6, s: '어서 오세요! 자리 비운 ' + fmtTime(away) + ' 동안 ' + big(g) + ' 생산' }; A.sfx('coin'); }
    save(); hud();
  }
  function fmtTime(s) { var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? h + '시간 ' + m + '분' : m + '분'; }
  function update(dt) {
    tim += dt; fx.update(dt); pulse = Math.max(0, pulse - dt * 4);
    gain(perSec() * dt);
    floats.forEach(function (f) { f.t -= dt; f.y -= 60 * dt; }); floats = floats.filter(function (f) { return f.t > 0; });
    if (offlineMsg) { offlineMsg.t -= dt; if (offlineMsg.t <= 0) offlineMsg = null; }
    saveT += dt; if (saveT > 5) { saveT = 0; save(); }
    if (Math.floor(tim * 4) !== Math.floor((tim - dt) * 4)) hud();
  }

  // ---------- 그리기 ----------
  var CX = 270, CY = 300, CR = 104, LY = 452, RH = 50;
  function rowRect(i) { return { x: 18, y: LY + i * (RH + 4), w: 504, h: RH }; }
  var UB = { x: 18, y: 890, w: 504, h: 56 }, SB = { x: 400, y: 118, w: 122, h: 40 }, PB = { x: 18, y: 118, w: 150, h: 40 };
  function render(c, t) {
    if (!st) st = load();
    c.fillStyle = '#081004'; c.fillRect(0, 0, W, H);
    var o = fx.offset(); c.save(); c.translate(o[0], o[1]);
    // 에너지
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#e9ffc8'; c.font = '900 44px "Pretendard Variable",system-ui'; c.fillText(big(st.e), W / 2, 178);
    c.fillStyle = 'rgba(195,255,94,.8)'; c.font = '700 17px "Pretendard Variable",system-ui'; c.fillText('초당 ' + big(perSec()) + ' · 탭당 ' + big(tapPower()) + (st.pp ? ' · 배율 ×' + mult().toFixed(1) : ''), W / 2, 212);
    // 에너지 코어
    var r = CR * (1 + pulse * 0.06 + Math.sin(t * 2) * 0.015);
    for (var k = 3; k >= 1; k--) { c.fillStyle = 'rgba(195,255,94,' + (0.05 * k) + ')'; c.beginPath(); c.arc(CX, CY + 20, r + k * 14, 0, Math.PI * 2); c.fill(); }
    var g = c.createRadialGradient(CX - 25, CY - 5, 10, CX, CY + 20, r); g.addColorStop(0, '#f6ffd8'); g.addColorStop(0.35, '#c3ff5e'); g.addColorStop(1, '#2f5a00');
    c.fillStyle = g; c.beginPath(); c.arc(CX, CY + 20, r, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(8,16,4,.35)'; c.lineWidth = 3;
    for (k = 0; k < 6; k++) { var a = t * 0.6 + k * Math.PI / 3; c.beginPath(); c.arc(CX, CY + 20, r * 0.62, a, a + 0.6); c.stroke(); }
    c.fillStyle = '#172400'; c.font = '900 22px "Pretendard Variable",system-ui'; c.fillText('TAP!', CX, CY + 22);
    floats.forEach(function (f) { c.globalAlpha = Math.min(1, f.t * 2); c.fillStyle = '#ffffff'; c.font = '800 22px "Pretendard Variable",system-ui'; c.fillText(f.v, f.x, f.y); }); c.globalAlpha = 1;
    // 위 단추: 기록 저장 / 프레스티지
    c.fillStyle = 'rgba(195,255,94,.16)'; A.rr(c, SB.x, SB.y, SB.w, SB.h, 12); c.fill(); c.fillStyle = '#c3ff5e'; c.font = '800 16px "Pretendard Variable",system-ui'; c.fillText('기록 저장', SB.x + SB.w / 2, SB.y + SB.h / 2 + 1);
    var pg = ppGain();
    c.fillStyle = pg ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.07)'; A.rr(c, PB.x, PB.y, PB.w, PB.h, 12); c.fill();
    c.fillStyle = pg ? '#172400' : 'rgba(255,255,255,.4)'; c.font = '800 15px "Pretendard Variable",system-ui'; c.fillText(pg ? '프레스티지 +' + pg : '프레스티지 ' + Math.min(100, Math.floor(st.run / 1e4)) + '%', PB.x + PB.w / 2, PB.y + PB.h / 2 + 1);
    // 기계 목록
    for (var i = 0; i < 8; i++) {
      var rr = rowRect(i), cs = cost(i), can = st.e >= cs, seen = st.own[i] > 0 || st.life >= M[i].base * 0.4 || i === 0;
      c.fillStyle = can ? 'rgba(195,255,94,.14)' : 'rgba(255,255,255,.05)'; A.rr(c, rr.x, rr.y, rr.w, rr.h, 12); c.fill();
      if (can) { c.strokeStyle = M[i].col; c.lineWidth = 2; A.rr(c, rr.x + 1, rr.y + 1, rr.w - 2, rr.h - 2, 11); c.stroke(); }
      c.fillStyle = seen ? M[i].col : '#333'; c.beginPath(); c.arc(rr.x + 26, rr.y + rr.h / 2, 13, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#081004'; c.font = '900 14px "Pretendard Variable",system-ui'; c.fillText(String(i + 1), rr.x + 26, rr.y + rr.h / 2 + 1);
      c.textAlign = 'left'; c.fillStyle = seen ? '#ffffff' : 'rgba(255,255,255,.3)'; c.font = '800 17px "Pretendard Variable",system-ui';
      c.fillText(seen ? M[i].n : '???', rr.x + 50, rr.y + 17);
      c.fillStyle = 'rgba(255,255,255,.5)'; c.font = '700 13px "Pretendard Variable",system-ui'; c.fillText(seen ? st.own[i] + '대 · 대당 초당 ' + big(machinePs(i)) : '더 모으면 열려요', rr.x + 50, rr.y + 36);
      c.textAlign = 'right'; c.fillStyle = can ? '#e9ffc8' : 'rgba(255,255,255,.4)'; c.font = '800 17px "Pretendard Variable",system-ui'; c.fillText(big(cs), rr.x + rr.w - 14, rr.y + rr.h / 2 + 1);
      c.textAlign = 'center';
    }
    // 업그레이드 단추
    var u = upgrades()[0];
    c.fillStyle = u && st.e >= u.c ? '#c3ff5e' : 'rgba(255,255,255,.07)'; A.rr(c, UB.x, UB.y, UB.w, UB.h, 14); c.fill();
    c.fillStyle = u && st.e >= u.c ? '#172400' : 'rgba(255,255,255,.55)'; c.font = '800 18px "Pretendard Variable",system-ui';
    c.fillText(u ? '업그레이드 (U) · ' + u.n + ' · ' + big(u.c) : '기계를 10대 모으면 업그레이드가 열려요', W / 2, UB.y + UB.h / 2 + 1);
    if (offlineMsg) { c.fillStyle = 'rgba(0,0,0,.7)'; A.rr(c, 40, 404, 460, 40, 12); c.fill(); c.fillStyle = '#ffd166'; c.font = '800 16px "Pretendard Variable",system-ui'; c.fillText(offlineMsg.s, W / 2, 425); }
    c.textBaseline = 'alphabetic';
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var lastHud = '';
  function hud() {
    if (!st) return; var k = scoreNow() + '|' + big(perSec()) + '|' + st.pp; if (k === lastHud) return; lastHud = k;
    document.getElementById('hA').textContent = A.fmt(scoreNow()); document.getElementById('hB').textContent = big(perSec()); document.getElementById('hC').textContent = st.pp;
    document.getElementById('hMult').textContent = '';
  }

  // ---------- 입력 ----------
  function inR(p, b) { return p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing') return; var p = S.toLocal(e);
    if (Math.hypot(p.x - CX, p.y - CY - 20) < CR + 16) { e.preventDefault(); tap(p.x, p.y); return; }
    if (inR(p, SB)) { saveRecord(); return; }
    if (inR(p, PB)) { prestige(); return; }
    if (inR(p, UB)) { buyUp(); return; }
    for (var i = 0; i < 8; i++) if (inR(p, rowRect(i))) { buy(i); return; }
  });
  window.addEventListener('pagehide', function () { if (st) save(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && st) save(); });
  var S = new A.Shell({
    id: 'idle', W: W, H: H, reset: reset, update: update, idle: function (dt) { tim += dt; fx.update(dt); }, render: render,
    keydown: function (e) {
      var k = e.key;
      if (k === ' ') { if (!e.repeat) tap(CX + A.rand(-50, 50), CY + A.rand(-30, 40)); }
      else if (k >= '1' && k <= '8') buy(+k - 1);
      else if (k === 'u' || k === 'U') buyUp();
    }
  });
})();
