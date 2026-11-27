/* 너와 아케이드: 3D 그래픽 공통 틀 (three.js r187, ES 모듈)
   - 3D로 꾸민 게임만 이 파일을 부릅니다. 게임 규칙·조작·점수는 원래 2D 코드 그대로이고, 그림만 3D로 그립니다.
   - three.js는 로컬 파일 assets/three.module.js(+ three.core.js)를 import map + 동적 import로 불러옵니다. 외부 CDN은 쓰지 않습니다.
   - 3D를 못 쓰는 상황(웹GL2 없음, 저사양, 불러오기 실패, 계속 느림)이면 자동으로 원래 2D 그림으로 돌아갑니다.
     직접 끄려면 localStorage 'neowa_3d' = '0', 직접 켜려면 '1'. r163부터 WebGLRenderer는 WebGL2만 지원합니다.
   - 느려서 꺼진 적 있어도 다음에 들어오면 낮은 해상도로 3D를 다시 시도합니다. 3D 시작에 성공하면 느림 기록을 지웁니다.
     3D가 꺼질 때는 화면에도 짧게 알립니다.

   게임 쪽에서 할 일 (2줄):
     var G3 = A.G3D ? A.G3D.boot('tower', function () { return { ...그릴 때 필요한 상태... }; }) : null;
     render 맨 앞:  if (G3 && G3.draw(c, fx)) return;
   그러면 3D 장면은 assets/arcade/3d/<id>.js 가 그리고, 파티클·점수 글자(fx)는 그 위 2D 캔버스에 겹쳐 그립니다.

   3D 장면 파일은 A.G3D.define('<id>', function (X) { ... return { camera, update(state, dt, shake), map? } }) 로 만듭니다.
   X: THREE, scene, renderer, S(게임 틀), W/H(논리 크기), 도우미들(planeCam, glowTex, gradTex, project 등) */
(function () {
  'use strict';
  var A = window.Arcade;
  if (!A || A.G3D) return;
  var sc = document.currentScript;
  var BASE = sc ? sc.src.replace(/g3d\.js.*$/, '') : '../assets/arcade/';
  var defs = {};
  var G = A.G3D = {};

  // 모바일(터치 + 작은 화면) 판정: 해상도와 느림 기준을 따로 둔다
  var isMobile = (function () {
    try {
      var touch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      var small = Math.min(window.innerWidth || 0, window.innerHeight || 0) <= 600;
      return touch && small;
    } catch (e) { return false; }
  })();

  function webgl() {
    try {
      var c = document.createElement('canvas');
      // r163부터 WebGLRenderer는 WebGL2만 지원합니다. WebGL1만 되는 기기는 2D로 돌아갑니다.
      return !!(window.WebGLRenderingContext && c.getContext('webgl2'));
    } catch (e) { return false; }
  }
  /* three.js r187 모듈 로더: import map에 'three'를 등록하고, module 스크립트에서 동적 import합니다.
     오래된 브라우저는 module 스크립트를 실행하지 않으므로, 타임아웃이 지나면 불러오기 실패로 보고 2D로 돌아갑니다. */
  var threeLoading = false, threeTried = false;
  function loadThree(next) {
    if (window.THREE) { next(); return; }
    if (threeLoading) { var iv = setInterval(function () { if (threeTried) { clearInterval(iv); if (!window.THREE) next(); } }, 100); return; } // 성공 때는 finish가 이미 next를 불렀으므로 실패 때만 부름
    threeLoading = true;
    var done = false;
    function finish() { if (done) return; done = true; threeTried = true; next(); }
    setTimeout(finish, 8000);
    window.__neowaThreeOk = function (mod) { window.THREE = mod; finish(); };
    try {
      var url = new URL(BASE + '../three.module.js?v=2', document.baseURI).href;
      var im = document.createElement('script');
      im.type = 'importmap';
      im.textContent = JSON.stringify({ imports: { 'three': url } });
      document.head.appendChild(im);
      var m = document.createElement('script');
      m.type = 'module';
      m.textContent = "import * as THREE from 'three'; window.__neowaThreeOk(THREE);";
      m.onerror = finish;
      document.head.appendChild(m);
    } catch (e) { finish(); }
  }
  function load(src, ok, fail) {
    var s = document.createElement('script'); s.src = src; s.async = true;
    s.onload = ok; s.onerror = fail || function () {};
    document.head.appendChild(s);
  }
  function toast(msg) {
    try {
      var d = document.createElement('div');
      d.textContent = msg;
      d.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9999;background:rgba(10,14,34,.92);color:#fff;font-size:14px;line-height:1.4;padding:10px 16px;border-radius:999px;border:1px solid rgba(255,255,255,.25);pointer-events:none;white-space:nowrap';
      document.body.appendChild(d);
      setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 3500);
    } catch (e) {}
  }
  G.mobile = isMobile;
  G.define = function (id, factory) { defs[id] = factory; };

  /* 게임이 부르는 시작점. 돌려주는 객체(h)의 h.draw(c, fx) 가 true면 3D로 그린 것 */
  G.boot = function (id, getState) {
    var h = { on: false, id: id, draw: function () { return false; } };
    var tries = 0;
    (function wait() {
      // gfx.js(품질 단계)와 게임 틀(A.shell)이 준비될 때까지 잠깐 기다림
      if (!A.gfx || !A.shell) { if (++tries < 80) setTimeout(wait, 50); return; }
      var setting = '';
      try { setting = A.get('neowa_3d', ''); } catch (e) {}
      if (setting === '0' || A.gfx.level < 1 || !webgl()) return;
      // 느림 기록이 있어도 시도를 막지 않는다. 수동 '1'이면 보통 해상도로, 아니면 낮은 해상도로 다시 시도한다.
      var bad = false; try { bad = sessionStorage.getItem('neowa_3d_slow_' + id) === '1'; } catch (e) {}
      var low = bad && setting !== '1';
      var go = function () { if (defs[id] && window.THREE) start(h, id, getState, low ? { low: true } : null); };
      var next = function () { if (defs[id]) go(); else load(BASE + '3d/' + id + '.js?v=1', go); };
      loadThree(next);
    })();
    return h;
  };

  /* 공통 도우미 */
  function helpers(X) {
    var THREE = X.THREE, cache = {};
    // 빛나는 점 텍스처 (스프라이트용)
    X.glowTex = function (hex, soft) {
      var k = 'g' + hex + (soft || 0); if (cache[k]) return cache[k];
      var c = document.createElement('canvas'); c.width = c.height = 128;
      var x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, soft ? A.hexA(hex, 0.9) : '#ffffff'); g.addColorStop(soft ? 0.1 : 0.15, hex); g.addColorStop(0.42, A.hexA(hex, 0.32)); g.addColorStop(1, A.hexA(hex, 0));
      x.fillStyle = g; x.fillRect(0, 0, 128, 128);
      var t = new THREE.CanvasTexture(c); return (cache[k] = t);
    };
    X.glow = function (hex, size, opacity) {
      var m = new THREE.SpriteMaterial({ map: X.glowTex(hex), color: 0xffffff, transparent: true, opacity: opacity == null ? 1 : opacity, blending: THREE.AdditiveBlending, depthWrite: false });
      var s = new THREE.Sprite(m); s.scale.set(size, size, 1); return s;
    };
    // 세로 그라데이션 텍스처 (하늘·배경)
    X.gradTex = function (stops, w, h) {
      var c = document.createElement('canvas'); c.width = w || 4; c.height = h || 256;
      var x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, c.height);
      stops.forEach(function (s) { g.addColorStop(s[0], s[1]); });
      x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
      var t = new THREE.CanvasTexture(c); if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace; return t;
    };
    X.canvasTex = function (w, h, draw) {
      var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
      var t = new THREE.CanvasTexture(c); if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace; return t;
    };
    // 별 가루 (점 구름)
    X.stars = function (n, spread, depth, size, color) {
      var g = new THREE.BufferGeometry(), p = new Float32Array(n * 3);
      for (var i = 0; i < n; i++) { p[i * 3] = (Math.random() - 0.5) * spread[0]; p[i * 3 + 1] = (Math.random() - 0.5) * spread[1]; p[i * 3 + 2] = depth[0] + Math.random() * (depth[1] - depth[0]); }
      g.setAttribute('position', new THREE.BufferAttribute(p, 3));
      return new THREE.Points(g, new THREE.PointsMaterial({ color: color || 0xffffff, size: size || 2, map: X.glowTex('#ffffff'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
    };
    /* 평면 카메라: 게임 평면(z=0)의 논리 좌표 (0,0)~(W,H)가 화면에 정확히 맞도록 하는 원근 카메라.
       눈 위치(ex, ey)를 화면 가운데에서 비켜 두면 물체의 윗면·옆면이 보여 입체감이 납니다(축 이동 투영).
       월드 좌표: x = 논리 x, y = -논리 y, z = 화면 앞쪽(+) */
    X.planeCam = function (ex, ey, dist) {
      var cam = new THREE.PerspectiveCamera(40, 1, 10, dist * 6);
      cam.userData = { ex: ex, ey: ey, d: dist };
      cam.setEye = function (nx, ny, nd) { var u = cam.userData; if (nx != null) u.ex = nx; if (ny != null) u.ey = ny; if (nd != null) u.d = nd; };
      cam.fitPlane = function (W, H, ox, oy) {
        var u = cam.userData, n = cam.near, k = n / u.d;
        ox = ox || 0; oy = oy || 0;
        cam.position.set(u.ex + ox, -(u.ey + oy), u.d); cam.rotation.set(0, 0, 0);
        cam.updateMatrixWorld(true);
        // 평면 위 창(0..W, 0..H)을 눈 기준 좌표로 → near 평면으로 축소
        var l = (0 - u.ex) * k, r = (W - u.ex) * k, t = (u.ey - 0) * k, b = (u.ey - H) * k;
        cam.projectionMatrix.makePerspective(l, r, t, b, n, cam.far);
        cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
      };
      return cam;
    };
    // 3D 점 → 논리 화면 좌표 {x, y, s(원근 배율)}
    var v = null;
    X.project = function (x, y, z, cam) {
      v = v || new THREE.Vector3();
      v.set(x, y, z).project(cam || X.camera);
      return { x: (v.x + 1) / 2 * X.S.W, y: (1 - v.y) / 2 * X.S.H, z: v.z };
    };
    X.std = function (hex, o) {
      o = o || {};
      return new THREE.MeshStandardMaterial({ color: hex, roughness: o.r == null ? 0.45 : o.r, metalness: o.m == null ? 0.1 : o.m, emissive: o.e || 0x000000, emissiveIntensity: o.ei == null ? 1 : o.ei, transparent: !!o.t, opacity: o.o == null ? 1 : o.o, flatShading: !!o.flat });
    };
    X.basic = function (hex, o) {
      o = o || {};
      return new THREE.MeshBasicMaterial({ color: hex, transparent: !!(o.t || o.add), opacity: o.o == null ? 1 : o.o, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: !o.add, side: o.side || THREE.FrontSide });
    };
    // 둥근 모서리 상자 (윗면 테두리가 반짝여 고급스럽게)
    X.roundBox = function (w, h, d, r, seg) {
      r = Math.min(r, w / 2 - 0.01, h / 2 - 0.01);
      var s = new THREE.Shape(), x = -w / 2, y = -h / 2;
      s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
      s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
      var g = new THREE.ExtrudeGeometry(s, { depth: d - r * 2, bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.6, bevelSegments: seg || 2, curveSegments: seg || 3 });
      g.translate(0, 0, -(d - r * 2) / 2); g.computeVertexNormals();
      return g;
    };
  }

  function start(h, id, getState, opts) {
    var THREE = window.THREE, S = A.shell, lvl = A.gfx.level;
    var lowStart = !!(opts && opts.low);
    var holder = S.canvas.parentNode;
    var canvas = document.createElement('canvas');
    canvas.className = 'g-3d';
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:block';
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: lvl >= 2 && !lowStart && !isMobile, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    } catch (e) { return; }
    holder.insertBefore(canvas, S.canvas);
    // 모바일은 처음부터 낮은 해상도로 시작한다. 안티앨리어싱·그림자도 기본 끔이다.
    var maxPr = isMobile ? 1 : lowStart ? 1 : (lvl >= 2 ? 2 : 1.5), pr = Math.min(window.devicePixelRatio || 1, maxPr);
    renderer.setPixelRatio(pr);
    if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    if (lvl >= 2 && !lowStart && !isMobile) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; } // r186에서 PCFSoftShadowMap이 제거됨
    var X = { THREE: THREE, renderer: renderer, canvas: canvas, scene: new THREE.Scene(), S: S, level: lvl, shadows: lvl >= 2, get W() { return S.W; }, get H() { return S.H; } };
    helpers(X);
    var mod;
    try { mod = defs[id](X); if (mod.tone === 'none') renderer.toneMapping = THREE.NoToneMapping; else if (mod.exposure) renderer.toneMappingExposure = mod.exposure; } catch (e) { cleanup(); if (window.console) console.warn('3D 장면 준비 실패:', e); return; }
    X.camera = mod.camera;
    var cw = 0, chh = 0, ftAvg = 16.7, slowT = 0, last = 0, lastT = performance.now(), startT = performance.now();
    function cleanup() { try { renderer.dispose(); } catch (e) {} if (canvas.parentNode) canvas.parentNode.removeChild(canvas); h.on = false; G.on = false; G.canvas = null; S.canvas.style.background = ''; document.body.classList.remove('is-3d'); }
    function off(reason) {
      cleanup();
      try { sessionStorage.setItem('neowa_3d_slow_' + id, '1'); } catch (e) {}
      if (window.console) console.info('3D 끔:', reason);
      toast(reason === '느림' ? '기기가 느려 2D로 전환했습니다' : '3D 그림을 켜지 못해 2D로 표시합니다');
    }
    h.X = X; h.mod = mod; h.off = off; G.state = getState; // G.state: 점검 스크립트용
    h.draw = function (c, fx) {
      if (!h.on) return false;
      var now = performance.now(), dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
      // 성능 감시: 시작한 뒤 처음 몇 초는 예열로 보고 세지 않는다. 플레이 중 계속 느리면 해상도를 낮추고, 그래도 느리면 2D로
      // 모바일은 기준을 더 관대하게 둔다 (예열 8초, 36ms, 5초 누적, 해상도 0.6까지 단계적으로 낮춤)
      var warmup = isMobile ? 8000 : 5000, slowLim = isMobile ? 36 : 28, slowNeed = isMobile ? 5000 : 3000;
      if (last && now - startT > warmup) {
        var ft = now - last; if (ft < 250) ftAvg += (ft - ftAvg) * 0.06;
        if (S.state === 'playing' && ftAvg > slowLim && !A.gfx.forced) slowT += ft; else slowT = Math.max(0, slowT - ft * 0.5);
        if (slowT > slowNeed) {
          slowT = 0; ftAvg = 16.7;
          var prFloor = isMobile ? 0.6 : 0.75, prStep = isMobile ? 0.25 : 0.5;
          if (pr > prFloor) { pr = Math.max(prFloor, pr - prStep); renderer.setPixelRatio(pr); cw = 0; if (renderer.shadowMap.enabled && pr <= 1) renderer.shadowMap.enabled = false; }
          else { off('느림'); return false; }
        }
      }
      last = now;
      var w = holder.clientWidth, hh = holder.clientHeight;
      if (w !== cw || hh !== chh) { cw = w; chh = hh; renderer.setSize(w, hh, false); if (mod.resize) mod.resize(w, hh); }
      var o = fx ? fx.offset() : [0, 0];
      try { mod.update(getState(), dt, o, S.time); renderer.render(X.scene, mod.camera); }
      catch (e) { off('오류 ' + e.message); return false; }
      // 위 2D 캔버스는 투명하게 비우고 파티클·글자만 겹쳐 그림
      c.clearRect(0, 0, S.W + 1, S.H + 1);
      if (fx) {
        fx.map = mod.map || null;
        c.save(); c.translate(o[0] * 0.5, o[1] * 0.5); fx.draw(c); c.restore(); fx.drawFlash(c, S.W, S.H);
      }
      if (mod.overlay) mod.overlay(c, getState());
      return true;
    };
    S.canvas.style.background = 'transparent';
    h.on = true; G.on = true; G.canvas = canvas;
    document.body.classList.add('is-3d');
    // 3D 시작에 성공했으면 지난 느림 기록을 지운다. 다음에는 보통 해상도로 다시 시도한다.
    try { sessionStorage.removeItem('neowa_3d_slow_' + id); } catch (e) {}
  }
})();
