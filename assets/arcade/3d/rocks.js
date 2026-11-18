/* 우주 광부 3D 장면 (게임 규칙은 docs/tools/games/rocks.js 그대로, 그림만 3D)
   게임 평면(z=0)에 운석·우주선이 있고, 뒤쪽 깊은 곳에 행성·성운·별이 있습니다. */
Arcade.G3D.define('rocks', function (X) {
  'use strict';
  var THREE = X.THREE, A = Arcade, scene = X.scene;
  var W = 540, H = 960;
  var cam = X.planeCam(W / 2, H / 2, 1200);
  scene.background = X.gradTex([[0, '#02040c'], [0.6, '#050a1a'], [1, '#0a0f24']]);

  /* 배경: 큰 행성, 성운, 별 */
  var neb = new THREE.Mesh(new THREE.PlaneGeometry(2600, 3600), new THREE.MeshBasicMaterial({ map: X.canvasTex(512, 720, function (x, w, h) {
    var cols = ['rgba(94,160,255,', 'rgba(155,231,255,', 'rgba(180,120,255,'];
    for (var i = 0; i < 22; i++) { var cx = Math.random() * w, cy = Math.random() * h, r = 60 + Math.random() * 180, c = cols[i % 3]; var g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, c + '0.09)'); g.addColorStop(1, c + '0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); }
  }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  neb.position.set(W / 2, -H / 2, -2200); scene.add(neb);
  var stars = X.stars(X.level >= 2 ? 600 : 300, [3000, 4200], [-2000, -1200], 7); stars.position.set(W / 2, -H / 2, 0); scene.add(stars);
  var planetTex = X.canvasTex(512, 256, function (x, w, h) {
    for (var y = 0; y < h; y++) { var b = Math.sin(y * 0.09 + Math.sin(y * 0.02) * 4) * 0.5 + 0.5; x.fillStyle = 'hsl(' + (200 + b * 30) + ',55%,' + (22 + b * 22) + '%)'; x.fillRect(0, y, w, 1); }
    for (var i = 0; i < 60; i++) { x.fillStyle = 'rgba(255,255,255,' + Math.random() * 0.1 + ')'; x.beginPath(); x.ellipse(Math.random() * w, Math.random() * h, 10 + Math.random() * 40, 3 + Math.random() * 6, 0, 0, 7); x.fill(); }
  });
  var planet = new THREE.Mesh(new THREE.SphereGeometry(520, 48, 32), new THREE.MeshStandardMaterial({ map: planetTex, roughness: 0.8 }));
  planet.position.set(-700, -H - 900, -2600); planet.rotation.set(0.3, 0, 0.4); scene.add(planet);
  var atm = X.glow('#5ea8ff', 1800, 0.35); atm.position.set(-700, -H - 900, -2650); scene.add(atm);

  /* 빛 */
  var sun = new THREE.DirectionalLight(0xfff2e0, 2.6); sun.position.set(700, 500, 600); sun.target.position.set(W / 2, -H / 2, 0); scene.add(sun); scene.add(sun.target);
  scene.add(new THREE.AmbientLight(0x4a5070, 1.6));
  var rim = new THREE.DirectionalLight(0x6ab8ff, 0.8); rim.position.set(-500, -400, 200); scene.add(rim);

  /* 운석: 크기마다 모양 몇 가지를 미리 만들어 둠 */
  var rockTex = X.canvasTex(256, 128, function (x, w, h) {
    x.fillStyle = '#5a5060'; x.fillRect(0, 0, w, h);
    for (var i = 0; i < 260; i++) { var r = 1 + Math.random() * 7; x.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '20,15,25,' : '200,180,150,') + (0.15 + Math.random() * 0.25) + ')'; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, r, 0, 7); x.fill(); }
  });
  var shapes = {};
  function rockGeo(size, k) {
    var key = size + '_' + k; if (shapes[key]) return shapes[key];
    var r = [0, 18, 32, 52][size], g = new THREE.IcosahedronGeometry(r, size >= 3 ? 2 : 1), p = g.attributes.position, seed = k * 13.7 + size;
    for (var i = 0; i < p.count; i++) {
      var vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i), n = Math.sin(vx * 0.21 + seed) * Math.cos(vy * 0.17 - seed) * Math.sin(vz * 0.19 + seed * 0.5);
      var f = 0.82 + n * 0.22 + (Math.sin(i * 12.9898 + seed) * 0.5 + 0.5) * 0.1; p.setXYZ(i, vx * f, vy * f, vz * f * 0.85);
    }
    g.computeVertexNormals(); return (shapes[key] = g);
  }
  var rockMat = new THREE.MeshStandardMaterial({ map: rockTex, roughness: 0.92, metalness: 0.05, flatShading: true, color: 0xffffff });
  var rockMeshes = new Map();
  function makeRock(r) {
    var m = new THREE.Mesh(rockGeo(r.size, Math.floor(Math.random() * 4)), rockMat.clone());
    m.rotation.set(Math.random() * 6, Math.random() * 6, 0); m.userData.tumble = [A.rand(-1, 1), A.rand(-1, 1)];
    scene.add(m); return m;
  }

  /* 총알, 광석 */
  var shotTex = X.glowTex('#9be7ff');
  var shotPool = [];
  function shot() { var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: shotTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); s.scale.set(22, 22, 1); scene.add(s); return s; }
  var oreGeo = new THREE.OctahedronGeometry(8, 0), oreMat = X.std(0xffd166, { r: 0.2, m: 0.85, e: 0xffa020, ei: 0.8 });
  var orePool = [];
  function ore() { var g = new THREE.Group(); g.add(new THREE.Mesh(oreGeo, oreMat)); g.add(X.glow('#ffd166', 52, 0.7)); scene.add(g); return g; }

  /* 우주선 */
  var ship = new THREE.Group();
  var hull = new THREE.Mesh(new THREE.ConeGeometry(11, 38, 4), X.std(0xe8fbff, { r: 0.25, m: 0.6, e: 0x1a3a50, ei: 0.4, flat: true }));
  hull.rotation.z = -Math.PI / 2; hull.scale.set(1, 1, 0.55); ship.add(hull);
  var wings = new THREE.Mesh(new THREE.BoxGeometry(14, 34, 3), X.std(0x5ab8e8, { r: 0.3, m: 0.6, e: 0x0a4a70, ei: 0.5 })); wings.position.x = -8; ship.add(wings);
  var cockpit = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 12), X.std(0x0a1020, { r: 0.05, m: 0.9 })); cockpit.position.set(4, 0, 5); ship.add(cockpit);
  var engine = X.glow('#9be7ff', 40, 1); engine.position.x = -22; ship.add(engine);
  var halo = X.glow('#9be7ff', 110, 0.25); ship.add(halo);
  var shipLight = new THREE.PointLight(0x9be7ff, 1.2, 260, 1.6); shipLight.position.z = 40; ship.add(shipLight);
  ship.scale.setScalar(1.35); scene.add(ship);

  function syncList(list, pool, make) {
    while (pool.length < list.length) pool.push(make());
    for (var i = 0; i < pool.length; i++) pool[i].visible = i < list.length;
  }
  return {
    camera: cam,
    update: function (s, dt, o, time) {
      var rocks = s.rocks || [], seen = new Set();
      for (var i = 0; i < rocks.length; i++) {
        var r = rocks[i], m = rockMeshes.get(r);
        if (!m) { m = makeRock(r); rockMeshes.set(r, m); }
        seen.add(r);
        m.position.set(r.x, -r.y, 0);
        m.rotation.z = -r.rot; m.rotation.x += m.userData.tumble[0] * dt; m.rotation.y += m.userData.tumble[1] * dt;
        m.material.emissive.setHex(r.hit > 0 ? 0xffffff : 0x000000); m.material.emissiveIntensity = r.hit > 0 ? 0.9 : 0;
      }
      rockMeshes.forEach(function (m, r) { if (!seen.has(r)) { scene.remove(m); m.material.dispose(); rockMeshes.delete(r); } });
      var shots = s.shots || []; syncList(shots, shotPool, shot);
      for (i = 0; i < shots.length; i++) { var sp = shotPool[i]; sp.position.set(shots[i].x, -shots[i].y, 2); sp.material.rotation = -Math.atan2(shots[i].vy, shots[i].vx); sp.scale.set(30, 14, 1); }
      var ores = s.ores || []; syncList(ores, orePool, ore);
      for (i = 0; i < ores.length; i++) { var og = orePool[i]; og.position.set(ores[i].x, -ores[i].y, 4); og.children[0].rotation.y = time * 3 + i; og.children[0].rotation.x = time * 1.3; }
      var P = s.P;
      if (P) {
        var blink = P.inv > 0 && Math.floor(P.inv * 14) % 2;
        ship.visible = !(s.dying > 0) && !blink;
        ship.position.set(P.x, -P.y, 6); ship.rotation.set(Math.sin(time * 3) * 0.15 + A.clamp((P.vy || 0) * 0.002, -0.4, 0.4) * 0, 0, -P.a);
        hull.rotation.x = A.clamp(-(P.vx * Math.sin(P.a) - P.vy * Math.cos(P.a)) * 0.002, -0.6, 0.6);
        var moving = Math.hypot(P.vx, P.vy);
        engine.scale.setScalar(30 + Math.min(40, moving * 0.12) + Math.random() * 8);
      } else {
        ship.visible = true; ship.position.set(W / 2, -H * 0.6, 6); ship.rotation.set(0, 0, time * 0.8);
      }
      planet.rotation.y += dt * 0.02;
      cam.setEye(W / 2 + (P ? (P.x - W / 2) * 0.15 : Math.sin(time * 0.3) * 50), H / 2 + (P ? (P.y - H / 2) * 0.15 : 0));
      cam.fitPlane(W, H, o[0], o[1]);
    }
  };
});
