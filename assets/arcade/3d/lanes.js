/* 네온 하이웨이 3D 장면 (게임 규칙은 docs/tools/games/lanes.js 그대로, 그림만 3D)
   내 차 뒤에서 따라가는 카메라. 게임 좌표(x: 차선, y: 화면 위→아래)를 도로 위 좌표로 바꿔 그립니다. */
Arcade.G3D.define('lanes', function (X) {
  'use strict';
  var THREE = X.THREE, A = Arcade, scene = X.scene;
  var W = 540, H = 960, LX = [150, 270, 390], PY = 780;
  var KX = 1.0, KZ = 1.6;                 // 게임 좌표 → 도로 좌표 배율 (앞뒤로 길게)
  function wx(x) { return (x - 270) * KX; }
  function wz(y) { return (y - PY) * KZ; }
  var ROAD_W = 380, FAR = -4200;

  var cam = new THREE.PerspectiveCamera(58, W / H, 5, 9000);
  var camBase = new THREE.Vector3(0, 280, 470), look = new THREE.Vector3(0, 10, -560);

  /* 하늘과 해 */
  scene.background = X.gradTex([[0, '#05020f'], [0.45, '#1a0630'], [0.7, '#4a0f4f'], [0.86, '#ff3d7f'], [1, '#ff9e5e']]);
  scene.fog = new THREE.Fog(0x2a0838, 1400, 5200);
  var sunTex = X.canvasTex(512, 512, function (x, w, h) {
    var g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffe066'); g.addColorStop(0.55, '#ff7a45'); g.addColorStop(1, '#ff2d95');
    x.fillStyle = g; x.beginPath(); x.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2); x.fill();
    x.globalCompositeOperation = 'destination-out';
    for (var i = 0; i < 9; i++) { var y = h * 0.52 + i * i * 2.6 + i * 14; x.fillRect(0, y, w, 4 + i * 1.6); }
  });
  var sun = new THREE.Mesh(new THREE.PlaneGeometry(1500, 1500), new THREE.MeshBasicMaterial({ map: sunTex, transparent: true, fog: false, depthWrite: false }));
  sun.position.set(0, 520, -6800); scene.add(sun);
  var sunGlow = X.glow('#ff5d8f', 4200, 0.55); sunGlow.material.fog = false; sunGlow.position.set(0, 560, -6900); scene.add(sunGlow);
  var stars = X.stars(X.level >= 2 ? 700 : 300, [14000, 5000], [-7600, -7000], 14); stars.position.y = 2600; stars.material.fog = false; scene.add(stars);

  /* 네온 산맥 (선으로 그린 실루엣) */
  function ridge(seed, h, col, z) {
    var pts = [], n = 60, w = 16000;
    for (var i = 0; i <= n; i++) {
      var x = -w / 2 + w * i / n, d = Math.abs(x) / 2400;
      var y = d < 0.3 ? 0 : (Math.sin(i * 1.7 + seed) * 0.5 + 0.5) * h * Math.min(1, d) + Math.sin(i * 0.43 + seed * 3) * h * 0.25;
      pts.push(new THREE.Vector3(x, Math.max(0, y), z));
    }
    var shape = new THREE.Shape(); shape.moveTo(-w / 2, 0);
    pts.forEach(function (p) { shape.lineTo(p.x, p.y); }); shape.lineTo(w / 2, 0);
    var m = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: 0x0b0418, fog: false }));
    m.position.z = z; scene.add(m);
    var line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(function (p) { return new THREE.Vector3(p.x, p.y, 0.5); })), new THREE.LineBasicMaterial({ color: col, fog: false }));
    line.position.z = z; scene.add(line);
  }
  ridge(1, 900, 0xb48cff, -6000); ridge(4, 520, 0xff5d8f, -5200);

  /* 땅: 움직이는 네온 격자 */
  var gridTex = X.canvasTex(128, 128, function (x, w, h) {
    x.fillStyle = '#0a0414'; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(255,61,160,.95)'; x.lineWidth = 3; x.strokeRect(0, 0, w, h);
    x.strokeStyle = 'rgba(255,61,160,.25)'; x.lineWidth = 9; x.strokeRect(0, 0, w, h);
  });
  gridTex.wrapS = gridTex.wrapT = THREE.RepeatWrapping; gridTex.repeat.set(60, 50);
  gridTex.anisotropy = X.level >= 2 ? 4 : 1;
  var floor = new THREE.Mesh(new THREE.PlaneGeometry(12000, 10000), new THREE.MeshBasicMaterial({ map: gridTex }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, -2, -3800); scene.add(floor);

  /* 도로 */
  var roadTex = X.canvasTex(256, 256, function (x, w, h) {
    var g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#120a1e'); g.addColorStop(0.5, '#1d1230'); g.addColorStop(1, '#120a1e');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (var i = 0; i < 900; i++) { x.fillStyle = 'rgba(255,255,255,' + Math.random() * 0.05 + ')'; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    // 차선 점선 (120 → 240 사이 칸 3개)
    x.fillStyle = 'rgba(255,255,255,.75)';
    var l1 = w * (130 / ROAD_W), l2 = w * (250 / ROAD_W);
    x.fillRect(l1 - 2, 0, 5, h * 0.5); x.fillRect(l2 - 2, 0, 5, h * 0.5);
  });
  roadTex.wrapS = THREE.ClampToEdgeWrapping; roadTex.wrapT = THREE.RepeatWrapping; roadTex.repeat.set(1, 40);
  roadTex.anisotropy = X.level >= 2 ? 8 : 2;
  var road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, 10000), new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.55, metalness: 0.3 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -3800); road.receiveShadow = X.shadows; scene.add(road);
  // 가장자리 네온
  [-1, 1].forEach(function (s) {
    var e = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 10000), X.basic(0xff7a45));
    e.position.set(s * (ROAD_W / 2 + 2), 3, -3800); scene.add(e);
    var eg = new THREE.Mesh(new THREE.PlaneGeometry(40, 10000), X.basic(0xff7a45, { add: true, o: 0.25 }));
    eg.rotation.x = -Math.PI / 2; eg.position.set(s * (ROAD_W / 2 + 2), 1, -3800); scene.add(eg);
  });

  /* 가로등 (지나가는 불빛) */
  var lamps = [], LAMP_GAP = 320;
  var poleGeo = new THREE.BoxGeometry(5, 150, 5), armGeo = new THREE.BoxGeometry(50, 4, 4);
  var poleMat = X.std(0x2a2040, { r: 0.6 }), headMat = X.basic(0xffb08a);
  for (var i = 0; i < 16; i++) {
    [-1, 1].forEach(function (s) {
      var g = new THREE.Group();
      var pole = new THREE.Mesh(poleGeo, poleMat); pole.position.y = 75; g.add(pole);
      var arm = new THREE.Mesh(armGeo, poleMat); arm.position.set(-s * 22, 148, 0); g.add(arm);
      var head = new THREE.Mesh(new THREE.BoxGeometry(18, 4, 8), headMat); head.position.set(-s * 42, 145, 0); g.add(head);
      var gl = X.glow('#ff9e6b', 120, 0.8); gl.position.set(-s * 42, 140, 0); g.add(gl);
      g.position.set(s * (ROAD_W / 2 + 46), 0, -i * LAMP_GAP); g.userData.base = -i * LAMP_GAP;
      scene.add(g); lamps.push(g);
    });
  }

  /* 빛 */
  scene.add(new THREE.HemisphereLight(0x9a7cff, 0x220830, 1.2));
  var key = new THREE.DirectionalLight(0xffd0e0, 1.6); key.position.set(-200, 600, 300); scene.add(key); scene.add(key.target);
  if (X.shadows) {
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    var sc = key.shadow.camera; sc.left = -400; sc.right = 400; sc.top = 900; sc.bottom = -500; sc.near = 50; sc.far = 1600;
    key.shadow.bias = -0.002;
  }

  /* 차 만들기 */
  var bodyGeo = X.roundBox(64, 26, 112, 8, 2), cabGeo = X.roundBox(48, 20, 54, 7, 2);
  var wheelGeo = new THREE.CylinderGeometry(11, 11, 10, 14); wheelGeo.rotateZ(Math.PI / 2);
  var tailGeo = new THREE.BoxGeometry(18, 5, 2), glassMat = X.std(0x0a1020, { r: 0.1, m: 0.9 }), tyreMat = X.std(0x111111, { r: 0.8 });
  var blobTex = X.canvasTex(64, 64, function (x) { var g = x.createRadialGradient(32, 32, 4, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,.7)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
  var blobMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false });
  function car(hex, me) {
    var g = new THREE.Group(), c = new THREE.Color(hex);
    var body = new THREE.Mesh(bodyGeo, X.std(c, { r: 0.25, m: 0.55, e: c, ei: 0.12 })); body.position.y = 24; body.castShadow = X.shadows; g.add(body);
    var cab = new THREE.Mesh(cabGeo, glassMat); cab.position.set(0, 44, me ? 8 : 6); g.add(cab);
    [[-30, 40], [30, 40], [-30, -38], [30, -38]].forEach(function (p) { var w = new THREE.Mesh(wheelGeo, tyreMat); w.position.set(p[0], 11, p[1]); g.add(w); });
    // 뒷불(빨강) + 아래 네온
    [-20, 20].forEach(function (x) {
      var t = new THREE.Mesh(tailGeo, X.basic(0xff2d55)); t.position.set(x, 28, 57); g.add(t);
      var tg = X.glow('#ff2d55', 46, 0.9); tg.position.set(x, 28, 60); g.add(tg);
    });
    var under = new THREE.Mesh(new THREE.PlaneGeometry(90, 140), X.basic(hex, { add: true, o: 0.35 }));
    under.material.map = X.glowTex('#ffffff'); under.rotation.x = -Math.PI / 2; under.position.y = 1.5; g.add(under);
    var blob = new THREE.Mesh(new THREE.PlaneGeometry(90, 150), blobMat); blob.rotation.x = -Math.PI / 2; blob.position.y = 1; g.add(blob);
    if (me) {
      // 앞으로 뻗는 전조등 빛
      var beamTex = X.canvasTex(64, 256, function (x, w, h) { var g2 = x.createLinearGradient(0, h, 0, 0); g2.addColorStop(0, 'rgba(255,240,210,.22)'); g2.addColorStop(1, 'rgba(255,240,210,0)'); x.fillStyle = g2; x.beginPath(); x.moveTo(w * 0.4, h); x.lineTo(w * 0.6, h); x.lineTo(w, 0); x.lineTo(0, 0); x.closePath(); x.fill(); });
      [-18, 18].forEach(function (x) {
        var b = new THREE.Mesh(new THREE.PlaneGeometry(90, 420), new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        b.rotation.x = -Math.PI / 2; b.position.set(x, 2, -265); g.add(b);
      });
    }
    return g;
  }
  var me = car(0xff7a45, true); scene.add(me);
  var pool = {}, live = [];
  function getCar(hex) { var p = pool[hex] || (pool[hex] = []); var c = p.pop() || car(hex, false); c.userData.hex = hex; scene.add(c); return c; }
  function putCar(c) { scene.remove(c); pool[c.userData.hex].push(c); }

  /* 코인 */
  var coinGeo = new THREE.CylinderGeometry(15, 15, 4, 20); coinGeo.rotateX(Math.PI / 2);
  var coinMat = X.std(0xffd166, { r: 0.2, m: 0.9, e: 0xffa020, ei: 0.6 });
  var coinPool = [], coinLive = [];
  function getCoin() { var c = coinPool.pop(); if (!c) { c = new THREE.Group(); c.add(new THREE.Mesh(coinGeo, coinMat)); var g = X.glow('#ffd166', 70, 0.7); c.add(g); } scene.add(c); return c; }

  var scroll = 0, fovK = 58, crashT = 0;
  var proj = new THREE.Vector3(), proj2 = new THREE.Vector3();
  function toScreen(x, y, hgt) {
    proj.set(wx(x), hgt, wz(y)).project(cam);
    proj2.set(wx(x) + 20, hgt, wz(y)).project(cam);
    var s = Math.abs(proj2.x - proj.x) * W / 2 / 20;
    return [(proj.x + 1) / 2 * W, (1 - proj.y) / 2 * H, A.clamp(s * 1.25, 0.2, 2.2)];
  }

  return {
    camera: cam,
    resize: function (w, h) { cam.aspect = w / h; cam.updateProjectionMatrix(); },
    map: function (x, y) { return toScreen(x, y, 30); },
    update: function (s, dt, o, time) {
      var playing = !!s.cars, spd = playing ? s.speed : 220;
      scroll += spd * dt * KZ;
      roadTex.offset.y = (scroll / 10000 * 40) % 1;
      gridTex.offset.y = (scroll / 10000 * 50) % 1;
      for (var i = 0; i < lamps.length; i++) { var L = lamps[i], z = L.userData.base + (scroll % LAMP_GAP); L.position.z = z > 600 ? z - LAMP_GAP * 16 : z; }
      // 내 차
      var px = s.px != null ? s.px : LX[1], tgt = s.lane != null ? LX[s.lane] : LX[1];
      me.position.set(wx(px), 0, 0);
      me.rotation.y = (tgt - px) * -0.006;
      me.rotation.z = (tgt - px) * 0.0025;
      me.visible = !(s.dying > 0);
      if (s.dying > 0) crashT += dt; else crashT = 0;
      // 다른 차
      var cars = s.cars || [];
      while (live.length > cars.length) putCar(live.pop());
      for (i = 0; i < cars.length; i++) {
        var cd = cars[i], hex = parseInt(cd.c.slice(1), 16);
        if (!live[i] || live[i].userData.hex !== hex) { if (live[i]) putCar(live[i]); live[i] = getCar(hex); }
        live[i].position.set(wx(LX[cd.l]), 0, wz(cd.y));
        live[i].rotation.y = Math.sin(time * 2 + i) * 0.01;
      }
      // 코인
      var coins = s.coins || [];
      while (coinLive.length > coins.length) { var cc = coinLive.pop(); scene.remove(cc); coinPool.push(cc); }
      while (coinLive.length < coins.length) coinLive.push(getCoin());
      for (i = 0; i < coins.length; i++) { var cn = coinLive[i]; cn.position.set(wx(LX[coins[i].l]), 28 + Math.sin(time * 5 + i) * 4, wz(coins[i].y)); cn.children[0].rotation.y = time * 4 + i; }
      // 카메라: 속도가 빠를수록 시야가 넓어지고, 차를 살짝 따라감
      var f = 56 + A.clamp((spd - 420) / 680, 0, 1) * 14;
      fovK += (f - fovK) * Math.min(1, dt * 2);
      cam.fov = fovK; cam.updateProjectionMatrix();
      cam.position.set(camBase.x + wx(px) * 0.45 + o[0] * 1.5, camBase.y + o[1] * 1.5 + (playing ? 0 : Math.sin(time * 0.5) * 20), camBase.z);
      look.set(wx(px) * 0.3, 10, -560);
      cam.lookAt(look);
      key.target.position.set(0, 0, -200);
      sun.position.x = cam.position.x * 0.9;
    }
  };
});
