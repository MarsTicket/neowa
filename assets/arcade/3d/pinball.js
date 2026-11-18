/* 네온 핀볼 3D 장면 (게임 규칙은 docs/tools/games/pinball.js 그대로, 그림만 3D)
   게임판 면이 게임 평면(z=0). 아래쪽(내 쪽)에서 비스듬히 내려다보는 느낌으로 벽·범퍼의 옆면이 보입니다. */
Arcade.G3D.define('pinball', function (X) {
  'use strict';
  var THREE = X.THREE, A = Arcade, scene = X.scene;
  var W = 540, H = 960, R = 13;
  var WALLS = [[30, 960, 30, 230], [30, 230, 120, 110], [120, 110, 420, 110], [420, 110, 510, 230], [510, 230, 510, 960],
    [30, 760, 150, 850], [510, 760, 390, 850], [70, 640, 70, 740], [470, 640, 470, 740], [70, 740, 140, 790], [470, 740, 400, 790]];
  var TARGETS = [{ x: 170, y: 170 }, { x: 270, y: 155 }, { x: 370, y: 170 }];
  var cam = X.planeCam(W / 2, H * 1.02, 1000);
  scene.background = new THREE.Color(0x06010a);

  // 크롬 공이 비칠 주변 풍경 (네온 띠가 있는 둥근 방)
  var env = X.canvasTex(512, 256, function (x, w, h) {
    var g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#d9c8ff'); g.addColorStop(0.45, '#5a2a7a'); g.addColorStop(1, '#2a0a3a');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    var cols = ['#ff5ec4', '#5ee7ff', '#ffd166', '#b48cff'];
    for (var i = 0; i < 10; i++) { x.fillStyle = cols[i % 4]; x.fillRect(i * 52, h * 0.3, 18, h * 0.25); }
    x.fillStyle = '#ffffff'; x.fillRect(0, 10, w, 8);
  });
  env.mapping = THREE.EquirectangularReflectionMapping;

  /* 게임판 그림 */
  var fieldTex = X.canvasTex(540, 960, function (x, w, h) {
    var g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2a0838'); g.addColorStop(0.55, '#14041e'); g.addColorStop(1, '#07020c');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    // 육각 무늬
    x.strokeStyle = 'rgba(255,94,196,.07)'; x.lineWidth = 1.5;
    for (var yy = 0; yy < h; yy += 34) for (var xx = (yy / 34 % 2) * 20; xx < w; xx += 40) { x.beginPath(); for (var k = 0; k < 6; k++) { var a = k / 6 * Math.PI * 2; x.lineTo(xx + Math.cos(a) * 14, yy + Math.sin(a) * 14); } x.closePath(); x.stroke(); }
    // 가운데 별 무늬와 화살표
    var rg = x.createRadialGradient(270, 420, 0, 270, 420, 230); rg.addColorStop(0, 'rgba(255,94,196,.28)'); rg.addColorStop(1, 'rgba(255,94,196,0)');
    x.fillStyle = rg; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(94,231,255,.35)';
    [[200, 640], [270, 600], [340, 640]].forEach(function (p) { x.beginPath(); x.moveTo(p[0], p[1] - 22); x.lineTo(p[0] + 16, p[1]); x.lineTo(p[0] + 6, p[1]); x.lineTo(p[0] + 6, p[1] + 18); x.lineTo(p[0] - 6, p[1] + 18); x.lineTo(p[0] - 6, p[1]); x.lineTo(p[0] - 16, p[1]); x.closePath(); x.fill(); });
    x.font = '700 46px "Chakra Petch", system-ui'; x.textAlign = 'center'; x.fillStyle = 'rgba(255,209,102,.16)'; x.fillText('NEOWA', 270, 560);
    // 아래 배수구 쪽 경고 줄무늬
    for (var s = 0; s < 12; s++) { x.fillStyle = s % 2 ? 'rgba(255,77,109,.18)' : 'rgba(0,0,0,0)'; x.fillRect(150 + s * 20, 905, 20, 55); }
  });
  var field = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: fieldTex, roughness: 0.6, metalness: 0, emissive: 0xffffff, emissiveMap: fieldTex, emissiveIntensity: 0.55 }));
  field.position.set(W / 2, -H / 2, 0); field.receiveShadow = X.shadows; scene.add(field);
  // 판 밖 바깥 테두리 상자
  var cab = new THREE.Mesh(new THREE.BoxGeometry(W + 220, H + 300, 60), X.std(0x12041a, { r: 0.5, m: 0.5 }));
  cab.position.set(W / 2, -H / 2, -31); scene.add(cab);

  /* 벽: 네온 레일 */
  var railMat = X.std(0x3a1040, { r: 0.3, m: 0.6, e: 0xff5ec4, ei: 0.25 }), neonMat = X.basic(0xff9ee0);
  WALLS.forEach(function (w) {
    var dx = w[2] - w[0], dy = w[3] - w[1], len = Math.hypot(dx, dy), ang = Math.atan2(-dy, dx);
    var g = new THREE.Group();
    var m = new THREE.Mesh(new THREE.BoxGeometry(len + 6, 8, 26), railMat); m.position.z = 13; m.castShadow = X.shadows; g.add(m);
    var n = new THREE.Mesh(new THREE.BoxGeometry(len + 6, 3, 3), neonMat); n.position.z = 27; g.add(n);
    var gl = new THREE.Mesh(new THREE.PlaneGeometry(len + 30, 46), new THREE.MeshBasicMaterial({ map: X.gradTex([[0, 'rgba(255,94,196,0)'], [0.5, 'rgba(255,94,196,.35)'], [1, 'rgba(255,94,196,0)']]), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    gl.position.z = 0.5; g.add(gl);
    g.position.set((w[0] + w[2]) / 2, -(w[1] + w[3]) / 2, 0); g.rotation.z = ang; scene.add(g);
  });

  /* 범퍼 */
  var bumpers = [];
  function bumper(b) {
    var g = new THREE.Group();
    var skirt = new THREE.Mesh(new THREE.CylinderGeometry(b.r, b.r * 1.08, 10, 36), X.std(0x2a0420, { r: 0.4, m: 0.5 })); skirt.rotation.x = Math.PI / 2; skirt.position.z = 5; g.add(skirt);
    var body = new THREE.Mesh(new THREE.CylinderGeometry(b.r * 0.82, b.r * 0.9, 24, 36), new THREE.MeshStandardMaterial({ color: 0xff5ec4, emissive: 0xff5ec4, emissiveIntensity: 0.6, roughness: 0.25, metalness: 0.3 }));
    body.rotation.x = Math.PI / 2; body.position.z = 20; body.castShadow = X.shadows; g.add(body);
    var cap = new THREE.Mesh(new THREE.CylinderGeometry(b.r, b.r, 6, 36), X.std(0xffc8ec, { r: 0.25, m: 0.2, e: 0xff5ec4, ei: 0.35 })); cap.rotation.x = Math.PI / 2; cap.position.z = 34; g.add(cap);
    var star = new THREE.Mesh(new THREE.CircleGeometry(b.r * 0.45, 5), X.basic(0x2a0420)); star.position.z = 37.2; g.add(star);
    var gl = X.glow('#ff5ec4', b.r * 5, 0.5); gl.position.z = 2; g.add(gl);
    var light = new THREE.PointLight(0xff5ec4, 0, 200, 1.6); light.position.z = 50; g.add(light);
    g.position.set(b.x, -b.y, 0); scene.add(g);
    return { g: g, body: body, cap: cap, gl: gl, light: light };
  }

  /* 타깃 (불 켜지면 노랗게 빛나며 살짝 내려감) */
  var targets = TARGETS.map(function (t) {
    var m = new THREE.Mesh(X.roundBox(36, 14, 22, 4, 2), new THREE.MeshStandardMaterial({ color: 0x5a4210, emissive: 0xffd166, emissiveIntensity: 0.1, roughness: 0.3, metalness: 0.4 }));
    m.position.set(t.x, -t.y, 11); m.castShadow = X.shadows; scene.add(m);
    var gl = X.glow('#ffd166', 90, 0); gl.position.set(t.x, -t.y, 4); scene.add(gl);
    return { m: m, gl: gl };
  });

  /* 플리퍼 */
  function flipperGeo(len) {
    var s = new THREE.Shape(); s.absarc(0, 0, 11, Math.PI / 2, Math.PI * 1.5, false); s.lineTo(len, -5); s.absarc(len, 0, 5, -Math.PI / 2, Math.PI / 2, false); s.lineTo(0, 11);
    var g = new THREE.ExtrudeGeometry(s, { depth: 16, bevelEnabled: true, bevelThickness: 2, bevelSize: 2, bevelSegments: 2 }); return g;
  }
  var flGeo = flipperGeo(95), flMat = new THREE.MeshStandardMaterial({ color: 0x5ee7ff, emissive: 0x1aa8d0, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.4 });
  var flips = {};
  ['L', 'R'].forEach(function (k) {
    var g = new THREE.Group(), m = new THREE.Mesh(flGeo, flMat); m.position.z = 2; m.castShadow = X.shadows; g.add(m);
    var pin = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 24, 12), X.std(0xffffff, { m: 0.9, r: 0.2 })); pin.rotation.x = Math.PI / 2; pin.position.z = 12; g.add(pin);
    scene.add(g); flips[k] = g;
  });

  /* 공: 크롬 */
  var ball = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 24), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.12, envMap: env, envMapIntensity: 2.2 }));
  ball.castShadow = X.shadows; scene.add(ball);
  var blob = new THREE.Mesh(new THREE.CircleGeometry(R * 1.3, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false })); scene.add(blob);
  var ballGlow = X.glow('#ffffff', 60, 0.35); scene.add(ballGlow);
  var trail = [], tp = [];
  for (var i = 0; i < 10; i++) { var t = X.glow('#9be7ff', 30, 0); scene.add(t); trail.push(t); }

  /* 공 지켜 주는 막대 */
  var save = new THREE.Mesh(new THREE.BoxGeometry(240, 4, 6), X.basic(0x5ee7ff, { t: true, o: 0.7 })); save.position.set(270, -900, 4); scene.add(save);

  /* 빛 */
  scene.add(new THREE.HemisphereLight(0xffb0e8, 0x10041a, 0.45));
  var key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(150, -200, 900); key.target.position.set(W / 2, -H / 2, 0); scene.add(key); scene.add(key.target);
  if (X.shadows) { key.castShadow = true; key.shadow.mapSize.set(1024, 2048); var sc = key.shadow.camera; sc.left = -330; sc.right = 330; sc.top = 560; sc.bottom = -560; sc.near = 300; sc.far = 1500; key.shadow.bias = -0.0015; }
  var ballLight = new THREE.PointLight(0x9be7ff, 0.9, 180, 1.6); scene.add(ballLight);

  var bInit = false;
  return {
    camera: cam,
    overlay: function (c, s) {
      // 터치 기기: 왼쪽·오른쪽 누르는 곳 표시
      if (A.shell.state === 'playing' && document.body.classList.contains('touch')) { c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(0, 880, W / 2 - 2, 80); c.fillRect(W / 2 + 2, 880, W / 2, 80); }
    },
    update: function (s, dt, o, time) {
      if (!bInit && s.B) { s.B.forEach(function (b) { bumpers.push(bumper(b)); }); bInit = true; }
      for (var i = 0; i < bumpers.length; i++) {
        var b = s.B[i], u = bumpers[i], h = b.hit > 0 ? b.hit / 0.15 : 0;
        u.body.material.emissiveIntensity = 0.6 + h * 2.5; u.light.intensity = h * 3;
        u.gl.material.opacity = 0.45 + h * 0.5 + Math.sin(time * 3 + i) * 0.05;
        u.g.scale.setScalar(1 + h * 0.08); u.cap.position.z = 34 - h * 6;
      }
      var lit = s.lit || [];
      targets.forEach(function (t, k) {
        var on = !!lit[k];
        t.m.material.emissiveIntensity = on ? 1.1 : 0.12 + Math.sin(time * 4 + k) * 0.06;
        t.m.position.z = A.lerp(t.m.position.z, on ? 4 : 11, Math.min(1, dt * 12)); t.gl.material.opacity = on ? 0.8 : 0;
      });
      if (s.FL) ['L', 'R'].forEach(function (k) { var f = s.FL[k]; flips[k].position.set(f.x, -f.y, 0); flips[k].rotation.z = -f.a; });
      var bl = s.ball || (!s.balls ? { x: 270 + Math.sin(time) * 120, y: 600 } : null);
      ball.visible = blob.visible = ballGlow.visible = ballLight.visible = !!bl;
      if (bl) {
        ball.position.set(bl.x, -bl.y, R); blob.position.set(bl.x + 4, -bl.y - 6, 0.4); ballGlow.position.set(bl.x, -bl.y, R); ballLight.position.set(bl.x, -bl.y, 40);
        ball.rotation.x -= (bl.vy || 0) * dt / R; ball.rotation.y += (bl.vx || 0) * dt / R;
        tp.unshift([bl.x, bl.y]); if (tp.length > trail.length) tp.pop();
      } else tp.length = 0;
      var sp = bl ? Math.hypot(bl.vx || 0, bl.vy || 0) : 0;
      for (i = 0; i < trail.length; i++) { var p = tp[i + 1]; trail[i].visible = !!p && sp > 500; if (p) { trail[i].position.set(p[0], -p[1], R); trail[i].material.opacity = (1 - i / trail.length) * 0.4 * Math.min(1, sp / 1400); } }
      save.visible = s.saveT > 0 && !!s.ball; save.material.opacity = 0.4 + Math.sin(time * 12) * 0.3;
      cam.fitPlane(W, H, o[0], o[1]);
    }
  };
});
