/* 하늘 탑 쌓기 3D 장면 (게임 규칙은 docs/tools/games/tower.js 그대로, 그림만 3D)
   블록 앞면이 게임 평면(z=0)에 오도록 놓아서 2D 좌표·파티클 위치가 그대로 맞습니다. */
Arcade.G3D.define('tower', function (X) {
  'use strict';
  var THREE = X.THREE, A = Arcade, scene = X.scene;
  var W = 540, H = 960, BH = 44, DZ = 120;  // 블록 높이, 안쪽 깊이
  function topY(i) { return 760 - i * BH; }
  function hue(n) { return (n * 9 + 40) % 360; }
  var tmpC = new THREE.Color();
  function colFor(n, l) { return tmpC.setHSL(hue(n) / 360, 0.85, l / 100).clone(); }

  // 카메라: 오른쪽 위에서 내려다보는 느낌 (윗면·오른쪽 옆면이 보임)
  var cam = X.planeCam(W / 2 + 150, 150, 1250);

  /* 하늘: 높이 올라갈수록 노을 → 밤하늘 → 우주 */
  var skyCv = document.createElement('canvas'); skyCv.width = 4; skyCv.height = 256;
  var skyX = skyCv.getContext('2d'), skyTex = new THREE.CanvasTexture(skyCv);
  if (THREE.SRGBColorSpace) skyTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = skyTex;
  var SKY = [
    [[0, '#0a0f2c'], [0.55, '#3b2a6b'], [0.85, '#ff7e6b'], [1, '#ffc38a']],
    [[0, '#04061a'], [0.6, '#1c1a52'], [0.9, '#5b3a8a'], [1, '#a2558f']],
    [[0, '#010208'], [0.7, '#070a24'], [1, '#1d1450']]
  ];
  function mixHex(a, b, t) { var ca = new THREE.Color(a), cb = new THREE.Color(b); return '#' + ca.lerp(cb, t).getHexString(); }
  var skyK = -1;
  function paintSky(alt) {
    var k = Math.round(A.clamp(alt, 0, 1.999) * 40) / 40; if (k === skyK) return; skyK = k;
    var i = Math.floor(k), t = k - i, a = SKY[i], b = SKY[Math.min(2, i + 1)];
    var g = skyX.createLinearGradient(0, 0, 0, 256);
    for (var j = 0; j < 4; j++) {
      var sa = a[Math.min(j, a.length - 1)], sb = b[Math.min(j, b.length - 1)];
      g.addColorStop(A.lerp(sa[0], sb[0], t), mixHex(sa[1], sb[1], t));
    }
    skyX.fillStyle = g; skyX.fillRect(0, 0, 4, 256); skyTex.needsUpdate = true;
  }

  /* 빛 */
  var hemi = new THREE.HemisphereLight(0xbfd4ff, 0x40205a, 0.9); scene.add(hemi);
  var sun = new THREE.DirectionalLight(0xffe2c0, 2.0);
  sun.position.set(-500, 700, 700); scene.add(sun); scene.add(sun.target);
  if (X.shadows) {
    sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    var sc = sun.shadow.camera; sc.left = -520; sc.right = 520; sc.top = 700; sc.bottom = -700; sc.near = 10; sc.far = 3000;
    sun.shadow.bias = -0.0015; sun.shadow.normalBias = 1.5;
  }
  var rim = new THREE.DirectionalLight(0x9be7ff, 0.7); rim.position.set(600, 200, -400); scene.add(rim);
  var amb = new THREE.AmbientLight(0x30244a, 0.6); scene.add(amb);

  /* 별 (높이 올라갈수록 보임) */
  var stars = X.stars(X.level >= 2 ? 500 : 250, [3200, 5200], [-1600, -900], 6);
  stars.material.opacity = 0; scene.add(stars);

  /* 먼 도시 실루엣 + 창문 불빛 */
  var cityTex = X.canvasTex(1024, 256, function (x, w, h) {
    x.clearRect(0, 0, w, h);
    for (var layer = 0; layer < 2; layer++) {
      var bx = 0;
      while (bx < w) {
        var bw = 30 + Math.random() * 60, bh = (layer ? 60 : 110) + Math.random() * (layer ? 90 : 130);
        x.fillStyle = layer ? '#1c1236' : '#120a24'; x.fillRect(bx, h - bh, bw, bh);
        for (var wy = h - bh + 8; wy < h - 6; wy += 11) for (var wx = bx + 5; wx < bx + bw - 6; wx += 9) {
          if (Math.random() < (layer ? 0.18 : 0.3)) { x.fillStyle = Math.random() < 0.8 ? 'rgba(255,214,140,.9)' : 'rgba(150,220,255,.9)'; x.fillRect(wx, wy, 4, 5); }
        }
        bx += bw + 2;
      }
    }
  });
  // 멀리(z=-1500) 있어서 원근 때문에 천천히 움직임: 올라갈수록 도시가 발아래로 멀어짐
  var city = new THREE.Mesh(new THREE.PlaneGeometry(2600, 700), new THREE.MeshBasicMaterial({ map: cityTex, transparent: true, depthWrite: false }));
  city.position.set(420, -(1250 + 350), -1500); scene.add(city);
  var haze = new THREE.Mesh(new THREE.PlaneGeometry(2600, 500), new THREE.MeshBasicMaterial({ map: X.gradTex([[0, 'rgba(255,150,120,0)'], [0.6, 'rgba(255,140,110,.35)'], [1, 'rgba(120,60,140,.0)']]), transparent: true, depthWrite: false }));
  haze.position.set(420, -(1250 + 60), -1450); scene.add(haze);

  /* 받침대 */
  var base = new THREE.Mesh(X.roundBox(300, 420, DZ + 60, 8, 2), X.std(0x3a2a66, { r: 0.4, m: 0.4, e: 0x1a1030 }));
  base.position.set(W / 2, -(topY(0) + BH + 210), -DZ / 2); base.receiveShadow = true; scene.add(base);
  var baseLine = new THREE.Mesh(new THREE.BoxGeometry(304, 3, DZ + 64), X.basic(0xffe066, { add: true, o: 0.8 }));
  baseLine.position.set(W / 2, -(topY(0) + BH) - 2, -DZ / 2); scene.add(baseLine);

  /* 구름 (반투명 스프라이트, 여러 깊이) */
  var cloudTex = X.canvasTex(256, 128, function (x, w, h) {
    for (var i = 0; i < 14; i++) {
      var cx = 40 + Math.random() * 176, cy = 64 + (Math.random() - 0.5) * 30, r = 26 + Math.random() * 30;
      var g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    }
  });
  var clouds = [];
  for (var ci = 0; ci < (X.level >= 2 ? 14 : 8); ci++) {
    var cm = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.5, depthWrite: false, color: 0xffe6f0 });
    var cs = new THREE.Sprite(cm), z = -200 - Math.random() * 1100;
    cs.scale.set(420 + Math.random() * 300, 160 + Math.random() * 80, 1);
    cs.position.set(Math.random() * 1600 - 500, -(Math.random() * 3000) + 600, z);
    cs.userData.v = 8 + Math.random() * 18; clouds.push(cs); scene.add(cs);
  }

  /* 블록 */
  var group = new THREE.Group(); scene.add(group);
  var geoCache = {};
  function geo(w) {
    var k = Math.round(w); if (geoCache[k]) return geoCache[k];
    return (geoCache[k] = X.roundBox(Math.max(4, k), BH, DZ, 3, 2));
  }
  function mat(n) {
    return new THREE.MeshStandardMaterial({ color: colFor(n, 55), roughness: 0.3, metalness: 0.1, emissive: colFor(n, 40), emissiveIntensity: 0.3 });
  }
  function makeBlock(n, w) {
    var m = new THREE.Mesh(geo(w), mat(n)); m.castShadow = X.shadows; m.receiveShadow = X.shadows;
    // 윗면 앞 모서리 빛줄기
    var edge = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 2), X.basic(0xffffff, { add: true, o: 0.55 }));
    edge.position.set(0, BH / 2 - 1, DZ / 2); edge.scale.x = Math.max(4, w) - 6; m.add(edge);
    m.userData = { n: n, w: w, flash: 0 };
    return m;
  }
  function place(m, x, y, w) { m.position.set(x + w / 2, -(y + BH / 2), -DZ / 2); }
  var built = [];      // stack 인덱스 → 메시
  var moving = null, ghost = null, chipMeshes = [];
  ghost = new THREE.Mesh(new THREE.BoxGeometry(1, BH, DZ), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, depthWrite: false }));
  scene.add(ghost);
  var flashLight = new THREE.PointLight(0xffffff, 0, 420, 2); scene.add(flashLight);

  function clearAll() {
    built.forEach(function (m) { group.remove(m); m.material.dispose(); }); built.length = 0;
    chipMeshes.forEach(function (m) { group.remove(m); m.material.dispose(); }); chipMeshes.length = 0;
    if (moving) { group.remove(moving); moving.material.dispose(); moving = null; }
  }
  var lastStack = null, demo = [];
  for (var d = 0; d < 9; d++) demo.push({ x: W / 2 - 110 + (d ? Math.sin(d * 1.3) * 8 : 0), w: 220 - (d ? d * 6 : 0), n: d });

  var t0 = 0;
  return {
    camera: cam,
    update: function (s, dt, o, time) {
      t0 = time;
      var st = s.stack || demo, camY = s.stack ? (s.cam || 0) : 0;
      if (st !== lastStack) { clearAll(); lastStack = st; }
      // 새로 놓인 블록 만들기
      for (var i = built.length; i < st.length; i++) {
        var b = st[i], m = makeBlock(b.n, b.w); place(m, b.x, topY(b.n), b.w); group.add(m); built.push(m);
        if (s.stack && i > 0) { m.userData.flash = 1; flashLight.position.set(b.x + b.w / 2, -topY(b.n) + 40, 120); flashLight.intensity = 2.2; flashLight.color.copy(colFor(b.n, 70)); }
      }
      // 화면 아래로 멀리 내려간 블록은 그리지 않음
      for (i = 0; i < built.length; i++) {
        var bm = built[i], sy = topY(bm.userData.n) + camY;
        bm.visible = sy < H + 260 && sy > -200;
        if (bm.userData.flash > 0) { bm.userData.flash = Math.max(0, bm.userData.flash - dt * 2.5); bm.material.emissiveIntensity = 0.35 + bm.userData.flash * 1.2; }
      }
      flashLight.intensity = Math.max(0, flashLight.intensity - dt * 5);
      // 움직이는 블록
      var cur = s.cur;
      if (cur) {
        if (!moving || moving.userData.n !== cur.n || Math.abs(moving.userData.w - cur.w) > 0.5) {
          if (moving) { group.remove(moving); moving.material.dispose(); }
          moving = makeBlock(cur.n, cur.w); group.add(moving);
        }
        place(moving, cur.x, topY(cur.n), cur.w);
        moving.material.emissiveIntensity = 0.45 + Math.sin(time * 8) * 0.12;
        var last = st[st.length - 1];
        ghost.visible = true; ghost.scale.x = last.w; ghost.position.set(last.x + last.w / 2, -(topY(cur.n) + BH / 2), -DZ / 2);
      } else {
        if (moving) { group.remove(moving); moving.material.dispose(); moving = null; }
        ghost.visible = false;
      }
      // 잘려 떨어지는 조각
      var chips = s.chips || [];
      while (chipMeshes.length < chips.length) { var cm = makeBlock(0, 10); group.add(cm); chipMeshes.push(cm); }
      while (chipMeshes.length > chips.length) { var rm = chipMeshes.pop(); group.remove(rm); rm.material.dispose(); }
      for (i = 0; i < chips.length; i++) {
        var ch = chips[i], mm = chipMeshes[i];
        if (mm.userData.n !== ch.n || mm.userData.w !== ch.w) { group.remove(mm); mm.material.dispose(); mm = chipMeshes[i] = makeBlock(ch.n, ch.w); group.add(mm); }
        mm.position.set(ch.x + ch.w / 2, -(ch.y + BH / 2), -DZ / 2);
        mm.rotation.set(ch.rot * 0.6, 0, -ch.rot);
      }
      // 카메라와 하늘
      var demoBob = s.stack ? 0 : Math.sin(time * 0.6) * 20;
      cam.setEye(W / 2 + 150 + (s.stack ? 0 : Math.sin(time * 0.4) * 90), 150 + demoBob);
      cam.fitPlane(W, H, o[0], -camY + o[1]);
      var alt = camY / 2600;
      paintSky(alt);
      stars.material.opacity = A.clamp((alt - 0.3) * 1.2, 0, 1);
      stars.position.y = cam.position.y * 0.9;
      city.material.opacity = A.clamp(1 - alt * 1.4, 0, 1);
      hemi.intensity = 0.9 - Math.min(0.35, alt * 0.25);
      sun.position.set(cam.position.x - 700, cam.position.y + 600, 800); sun.target.position.set(W / 2, cam.position.y - 200, -60);
      for (i = 0; i < clouds.length; i++) {
        var c = clouds[i]; c.position.x += c.userData.v * dt;
        if (c.position.x > 1300) c.position.x = -700;
        var rel = c.position.y - cam.position.y;
        if (rel > 1700) c.position.y -= 3400; else if (rel < -1700) c.position.y += 3400;
        c.material.opacity = 0.45 * A.clamp(1 - alt * 0.6, 0.25, 1);
      }
    }
  };
});
