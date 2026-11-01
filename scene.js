import * as THREE from 'three';

const canvas = document.getElementById('scene');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = innerWidth < 760;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, alpha: false, powerPreference: 'high-performance' });
} catch (e) {
  canvas.remove(); // no WebGL: the page still works on its own
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
renderer.setClearColor(0x05070d, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05070d, 0.045);
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);

/* ---------- data terrain: an instanced 3D bar chart ---------- */
const N = small ? 34 : 50, GAP = 0.62;
const geo = new THREE.BoxGeometry(0.46, 1, 0.46);
geo.translate(0, 0.5, 0); // grow from the floor
const mat = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.25, emissive: 0x0b1a2a, emissiveIntensity: 0.6 });
const bars = new THREE.InstancedMesh(geo, mat, N * N);
const grid = new THREE.Group();
grid.add(bars);
scene.add(grid);

const lo = new THREE.Color('#06303d'), mid = new THREE.Color('#0e7490'), hi = new THREE.Color('#8b5cf6');
const tmp = new THREE.Object3D(), col = new THREE.Color();
const off = (N - 1) * GAP / 2;

// wireframe floor grid + axes, like a chart's gridlines
const floor = new THREE.GridHelper(N * GAP * 1.6, 40, 0x1e3a4a, 0x0f1d29);
floor.position.y = -0.01;
grid.add(floor);

/* ---------- scatter cloud with regression-ish structure ---------- */
const P = small ? 500 : 1100;
const pPos = new Float32Array(P * 3), pCol = new Float32Array(P * 3);
for (let i = 0; i < P; i++) {
  const t = Math.random() * 2 - 1;
  pPos[i * 3] = t * 22 + (Math.random() - .5) * 4;
  pPos[i * 3 + 1] = 4 + t * 3 + (Math.random() - .5) * 5 + 3;
  pPos[i * 3 + 2] = (Math.random() - .5) * 30;
  col.copy(Math.random() > .75 ? hi : mid);
  pCol.set([col.r, col.g, col.b], i * 3);
}
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
const dotTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
const points = new THREE.Points(pGeo, new THREE.PointsMaterial({
  size: 0.16, map: dotTex, vertexColors: true, transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending
}));
scene.add(points);

// regression line through the cloud
const regLine = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-24, 7 - 3.3, 0), new THREE.Vector3(24, 7 + 3.3, 0)]),
  new THREE.LineDashedMaterial({ color: 0xa78bfa, dashSize: .5, gapSize: .35, transparent: true, opacity: .55 })
);
regLine.computeLineDistances();
scene.add(regLine);

/* ---------- lights ---------- */
scene.add(new THREE.AmbientLight(0x6b7a99, 0.7));
const key = new THREE.DirectionalLight(0xffffff, 1.4);
key.position.set(8, 14, 6);
scene.add(key);
const cyanL = new THREE.PointLight(0x22d3ee, 40, 30); cyanL.position.set(-6, 5, 4); scene.add(cyanL);
const violetL = new THREE.PointLight(0xa78bfa, 40, 30); violetL.position.set(7, 4, -5); scene.add(violetL);

/* ---------- interaction ---------- */
const mouse = new THREE.Vector2(0, 0), mouseS = new THREE.Vector2(0, 0);
const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3(999, 0, 999);
addEventListener('pointermove', e => { mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); }, { passive: true });

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w < h ? 60 : 45;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

/* ---------- frame ---------- */
const clock = new THREE.Clock();
let t = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), .05);
  if (!reduce) t += dt;
  mouseS.lerp(mouse, .06);

  const sp = Math.min(1, scrollY / (document.documentElement.scrollHeight - innerHeight || 1));
  const heroK = Math.min(1, scrollY / innerHeight);

  // camera flies over the terrain as you scroll through the page
  const ang = -0.6 + sp * Math.PI * 1.2 + mouseS.x * .15;
  const rad = 15 - heroK * 3;
  camera.position.set(Math.sin(ang) * rad, 8 + heroK * 4 + mouseS.y * .8 + sp * 3, Math.cos(ang) * rad);
  camera.lookAt(0, 3.2 - heroK * 1.5, 0);

  ray.setFromCamera(mouseS, camera);
  if (!ray.ray.intersectPlane(plane, hit)) hit.set(999, 0, 999);

  let i = 0;
  for (let x = 0; x < N; x++) {
    for (let z = 0; z < N; z++) {
      const px = x * GAP - off, pz = z * GAP - off;
      const d = Math.hypot(px - hit.x, pz - hit.z);
      let h = 0.9
        + Math.sin(px * .35 + t * .9) * .55
        + Math.cos(pz * .3 - t * .7) * .55
        + Math.sin((px + pz) * .18 + t * .5) * .7
        + Math.sin(Math.hypot(px, pz) * .5 - t * 1.4) * .35;
      h += Math.max(0, 1 - d / 3.2) * 2.4 * (0.6 + 0.4 * Math.sin(t * 6 - d * 2)); // cursor ripple
      h = Math.max(.06, h);
      tmp.position.set(px, 0, pz);
      tmp.scale.set(1, h, 1);
      tmp.updateMatrix();
      bars.setMatrixAt(i, tmp.matrix);
      const k = Math.min(1, h / 3.6);
      k < .5 ? col.copy(lo).lerp(mid, k * 2) : col.copy(mid).lerp(hi, (k - .5) * 2);
      bars.setColorAt(i, col);
      i++;
    }
  }
  bars.instanceMatrix.needsUpdate = true;
  bars.instanceColor.needsUpdate = true;

  points.rotation.y = t * .03;
  regLine.rotation.y = t * .03;
  cyanL.position.x = Math.sin(t * .5) * 8;
  violetL.position.z = Math.cos(t * .4) * 8;

  canvas.style.opacity = 1 - heroK * .5;
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
