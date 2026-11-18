/* 너와 아케이드: 그래픽 보강 (모든 게임 공통)
   arcade.js 가 알아서 불러옵니다. 이 파일이 없거나 오류가 나도 게임은 원래 모습으로 돌아갑니다.
   - 품질 3단계(A.gfx.level): 2 높음 / 1 보통 / 0 낮음. 기기를 보고 정하고, 느려지면 자동으로 낮춥니다.
     강제로 정하려면 localStorage 'neowa_gfx' 에 'hi' / 'mid' / 'lo'
   - 파티클: 속도 방향으로 늘어나는 불꽃 꼬리, 충격파 섬광, 빛나는 점수 글자
   - 화면: 빛 번짐(블룸, 높음만), 비네트(가장자리 어둡게), 가장자리 번쩍임 피격 효과
   - 연출: 큰 충격 때 아주 짧은 슬로모션(타격감), 시작·종료 화면 등장 애니메이션 */
(function () {
  'use strict';
  var A = window.Arcade;
  if (!A || !A.FX || A.gfx) return;

  /* ---------- 품질 단계 ---------- */
  var ua = navigator.userAgent || '';
  var tesla = /Tesla\//.test(ua);
  var mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
  var forced = A.get('neowa_gfx', '');
  var level = forced === 'lo' ? 0 : forced === 'mid' ? 1 : forced === 'hi' ? 2
    : (mem <= 2 || cores <= 2) ? 0 : (tesla || mem <= 3 || cores <= 4) ? 1 : 2;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 게임별 빛 번짐 세기 (밝은 배경 게임은 약하게, 글자·숫자 위주 퍼즐은 끔)
  var BLOOM = {
    tower: 0.25, jumper: 0.3, fishy: 0.35, keeper: 0.35, baseball: 0, sudoku: 0, nonogram: 0, math: 0,
    stroop: 0, schulte: 0, solitaire: 0.15, blackjack: 0.2, baduk: 0, gomoku: 0.15, reversi: 0.2, mines: 0.2,
    slide: 0.2, lights: 0.4, memory: 0.3, oddcolor: 0, pairs: 0.2, dots: 0.3, reaction: 0.3
  };

  A.gfx = {
    get level() { return level; },
    tesla: tesla,
    forced: !!forced, // 직접 정한 품질이면 자동으로 낮추지 않음
    set: function (l) { level = A.clamp(l, 0, 2); apply(); },
    // 게임 코드가 쓸 수 있는 도우미: 품질에 맞춘 파티클 수
    n: function (k) { return Math.max(1, Math.round(k * (level === 2 ? 1 : level === 1 ? 0.7 : 0.4))); }
  };
  function apply() {
    A.dprCap = level === 0 ? 1.5 : level === 1 ? 2 : 2.5;
    document.documentElement.setAttribute('data-gfx', String(level));
    if (A.shell && A.shell.fit) A.shell.fit();
  }

  /* ---------- 파티클 그리기 (기존 FX를 그대로 쓰면서 모양만 바꿈) ---------- */
  var P = A.FX.prototype;
  var baseBurst = P.burst, baseShake = P.shake;
  P.burst = function (x, y, color, n, spd, life, size) {
    baseBurst.call(this, x, y, color, level === 0 ? Math.ceil(n * 0.5) : n, spd, life, size);
    // 큰 폭발에는 가운데 섬광 하나 (높음/보통)
    if (level > 0 && n >= 18 && spd >= 250) this.rings.push({ x: x, y: y, c: color, r: Math.min(140, spd * 0.28), life: 0.28, max: 0.28, core: 1 });
    var cap = level === 2 ? 700 : level === 1 ? 420 : 220;
    if (this.p.length > cap) this.p.splice(0, this.p.length - cap);
  };
  P.shake = function (a, t) {
    baseShake.call(this, a, t);
    // 아주 큰 충격(피격·폭발)에는 0.09초 슬로모션으로 '쾅' 하는 느낌
    if (a >= 12 && !reduce && A.shell && A.shell.slow) A.shell.slow(0.3, 0.09);
  };

  // 3D 게임: 게임 좌표 → 화면 좌표 바꾸기(fx.map). 3D가 꺼져 있으면 그대로
  var M = [0, 0, 1];
  function mp(fx, x, y) {
    if (fx.map && A.G3D && A.G3D.on) { var r = fx.map(x, y); M[0] = r[0]; M[1] = r[1]; M[2] = r[2] == null ? 1 : r[2]; }
    else { M[0] = x; M[1] = y; M[2] = 1; }
    return M;
  }
  P.draw = function (ctx) {
    var i, q, t, n = this.p.length, streak = level > 0, hot = level === 2 ? n < 360 : n < 160, m, qx, qy, qs;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < n; i++) {
      q = this.p[i]; t = q.life / q.max;
      m = mp(this, q.x, q.y); qx = m[0]; qy = m[1]; qs = m[2];
      var spr = A.glowDot(q.c, 4), sc = (q.r / 4) * (0.5 + t * 0.5) * qs;
      ctx.globalAlpha = t;
      var sp = streak ? Math.abs(q.vx) + Math.abs(q.vy) : 0;
      if (sp > 90) {
        // 빠른 불티는 날아가는 방향으로 길게 (불꽃 꼬리)
        var len = Math.min(4.5, 1 + sp / 160);
        ctx.save(); ctx.translate(qx, qy); ctx.rotate(Math.atan2(q.vy, q.vx));
        var w = spr.w * sc, h = spr.h * sc;
        ctx.drawImage(spr, -w * len * 0.75, -h / 2, w * len, h);
        if (hot && t > 0.55) { ctx.globalAlpha = (t - 0.55) * 2; var s2 = A.glowDot('#ffffff', 4); ctx.drawImage(s2, -w * len * 0.4, -h / 4, w * len * 0.5, h / 2); }
        ctx.restore();
      } else {
        A.draw(ctx, spr, qx, qy, sc);
        if (hot && t > 0.6) { ctx.globalAlpha = (t - 0.6) * 2; A.draw(ctx, A.glowDot('#ffffff', 4), qx, qy, q.r / 8 * qs); }
      }
    }
    for (i = 0; i < this.rings.length; i++) {
      q = this.rings[i]; t = 1 - q.life / q.max;
      m = mp(this, q.x, q.y); qx = m[0]; qy = m[1]; qs = m[2];
      if (q.core) {
        // 폭발 가운데 섬광: 크게 번쩍였다 빠르게 사라짐
        ctx.globalAlpha = (1 - t) * (1 - t) * 0.9;
        A.draw(ctx, A.glowDot(q.c, 10), qx, qy, (q.r / 30) * (0.6 + t * 0.8) * qs);
        ctx.globalAlpha = (1 - t) * (1 - t) * 0.7;
        A.draw(ctx, A.glowDot('#ffffff', 10), qx, qy, (q.r / 60) * (0.6 + t) * qs);
        continue;
      }
      var rr = q.r * (0.2 + (1 - (1 - t) * (1 - t)) * 0.8) * qs;
      ctx.strokeStyle = q.c;
      ctx.globalAlpha = (1 - t) * 0.22; ctx.lineWidth = 12 * (1 - t) + 2; ctx.beginPath(); ctx.arc(qx, qy, rr, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = (1 - t) * 0.85; ctx.lineWidth = 2.5 * (1 - t) + 0.8; ctx.beginPath(); ctx.arc(qx, qy, rr, 0, Math.PI * 2); ctx.stroke();
      if (level === 2 && t < 0.5) { ctx.globalAlpha = (0.5 - t) * 0.9; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(qx, qy, rr * 0.96, 0, Math.PI * 2); ctx.stroke(); }
    }
    ctx.restore();
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (i = 0; i < this.texts.length; i++) {
      q = this.texts[i]; t = q.life / q.max;
      var age = q.max - q.life, pop = age < 0.12 ? 1.35 - age / 0.12 * 0.35 : 1;
      ctx.globalAlpha = Math.min(1, t * 2.5);
      m = mp(this, q.x, q.y);
      ctx.save(); ctx.translate(m[0], m[1]); if (pop !== 1) ctx.scale(pop, pop);
      ctx.font = '700 ' + q.z + 'px "Chakra Petch", system-ui, sans-serif'; ctx.lineJoin = 'round';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.strokeText(q.s, 0, 1.5);
      if (level > 0 && q.c.charAt(0) === '#') {
        // 같은 색 글자를 한 번 더 겹쳐 빛나는 느낌 (shadowBlur 없이)
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.35; ctx.fillStyle = q.c;
        ctx.fillText(q.s, -1, 0); ctx.fillText(q.s, 1, 0); ctx.fillText(q.s, 0, -1); ctx.fillText(q.s, 0, 1);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = Math.min(1, t * 2.5);
      }
      ctx.fillStyle = q.c; ctx.fillText(q.s, 0, 0);
      if (level > 0 && age < 0.2) { ctx.globalAlpha = (0.2 - age) * 4; ctx.fillStyle = '#fff'; ctx.fillText(q.s, 0, 0); }
      ctx.restore();
    }
    ctx.restore();
  };

  // 피격 번쩍임: 화면 전체를 덮는 대신 가장자리가 더 강하게 (게임판이 덜 가려짐)
  var flashCache = {};
  P.drawFlash = function (ctx, W, H) {
    if (this.flash <= 0) return;
    var key = this.flashC + W + 'x' + H, spr = flashCache[key];
    if (!spr) {
      spr = document.createElement('canvas'); spr.width = 128; spr.height = Math.round(128 * H / W);
      var x = spr.getContext('2d'), g = x.createRadialGradient(64, spr.height / 2, 10, 64, spr.height / 2, Math.max(64, spr.height / 2) * 1.15);
      g.addColorStop(0, A.hexA(this.flashC.charAt(0) === '#' && this.flashC.length === 7 ? this.flashC : '#ffffff', 0.25));
      g.addColorStop(1, this.flashC.charAt(0) === '#' && this.flashC.length === 7 ? this.flashC : '#ffffff');
      x.fillStyle = g; x.fillRect(0, 0, 128, spr.height);
      flashCache[key] = spr;
    }
    ctx.save(); ctx.globalAlpha = Math.min(1, this.flash * 0.75); ctx.drawImage(spr, 0, 0, W, H); ctx.restore();
  };

  /* ---------- 화면 후처리: 빛 번짐(블룸) + 프레임 감시 ---------- */
  var b1 = document.createElement('canvas'), x1 = b1.getContext('2d');
  var b2 = document.createElement('canvas'), x2 = b2.getContext('2d');
  var slowAcc = 0, fastAcc = 0, ftAvg = 16.7, lastNow = 0, frames = 0;
  A.post = function (c, S) {
    var now = performance.now();
    if (lastNow) {
      var ft = now - lastNow; frames++;
      if (ft < 250) ftAvg += (ft - ftAvg) * 0.05; // 탭 전환 등 긴 멈춤은 무시
      // 플레이 중 계속 느리면(평균 26ms 이상 = 38fps 미만이 4초) 한 단계 낮춤
      if (S.state === 'playing' && frames > 90 && ftAvg > 26) { slowAcc += ft; if (slowAcc > 4000 && level > 0 && !forced) { level--; slowAcc = 0; frames = 0; ftAvg = 16.7; apply(); } }
      else slowAcc = Math.max(0, slowAcc - ft);
      void fastAcc;
    }
    lastNow = now;
    var k = S.cfg.bloom != null ? S.cfg.bloom : BLOOM[S.id] != null ? BLOOM[S.id] : 0.5;
    if (level < 2 || !k) return;
    var cv = S.canvas, w = cv.width, h = cv.height; if (!w || !h) return;
    var sw = Math.max(8, Math.round(w / 6)), sh = Math.max(8, Math.round(h / 6));
    if (b1.width !== sw || b1.height !== sh) { b1.width = sw; b1.height = sh; b2.width = Math.max(4, sw >> 1); b2.height = Math.max(4, sh >> 1); }
    // 1) 작게 줄여 복사 → 2) 자기 자신과 곱해 밝은 곳만 남김(어두운 곳은 0에 가까워짐) → 3) 더 작게 한 번 더(넓게 번짐)
    x1.globalCompositeOperation = 'copy'; x1.globalAlpha = 1;
    x1.drawImage(cv, 0, 0, sw, sh);
    x1.globalCompositeOperation = 'multiply'; x1.drawImage(b1, 0, 0); x1.drawImage(b1, 0, 0);
    x2.globalCompositeOperation = 'copy'; x2.drawImage(b1, 0, 0, b2.width, b2.height);
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'lighter'; c.imageSmoothingEnabled = true;
    c.globalAlpha = 0.55 * k; c.drawImage(b1, 0, 0, w, h);
    c.globalAlpha = 0.8 * k; c.drawImage(b2, 0, 0, w, h);
    c.restore();
  };

  /* ---------- 화면 장식(CSS): 비네트, 등장 애니메이션 ---------- */
  var css = '' +
    '.g-vfx{position:absolute;top:0;right:0;bottom:0;left:0;pointer-events:none;border-radius:inherit;' +
    'background:radial-gradient(120% 90% at 50% 45%,rgba(0,0,0,0) 62%,rgba(0,0,0,.34) 100%);' +
    'box-shadow:inset 0 0 0 1px rgba(255,255,255,.05),inset 0 1px 0 rgba(255,255,255,.08)}' +
    'html[data-gfx="2"] .g-vfx::after,html[data-gfx="1"] .g-vfx::after{content:"";position:absolute;top:0;right:0;bottom:0;left:0;border-radius:inherit;' +
    'background:linear-gradient(160deg,rgba(255,255,255,.06),rgba(255,255,255,0) 28%)}' +
    // 시작 화면: 글자가 차례로 떠오름
    '@keyframes gfxUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}' +
    '@keyframes gfxZoom{from{opacity:0;transform:scale(.6)}60%{opacity:1;transform:scale(1.08)}to{transform:scale(1)}}' +
    '@keyframes gfxGlow{50%{text-shadow:0 0 46px rgba(var(--ar),.95),0 0 12px rgba(255,255,255,.35)}}' +
    'html[data-gfx]:not([data-gfx="0"]) body[data-state="ready"] #ovStart>*{animation:gfxUp .55s cubic-bezier(.2,.9,.3,1) both}' +
    'html[data-gfx]:not([data-gfx="0"]) body[data-state="ready"] #ovStart>.ov-start-btn{animation:gfxUp .55s cubic-bezier(.2,.9,.3,1) .32s both,breathe 1.8s ease-in-out .9s infinite}' +
    'body[data-state="ready"] #ovStart>:nth-child(2){animation-delay:.06s}body[data-state="ready"] #ovStart>:nth-child(3){animation-delay:.12s}' +
    'body[data-state="ready"] #ovStart>:nth-child(4){animation-delay:.18s}body[data-state="ready"] #ovStart>:nth-child(5){animation-delay:.24s}' +
    'body[data-state="ready"] #ovStart>:nth-child(n+7){animation-delay:.4s}' +
    'html[data-gfx]:not([data-gfx="0"]) body[data-state="ready"] #ovStart .ov-title{animation:gfxUp .55s cubic-bezier(.2,.9,.3,1) .06s both,gfxGlow 3.2s ease-in-out 1s infinite}' +
    // 종료 화면: 점수가 튀어나오고, 나머지가 따라 올라옴
    'html[data-gfx]:not([data-gfx="0"]) body[data-state="over"] #ovOver .ov-score{animation:gfxZoom .6s cubic-bezier(.2,1.4,.4,1) .08s both}' +
    'html[data-gfx]:not([data-gfx="0"]) body[data-state="over"] #ovOver .ov-kick{animation:gfxUp .4s ease both}' +
    'html[data-gfx]:not([data-gfx="0"]) body[data-state="over"] #ovOver .ov-meta,html[data-gfx]:not([data-gfx="0"]) body[data-state="over"] #ovOver .ov-col{animation:gfxUp .5s cubic-bezier(.2,.9,.3,1) .35s both}' +
    'html[data-gfx]:not([data-gfx="0"]) body[data-state="paused"] #ovPause>*{animation:gfxUp .35s ease both}' +
    'html[data-gfx]:not([data-gfx="0"]) .g-banner.show b{animation:gfxZoom .5s cubic-bezier(.2,1.4,.4,1) both}' +
    '@media (prefers-reduced-motion:reduce){#ovStart>*,#ovOver *,#ovPause>*{animation:none!important}}';
  var st = document.createElement('style'); st.id = 'gfxCss'; st.textContent = css; document.head.appendChild(st);

  function mount() {
    var cv = document.getElementById('cv');
    if (cv && !document.querySelector('.g-vfx')) {
      var v = document.createElement('div'); v.className = 'g-vfx';
      cv.parentNode.insertBefore(v, cv.nextSibling);
    }
    apply();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
