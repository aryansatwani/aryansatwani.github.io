import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Small 3D props: a football (XPERT), a dotted land globe with my route (Wayfarer Atlas), a trophy (honours).
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- shared mini-scene ---------- */
function mini(box, { build, tick, z = 3.6, lookY = 0 }) {
  const canvas = document.createElement('canvas');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch { return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  scene.add(new THREE.HemisphereLight('#ffffff', '#1b2a4a', .6));
  const key = new THREE.DirectionalLight('#ffffff', 2.2); key.position.set(-3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight('#22d3ee', 2); rim.position.set(4, 2, -3); scene.add(rim);
  const fill = new THREE.DirectionalLight('#a78bfa', 1.2); fill.position.set(-4, -1, -2); scene.add(fill);

  const camera = new THREE.PerspectiveCamera(35, 1, .1, 50);
  camera.position.set(0, lookY, z);
  camera.lookAt(0, lookY, 0);
  const root = new THREE.Group();
  scene.add(root);
  const obj = build(root);

  box.replaceChildren(canvas);
  box.classList.add('live');
  const resize = () => {
    const w = box.clientWidth || 120, h = box.clientHeight || 120;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(box);
  resize();

  // tilt toward the cursor while it's over the card
  const card = box.closest('.spotlight') || box;
  const tilt = { x: 0, y: 0 }, aim = { x: 0, y: 0 };
  card.addEventListener('pointermove', e => {
    const r = card.getBoundingClientRect();
    aim.x = ((e.clientX - r.left) / r.width - .5) * 2;
    aim.y = ((e.clientY - r.top) / r.height - .5) * 2;
  });
  card.addEventListener('pointerleave', () => { aim.x = aim.y = 0; });

  let visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '80px' }).observe(box);
  const clock = new THREE.Clock();
  let t = 0;
  const frame = () => {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), .05);
    if (!visible) return;
    t += reduce ? 0 : dt;
    tilt.x += (aim.x - tilt.x) * .08; tilt.y += (aim.y - tilt.y) * .08;
    root.rotation.set(tilt.y * .35, tilt.x * .6, 0);
    tick(obj, t, dt);
    renderer.render(scene, camera);
  };
  requestAnimationFrame(frame);
}

/* ---------- football: 12 pentagons + 20 hexagons projected onto a sphere ---------- */
function footballGeometry(sub = 5) {
  const ico = new THREE.IcosahedronGeometry(1, 0).getAttribute('position');
  const V = [], F = [];
  const idx = v => {
    const i = V.findIndex(u => u.distanceToSquared(v) < 1e-6);
    return i >= 0 ? i : V.push(v.clone()) - 1;
  };
  for (let i = 0; i < ico.count; i += 3) {
    F.push([0, 1, 2].map(k => idx(new THREE.Vector3().fromBufferAttribute(ico, i + k))));
  }
  const nbrs = V.map(() => new Set());
  F.forEach(([a, b, c]) => { nbrs[a].add(b).add(c); nbrs[b].add(a).add(c); nbrs[c].add(a).add(b); });
  const lerp = (a, b, k) => V[a].clone().lerp(V[b], k);

  const polys = [];
  F.forEach(([a, b, c]) => polys.push({ white: true, pts: [lerp(a, b, 1 / 3), lerp(a, b, 2 / 3), lerp(b, c, 1 / 3), lerp(b, c, 2 / 3), lerp(c, a, 1 / 3), lerp(c, a, 2 / 3)] }));
  V.forEach((v, i) => {
    const n = v.clone().normalize();
    const u = new THREE.Vector3(0, 1, 0).cross(n).normalize();
    if (u.lengthSq() < .5) u.set(1, 0, 0);
    const w = n.clone().cross(u);
    const pts = [...nbrs[i]].map(j => lerp(i, j, 1 / 3))
      .sort((p, q) => Math.atan2(p.clone().sub(v).dot(w), p.clone().sub(v).dot(u)) - Math.atan2(q.clone().sub(v).dot(w), q.clone().sub(v).dot(u)));
    polys.push({ white: false, pts });
  });

  const pos = [], col = [];
  const white = new THREE.Color('#f4f4f2'), black = new THREE.Color('#15171c');
  const push = (p, c) => { pos.push(p.x, p.y, p.z); col.push(c.r, c.g, c.b); };
  polys.forEach(({ white: isW, pts }) => {
    const c = isW ? white : black;
    const C = pts.reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(pts.length);
    const P = pts.map(p => C.clone().add(p.clone().sub(C).multiplyScalar(.955))); // small gap = seams
    P.forEach((p, i) => {
      const A = p.clone().sub(C), B = P[(i + 1) % P.length].clone().sub(C);
      const at = (a, b) => C.clone().addScaledVector(A, a / sub).addScaledVector(B, b / sub).normalize();
      for (let a = 0; a < sub; a++) for (let b = 0; b < sub - a; b++) {
        const tris = [[at(a, b), at(a + 1, b), at(a, b + 1)]];
        if (b < sub - a - 1) tris.push([at(a + 1, b), at(a + 1, b + 1), at(a, b + 1)]);
        tris.forEach(([x, y, z]) => {
          const nrm = y.clone().sub(x).cross(z.clone().sub(x));
          (nrm.dot(x) < 0 ? [x, z, y] : [x, y, z]).forEach(q => push(q, c));
        });
      }
    });
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

function buildBall(root) {
  const ball = new THREE.Group();
  ball.add(new THREE.Mesh(footballGeometry(), new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .42, clearcoat: .7, clearcoatRoughness: .25 })));
  ball.add(new THREE.Mesh(new THREE.SphereGeometry(.985, 48, 32), new THREE.MeshStandardMaterial({ color: '#2a2d33', roughness: .8 })));
  root.add(ball);
  return ball;
}

/* ---------- trophy ---------- */
function buildTrophy(root) {
  const g = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: '#ffc53d', metalness: .62, roughness: .26, envMapIntensity: 2.2, emissive: '#5a3b00', emissiveIntensity: .45 });
  const profile = [[0, 0], [.42, 0], [.42, .06], [.3, .1], [.11, .18], [.08, .48], [.1, .58], [.26, .64], [.47, .88], [.53, 1.26], [.56, 1.3], [.5, 1.3], [.45, .98], [0, .8]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 64), gold));
  for (const s of [-1, 1]) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(.2, .042, 16, 40, Math.PI), gold);
    handle.position.set(s * .55, 1.02, 0);
    handle.rotation.z = -s * Math.PI / 2; // right half-ring on the right, left half-ring on the left
    g.add(handle);
  }
  const base = new THREE.Mesh(new THREE.BoxGeometry(.9, .32, .9), new THREE.MeshStandardMaterial({ color: '#1c2433', roughness: .45, metalness: .2 }));
  base.position.y = -.16;
  const plate = new THREE.Mesh(new THREE.BoxGeometry(.5, .12, .02), gold);
  plate.position.set(0, -.16, .46);
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(.1, 0), gold);
  star.position.y = 1.5;
  g.add(base, plate, star);
  g.position.y = -.55;
  root.add(g);
  return { g, star };
}

/* ---------- dotted globe with the Dubai → Istanbul → Tbilisi route ---------- */
const toVec = (lat, lon, r = 1) => {
  const p = THREE.MathUtils.degToRad(lat), l = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(Math.cos(p) * Math.sin(l), Math.sin(p), Math.cos(p) * Math.cos(l)).multiplyScalar(r);
};

async function buildGlobe(root) {
  const globe = new THREE.Group();
  globe.rotation.y = THREE.MathUtils.degToRad(-42); // start over the Middle East
  globe.rotation.x = .35;
  root.add(globe);
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(.985, 64, 48), new THREE.MeshStandardMaterial({ color: '#0b1324', roughness: .9 })));

  const land = await fetch('globe-land.json').then(r => r.json()).catch(() => []);
  const pts = [];
  for (let i = 0; i < land.length; i += 2) { const v = toVec(land[i], land[i + 1], 1.003); pts.push(v.x, v.y, v.z); }
  const dots = new THREE.BufferGeometry();
  dots.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  globe.add(new THREE.Points(dots, new THREE.PointsMaterial({ color: '#67e8f9', size: .028, sizeAttenuation: true })));

  const stops = [[25.2, 55.27], [41.01, 28.98], [41.72, 44.79]].map(([a, b]) => toVec(a, b));
  const curve = [];
  for (let s = 0; s < stops.length - 1; s++) {
    for (let k = 0; k <= 48; k++) {
      const t = k / 48;
      curve.push(stops[s].clone().lerp(stops[s + 1], t).normalize().multiplyScalar(1 + Math.sin(Math.PI * t) * .14));
    }
  }
  const routeGeo = new THREE.BufferGeometry().setFromPoints(curve);
  const route = new THREE.Line(routeGeo, new THREE.LineBasicMaterial({ color: '#a78bfa' }));
  globe.add(route);
  stops.forEach(p => {
    const pin = new THREE.Mesh(new THREE.SphereGeometry(.03, 16, 12), new THREE.MeshBasicMaterial({ color: '#fbbf24' }));
    pin.position.copy(p.clone().multiplyScalar(1.01));
    globe.add(pin);
  });
  const plane = new THREE.Mesh(new THREE.SphereGeometry(.028, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  globe.add(plane);
  return { globe, route, curve, plane };
}

/* ---------- mount ---------- */
const boxes = document.querySelectorAll('[data-obj]');
boxes.forEach(async box => {
  const kind = box.dataset.obj;
  if (kind === 'ball') {
    mini(box, {
      build: buildBall, z: 3.4,
      tick: (ball, t, dt) => { ball.rotation.y += dt * .9; ball.rotation.x += dt * .35; ball.position.y = Math.abs(Math.sin(t * 2.4)) * .18 - .08; }
    });
  } else if (kind === 'trophy') {
    mini(box, {
      build: buildTrophy, z: 3.6, lookY: .15,
      tick: ({ g, star }, t) => { g.rotation.y = t * .7; star.rotation.y = t * 2.5; }
    });
  } else if (kind === 'globe') {
    let ready = null;
    mini(box, {
      build: root => { buildGlobe(root).then(o => { ready = o; }); return null; }, z: 3.3,
      tick: (_, t) => {
        if (!ready) return;
        ready.globe.rotation.y = THREE.MathUtils.degToRad(-46) + Math.sin(t * .25) * .22;
        const n = ready.curve.length, k = (t * .35) % 1.4;          // draw the route, hold, repeat
        const shown = Math.max(2, Math.floor(Math.min(1, k) * n));
        ready.route.geometry.setDrawRange(0, shown);
        ready.plane.position.copy(ready.curve[Math.min(n - 1, shown - 1)]);
      }
    });
  }
});
