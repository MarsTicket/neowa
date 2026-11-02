/* 너와 아케이드: 게임 공통 엔진 (저장, 사운드, 이펙트, 화면 상태, 무대 크기) */
(function () {
  'use strict';
  var A = window.Arcade = {};

  /* ---------- 저장 ---------- */
  A.get = function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
  A.set = function (k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} };
  A.getInt = function (k) { return parseInt(A.get(k, '0'), 10) || 0; };
  A.fmt = function (n) { return Math.floor(n).toLocaleString('ko-KR'); };

  /* ---------- 사운드 (파일 없이 즉석 합성) ---------- */
  var ac = null, master = null, noiseBuf = null;
  var muted = A.get('neowa_mute', '0') === '1';
  function audio() {
    if (!ac) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ac = new C();
      master = ac.createGain(); master.gain.value = 0.32;
      var comp = ac.createDynamicsCompressor();
      master.connect(comp); comp.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function noise(c) {
    if (noiseBuf) return noiseBuf;
    noiseBuf = c.createBuffer(1, c.sampleRate * 0.6, c.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }
  function tone(o, p) {
    var c = audio(); if (!c) return;
    var t = c.currentTime + (o.at || 0), d = o.d || 0.1, v = o.v || 0.2;
    var g = c.createGain(), src;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    if (o.n) {
      src = c.createBufferSource(); src.buffer = noise(c);
      var f = c.createBiquadFilter(); f.type = 'lowpass';
      f.frequency.setValueAtTime(o.f, t);
      if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + d);
      src.connect(f); f.connect(g);
    } else {
      src = c.createOscillator(); src.type = o.w || 'square';
      src.frequency.setValueAtTime(o.f * p, t);
      if (o.f2) src.frequency.exponentialRampToValueAtTime(o.f2 * p, t + d);
      src.connect(g);
    }
    g.connect(master); src.start(t); src.stop(t + d + 0.03);
  }
  var SFX = {
    shoot: [{ w: 'square', f: 1400, f2: 500, d: 0.05, v: 0.035 }],
    hit: [{ w: 'square', f: 420, f2: 160, d: 0.06, v: 0.08 }],
    boom: [{ n: 1, f: 2400, f2: 90, d: 0.32, v: 0.32 }, { w: 'sine', f: 150, f2: 40, d: 0.28, v: 0.3 }],
    bigboom: [{ n: 1, f: 3000, f2: 60, d: 0.9, v: 0.45 }, { w: 'sine', f: 110, f2: 28, d: 0.8, v: 0.45 }, { w: 'sawtooth', f: 220, f2: 40, d: 0.5, v: 0.12, at: 0.05 }],
    hurt: [{ w: 'sawtooth', f: 300, f2: 60, d: 0.35, v: 0.22 }, { n: 1, f: 1200, f2: 100, d: 0.3, v: 0.25 }],
    power: [{ w: 'triangle', f: 523, f2: 1046, d: 0.12, v: 0.22 }, { w: 'triangle', f: 784, f2: 1568, d: 0.16, v: 0.2, at: 0.08 }],
    coin: [{ w: 'square', f: 988, d: 0.06, v: 0.09 }, { w: 'square', f: 1319, d: 0.14, v: 0.09, at: 0.06 }],
    eat: [{ w: 'triangle', f: 660, f2: 990, d: 0.08, v: 0.25 }],
    gold: [{ w: 'triangle', f: 784, d: 0.07, v: 0.2 }, { w: 'triangle', f: 988, d: 0.07, v: 0.2, at: 0.07 }, { w: 'triangle', f: 1319, d: 0.16, v: 0.2, at: 0.14 }],
    bounce: [{ w: 'sine', f: 420, f2: 380, d: 0.07, v: 0.22 }],
    wall: [{ w: 'sine', f: 260, f2: 240, d: 0.05, v: 0.12 }],
    brick: [{ w: 'square', f: 660, f2: 640, d: 0.07, v: 0.1 }],
    steel: [{ w: 'triangle', f: 1800, f2: 1700, d: 0.08, v: 0.12 }],
    turn: [{ w: 'sine', f: 300, d: 0.03, v: 0.06 }],
    start: [{ w: 'square', f: 523, d: 0.08, v: 0.12 }, { w: 'square', f: 659, d: 0.08, v: 0.12, at: 0.08 }, { w: 'square', f: 784, d: 0.08, v: 0.12, at: 0.16 }, { w: 'square', f: 1046, d: 0.2, v: 0.12, at: 0.24 }],
    level: [{ w: 'triangle', f: 523, d: 0.1, v: 0.2 }, { w: 'triangle', f: 659, d: 0.1, v: 0.2, at: 0.1 }, { w: 'triangle', f: 784, d: 0.1, v: 0.2, at: 0.2 }, { w: 'triangle', f: 1046, d: 0.3, v: 0.22, at: 0.3 }],
    over: [{ w: 'square', f: 392, d: 0.16, v: 0.12 }, { w: 'square', f: 330, d: 0.16, v: 0.12, at: 0.16 }, { w: 'square', f: 262, d: 0.16, v: 0.12, at: 0.32 }, { w: 'sawtooth', f: 196, f2: 98, d: 0.5, v: 0.12, at: 0.48 }],
    record: [{ w: 'square', f: 784, d: 0.08, v: 0.1 }, { w: 'square', f: 988, d: 0.08, v: 0.1, at: 0.09 }, { w: 'square', f: 1175, d: 0.08, v: 0.1, at: 0.18 }, { w: 'square', f: 1568, d: 0.3, v: 0.1, at: 0.27 }],
    click: [{ w: 'sine', f: 880, d: 0.04, v: 0.1 }],
    tick: [{ w: 'square', f: 1200, d: 0.02, v: 0.03 }]
  };
  var lastPlay = {};
  A.sfx = function (name, pitch) {
    if (muted) return;
    var now = performance.now();
    if (lastPlay[name] && now - lastPlay[name] < 30) return; // 같은 소리 겹침 방지
    lastPlay[name] = now;
    var list = SFX[name]; if (!list) return;
    try { for (var i = 0; i < list.length; i++) tone(list[i], pitch || 1); } catch (e) {}
  };
  A.isMuted = function () { return muted; };
  A.setMuted = function (m) {
    muted = !!m; A.set('neowa_mute', muted ? '1' : '0');
    document.body.classList.toggle('muted', muted);
  };
  A.unlockAudio = function () { if (!muted) audio(); };
  A.vibrate = function (p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} };

  /* ---------- 수학 ---------- */
  A.rand = function (a, b) { return a + Math.random() * (b - a); };
  A.irand = function (a, b) { return Math.floor(A.rand(a, b + 1)); };
  A.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  A.lerp = function (a, b, t) { return a + (b - a) * t; };
  A.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };

  /* ---------- 스프라이트 캐시: 빛 번짐(shadowBlur)은 한 번만 그려 둡니다 ---------- */
  var sprites = {};
  A.sprite = function (key, w, h, draw) {
    if (sprites[key]) return sprites[key];
    var s = 2, c = document.createElement('canvas');
    c.width = Math.ceil(w * s); c.height = Math.ceil(h * s);
    var x = c.getContext('2d'); x.scale(s, s); draw(x, w, h);
    c.w = w; c.h = h; sprites[key] = c; return c;
  };
  A.draw = function (ctx, spr, x, y, scale, rot) {
    var w = spr.w * (scale || 1), h = spr.h * (scale || 1);
    if (rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(spr, -w / 2, -h / 2, w, h); ctx.restore(); }
    else ctx.drawImage(spr, x - w / 2, y - h / 2, w, h);
  };
  A.glowDot = function (color, r) {
    return A.sprite('dot' + color + r, r * 6, r * 6, function (x, w) {
      var g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      g.addColorStop(0, '#fff'); g.addColorStop(0.18, color); g.addColorStop(0.45, hexA(color, 0.35)); g.addColorStop(1, hexA(color, 0));
      x.fillStyle = g; x.fillRect(0, 0, w, w);
    });
  };
  function hexA(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  A.hexA = hexA;
  A.rr = function (x, px, py, w, h, r) {
    x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r);
    x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath();
  };

  /* ---------- 이펙트: 파티클, 충격파, 점수 글자, 화면 흔들림 ---------- */
  A.FX = function () { this.p = []; this.rings = []; this.texts = []; this.sk = 0; this.skA = 0; this.flash = 0; this.flashC = '#fff'; };
  A.FX.prototype = {
    burst: function (x, y, color, n, spd, life, size) {
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, s = spd * (0.25 + Math.random() * 0.75);
        this.p.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * (0.5 + Math.random() * 0.5), max: life, c: color, r: (size || 3) * (0.6 + Math.random() * 0.8) });
      }
      if (this.p.length > 700) this.p.splice(0, this.p.length - 700);
    },
    spark: function (x, y, color, vx, vy, life, size) {
      this.p.push({ x: x, y: y, vx: vx, vy: vy, life: life, max: life, c: color, r: size || 2 });
    },
    ring: function (x, y, color, r, life) { this.rings.push({ x: x, y: y, c: color, r: r, life: life, max: life }); },
    text: function (x, y, str, color, size) { this.texts.push({ x: x, y: y, s: str, c: color || '#fff', z: size || 20, life: 0.9, max: 0.9 }); },
    shake: function (a, t) { this.skA = Math.max(this.skA, a); this.sk = Math.max(this.sk, t || 0.25); },
    flashIt: function (c, a) { this.flashC = c; this.flash = Math.max(this.flash, a || 0.5); },
    clear: function () { this.p.length = 0; this.rings.length = 0; this.texts.length = 0; this.sk = 0; this.flash = 0; },
    update: function (dt) {
      var i, q;
      for (i = this.p.length - 1; i >= 0; i--) {
        q = this.p[i]; q.life -= dt;
        if (q.life <= 0) { this.p.splice(i, 1); continue; }
        q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 1 - 2.2 * dt; q.vy *= 1 - 2.2 * dt;
      }
      for (i = this.rings.length - 1; i >= 0; i--) { q = this.rings[i]; q.life -= dt; if (q.life <= 0) this.rings.splice(i, 1); }
      for (i = this.texts.length - 1; i >= 0; i--) { q = this.texts[i]; q.life -= dt; q.y -= 40 * dt; if (q.life <= 0) this.texts.splice(i, 1); }
      if (this.sk > 0) { this.sk -= dt; if (this.sk <= 0) this.skA = 0; }
      if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 2.5);
    },
    offset: function () {
      if (this.sk <= 0) return [0, 0];
      var a = this.skA * Math.min(1, this.sk * 4);
      return [(Math.random() * 2 - 1) * a, (Math.random() * 2 - 1) * a];
    },
    draw: function (ctx) {
      var i, q, t;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (i = 0; i < this.p.length; i++) {
        q = this.p[i]; t = q.life / q.max;
        ctx.globalAlpha = t;
        A.draw(ctx, A.glowDot(q.c, 4), q.x, q.y, (q.r / 4) * (0.5 + t * 0.5));
      }
      for (i = 0; i < this.rings.length; i++) {
        q = this.rings[i]; t = 1 - q.life / q.max;
        ctx.globalAlpha = (1 - t) * 0.9; ctx.strokeStyle = q.c; ctx.lineWidth = 4 * (1 - t) + 1;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (0.2 + t * 0.8), 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (i = 0; i < this.texts.length; i++) {
        q = this.texts[i]; t = q.life / q.max;
        ctx.globalAlpha = Math.min(1, t * 2.5);
        ctx.font = '700 ' + q.z + 'px "Chakra Petch", system-ui, sans-serif';
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.strokeText(q.s, q.x, q.y);
        ctx.fillStyle = q.c; ctx.fillText(q.s, q.x, q.y);
      }
      ctx.restore();
    },
    drawFlash: function (ctx, W, H) {
      if (this.flash <= 0) return;
      ctx.save(); ctx.globalAlpha = this.flash * 0.6; ctx.fillStyle = this.flashC; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
  };

  /* ---------- 게임 틀: 상태(대기/플레이/일시정지/종료), 무대 크기, 키·버튼 ---------- */
  A.Shell = function (cfg) {
    var S = this;
    S.cfg = cfg; S.W = cfg.W; S.H = cfg.H; S.id = cfg.id;
    S.state = 'ready'; S.time = 0;
    S.bestKey = 'neowa_hub_' + cfg.id + '_high';
    S.best = A.getInt(S.bestKey);
    S.stage = document.getElementById('stage');
    S.wrap = document.getElementById('wrap');
    S.canvas = document.getElementById('cv');
    S.ctx = S.canvas.getContext('2d');
    S.scale = 1;
    var body = document.body;
    if (window.matchMedia && matchMedia('(pointer:coarse)').matches) body.classList.add('touch');
    A.setMuted(muted);
    setState('ready');
    S.fit = function () {
      var top = S.wrap.getBoundingClientRect();
      var aw = S.wrap.clientWidth - 24, ah = S.wrap.clientHeight - 16;
      var ar = S.W / S.H;
      var wide = aw > 900 && aw - ah * ar > 520;
      S.wrap.classList.toggle('wide', wide);
      if (wide) aw -= 2 * (220 + 28);
      var w = Math.min(aw, ah * ar), h = w / ar;
      w = Math.floor(w); h = Math.floor(h);
      S.stage.style.setProperty('--sw', w + 'px'); S.stage.style.setProperty('--sh', h + 'px');
      var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      S.canvas.width = Math.round(w * dpr); S.canvas.height = Math.round(h * dpr);
      S.scale = (w * dpr) / S.W; S.cssScale = w / S.W;
      void top;
    };
    window.addEventListener('resize', S.fit);
    window.addEventListener('orientationchange', function () { setTimeout(S.fit, 200); });
    S.fit();

    function setState(st) { S.state = st; body.setAttribute('data-state', st); }
    S.setState = setState;

    S.toLocal = function (e) {
      var r = S.canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * S.W, y: (e.clientY - r.top) / r.height * S.H };
    };

    var bestEls = document.querySelectorAll('[data-best]');
    var playEls = document.querySelectorAll('[data-plays]');
    S.playsKey = 'neowa_plays_' + cfg.id;
    function paintBest() {
      for (var i = 0; i < bestEls.length; i++) bestEls[i].textContent = A.fmt(S.best);
      for (i = 0; i < playEls.length; i++) playEls[i].textContent = A.fmt(A.getInt(S.playsKey));
    }
    paintBest();

    S.start = function () {
      A.unlockAudio();
      S.overAt = 0;
      cfg.reset();
      setState('playing');
      A.sfx('start');
      A.set(S.playsKey, A.getInt(S.playsKey) + 1);
      A.set('neowa_last', cfg.id);
      paintBest();
      if (window.gtag) try { gtag('event', 'game_start', { game_name: cfg.id }); } catch (e) {}
    };
    S.pause = function () { if (S.state !== 'playing') return; setState('paused'); A.sfx('click'); };
    S.resume = function () { if (S.state !== 'paused') return; setState('playing'); A.sfx('click'); last = performance.now(); };
    S.togglePause = function () { if (S.state === 'playing') S.pause(); else if (S.state === 'paused') S.resume(); };

    S.gameOver = function (score, meta) {
      if (S.state !== 'playing') return;
      setState('over');
      S.overAt = performance.now();
      var isNew = score > S.best && score > 0;
      if (isNew) { S.best = score; A.set(S.bestKey, score); }
      paintBest();
      var el = document.getElementById('ovScore');
      var newEl = document.getElementById('ovNew');
      newEl.hidden = !isNew;
      var metaEl = document.getElementById('ovMeta');
      if (metaEl) {
        metaEl.innerHTML = '';
        (meta || []).forEach(function (m) {
          var d = document.createElement('div');
          var b = document.createElement('b'); b.textContent = m[1];
          d.appendChild(b); d.appendChild(document.createTextNode(m[0]));
          metaEl.appendChild(d);
        });
      }
      A.sfx(isNew ? 'record' : 'over');
      var t0 = performance.now(), dur = Math.min(1200, 300 + score / 20);
      (function count() {
        var k = Math.min(1, (performance.now() - t0) / dur);
        el.textContent = A.fmt(score * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(count);
      })();
      if (window.gtag) try { gtag('event', 'game_over', { game_name: cfg.id, score: score }); } catch (e) {}
      setTimeout(function () { var b = document.querySelector('#ovOver .btn-p'); if (b) b.focus({ preventScroll: true }); }, 400);
    };

    S.banner = function (big, small) {
      var b = document.getElementById('banner'); if (!b) return;
      b.innerHTML = '';
      var s = document.createElement('span'); s.textContent = small || '';
      var t = document.createElement('b'); t.textContent = big;
      b.appendChild(s); b.appendChild(t);
      b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
    };

    // 버튼
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-act]'); if (!t) return;
      var act = t.getAttribute('data-act');
      if (act === 'start' || act === 'restart') { e.stopPropagation(); S.start(); }
      else if (act === 'resume') S.resume();
      else if (act === 'pause') S.pause();
      else if (act === 'mute') { A.setMuted(!A.isMuted()); if (!A.isMuted()) A.sfx('click'); }
    });
    // 시작 화면은 어디를 눌러도 시작
    var ovStart = document.getElementById('ovStart');
    ovStart.addEventListener('click', function (e) { if (S.state === 'ready' && !e.target.closest('a')) S.start(); });

    // 키보드
    window.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === ' ' || k === 'Enter') {
        if (e.target.closest && e.target.closest('a,button') && k === 'Enter') return;
        if (S.state === 'ready') { e.preventDefault(); S.start(); return; }
        if (S.state === 'paused') { e.preventDefault(); S.resume(); return; }
        if (S.state === 'over') { e.preventDefault(); if (performance.now() - S.overAt > 700) S.start(); return; }
      }
      if (k === 'p' || k === 'P' || k === 'Escape') { e.preventDefault(); S.togglePause(); return; }
      if (k === 'm' || k === 'M') { A.setMuted(!A.isMuted()); return; }
      if ((k === 'r' || k === 'R') && S.state === 'over') { S.start(); return; }
      if (S.state === 'playing' && cfg.keydown) cfg.keydown(e);
      if (/^Arrow/.test(k) || k === ' ') e.preventDefault();
    });
    window.addEventListener('keyup', function (e) { if (cfg.keyup) cfg.keyup(e); });

    // 화면을 벗어나면 일시정지
    document.addEventListener('visibilitychange', function () { if (document.hidden) S.pause(); });
    window.addEventListener('blur', function () { S.pause(); });

    // 루프
    var last = performance.now();
    function frame(now) {
      var dt = Math.min(0.033, (now - last) / 1000); last = now;
      S.time += dt;
      if (S.state === 'playing') cfg.update(dt);
      else if (cfg.idle) cfg.idle(dt);
      var c = S.ctx;
      c.setTransform(S.scale, 0, 0, S.scale, 0, 0);
      cfg.render(c, dt);
      requestAnimationFrame(frame);
    }
    if (cfg.init) cfg.init();
    requestAnimationFrame(frame);
  };
})();
