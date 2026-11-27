/* 별빛 수호대 3D 장면 (게임 규칙은 shooting/index.html 2D 그대로, 그림만 3D)
   - BatchedMesh: 탄환·적기·파편을 묶어 드로우콜 절감 (r160에도 있는 기능)
   - 발광·블룸: 폭발 글로우, 머즐 플래시, 궁극 글로우 (gfx.js 블룸과 함께)
   - 볼류메트릭 빛줄기: 보스 등장 시 원뿔 빛줄기 + 탐색광 글로우
   - 피격 소프트바디: 맞으면 찌그러졌다 복원되는 스케일 변형 (물리 엔진 없음)
   - 분절형 보스: 최종 보스 심연의 여제 촉수·몸통을 마디별로 따로 움직임
   - WebGL 불가·느림이면 g3d.js가 자동으로 2D로 되돌림 */
Arcade.G3D.define('shooting', function (X) {
  'use strict';
  var THREE = X.THREE, A = Arcade, scene = X.scene;
  var W = 540, H = 960, HI = X.level >= 2;
  var cam = X.planeCam(W * 0.5, H * 0.42, 1200);

  scene.add(new THREE.HemisphereLight(0xc0b8ff, 0x1a0a30, 0.9));
  var key = new THREE.DirectionalLight(0xfff0d0, 1.6); key.position.set(W * 0.8, 300, 600); scene.add(key);

  /* 페이즈별 배경 그라데이션 */
  var bgTex = [null,
    X.gradTex([[0, '#070218'], [0.55, '#0d0530'], [1, '#05060c']]),
    X.gradTex([[0, '#120a04'], [0.55, '#1c0f08'], [1, '#060409']]),
    X.gradTex([[0, '#160208'], [0.55, '#20040e'], [1, '#05030a']])];
  scene.background = bgTex[1];
  var curPhase = 1;

  /* 별 3겹 시차 (Points, 직접 위치를 갱신하며 아래로 흐름) */
  function starLayer(n, size, z, speed, color) {
    var g = new THREE.BufferGeometry(), p = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { p[i * 3] = Math.random() * W; p[i * 3 + 1] = -Math.random() * H; p[i * 3 + 2] = z; }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    var pts = new THREE.Points(g, new THREE.PointsMaterial({ color: color, size: size, map: X.glowTex('#ffffff'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
    pts.frustumCulled = false; scene.add(pts);
    return { pts: pts, speed: speed, n: n };
  }
  var starLayers = [
    starLayer(HI ? 70 : 40, 2.2, -120, 26, 0xffffff),
    starLayer(HI ? 60 : 35, 3.2, -60, 90, 0xd4f2ff),
    starLayer(HI ? 30 : 16, 5, -20, 260, 0xffffff)
  ];
  /* 성운 글로우 (페이즈별 색) */
  var nebCols = [null, ['#7a3ad0', '#2a5ad0', '#c02a7a', '#2a8ad0'], ['#c07a2a', '#7a2a1a', '#5a3a7a', '#2a6a4a'], ['#a01030', '#4a0d5a', '#c01020', '#2a0d3a']];
  var nebs = [];
  for (var ni = 0; ni < 8; ni++) {
    var ng = X.glow('#ffffff', 300, 0.5); ng.material.fog = false;
    ng.material.color.set(nebCols[1][ni % nebCols[1].length]);
    ng.position.set(Math.random() * W, -Math.random() * H, -350 - Math.random() * 300);
    var ns = 220 + Math.random() * 220; ng.scale.set(ns, ns, 1); ng.userData.sp = 6 + Math.random() * 10;
    scene.add(ng); nebs.push(ng);
  }
  /* 행성 (캔버스 텍스처 + 고리) */
  var planetTex = X.canvasTex(256, 256, function (x, w, h) {
    var g = x.createRadialGradient(w * 0.4, h * 0.4, 10, w / 2, h / 2, w / 2);
    g.addColorStop(0, '#8a73e8'); g.addColorStop(0.6, '#3b2f8a'); g.addColorStop(1, '#1a1446');
    x.fillStyle = g; x.beginPath(); x.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(255,190,240,.18)';
    for (var i = 0; i < 5; i++) x.fillRect(0, h * 0.2 + i * h * 0.13, w, 6 + i * 2);
  });
  var planet = new THREE.Group();
  var planetBall = new THREE.Mesh(new THREE.CircleGeometry(92, 40), new THREE.MeshBasicMaterial({ map: planetTex, transparent: true }));
  planet.add(planetBall);
  var planetRing = new THREE.Mesh(new THREE.TorusGeometry(140, 3, 6, 60), new THREE.MeshBasicMaterial({ color: 0xbeaaFF, transparent: true, opacity: 0.35 }));
  planetRing.rotation.x = Math.PI / 2 - 0.32; planetRing.scale.z = 0.3; planet.add(planetRing);
  planet.position.set(W * 0.78, -H * 0.26, -520); scene.add(planet);
  var planetS = 0.85;

  /* 페이즈 오브젝트: 2페이즈 소행성 / 3페이즈 요새·기둥 */
  var rockGroup = new THREE.Group(); scene.add(rockGroup);
  var rockMat = new THREE.MeshStandardMaterial({ color: 0x6a5a48, roughness: 0.9, metalness: 0.1, flatShading: true });
  var rocks = [];
  for (var ri = 0; ri < 10; ri++) {
    var rk = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), rockMat);
    var rr = 10 + (ri % 3) * 13 + Math.random() * 12;
    rk.scale.set(rr, rr * 0.8, rr * 0.6);
    rk.position.set(Math.random() * W, -Math.random() * H, -80 - (ri % 3) * 90);
    rk.userData = { sp: 18 + (ri % 3) * 34, vr: (Math.random() - 0.5) * 0.8, r: rr };
    rockGroup.add(rk); rocks.push(rk);
  }
  var fortGroup = new THREE.Group(); scene.add(fortGroup);
  var fortMat = new THREE.MeshStandardMaterial({ color: 0x0a0614, roughness: 1, metalness: 0 });
  for (var fi = 0; fi < 3; fi++) {
    var fb = new THREE.Mesh(new THREE.BoxGeometry(150, 90, 60), fortMat);
    fb.position.set(fi * 190 - 30 + 75, -fi * 340 - 100, -260); fortGroup.add(fb);
    var fl = X.glow('#ff2a3c', 90, 0.5); fl.position.set(fi * 190 + 40, -fi * 340 - 60, -200); fortGroup.add(fl);
  }
  var pillarGroup = new THREE.Group(); scene.add(pillarGroup);
  var pillars = [];
  for (var pi = 0; pi < 4; pi++) {
    var pc = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 220, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xff2a3c, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    pc.position.set(60 + pi * 130, -Math.random() * H, -180); pillarGroup.add(pc); pillars.push(pc);
  }
  rockGroup.visible = false; fortGroup.visible = false; pillarGroup.visible = false;

  /* ---------- BatchedMesh: 같은 기체 지오메트리를 슬롯 수만큼 복사 등록해 묶습니다.
     r187부터 addGeometry는 지오메트리만 등록하고 인스턴스는 addInstance로 따로 만들어야 합니다.
     (r160은 addGeometry가 인스턴스까지 만들었으나 r187에서 분리됨. addInstance를 안 부르면
     setMatrixAt에서 Invalid instanceId 오류가 나 3D가 꺼집니다.)
     색은 vertex color 속성에 구워 넣습니다. ---------- */
  var _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
  function compose(x, y, z, rotZ, sx, sy, sz) {
    _e.set(0, 0, rotZ); _q.setFromEuler(_e); _v.set(x, y, z); _s.set(sx, sy, sz);
    _m4.compose(_v, _q, _s); return _m4;
  }
  function colorize(geo, hex) {
    // non-indexed로 바꾸고(혼합 금지) 정점마다 같은 색을 구움
    var g = geo.index ? geo.toNonIndexed() : geo;
    var n = g.attributes.position.count, arr = new Float32Array(n * 3);
    _c.set(hex);
    for (var i = 0; i < n; i++) { arr[i * 3] = _c.r; arr[i * 3 + 1] = _c.g; arr[i * 3 + 2] = _c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return g;
  }
  function plain(geo) { return geo.index ? geo.toNonIndexed() : geo; }
  function makeBatched(defs, material) {
    // defs: [{key, geo, color(없으면 무색), count}]
    var totalV = 0, totalSlots = 0, slots = {};
    defs.forEach(function (d) {
      var g = d.color ? colorize(d.geo, d.color) : plain(d.geo);
      totalV += g.attributes.position.count * d.count; totalSlots += d.count;
      slots[d.key] = { geo: g, count: d.count, ids: [] };
    });
    var m = new THREE.BatchedMesh(totalSlots + 8, totalV + 256, 0, material);
    m.frustumCulled = false;
    defs.forEach(function (d) {
      for (var i = 0; i < d.count; i++) slots[d.key].ids.push(m.addInstance(m.addGeometry(slots[d.key].geo)));
    });
    scene.add(m);
    return { mesh: m, slots: slots };
  }
  function setInst(b, slotId, x, y, z, rotZ, sx, sy, sz) {
    b.mesh.setMatrixAt(slotId, compose(x, y, z, rotZ, sx, sy, sz));
    b.mesh.setVisibleAt(slotId, true);
  }
  function hideInst(b, slotId) { b.mesh.setVisibleAt(slotId, false); }
  function downGeo(r, h, seg) { var g = new THREE.ConeGeometry(r, h, seg || 4); g.rotateZ(Math.PI); return g; }
  var units = makeBatched([
    { key: 'drone', geo: downGeo(14, 30), color: '#ff5d8f', count: 40 },
    { key: 'weaver', geo: new THREE.OctahedronGeometry(16), color: '#ffb547', count: 30 },
    { key: 'gunner', geo: new THREE.BoxGeometry(26, 30, 14), color: '#b48cff', count: 12 },
    { key: 'tank', geo: (function () { var g = new THREE.CylinderGeometry(26, 26, 16, 8); g.rotateX(Math.PI / 2); return g; })(), color: '#ff7a45', count: 6 },
    { key: 'dasher', geo: downGeo(13, 34), color: '#7dff9b', count: 12 },
    { key: 'splitter', geo: new THREE.IcosahedronGeometry(18, 0), color: '#ff9ecf', count: 8 },
    { key: 'mini', geo: new THREE.TetrahedronGeometry(9), color: '#ff9ecf', count: 12 },
    { key: 'sniper', geo: downGeo(12, 30), color: '#9be7ff', count: 8 },
    { key: 'shielded', geo: new THREE.BoxGeometry(30, 30, 12), color: '#8a90b0', count: 6 },
    { key: 'meteor', geo: new THREE.DodecahedronGeometry(15, 0), color: '#c8b8a0', count: 10 },
    { key: 'boss1', geo: (function () { var g = new THREE.SphereGeometry(50, 14, 10); g.scale(1, 1, 0.55); return g; })(), color: '#c05eff', count: 1 },
    { key: 'boss2', geo: (function () { var g = new THREE.DodecahedronGeometry(55, 0); g.scale(1.25, 1, 0.6); return g; })(), color: '#ff9a3c', count: 1 },
    { key: 'boss3', geo: (function () { var g = new THREE.SphereGeometry(56, 14, 10); g.scale(1, 1.1, 0.55); return g; })(), color: '#ff2a5e', count: 1 },
    { key: 'debris', geo: new THREE.TetrahedronGeometry(5), color: '#ff5d8f', count: 12 },
    { key: 'debris2', geo: new THREE.TetrahedronGeometry(5), color: '#ffb547', count: 12 },
    { key: 'debris3', geo: new THREE.TetrahedronGeometry(5), color: '#b48cff', count: 12 },
    { key: 'debris4', geo: new THREE.TetrahedronGeometry(5), color: '#5ee7ff', count: 12 },
    { key: 'debris5', geo: new THREE.TetrahedronGeometry(5), color: '#ffd166', count: 12 }
  ], new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.45, metalness: 0.3, flatShading: true }));
  var boltMat = new THREE.MeshBasicMaterial({ color: 0x5ee7ff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  var bolts = makeBatched([
    { key: 'bolt', geo: new THREE.BoxGeometry(5, 26, 5), count: 220 }
  ], boltMat);
  var orbs = makeBatched([
    { key: 'pink', geo: new THREE.SphereGeometry(7, 8, 6), color: '#ff5d8f', count: 50 },
    { key: 'orange', geo: new THREE.SphereGeometry(7, 8, 6), color: '#ffb547', count: 40 },
    { key: 'purple', geo: new THREE.SphereGeometry(7, 8, 6), color: '#b48cff', count: 40 },
    { key: 'red', geo: new THREE.SphereGeometry(7, 8, 6), color: '#ff5a3c', count: 40 },
    { key: 'crimson', geo: new THREE.SphereGeometry(7, 8, 6), color: '#ff2a5e', count: 30 }
  ], new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
  var DEBRIS_KEYS = ['debris', 'debris2', 'debris3', 'debris4', 'debris5'];
  var ORB_BY_COLOR = { '#ff5d8f': 'pink', '#ffb547': 'orange', '#b48cff': 'purple', '#ff5a3c': 'red', '#ff2a5e': 'crimson', '#9be7ff': 'purple', '#7dff9b': 'orange', '#ff9ecf': 'pink', '#ff7a45': 'orange', '#8a90b0': 'purple', '#c8b8a0': 'orange' };

  /* 플레이어 기체 (기체별 색은 상태로 받아옴) */
  var me = new THREE.Group();
  var meBodyMat = new THREE.MeshStandardMaterial({ color: 0xd8efff, roughness: 0.3, metalness: 0.4, flatShading: true, emissive: 0x0a2a3a, emissiveIntensity: 0.7 });
  var meBody = new THREE.Mesh(new THREE.ConeGeometry(15, 46, 4), meBodyMat); meBody.scale.z = 0.5; me.add(meBody);
  var meWingMat = new THREE.MeshStandardMaterial({ color: 0x355a80, roughness: 0.4, metalness: 0.5, flatShading: true });
  [-1, 1].forEach(function (s) {
    var w = new THREE.Mesh(new THREE.BoxGeometry(30, 5, 3), meWingMat);
    w.position.set(s * 20, -12, 0); w.rotation.z = s * -0.35; me.add(w);
  });
  var meGlow = X.glow('#ffffff', 110, 0.55); meGlow.material.color.set('#5ee7ff'); me.add(meGlow);
  var meFlame = new THREE.Mesh(new THREE.ConeGeometry(7, 26, 6), new THREE.MeshBasicMaterial({ color: 0x9be7ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  meFlame.geometry.rotateZ(Math.PI); meFlame.position.set(0, -34, 0); me.add(meFlame);
  var muzzle = X.glow('#ffffff', 70, 0.95); muzzle.position.set(0, 30, 6); muzzle.visible = false; me.add(muzzle);
  var meLight = new THREE.PointLight(0x5ee7ff, 60, 320, 1.8); me.add(meLight);
  me.position.z = 30; scene.add(me);
  var lastShipColor = '';

  /* 최종 보스 분절 촉수 (마디 8개가 따로 움직임) */
  var segGroup = new THREE.Group(); scene.add(segGroup);
  var segMat = new THREE.MeshStandardMaterial({ color: 0xff2a5e, roughness: 0.4, metalness: 0.3, emissive: 0x5a0a20, emissiveIntensity: 0.9, flatShading: true });
  var segs = [];
  for (var si = 0; si < 8; si++) {
    var sm = new THREE.Mesh(new THREE.SphereGeometry(Math.max(4, 13 - si * 1.4), 10, 8), segMat);
    sm.scale.z = 0.6; segGroup.add(sm); segs.push(sm);
  }
  segGroup.visible = false;
  var bossCrown = new THREE.Mesh(new THREE.ConeGeometry(16, 26, 5), new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.25, metalness: 0.8, emissive: 0x6a4a00, emissiveIntensity: 0.8 }));
  bossCrown.position.set(0, 62, 0); segGroup.add(bossCrown);

  /* 폭발 글로우 풀 + 궁극 연출 */
  var glowPool = [];
  for (var gi = 0; gi < 12; gi++) { var gl = X.glow('#ffffff', 120, 0); scene.add(gl); glowPool.push(gl); }
  var stormRing = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48), new THREE.MeshBasicMaterial({ color: 0x9be7ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  stormRing.position.z = 40; scene.add(stormRing);
  var laserBeam = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, H, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  laserBeam.rotation.x = 0; scene.add(laserBeam);
  var warpGlow = X.glow('#9be7ff', 320, 0); scene.add(warpGlow);
  /* 보스 등장 볼류메트릭 빛줄기: 원뿔 + 탐색광 글로우 */
  var introCone = new THREE.Mesh(new THREE.ConeGeometry(170, 520, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xff8899, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  introCone.geometry.rotateZ(Math.PI); scene.add(introCone);
  var searchGlow = X.glow('#ff8899', 200, 0); scene.add(searchGlow);

  return {
    camera: cam,
    update: function (s, dt, o, time) {
      var i, j;
      var playing = s.state === 'playing';
      var mob = s.mob || 1; // 모바일에서는 기체·적기·탄을 크게 그린다
      /* 페이즈 배경 교체 */
      if (s.phase && s.phase !== curPhase) {
        curPhase = s.phase; scene.background = bgTex[curPhase] || bgTex[1];
        var cols = nebCols[curPhase] || nebCols[1];
        for (i = 0; i < nebs.length; i++) nebs[i].material.color.set(cols[i % cols.length]);
        rockGroup.visible = curPhase === 2;
        fortGroup.visible = curPhase === 3; pillarGroup.visible = curPhase === 3;
      }
      var spd = playing ? 1 : 0.35;
      /* 별 3겹 시차 */
      for (i = 0; i < starLayers.length; i++) {
        var L = starLayers[i], pos = L.pts.geometry.attributes.position.array;
        for (j = 0; j < L.n; j++) {
          pos[j * 3 + 1] -= L.speed * spd * dt;
          if (pos[j * 3 + 1] < -H - 10) { pos[j * 3 + 1] += H + 20; pos[j * 3] = Math.random() * W; }
        }
        L.pts.geometry.attributes.position.needsUpdate = true;
      }
      for (i = 0; i < nebs.length; i++) {
        var nb = nebs[i]; nb.position.y -= nb.userData.sp * spd * dt;
        if (nb.position.y < -H - 200) { nb.position.y = 200; nb.position.x = Math.random() * W; }
      }
      planet.position.y += 7 * spd * dt;
      if (planet.position.y > H + 220) { planet.position.y = -220; planet.position.x = 60 + Math.random() * (W - 120); planetS = 0.55 + Math.random() * 0.45; planet.scale.set(planetS, planetS, 1); }
      if (curPhase === 2) {
        for (i = 0; i < rocks.length; i++) {
          var rk = rocks[i]; rk.position.y -= rk.userData.sp * spd * dt; rk.rotation.z += rk.userData.vr * dt;
          if (rk.position.y < -H - 60) { rk.position.y = 60; rk.position.x = Math.random() * W; }
        }
      }
      if (curPhase === 3) {
        fortGroup.children.forEach(function (f) {
          f.position.y -= 8 * spd * dt;
          if (f.position.y < -H - 200) f.position.y += H + 400;
        });
        for (i = 0; i < pillars.length; i++) {
          var pc = pillars[i]; pc.position.y -= 30 * spd * dt;
          if (pc.position.y < -H - 120) pc.position.y += H + 240;
        }
      }
      /* 플레이어 */
      var P = s.P, alive = P && s.state !== 'ready' && (s.dyingT <= 0 || s.lives > 0);
      me.visible = !!P && (s.state === 'ready' || alive);
      if (P) {
        var px = s.state === 'ready' ? W / 2 : P.x, py = s.state === 'ready' ? H - 170 + Math.sin(time * 2) * 8 : P.y;
        var blink = s.state !== 'ready' && P.inv > 0 && Math.floor(P.inv * 14) % 2 === 0;
        me.visible = me.visible && !blink;
        me.position.set(px, -py, 30);
        me.rotation.z = -(s.state === 'ready' ? 0 : P.tilt) * 0.18;
        me.scale.set((1 - Math.abs(P.tilt || 0) * 0.16) * mob, mob, mob);
        if (s.shipColor && s.shipColor !== lastShipColor) {
          lastShipColor = s.shipColor;
          meBodyMat.emissive.set(s.shipColor); meGlow.material.color.set(s.shipColor); meLight.color.set(s.shipColor);
          meFlame.material.color.set(s.shipColor);
        }
        var fz = 0.85 + Math.random() * 0.3;
        meFlame.scale.set(fz, fz * (1.1 + Math.sin(time * 31) * 0.15), 1);
        muzzle.visible = s.state === 'playing' && P.fireT > 0.075;
        if (muzzle.visible) { var ms = 0.8 + Math.random() * 0.5; muzzle.scale.set(ms * 70, ms * 70, 1); }
      }
      /* 적기·파편 (BatchedMesh 슬롯) */
      var cnt = {};
      Object.keys(units.slots).forEach(function (k) { cnt[k] = 0; });
      var ens = s.enemies || [];
      for (i = 0; i < ens.length; i++) {
        var e = ens[i], sl = units.slots[e.type];
        if (!sl) continue;
        var n = cnt[e.type] || 0;
        if (n >= sl.count) continue;
        cnt[e.type] = n + 1;
        var sq = e.hit > 0 ? e.hit / 0.08 : 0;
        var rot = e.type === 'weaver' ? -e.t * 2 : 0;
        var ez = e.type.indexOf('boss') === 0 ? 20 : 0;
        setInst(units, sl.ids[n], e.x, -e.y, ez, rot, (1 + sq * 0.18) * mob, (1 - sq * 0.18) * mob, mob);
      }
      var dbs = s.debris || [];
      for (i = 0; i < dbs.length; i++) {
        var dk = DEBRIS_KEYS[i % DEBRIS_KEYS.length], dsl = units.slots[dk];
        var dn = cnt[dk] || 0;
        if (dn >= dsl.count) continue;
        cnt[dk] = dn + 1;
        var q = dbs[i];
        var ds = Math.max(0.2, q.sz / 5) * Math.min(1, q.life * 2);
        setInst(units, dsl.ids[dn], q.x, -q.y, 5, -q.a, ds, ds, ds);
      }
      Object.keys(units.slots).forEach(function (k) {
        var s2 = units.slots[k], used = cnt[k] || 0;
        for (var u = used; u < s2.count; u++) hideInst(units, s2.ids[u]);
      });
      /* 탄환 (BatchedMesh 슬롯) */
      if (s.shipColor) boltMat.color.set(s.shipColor);
      var bc = 0;
      var bls = s.bullets || [];
      for (i = 0; i < bls.length && bc < bolts.slots.bolt.count; i++) {
        var b = bls[i];
        setInst(bolts, bolts.slots.bolt.ids[bc++], b.x, -b.y, 10, -Math.atan2(b.vx, -b.vy), mob, mob, 1);
      }
      for (var u2 = bc; u2 < bolts.slots.bolt.count; u2++) hideInst(bolts, bolts.slots.bolt.ids[u2]);
      var ocnt = {};
      Object.keys(orbs.slots).forEach(function (k) { ocnt[k] = 0; });
      var ebl = s.ebullets || [];
      for (i = 0; i < ebl.length; i++) {
        var eb = ebl[i], ok = ORB_BY_COLOR[eb.c] || 'pink', osl = orbs.slots[ok];
        var on = ocnt[ok] || 0;
        if (on >= osl.count) continue;
        ocnt[ok] = on + 1;
        var osc = (eb.homing ? 1.25 : 1) * mob;
        setInst(orbs, osl.ids[on], eb.x, -eb.y, 10, 0, osc, osc, 1);
      }
      Object.keys(orbs.slots).forEach(function (k) {
        var s3 = orbs.slots[k], used3 = ocnt[k] || 0;
        for (var u3 = used3; u3 < s3.count; u3++) hideInst(orbs, s3.ids[u3]);
      });
      /* 폭발 글로우 풀 */
      var bms = s.booms || [];
      for (i = 0; i < glowPool.length; i++) {
        var gp = glowPool[i], bm = bms[i];
        if (!bm) { gp.material.opacity = 0; continue; }
        var bt = 1 - bm.t / 0.7;
        gp.position.set(bm.x, -bm.y, 50);
        var gs = bm.s * 130 * (0.6 + bt * 0.8); gp.scale.set(gs, gs, 1);
        gp.material.color.set(bm.c || '#ffd166');
        gp.material.opacity = Math.max(0, bt) * 0.85;
      }
      /* 최종 보스 분절 촉수 */
      var isB3 = s.boss && s.boss.type === 'boss3';
      segGroup.visible = !!isB3;
      if (isB3) {
        var b3 = s.boss;
        for (i = 0; i < segs.length; i++) {
          segs[i].position.set(
            b3.x + Math.sin(b3.t * 2.2 + i * 0.7) * (14 + i * 7),
            -(b3.y - b3.r * 0.55 - i * 15),
            10 - i * 2);
          segs[i].rotation.z = Math.sin(time * 3 + i) * 0.4;
        }
        bossCrown.position.set(b3.x, -(b3.y - b3.r * 0.75 - 8), 22);
        bossCrown.rotation.z = Math.sin(time * 2) * 0.08;
      }
      /* 궁극 연출 */
      var uf = s.ultFx;
      if (uf && uf.t < 1.2) {
        var ut = uf.t / 1.2;
        stormRing.material.opacity = (1 - ut) * 0.9;
        var rs2 = 60 + ut * 480; stormRing.scale.set(rs2 / 100, rs2 / 100, 1);
        stormRing.position.set(P ? P.x : W / 2, -(P ? P.y : H - 150), 40);
        if (uf.kind === 'storm') stormRing.material.color.set(0x9be7ff);
        else if (uf.kind === 'laser') stormRing.material.color.set(0xffd166);
        else stormRing.material.color.set(0x9be7ff);
      } else stormRing.material.opacity = 0;
      var lasering = P && P.laserT > 0 && playing;
      laserBeam.material.opacity = lasering ? 0.55 + Math.sin(time * 30) * 0.1 : 0;
      if (lasering) {
        laserBeam.position.set(P.x, -(P.y - 40) / 2 - (H - P.y + 40) / 2 + (P.y - 40) / 2, 45);
        laserBeam.position.y = -((P.y - 40) / 2);
        laserBeam.scale.y = (P.y - 40) / H;
      }
      var warping = P && P.warpT > 0 && playing;
      warpGlow.material.opacity = warping ? 0.35 + Math.sin(time * 6) * 0.1 : 0;
      if (warping && P) { warpGlow.position.set(P.x, -P.y, 40); }
      /* 보스 등장 볼류메트릭 빛줄기 + 탐색광 */
      var bi = s.bossIntroT || 0;
      if (s.boss && bi > 0) {
        var ba = Math.min(1, bi);
        introCone.material.opacity = 0.14 * ba;
        introCone.position.set(s.boss.x, -(s.boss.y - 260), 60);
        introCone.rotation.z = Math.sin(time * 1.4) * 0.25;
        searchGlow.material.opacity = 0.6 * ba;
        var sa = time * 1.8;
        searchGlow.position.set(s.boss.x + Math.cos(sa) * 130, -(s.boss.y + Math.sin(sa) * 60), 70);
      } else { introCone.material.opacity = 0; searchGlow.material.opacity = 0; }
      /* 카메라 */
      cam.setEye(W * 0.5, H * 0.42);
      cam.fitPlane(W, H, o[0], o[1]);
    }
  };
});
