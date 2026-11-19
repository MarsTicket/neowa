/* 탑뷰 레이서 3D 장면 (게임 규칙은 docs/tools/games/racer.js 그대로, 그림만 3D)
   위에서 비스듬히 내려다보는 카메라. 땅이 게임 평면(z=0)이라 손가락·마우스 위치와 차 위치가 그대로 맞습니다.
   굽은 도로는 매 프레임 게임의 도로 중심선 함수(cx)로 띠 모양을 다시 만듭니다. */
Arcade.G3D.define('racer', function (X) {
  'use strict';
  var THREE = X.THREE, A = Arcade, scene = X.scene;
  var W = 540, H = 960, PY = 760, RW = 250, N = 90, Y0 = -160, Y1 = H + 120;
  var cam = X.planeCam(W / 2, H * 1.08, 1050);
  scene.background = new THREE.Color(0x0f1a0c);
  scene.fog = new THREE.Fog(0x0f1a0c, 1400, 2600);

  /* 잔디 */
  var grassTex = X.canvasTex(256, 256, function (x, w, h) {
    x.fillStyle = '#1b3014'; x.fillRect(0, 0, w, h);
    for (var i = 0; i < 2600; i++) { var l = 14 + Math.random() * 16; x.fillStyle = 'hsl(' + (95 + Math.random() * 25) + ',45%,' + l + '%)'; x.fillRect(Math.random() * w, Math.random() * h, 2, 3); }
  });
  grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping; grassTex.repeat.set(6, 10);
  var grass = new THREE.Mesh(new THREE.PlaneGeometry(1600, 2400), new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.95 }));
  grass.position.set(W / 2, -H / 2, -1); grass.receiveShadow = X.shadows; scene.add(grass);

  /* 도로·연석 띠 (매 프레임 정점 위치를 바꿈) */
  function ribbon(mat) {
    var g = new THREE.BufferGeometry(), pos = new Float32Array((N + 1) * 2 * 3), uv = new Float32Array((N + 1) * 2 * 2), idx = [];
    for (var i = 0; i < N; i++) { var a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
    mat.side = THREE.DoubleSide;
    var m = new THREE.Mesh(g, mat); m.receiveShadow = X.shadows; m.frustumCulled = false; scene.add(m); return m;
  }
  var roadTex = X.canvasTex(128, 256, function (x, w, h) {
    x.fillStyle = '#2a2a33'; x.fillRect(0, 0, w, h);
    for (var i = 0; i < 700; i++) { x.fillStyle = 'rgba(255,255,255,' + Math.random() * 0.06 + ')'; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    x.fillStyle = 'rgba(255,224,102,.85)'; x.fillRect(w / 2 - 3, 0, 6, h / 2);
    x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(6, 0, 3, h); x.fillRect(w - 9, 0, 3, h);
  });
  roadTex.wrapT = THREE.RepeatWrapping; roadTex.anisotropy = X.level >= 2 ? 8 : 2;
  var curbTex = X.canvasTex(16, 64, function (x, w, h) { x.fillStyle = '#ff4d6d'; x.fillRect(0, 0, w, h / 2); x.fillStyle = '#f4f5fb'; x.fillRect(0, h / 2, w, h / 2); });
  curbTex.wrapT = THREE.RepeatWrapping;
  var road = ribbon(new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.75, metalness: 0.05 }));
  var curbL = ribbon(new THREE.MeshStandardMaterial({ map: curbTex, roughness: 0.6 }));
  var curbR = ribbon(new THREE.MeshStandardMaterial({ map: curbTex, roughness: 0.6 }));
  function fill(m, cxf, d0, a, b, z, vScale) {
    var p = m.geometry.attributes.position.array, u = m.geometry.attributes.uv.array;
    for (var i = 0; i <= N; i++) {
      var y = Y0 + (Y1 - Y0) * i / N, d = d0 + (PY - y) + (H - PY), x = cxf(d);
      p[i * 6] = x + a; p[i * 6 + 1] = -y; p[i * 6 + 2] = z; p[i * 6 + 3] = x + b; p[i * 6 + 4] = -y; p[i * 6 + 5] = z;
      u[i * 4] = 0; u[i * 4 + 1] = d / vScale; u[i * 4 + 2] = 1; u[i * 4 + 3] = d / vScale;
    }
    m.geometry.attributes.position.needsUpdate = true; m.geometry.attributes.uv.needsUpdate = true; m.geometry.computeVertexNormals();
  }

  /* 나무 (도로 밖, 거리마다 같은 자리에) */
  var trunkGeo = new THREE.CylinderGeometry(4, 6, 26, 6); trunkGeo.rotateX(Math.PI / 2); trunkGeo.translate(0, 0, 13);
  var leafGeo = new THREE.ConeGeometry(26, 60, 7); leafGeo.rotateX(Math.PI / 2); leafGeo.translate(0, 0, 50);
  var leafGeo2 = new THREE.ConeGeometry(20, 44, 7); leafGeo2.rotateX(Math.PI / 2); leafGeo2.translate(0, 0, 76);
  var trunkMat = X.std(0x4a3020, { r: 0.9 }), leafMats = [X.std(0x2f7a3a, { r: 0.8, flat: true }), X.std(0x3d8f45, { r: 0.8, flat: true }), X.std(0x266a3a, { r: 0.8, flat: true })];
  var trees = [];
  function tree() {
    var g = new THREE.Group(), lm = A.pick(leafMats);
    var tr = new THREE.Mesh(trunkGeo, trunkMat), l1 = new THREE.Mesh(leafGeo, lm), l2 = new THREE.Mesh(leafGeo2, lm);
    tr.castShadow = l1.castShadow = l2.castShadow = X.shadows; g.add(tr); g.add(l1); g.add(l2); scene.add(g); return g;
  }
  function hash(n) { var s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }

  /* 장애물(라바콘), 연료통, 부스터 */
  var coneGeo = new THREE.ConeGeometry(15, 40, 16); coneGeo.rotateX(Math.PI / 2); coneGeo.translate(0, 0, 22);
  var coneMat = X.std(0xff7a45, { r: 0.45, e: 0x6a1a00, ei: 0.5 }), coneHit = X.std(0x555555, { r: 0.8 });
  var stripeGeo = new THREE.CylinderGeometry(9.5, 11.5, 6, 16); stripeGeo.rotateX(Math.PI / 2); stripeGeo.translate(0, 0, 22);
  var baseGeo = new THREE.BoxGeometry(34, 34, 4); baseGeo.translate(0, 0, 2);
  function cone() { var g = new THREE.Group(), c = new THREE.Mesh(coneGeo, coneMat); c.castShadow = X.shadows; g.add(c); g.add(new THREE.Mesh(stripeGeo, X.std(0xffffff, { r: 0.4 }))); g.add(new THREE.Mesh(baseGeo, coneMat)); g.userData.c = c; g.userData.base = g.children[2]; scene.add(g); return g; }
  var canGeo = X.roundBox(26, 34, 30, 5, 2), canMat = X.std(0x2fbf5a, { r: 0.35, m: 0.5, e: 0x0a5020, ei: 0.6 });
  function can() { var g = new THREE.Group(), m = new THREE.Mesh(canGeo, canMat); m.position.z = 16; m.castShadow = X.shadows; g.add(m); var gl = X.glow('#7dff9b', 90, 0.55); gl.position.z = 6; g.add(gl); g.userData.m = m; scene.add(g); return g; }
  var arrowTex = X.canvasTex(128, 128, function (x, w, h) {
    x.fillStyle = 'rgba(255,224,102,.95)';
    for (var k = 0; k < 2; k++) { var oy = k * 46; x.beginPath(); x.moveTo(w / 2, 10 + oy); x.lineTo(w - 18, 50 + oy); x.lineTo(w - 38, 50 + oy); x.lineTo(w / 2, 28 + oy); x.lineTo(38, 50 + oy); x.lineTo(18, 50 + oy); x.closePath(); x.fill(); }
  });
  function pad() { var g = new THREE.Group(); var m = new THREE.Mesh(new THREE.PlaneGeometry(56, 56), new THREE.MeshBasicMaterial({ map: arrowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); m.position.z = 1; g.add(m); var gl = X.glow('#ffe066', 110, 0.5); gl.position.z = 2; g.add(gl); g.userData.m = m; scene.add(g); return g; }
  var pools = { o: [], c: [], b: [] }, makers = { o: cone, c: can, b: pad };
  function sync(kind, list, cxf, d0, time) {
    var pl = pools[kind];
    while (pl.length < list.length) pl.push(makers[kind]());
    for (var i = 0; i < pl.length; i++) {
      var it = list[i], g = pl[i]; g.visible = !!it; if (!it) continue;
      var y = PY - (it.d - d0 - (H - PY)), x = cxf(it.d) + it.off; g.position.set(x, -y, 0);
      if (kind === 'o') { g.userData.c.material = it.hit ? coneHit : coneMat; g.rotation.set(it.hit ? 1.2 : 0, 0, it.hit ? 0.6 : 0); }
      else if (kind === 'c') { g.userData.m.rotation.z = time * 2; g.userData.m.position.z = 16 + Math.sin(time * 4 + i) * 4; }
      else g.userData.m.material.opacity = 0.65 + Math.sin(time * 8) * 0.3;
    }
  }

  /* 내 차 */
  var car = new THREE.Group();
  var cBody = new THREE.Mesh(X.roundBox(44, 80, 18, 7, 2), X.std(0xffe066, { r: 0.25, m: 0.55, e: 0x6a5000, ei: 0.25 })); cBody.position.z = 14; cBody.castShadow = X.shadows; car.add(cBody);
  var cCab = new THREE.Mesh(X.roundBox(34, 34, 14, 6, 2), X.std(0x0a1020, { r: 0.1, m: 0.9 })); cCab.position.set(0, -2, 26); car.add(cCab);
  var wGeo = new THREE.CylinderGeometry(9, 9, 8, 12); wGeo.rotateZ(Math.PI / 2);
  [[-22, 26], [22, 26], [-22, -26], [22, -26]].forEach(function (p) { var w = new THREE.Mesh(wGeo, X.std(0x111111, { r: 0.8 })); w.position.set(p[0], p[1], 9); car.add(w); });
  [-12, 12].forEach(function (x) { var t = X.glow('#ff4d6d', 34, 0.9); t.position.set(x, -40, 14); car.add(t); var hl = X.glow('#fff6d0', 40, 0.9); hl.position.set(x, 40, 14); car.add(hl); });
  var flame = X.glow('#ffe066', 70, 0); flame.position.set(0, -52, 10); car.add(flame);
  var carShadow = new THREE.Mesh(new THREE.PlaneGeometry(70, 110), new THREE.MeshBasicMaterial({ map: X.canvasTex(64, 64, function (x) { var g = x.createRadialGradient(32, 32, 4, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,.6)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }), transparent: true, depthWrite: false }));
  carShadow.position.z = 0.6; car.add(carShadow);
  scene.add(car);

  /* 빛: 오후 햇살 */
  scene.add(new THREE.HemisphereLight(0xdfffd0, 0x203018, 0.9));
  var sun = new THREE.DirectionalLight(0xfff0d0, 1.9); sun.position.set(-250, 150, 700); sun.target.position.set(W / 2, -H / 2, 0); scene.add(sun); scene.add(sun.target);
  sun.position.set(W / 2 - 400, -H / 2 + 250, 700);
  if (X.shadows) { sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); var sc = sun.shadow.camera; sc.left = -520; sc.right = 520; sc.top = 620; sc.bottom = -620; sc.near = 200; sc.far = 1600; sun.shadow.bias = -0.002; }

  var prevX = null;
  return {
    camera: cam,
    update: function (s, dt, o, time) {
      var cxf = s.cx, d0 = s.car ? s.dist : time * 300;
      fill(road, cxf, d0, -RW / 2, RW / 2, 0.2, 256);
      fill(curbL, cxf, d0, -RW / 2 - 12, -RW / 2, 1.2, 120);
      fill(curbR, cxf, d0, RW / 2, RW / 2 + 12, 1.2, 120);
      grassTex.offset.y = (d0 / 2400 * 10) % 1;
      // 나무: 90px 마다 양쪽 한 그루씩 (같은 거리엔 늘 같은 나무)
      var dStart = d0 + (H - PY) + (PY - Y1), dEnd = d0 + (H - PY) + (PY - Y0), k0 = Math.floor(dStart / 90), k1 = Math.ceil(dEnd / 90), n = 0;
      for (var k = k0; k <= k1; k++) {
        for (var side = -1; side <= 1; side += 2) {
          var hsh = hash(k * 2 + (side > 0 ? 1 : 0)); if (hsh < 0.35) continue;
          var d = k * 90 + hsh * 60, y = PY - (d - d0 - (H - PY)), x = cxf(d) + side * (RW / 2 + 50 + hsh * 140);
          if (x < -60 || x > W + 60) continue;
          var t = trees[n] || (trees[n] = tree()); n++;
          t.visible = true; t.position.set(x, -y, 0); t.scale.setScalar(0.8 + hsh * 0.6); t.rotation.z = hsh * 6;
        }
      }
      for (; n < trees.length; n++) trees[n].visible = false;
      sync('o', s.obs || [], cxf, d0, time); sync('c', s.cans || [], cxf, d0, time); sync('b', s.boosts || [], cxf, d0, time);
      var cx0 = s.car ? s.car.x : cxf(d0 + (H - PY));
      var vx = prevX == null ? 0 : (cx0 - prevX) / Math.max(dt, 0.001); prevX = cx0;
      car.position.set(cx0, -PY, 0);
      car.rotation.z = A.lerp(car.rotation.z, A.clamp(-vx * 0.0009, -0.35, 0.35), Math.min(1, dt * 10));
      car.rotation.y = A.lerp(car.rotation.y, A.clamp(vx * 0.0005, -0.12, 0.12), Math.min(1, dt * 10));
      flame.material.opacity = s.boostT > 0 ? 0.7 + Math.random() * 0.3 : 0;
      cam.fitPlane(W, H, o[0], o[1]);
    }
  };
});
