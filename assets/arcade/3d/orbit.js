/* 오빗 점프 3D 장면 (게임 규칙은 docs/tools/games/orbit.js 그대로, 그림만 3D)
   게임 평면(z=0)에 행성이 놓이고, 별·성운은 뒤쪽 깊은 곳에 있어 카메라가 오를 때 입체적으로 흘러갑니다. */
Arcade.G3D.define('orbit', function (X) {
  'use strict';
  var THREE = X.THREE, A = Arcade, scene = X.scene;
  var W = 540, H = 960;
  var cam = X.planeCam(W / 2, H * 0.52, 1100);

  /* 우주 배경 */
  scene.background = X.gradTex([[0, '#02010a'], [0.6, '#070418'], [1, '#140826']]);
  var nebTex = X.canvasTex(512, 1024, function (x, w, h) {
    var cols = ['rgba(180,140,255,', 'rgba(255,90,160,', 'rgba(94,231,255,', 'rgba(255,122,69,'];
    for (var i = 0; i < 26; i++) {
      var cx = Math.random() * w, cy = Math.random() * h, r = 60 + Math.random() * 200, c = cols[i % cols.length];
      var g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, c + '0.075)'); g.addColorStop(1, c + '0)');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    }
  });
  nebTex.wrapT = THREE.RepeatWrapping;
  var neb = new THREE.Mesh(new THREE.PlaneGeometry(3400, 6800), new THREE.MeshBasicMaterial({ map: nebTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  neb.position.set(W / 2, 0, -2600); scene.add(neb);
  // 별 층: 같은 별 묶음을 위아래로 3장 이어 붙여 끝없이 이어지게 (f: 카메라를 따라가는 정도)
  function layer(n, spread, depth, size, f) {
    var g = new THREE.Group(), base = X.stars(n, [spread[0], spread[1]], depth, size);
    for (var k = -1; k <= 1; k++) { var c = k ? new THREE.Points(base.geometry, base.material) : base; c.position.y = k * spread[1]; g.add(c); }
    g.userData = { span: spread[1], f: f }; scene.add(g); return g;
  }
  var starLayers = [
    layer(X.level >= 2 ? 500 : 250, [3600, 4000], [-2400, -1600], 7, 0.2),
    layer(X.level >= 2 ? 160 : 80, [1600, 2400], [-900, -500], 5, 0)
  ];

  /* 빛: 왼쪽 위의 먼 별빛 + 파란 반사광 */
  var sunL = new THREE.DirectionalLight(0xfff0e0, 2.4); sunL.position.set(-600, 500, 700); scene.add(sunL); scene.add(sunL.target);
  var fill = new THREE.DirectionalLight(0x6a8cff, 0.6); fill.position.set(500, -300, 300); scene.add(fill);
  scene.add(new THREE.AmbientLight(0x2a2050, 0.7));

  /* 행성 표면 무늬 (색마다 한 번 만들어 재사용) */
  var texCache = {};
  function planetTex(hex, kind) {
    var k = hex + kind; if (texCache[k]) return texCache[k];
    var base = new THREE.Color(hex), hsl = {}; base.getHSL(hsl);
    return (texCache[k] = X.canvasTex(256, 128, function (x, w, h) {
      for (var y = 0; y < h; y++) {
        var band = Math.sin(y * 0.18 + Math.sin(y * 0.05) * 3) * 0.5 + 0.5;
        var l = kind ? 0.35 + band * 0.3 : 0.42 + band * 0.18;
        x.fillStyle = 'hsl(' + Math.round(hsl.h * 360 + (band - 0.5) * 24) + ',' + Math.round(hsl.s * 85) + '%,' + Math.round(l * 100) + '%)';
        x.fillRect(0, y, w, 1);
      }
      // 크레이터·폭풍
      for (var i = 0; i < 40; i++) {
        var cx = Math.random() * w, cy = 10 + Math.random() * (h - 20), r = 2 + Math.random() * (kind ? 10 : 6);
        x.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '0,0,0,' : '255,255,255,') + (0.08 + Math.random() * 0.12) + ')';
        x.beginPath(); x.ellipse(cx, cy, r * (kind ? 2.2 : 1), r, 0, 0, Math.PI * 2); x.fill();
      }
    }));
  }
  var sphereGeo = new THREE.SphereGeometry(1, X.level >= 2 ? 48 : 28, X.level >= 2 ? 32 : 18);
  var ringGeo = new THREE.RingGeometry(1.35, 1.95, 64);
  var orbitGeo = (function () {
    var pts = []; for (var i = 0; i <= 96; i++) { var a = i / 96 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0)); }
    return new THREE.BufferGeometry().setFromPoints(pts);
  })();
  function makePlanet(p) {
    var g = new THREE.Group(), hex = p.c, col = new THREE.Color(hex), kind = Math.random() < 0.5 ? 1 : 0;
    var body = new THREE.Mesh(sphereGeo, new THREE.MeshStandardMaterial({ map: planetTex(hex, kind), roughness: 0.75, metalness: 0.05, emissive: col, emissiveIntensity: 0.12 }));
    body.scale.setScalar(p.r); body.rotation.set(0.35, 0, 0.25); g.add(body);
    var atm = X.glow(hex, p.r * 3.4, 0.55); atm.position.z = -p.r * 0.6; g.add(atm);
    if (Math.random() < 0.45) {
      var ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: col.clone().lerp(new THREE.Color(0xffffff), 0.4), transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
      ring.scale.setScalar(p.r); ring.rotation.set(1.2, 0.3, -0.4); g.add(ring);
    }
    var orbit = new THREE.Line(orbitGeo, new THREE.LineDashedMaterial({ color: col, dashSize: 0.05, gapSize: 0.1, transparent: true, opacity: 0.45 }));
    orbit.computeLineDistances(); orbit.scale.setScalar(p.r + 28); g.add(orbit);
    g.userData = { body: body, orbit: orbit, rocks: [] };
    return g;
  }
  var rockGeo = (function () {
    var gg = new THREE.IcosahedronGeometry(14, 1), pa = gg.attributes.position;
    for (var i = 0; i < pa.count; i++) { var f = 0.75 + Math.random() * 0.45; pa.setXYZ(i, pa.getX(i) * f, pa.getY(i) * f, pa.getZ(i) * f); }
    gg.computeVertexNormals(); return gg;
  })();
  var rockMat = new THREE.MeshStandardMaterial({ color: 0x6b5a7a, roughness: 0.9, flatShading: true, emissive: 0x3a0010, emissiveIntensity: 0.6 });
  function makeRock() { var g = new THREE.Group(); var m = new THREE.Mesh(rockGeo, rockMat); g.add(m); var d = X.glow('#ff4d6d', 70, 0.55); g.add(d); g.userData.m = m; return g; }

  /* 우주선 */
  var ship = new THREE.Group();
  var hull = new THREE.Mesh(new THREE.ConeGeometry(8, 26, 12), X.std(0xf4f6ff, { r: 0.25, m: 0.6, e: 0x223355, ei: 0.4 }));
  hull.rotation.z = -Math.PI / 2; ship.add(hull);
  var wingGeo = new THREE.BoxGeometry(12, 22, 2), wing = new THREE.Mesh(wingGeo, X.std(0xff7a45, { r: 0.4, e: 0xff4a10, ei: 0.5 }));
  wing.position.x = -6; ship.add(wing);
  var flame = X.glow('#ff9e6b', 44, 1); flame.position.x = -16; ship.add(flame);
  var shipGlow = X.glow('#ffb08a', 70, 0.4); ship.add(shipGlow);
  ship.scale.setScalar(1.35); scene.add(ship);
  // 꼬리
  var TRAIL = 22, trail = [];
  for (var i = 0; i < TRAIL; i++) { var t = X.glow('#ff7a45', 26, 0); scene.add(t); trail.push(t); }
  var trailPts = [];

  /* 조준선 */
  var aimGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(160, 0, 0)]);
  var aim = new THREE.Line(aimGeo, new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 6, gapSize: 10, transparent: true, opacity: 0.5 }));
  aim.computeLineDistances(); scene.add(aim);

  /* 별(먹는 것) */
  var gemGeo = new THREE.OctahedronGeometry(9, 0), gemMat = X.std(0xffd166, { r: 0.15, m: 0.8, e: 0xffa020, ei: 0.9 });
  var gems = [];
  function makeGem() { var g = new THREE.Group(); g.add(new THREE.Mesh(gemGeo, gemMat)); g.add(X.glow('#ffd166', 64, 0.85)); scene.add(g); return g; }

  var planetMeshes = new Map(), demo = null, camY = 0;
  function demoPlanets() {
    return [{ x: W / 2, y: 700, r: 46, c: '#ff7a45', spin: 2, rocks: [] }, { x: 150, y: 430, r: 40, c: '#5ee7ff', spin: -2, rocks: [] }, { x: 400, y: 170, r: 44, c: '#b48cff', spin: 2, rocks: [] }];
  }

  return {
    camera: cam,
    map: function (x, y) { return [x, y + camY, 1]; },
    update: function (s, dt, o, time) {
      var list = s.planets && s.ship ? s.planets : (demo || (demo = demoPlanets()));
      camY = s.ship ? (s.cam || 0) : 0;
      // 행성 맞추기 (Map 으로 객체마다 메시 하나)
      var seen = new Set();
      for (var i = 0; i < list.length; i++) {
        var p = list[i], g = planetMeshes.get(p);
        if (!g) { g = makePlanet(p); planetMeshes.set(p, g); scene.add(g); }
        seen.add(p);
        g.position.set(p.x, -p.y, 0);
        g.userData.body.rotation.y += (p.spin || 1) * dt * 0.25;
        g.userData.orbit.rotation.z -= (p.spin || 1) * dt * 0.15;
        var rocks = p.rocks || [];
        while (g.userData.rocks.length < rocks.length) { var rk = makeRock(); g.add(rk); g.userData.rocks.push(rk); }
        for (var k = 0; k < rocks.length; k++) {
          var r = rocks[k], rm = g.userData.rocks[k];
          rm.position.set(Math.cos(r.a) * r.d, -Math.sin(r.a) * r.d, 0);
          rm.userData.m.rotation.x += dt * 1.3; rm.userData.m.rotation.y += dt * 0.9;
        }
      }
      planetMeshes.forEach(function (g, p) { if (!seen.has(p)) { scene.remove(g); g.traverse(function (o2) { if (o2.material && o2.material !== rockMat) o2.material.dispose(); }); planetMeshes.delete(p); } });
      // 우주선
      var sh = s.ship, alive = !(s.dying > 0);
      if (sh) {
        ship.visible = alive;
        ship.position.set(sh.x, -sh.y, 6);
        var ang = sh.fly ? Math.atan2(sh.vy, sh.vx) : sh.a + Math.PI / 2 * Math.sign(sh.p.spin);
        ship.rotation.set(0, 0, -ang);
        hull.rotation.x += dt * 6;
        flame.scale.setScalar((sh.fly ? 56 : 34) * (0.85 + Math.random() * 0.3));
        if (sh.fly) { trailPts.push([sh.x, sh.y]); if (trailPts.length > TRAIL) trailPts.shift(); } else if (trailPts.length) trailPts.shift();
        aim.visible = !sh.fly && alive && s.playing;
        if (aim.visible) { var dir = Math.sign(sh.p.spin), tx = -Math.sin(sh.a) * dir, ty = Math.cos(sh.a) * dir; aim.position.set(sh.x, -sh.y, 4); aim.rotation.set(0, 0, Math.atan2(-ty, tx)); }
      } else {
        // 시작 화면: 첫 행성 둘레를 도는 우주선
        var a0 = time * 2; ship.visible = true; aim.visible = false;
        ship.position.set(W / 2 + Math.cos(a0) * 74, -(700 + Math.sin(a0) * 74), 6); ship.rotation.set(0, 0, -(a0 + Math.PI / 2));
        trailPts.length = 0;
      }
      for (i = 0; i < TRAIL; i++) {
        var tp = trailPts[i], ts = trail[i];
        if (!tp) { ts.visible = false; continue; }
        ts.visible = true; ts.position.set(tp[0], -tp[1], 2);
        var f = (i + 1) / trailPts.length; ts.material.opacity = f * 0.7; ts.scale.setScalar(10 + f * 22);
      }
      // 별
      var st = (s.stars || []).filter(function (q) { return !q.got; });
      while (gems.length < st.length) gems.push(makeGem());
      for (i = 0; i < gems.length; i++) {
        var gm = gems[i], sd = st[i];
        gm.visible = !!sd; if (!sd) continue;
        gm.position.set(sd.x, -(sd.y + Math.sin(time * 4 + sd.x) * 4), 4);
        gm.children[0].rotation.y = time * 2.5; gm.children[0].rotation.x = time * 1.1;
      }
      // 카메라 (평면 고정, 살짝 흔들림)
      cam.setEye(W / 2 + Math.sin(time * 0.3) * 40, H * 0.52);
      cam.fitPlane(W, H, o[0], -camY + o[1]);
      neb.position.y = cam.position.y * 0.6;
      nebTex.offset.y = (-cam.position.y * 0.00004) % 1;
      starLayers.forEach(function (L) { var u = L.userData, rel = cam.position.y * (1 - u.f); L.position.y = cam.position.y - (((rel % u.span) + u.span) % u.span); });
      sunL.target.position.set(W / 2, cam.position.y, 0); sunL.position.set(-600, cam.position.y + 500, 700);
    }
  };
});
