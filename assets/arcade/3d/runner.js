/* 네온 대시 3D 장면 (게임 규칙은 docs/tools/games/runner.js 그대로, 그림만 3D)
   달리는 길의 가운데 줄이 게임 평면(z=0)이라 점프·충돌 위치가 2D와 똑같이 맞고,
   뒤쪽 빌딩들은 실제 깊이에 놓여 있어 멀수록 천천히 지나갑니다. */
Arcade.G3D.define('runner', function (X) {
  'use strict';
  var THREE = X.THREE, A = Arcade, scene = X.scene;
  var W = 540, H = 960, G = 720, TD = 140;      // 바닥 높이, 길 폭(안쪽 깊이)
  var cam = X.planeCam(W * 0.4, G - 330, 1150);

  scene.background = X.gradTex([[0, '#07031a'], [0.5, '#1d0c3a'], [0.72, '#3a1460'], [0.8, '#2a1450'], [1, '#090410']]);
  scene.fog = new THREE.Fog(0x1d0c3a, 900, 4200);

  /* 해와 별 */
  var sunTex = X.canvasTex(512, 512, function (x, w, h) {
    var g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffd1ec'); g.addColorStop(0.5, '#ff9ecf'); g.addColorStop(1, '#b48cff');
    x.fillStyle = g; x.beginPath(); x.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2); x.fill();
    x.globalCompositeOperation = 'destination-out';
    for (var i = 0; i < 8; i++) x.fillRect(0, h * 0.55 + i * 26, w, 5 + i * 2);
  });
  var sun = new THREE.Mesh(new THREE.PlaneGeometry(1300, 1300), new THREE.MeshBasicMaterial({ map: sunTex, transparent: true, fog: false, depthWrite: false }));
  sun.position.set(W * 0.75, -(G - 520), -4000); scene.add(sun);
  var sunGlow = X.glow('#ff7ab8', 3600, 0.5); sunGlow.material.fog = false; sunGlow.position.set(W * 0.75, -(G - 520), -4100); scene.add(sunGlow);
  var stars = X.stars(X.level >= 2 ? 500 : 250, [7000, 2600], [-4300, -3800], 12); stars.position.set(W / 2, -(G - 1300), 0); stars.material.fog = false; scene.add(stars);

  /* 도시: 깊이별 빌딩 3줄. 화면 왼쪽으로 지나가면 오른쪽 끝으로 다시 */
  var winTex = X.canvasTex(64, 128, function (x, w, h) {
    x.fillStyle = '#000000'; x.fillRect(0, 0, w, h);
    for (var yy = 6; yy < h - 4; yy += 10) for (var xx = 5; xx < w - 4; xx += 9) {
      x.fillStyle = Math.random() < 0.3 ? (Math.random() < 0.7 ? '#ffd6f0' : '#a6e8ff') : '#000000'; x.fillRect(xx, yy, 4, 5);
    }
  });
  winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping;
  var rows = [];
  [[-700, 0x2c1650, 0.9, 120], [-1500, 0x1e0f3a, 0.8, 220], [-2600, 0x150a2a, 0.7, 340]].forEach(function (r, ri) {
    var list = [], span = 0, x = -300;
    var tex = winTex.clone(); tex.needsUpdate = true;
    var mat = new THREE.MeshStandardMaterial({ color: r[1], emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: r[2], roughness: 0.8, map: null });
    while (x < W + 1600 + ri * 1400) {
      var bw = 70 + Math.random() * 90 + ri * 50, bh = r[3] + Math.random() * r[3] * 1.4;
      var m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 60 + ri * 40), mat);
      m.position.set(x + bw / 2, -(G + 40) + bh / 2, r[0] - Math.random() * 80);
      // 지붕 네온
      var roof = new THREE.Mesh(new THREE.BoxGeometry(bw, 3, 62 + ri * 40), X.basic(ri ? 0x7a5ad0 : 0xff9ecf));
      roof.position.y = bh / 2; m.add(roof);
      scene.add(m); list.push(m); x += bw + 6 + Math.random() * 40;
    }
    span = x + 300;
    rows.push({ list: list, span: span, z: r[0] });
  });

  /* 길: 구덩이를 뺀 구간마다 판 하나 (재사용) */
  var trackTex = X.canvasTex(128, 128, function (x, w, h) {
    x.fillStyle = '#2a1450'; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(180,140,255,.55)'; x.lineWidth = 2; x.strokeRect(1, 1, w - 2, h - 2);
    x.fillStyle = 'rgba(214,191,255,.08)'; x.fillRect(0, h / 2 - 2, w, 4);
  });
  trackTex.wrapS = trackTex.wrapT = THREE.RepeatWrapping;
  var trackMat = new THREE.MeshStandardMaterial({ map: trackTex, roughness: 0.35, metalness: 0.5, color: 0xffffff });
  var sideMat = X.std(0x2a1450, { r: 0.5, m: 0.3, e: 0x1c0a3a, ei: 0.8 });
  var edgeMat = X.basic(0xd6bfff);
  var slabs = [];
  function slab() {
    var g = new THREE.Group();
    var top = new THREE.Mesh(new THREE.PlaneGeometry(1, TD), trackMat); top.rotation.x = -Math.PI / 2; top.receiveShadow = X.shadows; g.add(top);
    var front = new THREE.Mesh(new THREE.PlaneGeometry(1, 600), sideMat); front.position.set(0, -300, TD / 2); g.add(front);
    var edge = new THREE.Mesh(new THREE.BoxGeometry(1, 4, 4), edgeMat); edge.position.set(0, 0, TD / 2); g.add(edge);
    var edge2 = new THREE.Mesh(new THREE.BoxGeometry(1, 3, 3), edgeMat); edge2.position.set(0, 0, -TD / 2); g.add(edge2);
    g.userData = { top: top, front: front, edge: edge, edge2: edge2 };
    scene.add(g); return g;
  }
  function setSlab(s, x0, x1, off) {
    var w = x1 - x0, u = s.userData; s.visible = true;
    s.position.set((x0 + x1) / 2, -G, 0);
    u.top.scale.x = w; u.front.scale.x = w; u.edge.scale.x = w; u.edge2.scale.x = w;
    // 무늬가 길과 함께 흘러가도록 텍스처 위치 맞춤 (60px 칸)
    if (!u.tex) { u.tex = trackTex.clone(); u.tex.needsUpdate = true; u.top.material = trackMat.clone(); u.top.material.map = u.tex; }
    u.tex.repeat.set(w / 60, 2); u.tex.offset.x = ((x0 + off) / 60) % 1;
  }
  // 길 앞쪽 바닥: 흘러가는 네온 격자 (2D의 원근 격자 바닥)
  var floorTex = X.canvasTex(128, 128, function (x, w, h) {
    x.fillStyle = '#12082a'; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(180,140,255,.5)'; x.lineWidth = 3; x.strokeRect(0, 0, w, h);
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(40, 12); floorTex.anisotropy = X.level >= 2 ? 8 : 2;
  var floorM = new THREE.Mesh(new THREE.PlaneGeometry(2400, 720), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.4, metalness: 0.4 }));
  floorM.rotation.x = -Math.PI / 2; floorM.position.set(W / 2, -(G + 90), TD / 2 + 360); floorM.receiveShadow = X.shadows; scene.add(floorM);
  // 구덩이 안쪽 붉은 경고빛
  var pitGlows = [];
  function pitGlow() { var m = new THREE.Mesh(new THREE.PlaneGeometry(1, 120), new THREE.MeshBasicMaterial({ map: X.gradTex([[0, 'rgba(255,77,109,.55)'], [1, 'rgba(255,77,109,0)']]), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(m); return m; }

  /* 장애물 */
  var blockMat = new THREE.MeshStandardMaterial({ color: 0x5b3a9a, roughness: 0.35, metalness: 0.4, emissive: 0x2a1650, emissiveIntensity: 0.6 });
  var blockTopMat = X.basic(0xd6bfff);
  var spikeGeo = new THREE.ConeGeometry(19, 40, 4); spikeGeo.rotateY(Math.PI / 4); spikeGeo.translate(0, 20, 0);
  var spikeMat = new THREE.MeshStandardMaterial({ color: 0xff4d6d, emissive: 0xff2050, emissiveIntensity: 0.7, roughness: 0.3, metalness: 0.4, flatShading: true });
  var sawShape = new THREE.Shape();
  for (var i = 0; i < 16; i++) { var a = i / 16 * Math.PI * 2, rr = i % 2 ? 26 * 0.7 : 26; if (i) sawShape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else sawShape.moveTo(rr, 0); }
  var sawGeo = new THREE.ExtrudeGeometry(sawShape, { depth: 8, bevelEnabled: true, bevelThickness: 1.5, bevelSize: 1.5, bevelSegments: 1 }); sawGeo.translate(0, 0, -4);
  var sawMat = new THREE.MeshStandardMaterial({ color: 0xff7a45, roughness: 0.25, metalness: 0.8, emissive: 0x5a1a00, emissiveIntensity: 0.6 });
  var pool = { block: [], spike: [], saw: [] }, used = new Map();
  function make(t) {
    var m;
    if (t === 'block') {
      m = new THREE.Group();
      var b = new THREE.Mesh(new THREE.BoxGeometry(1, 1, TD - 20), blockMat); b.castShadow = X.shadows; b.receiveShadow = X.shadows; m.add(b);
      var tp = new THREE.Mesh(new THREE.BoxGeometry(1, 3, TD - 18), blockTopMat); m.add(tp); m.userData = { b: b, tp: tp };
    } else if (t === 'spike') {
      m = new THREE.Group();
      for (var k = -1; k <= 1; k++) { var s = new THREE.Mesh(spikeGeo, spikeMat); s.position.z = k * 40; s.castShadow = X.shadows; m.add(s); }
      var gl = X.glow('#ff4d6d', 90, 0.6); gl.position.y = 18; m.add(gl);
    } else {
      m = new THREE.Group(); var sw = new THREE.Mesh(sawGeo, sawMat); m.add(sw); m.userData.sw = sw;
      var sg = X.glow('#ff7a45', 110, 0.5); m.add(sg);
      var axle = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, TD, 8), X.std(0x2a0d05)); axle.rotation.x = Math.PI / 2; m.add(axle);
    }
    scene.add(m); return m;
  }

  /* 코인 */
  var coinGeo = new THREE.CylinderGeometry(11, 11, 3, 18); coinGeo.rotateX(Math.PI / 2);
  var coinMat = X.std(0xffd166, { r: 0.2, m: 0.9, e: 0xffa020, ei: 0.7 });
  var coinMeshes = [];

  /* 플레이어: 빛나는 큐브 */
  var me = new THREE.Group();
  var cube = new THREE.Mesh(X.roundBox(36, 36, 36, 6, 2), new THREE.MeshStandardMaterial({ color: 0xe9dcff, emissive: 0xb48cff, emissiveIntensity: 0.55, roughness: 0.2, metalness: 0.2 }));
  cube.castShadow = X.shadows; me.add(cube);
  var core = new THREE.Mesh(new THREE.BoxGeometry(22, 22, 37), X.basic(0x7d4fd6)); me.add(core);
  var eye = new THREE.Mesh(new THREE.BoxGeometry(5, 6, 38), X.basic(0xffffff)); eye.position.set(4.5, 3, 0); me.add(eye);
  var halo = X.glow('#b48cff', 130, 0.6); me.add(halo);
  var meLight = new THREE.PointLight(0xb48cff, 1.6, 300, 1.5); me.add(meLight);
  scene.add(me);

  /* 빛 */
  scene.add(new THREE.HemisphereLight(0xc0a0ff, 0x1a0830, 0.8));
  var key = new THREE.DirectionalLight(0xffd6f0, 1.8); key.position.set(W * 0.8, -(G - 600), 500); key.target.position.set(W / 2, -G, 0); scene.add(key); scene.add(key.target);
  if (X.shadows) { key.castShadow = true; key.shadow.mapSize.set(1024, 512); var sc = key.shadow.camera; sc.left = -450; sc.right = 450; sc.top = 300; sc.bottom = -300; sc.near = 100; sc.far = 1600; key.shadow.bias = -0.002; }

  var scroll = 0, lastDist = 0;
  return {
    camera: cam,
    update: function (s, dt, o, time) {
      var playing = !!s.obs, d = playing ? s.dist : scroll + 120 * dt;
      var dx = playing ? d - lastDist : 120 * dt; if (dx < 0 || dx > 400) dx = 0; lastDist = d; scroll += dx;
      // 빌딩 흐르기 (같은 속도로 움직여도 멀수록 화면에서는 느림)
      rows.forEach(function (r) {
        r.list.forEach(function (m) { m.position.x -= dx; if (m.position.x < -900 + r.z * 0.6) m.position.x += r.span + 600; });
      });
      floorTex.offset.x = (scroll / 60) % 1;
      // 길
      var obs = s.obs || [], pits = obs.filter(function (q) { return q.t === 'pit'; }).sort(function (a, b) { return a.x - b.x; });
      var segs = [], x0 = -600;
      pits.forEach(function (p) { if (p.x > x0) segs.push([x0, p.x]); x0 = Math.max(x0, p.x + p.w); });
      segs.push([x0, W + 900]);
      while (slabs.length < segs.length) slabs.push(slab());
      for (var i = 0; i < slabs.length; i++) { if (segs[i]) setSlab(slabs[i], segs[i][0], segs[i][1], scroll); else slabs[i].visible = false; }
      while (pitGlows.length < pits.length) pitGlows.push(pitGlow());
      for (i = 0; i < pitGlows.length; i++) {
        var pg = pitGlows[i], pp = pits[i]; pg.visible = !!pp; if (!pp) continue;
        pg.scale.x = pp.w; pg.position.set(pp.x + pp.w / 2, -G - 60, -TD / 2 + 1);
      }
      // 장애물
      var seen = new Set();
      for (i = 0; i < obs.length; i++) {
        var q = obs[i]; if (q.t === 'pit') continue;
        var m = used.get(q);
        if (!m) { m = pool[q.t].pop() || make(q.t); m.visible = true; used.set(q, m); }
        seen.add(q);
        if (q.t === 'block') { m.userData.b.scale.set(q.w, q.h, 1); m.userData.b.position.y = q.h / 2; m.userData.tp.scale.x = q.w; m.userData.tp.position.y = q.h; m.position.set(q.x + q.w / 2, -G, 0); }
        else if (q.t === 'spike') { m.position.set(q.x + q.w / 2, -G, 0); }
        else { m.position.set(q.x, -q.y, 0); m.userData.sw.rotation.z = -time * 10; }
      }
      used.forEach(function (m, q) { if (!seen.has(q)) { m.visible = false; pool[q.t].push(m); used.delete(q); } });
      // 코인
      var coins = s.coins || [];
      while (coinMeshes.length < coins.length) { var cm = new THREE.Mesh(coinGeo, coinMat); var cg = X.glow('#ffd166', 50, 0.7); cm.add(cg); scene.add(cm); coinMeshes.push(cm); }
      for (i = 0; i < coinMeshes.length; i++) {
        var c = coins[i], mm = coinMeshes[i]; mm.visible = !!c; if (!c) continue;
        mm.position.set(c.x, -(c.y + Math.sin(time * 6 + i) * 3), 0); mm.rotation.y = time * 4 + i * 0.4;
      }
      // 플레이어
      var P = s.P, alive = !(s.dying > 0);
      var px = P ? P.x : 140, py = P ? P.y : G, rot = P ? P.rot : 0, sq = P && P.squash > 0 ? P.squash / 0.12 : 0;
      me.visible = !P || alive;
      me.position.set(px, -(py - 22), 0);
      me.rotation.set(0, playing ? 0 : time * 0.6, -rot);
      me.scale.set(1 + sq * 0.25, 1 - sq * 0.25, 1 + sq * 0.25);
      halo.material.opacity = 0.5 + Math.sin(time * 6) * 0.1;
      // 카메라: 살짝 위아래로 따라감
      var bob = P ? A.clamp((G - py) * 0.12, 0, 60) : Math.sin(time * 0.5) * 20;
      cam.setEye(W * 0.4 + (playing ? 0 : Math.sin(time * 0.3) * 60), G - 330 - bob);
      cam.fitPlane(W, H, o[0], o[1]);
    }
  };
});
