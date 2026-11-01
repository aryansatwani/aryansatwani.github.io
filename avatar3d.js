import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Memoji-style 3D avatar, modelled on the portrait photos. Replaces the SVG fallback in each .avatar-slot.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SKIN = '#b4714a';
const HEAD_SCALE = new THREE.Vector3(0.94, 1.07, 0.97);

const look = { x: 0, y: 0 };
addEventListener('pointermove', e => {
  look.x = (e.clientX / innerWidth - .5) * 2;
  look.y = (e.clientY / innerHeight - .5) * 2;
}, { passive: true });

/* ---------- painted textures ---------- */
function faceTexture() {
  const W = 2048, H = 1024, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  // equirectangular: lon 0 / lat 0 is the centre of the face
  const at = (lon, lat) => [(0.25 + lon / (2 * Math.PI)) * W, (0.5 - lat / Math.PI) * H];
  const R = W / (2 * Math.PI); // px per radian

  const base = g.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, '#bf7d55'); base.addColorStop(.5, SKIN); base.addColorStop(1, '#a5653f');
  g.fillStyle = base; g.fillRect(0, 0, W, H);

  // cheeks
  for (const s of [-1, 1]) {
    const [x, y] = at(s * .45, -.2);
    const r = g.createRadialGradient(x, y, 0, x, y, R * .28);
    r.addColorStop(0, 'rgba(214,110,95,.38)'); r.addColorStop(1, 'rgba(214,110,95,0)');
    g.fillStyle = r; g.fillRect(x - R * .3, y - R * .3, R * .6, R * .6);
    // soft socket shadow around the eye
    const [ex, ey] = at(s * .32, .1);
    const sh = g.createRadialGradient(ex, ey, R * .08, ex, ey, R * .2);
    sh.addColorStop(0, 'rgba(110,60,40,.18)'); sh.addColorStop(1, 'rgba(110,60,40,0)');
    g.fillStyle = sh; g.fillRect(ex - R * .2, ey - R * .2, R * .4, R * .4);
  }

  // stubble: chin, jaw and a light moustache
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 26000; i++) {
    const lon = (rnd() * 2 - 1) * 1.0, lat = -0.2 - rnd() * 1.1;
    const top = -0.62 + 0.5 * Math.min(1, Math.abs(lon) / 0.95);
    const tache = Math.abs(lon) < .24 && lat < -.25 && lat > -.33;
    if (lat > top && !tache) continue;
    const [x, y] = at(lon, lat);
    g.fillStyle = `rgba(42,28,22,${tache ? .32 : .2 + rnd() * .15})`;
    g.fillRect(x, y, 1.6, 1.6);
  }

  // smile lines
  g.strokeStyle = 'rgba(125,62,42,.35)'; g.lineWidth = 7; g.lineCap = 'round';
  for (const s of [-1, 1]) {
    const p0 = at(s * .17, -.16), p1 = at(s * .33, -.24), p2 = at(s * .4, -.42);
    g.beginPath(); g.moveTo(...p0); g.quadraticCurveTo(...p1, ...p2); g.stroke();
  }

  // big toothy smile
  const L = at(-.39, -.34), Rt = at(.39, -.34);
  const mouth = new Path2D();
  mouth.moveTo(...L);
  mouth.quadraticCurveTo(...at(0, -.4), ...Rt);
  mouth.quadraticCurveTo(...at(0, -.9), ...L);
  g.fillStyle = '#4e1a16'; g.fill(mouth);
  g.save(); g.clip(mouth);
  const [tx, ty] = at(0, -.6);
  g.fillStyle = '#b8473e'; g.beginPath(); g.ellipse(tx, ty, R * .2, R * .09, 0, 0, Math.PI * 2); g.fill();
  const teeth = new Path2D();
  teeth.moveTo(...at(-.4, -.33));
  teeth.quadraticCurveTo(...at(0, -.41), ...at(.4, -.33));
  teeth.lineTo(...at(.4, -.41));
  teeth.quadraticCurveTo(...at(0, -.6), ...at(-.4, -.41));
  teeth.closePath();
  g.fillStyle = '#f8f3e7'; g.fill(teeth);
  g.strokeStyle = 'rgba(160,140,120,.35)'; g.lineWidth = 2.5;
  for (const lon of [-.21, -.13, -.05, .05, .13, .21]) {
    const [x1, y1] = at(lon, -.39), [x2, y2] = at(lon, -.5 + Math.abs(lon) * .25);
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  }
  g.restore();
  g.strokeStyle = '#8a4434'; g.lineWidth = 6;
  g.beginPath(); g.moveTo(...L); g.quadraticCurveTo(...at(0, -.4), ...Rt); g.stroke();
  g.strokeStyle = 'rgba(140,65,48,.55)'; g.lineWidth = 12;
  g.beginPath(); g.moveTo(...at(-.32, -.5)); g.quadraticCurveTo(...at(0, -.93), ...at(.32, -.5)); g.stroke();

  // thick, slightly arched brows
  for (const s of [-1, 1]) {
    const pts = [];
    for (let k = 0; k <= 20; k++) {
      const t = k / 20, lon = s * (.11 + t * .4);
      const lat = .3 + .055 * Math.sin(t * Math.PI * .95) - t * .02;
      pts.push([lon, lat, .075 - t * .035]);
    }
    const br = new Path2D();
    pts.forEach(([lon, lat, w], i) => { const p = at(lon, lat + w / 2); i ? br.lineTo(...p) : br.moveTo(...p); });
    [...pts].reverse().forEach(([lon, lat, w]) => br.lineTo(...at(lon, lat - w / 2)));
    br.closePath();
    g.fillStyle = '#20150e'; g.fill(br);
    g.strokeStyle = 'rgba(60,40,30,.6)'; g.lineWidth = 2;
    for (let k = 0; k < 40; k++) {
      const [lon, lat] = pts[Math.floor(rnd() * 20)];
      const [x, y] = at(lon, lat);
      g.beginPath(); g.moveTo(x, y + 6); g.lineTo(x + s * 14, y - 8); g.stroke();
    }
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function blazerTexture() {
  const W = 2048, H = 512, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#2152b0'; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(12,34,84,.6)';
  for (let x = 0; x < W; x += 9) g.fillRect(x, 0, 3, H);
  for (let y = 0; y < H; y += 9) g.fillRect(0, y, W, 3);
  // shirt V, collar and lapels at the front (u = 0.5)
  const cx = W / 2, vy = H * .74;
  g.fillStyle = '#183f8f';
  g.beginPath(); g.moveTo(cx - W * .15, 0); g.lineTo(cx, vy + 40); g.lineTo(cx + W * .15, 0); g.closePath(); g.fill();
  g.fillStyle = '#f2f2ee';
  g.beginPath(); g.moveTo(cx - W * .1, 0); g.lineTo(cx, vy); g.lineTo(cx + W * .1, 0); g.closePath(); g.fill();
  g.fillStyle = '#dcdcd6';
  for (const s of [-1, 1]) {
    g.beginPath(); g.moveTo(cx + s * W * .1, 0); g.lineTo(cx + s * W * .025, H * .26); g.lineTo(cx + s * W * .135, H * .2); g.closePath(); g.fill();
  }
  g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 4;
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * W * .15, 0); g.lineTo(cx, vy + 40); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function checkTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#2152b0'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = 'rgba(12,34,84,.6)';
  for (let i = 0; i < 256; i += 9) { g.fillRect(i, 0, 3, 256); g.fillRect(0, i, 256, 3); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

/* ---------- model ---------- */
function onHead(lon, lat, k = 1) {
  return new THREE.Vector3(
    HEAD_SCALE.x * Math.sin(lon) * Math.cos(lat),
    HEAD_SCALE.y * Math.sin(lat),
    HEAD_SCALE.z * Math.cos(lon) * Math.cos(lat)
  ).multiplyScalar(k);
}

function buildAvatar() {
  const root = new THREE.Group();
  const skin = new THREE.MeshPhysicalMaterial({ color: SKIN, roughness: .55, sheen: .4, sheenColor: new THREE.Color('#ffb59a'), sheenRoughness: .6 });
  const faceMat = skin.clone(); faceMat.map = faceTexture(); faceMat.color.set('#ffffff');
  const hair = new THREE.MeshPhysicalMaterial({ color: '#2a1c15', roughness: .6, sheen: 1, sheenColor: new THREE.Color('#7a5543'), sheenRoughness: .45 });
  const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .25 });

  /* body */
  const body = new THREE.Group();
  root.add(body);
  const profile = [[1.85, -3.6], [1.82, -2.3], [1.6, -1.65], [1.0, -1.28], [.46, -1.06], [.38, -.95]].map(([r, y]) => new THREE.Vector2(r, y));
  const torso = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 96, Math.PI),
    new THREE.MeshStandardMaterial({ map: blazerTexture(), roughness: .8, side: THREE.DoubleSide })
  );
  body.add(torso);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.34, .4, .85, 32), skin);
  neck.position.y = -.82;
  body.add(neck);

  /* head */
  const head = new THREE.Group();
  head.position.y = .35;
  root.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), faceMat);
  skull.scale.copy(HEAD_SCALE);
  head.add(skull);

  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), skin);
    ear.scale.set(.12, .23, .1);
    ear.position.set(s * .9, -.02, -.02);
    ear.rotation.y = s * .4;
    head.add(ear);
  }

  const nose = new THREE.Mesh(new THREE.SphereGeometry(.12, 32, 24), skin);
  nose.scale.set(1, 1.3, 1.05);
  nose.position.copy(onHead(0, -.13, 1.02));
  head.add(nose);
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(.065, 24, 16), skin);
    wing.position.copy(onHead(s * .1, -.2, 1.0));
    head.add(wing);
  }

  /* eyes with lids (for blinking) */
  const eyes = [];
  for (const s of [-1, 1]) {
    const socket = new THREE.Group();
    socket.position.copy(onHead(s * .33, .1, .89));
    head.add(socket);
    const eye = new THREE.Group();
    socket.add(eye);
    eye.add(new THREE.Mesh(new THREE.SphereGeometry(.16, 32, 24), white));
    const iris = new THREE.Mesh(new THREE.SphereGeometry(.094, 32, 24), new THREE.MeshPhysicalMaterial({ color: '#4b2a17', roughness: .2, clearcoat: 1 }));
    iris.position.z = .105; iris.scale.z = .45;
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(.05, 24, 16), new THREE.MeshStandardMaterial({ color: '#0b0705', roughness: .1 }));
    pupil.position.z = .146; pupil.scale.z = .3;
    const glint = new THREE.Mesh(new THREE.SphereGeometry(.02, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    glint.position.set(.03, .035, .16);
    eye.add(iris, pupil, glint);

    const upper = new THREE.Group();
    const lidU = new THREE.Mesh(new THREE.SphereGeometry(.172, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), skin);
    const lash = new THREE.Mesh(new THREE.TorusGeometry(.172, .015, 8, 40, Math.PI), new THREE.MeshStandardMaterial({ color: '#1a100b', roughness: .6 }));
    lash.rotation.x = Math.PI / 2;
    upper.add(lidU, lash);
    const lower = new THREE.Mesh(new THREE.SphereGeometry(.17, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), skin);
    socket.add(upper, lower);
    eyes.push({ eye, upper, lower });
  }

  /* hair: a back-tilted cap plus a swept-up quiff built from tufts */
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32, 0, Math.PI * 2, 0, 1.22), hair);
  cap.scale.set(HEAD_SCALE.x * 1.05, HEAD_SCALE.y * 1.04, HEAD_SCALE.z * 1.05);
  cap.rotation.x = -.42;
  head.add(cap);
  const blob = (p, s, r) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), hair);
    m.position.set(...p); m.scale.set(...s); m.rotation.set(...r);
    head.add(m);
  };
  // one smooth swept-up ridge (rising to the right, like the photos) over a fuller crown
  blob([0, .98, -.1], [.86, .34, .8], [0, 0, 0]);
  for (let i = 0; i <= 8; i++) {
    const u = i / 8 * 2 - 1;
    blob([u * .66, .9 + .1 * Math.cos(u * 1.3) + u * .05, .5 * Math.cos(u * 1.1) - .02],
         [.3, .3 + .04 * Math.cos(u * 2), .3], [-.35, 0, -.35 * u - .15]);
  }
  // a few strands for texture, swept back and to the right
  let sd = 3; const r2 = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 14; i++) {
    const u = r2() * 1.6 - .8;
    blob([u * .7, 1.06 + .08 * Math.cos(u * 1.4), .3 * Math.cos(u) - .05], [.12, .26, .1], [-.9, 0, -.6 * u - .3]);
  }
  for (const s of [-1, 1]) blob([s * .87, .1, .2], [.08, .24, .12], [0, 0, 0]);

  /* waving arm and hand with jointed fingers */
  const shoulder = new THREE.Vector3(1.35, -1.95, 0), wrist = new THREE.Vector3(1.95, -.5, .6);
  const arm = new THREE.Group();
  root.add(arm);
  const dir = wrist.clone().sub(shoulder);
  const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(.27, dir.length() - .1, 8, 32), new THREE.MeshStandardMaterial({ map: checkTexture(), roughness: .8 }));
  sleeve.position.copy(shoulder.clone().add(wrist).multiplyScalar(.5));
  sleeve.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  arm.add(sleeve);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(.22, .23, .12, 32), white);
  cuff.position.copy(wrist.clone().addScaledVector(dir.clone().normalize(), -.12));
  cuff.quaternion.copy(sleeve.quaternion);
  arm.add(cuff);

  const hand = new THREE.Group();
  hand.position.copy(wrist);
  hand.rotation.set(-.12, -.1, .18);
  hand.scale.setScalar(1.35);
  arm.add(hand);
  const palm = new THREE.Mesh(new RoundedBoxGeometry(.44, .46, .17, 4, .075), skin);
  palm.position.y = .26;
  hand.add(palm);

  const nail = new THREE.MeshStandardMaterial({ color: '#efc2ab', roughness: .3 });
  const fingers = [];
  const spec = [[-.15, [.17, .11, .09], .052], [-.05, [.19, .12, .095], .054], [.05, [.175, .11, .09], .051], [.145, [.13, .085, .075], .045]];
  for (const [x, lens, r] of spec) {
    const joints = [];
    let parent = hand, y = .48;
    lens.forEach((len, k) => {
      const j = new THREE.Group();
      j.position.set(k ? 0 : x, y, 0);
      parent.add(j);
      const seg = new THREE.Mesh(new THREE.CapsuleGeometry(r * (1 - k * .06), len, 6, 16), skin);
      seg.position.y = len / 2;
      j.add(seg);
      if (k === lens.length - 1) {
        const n = new THREE.Mesh(new THREE.SphereGeometry(r * .75, 16, 12), nail);
        n.scale.set(1, 1.3, .35);
        n.position.set(0, len * .62, r * .82);
        j.add(n);
      }
      joints.push(j);
      parent = j; y = len;
    });
    fingers.push(joints);
  }
  const thumbBase = new THREE.Group();
  thumbBase.position.set(-.2, .12, .04);
  thumbBase.rotation.set(.25, .35, .8);
  hand.add(thumbBase);
  const thumb = [thumbBase];
  let tp = thumbBase;
  [.15, .12].forEach((len, k) => {
    const j = k ? new THREE.Group() : tp;
    if (k) { j.position.y = .15; tp.add(j); }
    const seg = new THREE.Mesh(new THREE.CapsuleGeometry(.062, len, 6, 16), skin);
    seg.position.y = len / 2;
    j.add(seg);
    if (k) {
      const n = new THREE.Mesh(new THREE.SphereGeometry(.046, 16, 12), nail);
      n.scale.set(1, 1.25, .35); n.position.set(0, len * .62, .052);
      j.add(n); thumb.push(j);
    }
    tp = j;
  });

  return { root, head, body, eyes, arm, hand, fingers, thumb };
}

/* ---------- one renderer per slot ---------- */
function mount(slot, opts) {
  const canvas = document.createElement('canvas');
  canvas.className = 'avatar3d';
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.add(new THREE.HemisphereLight('#fff3e8', '#1b2a4a', .5));
  const key = new THREE.DirectionalLight('#fff1e2', 2.4); key.position.set(-3, 4, 6); scene.add(key);
  const rim = new THREE.DirectionalLight('#22d3ee', 2.6); rim.position.set(4, 2.5, -4); scene.add(rim);
  const rim2 = new THREE.DirectionalLight('#a78bfa', 1.6); rim2.position.set(-4, 1, -3); scene.add(rim2);

  const camera = new THREE.PerspectiveCamera(30, 1, .1, 50);
  const av = buildAvatar();
  scene.add(av.root);

  slot.replaceChildren(canvas);
  const resize = () => {
    const w = slot.clientWidth || 300, h = slot.clientHeight || 330;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const fit = Math.max(4.9, 4.6 / camera.aspect);
    camera.position.set(.3, -.35, fit / (2 * Math.tan(THREE.MathUtils.degToRad(15))));
    camera.lookAt(.3, -.45, 0);
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(slot);
  resize();

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(slot);

  const clock = new THREE.Clock();
  const sm = { x: 0, y: 0 };
  let nextBlink = 1.5, blinkT = -1, t = 0, alive = true;
  const frame = () => {
    if (!alive) return;
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), .05);
    if (!visible) return;
    if (opts.stopWhen && opts.stopWhen()) { alive = false; renderer.dispose(); return; }
    t += reduce ? 0 : dt;

    sm.x += (look.x - sm.x) * .08; sm.y += (look.y - sm.y) * .08;
    av.head.rotation.set(sm.y * .16, sm.x * .38, -sm.x * .04);
    av.head.position.y = .35 + Math.sin(t * 1.6) * .015;
    av.body.rotation.y = sm.x * .1;
    av.eyes.forEach(({ eye }) => eye.rotation.set(sm.y * .3, sm.x * .4, 0));

    // blink: lids close and reopen over ~0.16s
    if (t > nextBlink && blinkT < 0) blinkT = 0;
    let b = 0;
    if (blinkT >= 0) {
      blinkT += dt;
      b = Math.sin(Math.min(1, blinkT / .16) * Math.PI);
      if (blinkT > .16) { blinkT = -1; nextBlink = t + 2.5 + Math.random() * 3; }
    }
    av.eyes.forEach(({ upper, lower }) => {
      upper.rotation.x = -.62 + b * 1.95;
      lower.rotation.x = .78 - b * .5;
    });

    // wave in bursts: 2.2s of waving every 5.5s
    const cyc = t % 5.5, w = cyc < 2.2 ? Math.sin(cyc / 2.2 * Math.PI) : 0;
    av.hand.rotation.z = .18 + Math.sin(t * 10) * .42 * w + Math.sin(t * 1.3) * .04;
    av.arm.rotation.z = Math.sin(t * 10 - .6) * .03 * w;
    av.fingers.forEach((joints, i) => {
      const spread = (i - 1.5) * (.07 + .05 * w);
      joints[0].rotation.z = -spread;
      joints.forEach((j, k) => { j.rotation.x = (.08 + k * .05) + .1 * Math.sin(t * 10 + i * .7 + k) * w; });
    });
    av.thumb[0].rotation.z = .8 + .12 * w;

    renderer.render(scene, camera);
  };
  requestAnimationFrame(frame);
  return renderer;
}

const loader = document.getElementById('loader');
document.querySelectorAll('.avatar-slot').forEach(slot => {
  const inLoader = !!slot.closest('#loader');
  mount(slot, { stopWhen: inLoader ? () => loader.classList.contains('done') : null });
});
