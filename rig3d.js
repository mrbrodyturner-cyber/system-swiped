// Real 3D rig, built from the equipped gear with three.js (bundled locally, works offline).
// Renders on demand only: while you drag in the rig screen, plus one-off snapshots for cards.
import * as THREE from './three.module.js';
import { OrbitControls } from './OrbitControls.js';
import { RoomEnvironment } from './RoomEnvironment.js';
import { RoundedBoxGeometry } from './RoundedBoxGeometry.js';

const gear = (rig, s) => (rig[s] ? gearById.get(rig[s]) : null);

// ---------- procedural textures ----------
function canvas(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
function tex(c, { srgb = true, rep = [1, 1] } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = 8;
  return t;
}
const noise = (amt, size = 256, seed = 1) => canvas(size, size, (g, w, h) => {
  const d = g.createImageData(w, h); let s = seed * 9301;
  for (let i = 0; i < d.data.length; i += 4) { s = (s * 9301 + 49297) % 233280; const v = 128 + (s / 233280 - 0.5) * amt; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  g.putImageData(d, 0, 0);
});
const leather = tex(canvas(256, 256, (g, w, h) => {   // pebbled leatherette bump
  g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
  let s = 7; const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 2600; i++) { const x = r() * w, y = r() * h, rad = 1 + r() * 2.2; g.fillStyle = `rgba(${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},.18)`; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill(); }
}), { srgb: false, rep: [3, 3] });
const fine = tex(noise(60, 128, 3), { srgb: false, rep: [6, 6] });
const knurl = tex(canvas(256, 32, (g, w, h) => { g.fillStyle = '#909090'; g.fillRect(0, 0, w, h); g.fillStyle = '#202020'; for (let x = 0; x < w; x += 4) g.fillRect(x, 0, 2, h); }), { srgb: false, rep: [60, 1] });
const knurlCol = tex(canvas(256, 32, (g, w, h) => { g.fillStyle = '#1e1f1f'; g.fillRect(0, 0, w, h); g.fillStyle = '#0a0a0a'; for (let x = 0; x < w; x += 4) g.fillRect(x, 0, 2, h); }), { rep: [60, 1] });
const knurlColW = tex(canvas(256, 32, (g, w, h) => { g.fillStyle = '#8d9390'; g.fillRect(0, 0, w, h); g.fillStyle = '#5c625f'; for (let x = 0; x < w; x += 4) g.fillRect(x, 0, 2, h); }), { rep: [24, 1] });
const woodTex = tex(canvas(128, 512, (g, w, h) => {
  g.fillStyle = '#5a3418'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) { const x = Math.random() * w; g.strokeStyle = `rgba(${Math.random() > 0.5 ? '30,14,4' : '140,90,45'},${0.15 + Math.random() * 0.25})`; g.lineWidth = 0.6 + Math.random() * 2; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= h; y += 32) g.lineTo(x + Math.sin(y / 60 + i) * 3, y); g.stroke(); }
}), { rep: [2, 1] });
const scaleTex = tex(canvas(512, 64, (g, w, h) => {   // focus distance scale on the lens
  g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, w, h);
  g.fillStyle = '#e8e8e8'; g.font = 'bold 16px Helvetica'; const marks = ['∞', '10', '5', '3', '2', '1.5', '1.2', '1', '.8', 'ft'];
  marks.forEach((m, i) => g.fillText(m, 12 + i * 30, 40));
  g.fillStyle = '#ff7a1a'; g.fillRect(0, 50, w * 0.6, 2);
}));
const screenTex = tex(canvas(480, 300, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5b86b4'); gr.addColorStop(0.5, '#c3d8e4'); gr.addColorStop(1, '#2b6a45');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = '#1b4a31'; g.beginPath(); g.moveTo(0, h * 0.62); g.quadraticCurveTo(w * 0.3, h * 0.45, w * 0.55, h * 0.64); g.quadraticCurveTo(w * 0.8, h * 0.48, w, h * 0.58); g.lineTo(w, h); g.lineTo(0, h); g.fill();
  g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, w, 28); g.fillRect(0, h - 28, w, 28);
  g.fillStyle = '#fff'; g.font = 'bold 16px Helvetica'; g.fillText('4K 23.98   ISO 800   1/50   T2.8   S-LOG3', 12, 19);
  g.fillText('● REC  01:24:09', 12, h - 9); g.fillStyle = '#ff3b3b'; g.fillRect(w - 70, h - 20, 56, 12);
  g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 1.5; g.strokeRect(w / 3, 28, w / 3, h - 56);
}));
const brandCache = new Map();
function brandMat(name) {
  if (!brandCache.has(name)) {
    const serif = name === 'Sony' ? 'bold 92px Rockwell, "Clarendon", "Bodoni 72", Georgia, serif' : name === 'Canon' ? 'italic bold 92px Georgia, serif' : 'bold 86px "Avenir Next", Helvetica';
    const t = tex(canvas(512, 128, (g, w, h) => { g.fillStyle = '#eef0ef'; g.font = serif; g.textAlign = 'center'; g.textBaseline = 'middle'; g.save(); g.scale(1.18, 1); g.fillText(name.toUpperCase(), w / 2 / 1.18, h / 2 + 6); g.restore(); }), { rep: [1, 1] });
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    brandCache.set(name, new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.4, metalness: 0.2, polygonOffset: true, polygonOffsetFactor: -2 }));
  }
  return brandCache.get(name);
}

const badgeCache = new Map();
function badgeMat(text) {
  if (!badgeCache.has(text)) {
    const t = tex(canvas(256, 128, (g, w, h) => { g.fillStyle = '#e6e8e7'; g.font = 'bold 70px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 4); }));
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    badgeCache.set(text, new THREE.MeshBasicMaterial({ map: t, transparent: true, polygonOffset: true, polygonOffsetFactor: -2 }));
  }
  return badgeCache.get(text);
}
// coated front element: deep green/purple reflections like real lens glass
const coatTex = tex(canvas(256, 256, (g, w, h) => {
  const r = g.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.5);
  r.addColorStop(0, '#020403'); r.addColorStop(0.35, '#06140e'); r.addColorStop(0.62, '#1f6b44'); r.addColorStop(0.72, '#0a1a12'); r.addColorStop(0.86, '#3a1f5a'); r.addColorStop(1, '#050507');
  g.fillStyle = r; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.ellipse(w * 0.36, h * 0.32, w * 0.12, h * 0.06, -0.6, 0, 7); g.fill();
}));
coatTex.wrapS = coatTex.wrapT = THREE.ClampToEdgeWrapping;
const ringCache = new Map();
function frontRingMat(text) {   // lens name printed around the front rim
  if (!ringCache.has(text)) {
    const t = tex(canvas(512, 512, (g, w, h) => {
      g.translate(w / 2, h / 2); g.fillStyle = '#d9dcda'; g.font = 'bold 26px Helvetica'; g.textAlign = 'center';
      const chars = (text + '   ').toUpperCase().split(''); const step = (Math.PI * 1.7) / chars.length;
      chars.forEach((c, i) => { g.save(); g.rotate(-Math.PI * 0.85 + i * step); g.fillText(c, 0, -h * 0.415); g.restore(); });
    }));
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    ringCache.set(text, new THREE.MeshBasicMaterial({ map: t, transparent: true, polygonOffset: true, polygonOffsetFactor: -3 }));
  }
  return ringCache.get(text);
}
// ---------- materials ----------
const std = (o) => new THREE.MeshStandardMaterial(o);
const M = {
  body: new THREE.MeshPhysicalMaterial({ color: 0x18191a, roughness: 0.62, metalness: 0.05, bumpMap: fine, bumpScale: 0.35, clearcoat: 0.15, clearcoatRoughness: 0.6 }),
  leather: std({ color: 0x121313, roughness: 0.8, metalness: 0, bumpMap: leather, bumpScale: 1.6 }),
  rubber: std({ color: 0x0f1010, roughness: 0.9, metalness: 0, bumpMap: fine, bumpScale: 0.5 }),
  cage: std({ color: 0x1d1f20, roughness: 0.38, metalness: 0.85, bumpMap: fine, bumpScale: 0.12 }),
  cageGreen: std({ color: 0x173a2c, roughness: 0.38, metalness: 0.85, bumpMap: fine, bumpScale: 0.12 }),
  cageTilta: std({ color: 0x2a2a26, roughness: 0.4, metalness: 0.85 }),
  silver: std({ color: 0xd2d6d4, roughness: 0.22, metalness: 1 }),
  steel: std({ color: 0x6b706e, roughness: 0.3, metalness: 0.95 }),
  dark: std({ color: 0x0b0c0c, roughness: 0.5, metalness: 0.4 }),
  lensBlack: std({ color: 0x161717, roughness: 0.68, metalness: 0.08, bumpMap: fine, bumpScale: 0.25 }),
  lensWhite: new THREE.MeshPhysicalMaterial({ color: 0xe9ebe8, roughness: 0.4, metalness: 0, clearcoat: 0.4 }),
  knurl: std({ map: knurlCol, bumpMap: knurl, bumpScale: 1.2, roughness: 0.85, metalness: 0.05 }),
  knurlW: std({ map: knurlColW, bumpMap: knurl, bumpScale: 1, roughness: 0.75 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x0b1410, roughness: 0.02, metalness: 0.05, transmission: 0, transparent: true, opacity: 0.55, clearcoat: 1, clearcoatRoughness: 0, iridescence: 0.7, iridescenceIOR: 1.7, envMapIntensity: 2.6 }),
  glassInner: new THREE.MeshPhysicalMaterial({ map: coatTex, roughness: 0.05, metalness: 0.2, clearcoat: 1, iridescence: 0.8, envMapIntensity: 1.6 }),
  wood: std({ map: woodTex, roughness: 0.55, metalness: 0, bumpMap: woodTex, bumpScale: 0.6 }),
  lcd: std({ color: 0x050607, roughness: 0.08, metalness: 0.5 }),
  screenOn: new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }),
  scale: new THREE.MeshBasicMaterial({ map: scaleTex, transparent: true, polygonOffset: true, polygonOffsetFactor: -2 }),
  ledG: new THREE.MeshBasicMaterial({ color: 0x35d07f }),
  ledR: new THREE.MeshBasicMaterial({ color: 0xff3b3b }),
  green: std({ color: 0x2a8c63, roughness: 0.4, metalness: 0.5 }),
  carbon: std({ color: 0x161717, roughness: 0.35, metalness: 0.3, bumpMap: tex(noise(90, 64, 9), { srgb: false, rep: [1, 8] }), bumpScale: 0.3 }),
};
const accentMat = new Map();
const accent = (hex) => { if (!accentMat.has(hex)) accentMat.set(hex, std({ color: new THREE.Color(hex), roughness: 0.3, metalness: 0.5 })); return accentMat.get(hex); };

// ---------- geometry helpers ----------
function add(parent, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}
const rbox = (w, h, d, r = 0.4) => new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2.01, h / 2.01, d / 2.01));
const cylY = (r, len, seg = 32) => new THREE.CylinderGeometry(r, r, len, seg);
const cylZ = (r, len, seg = 48) => { const g = new THREE.CylinderGeometry(r, r, len, seg); g.rotateX(Math.PI / 2); return g; };
function tube(parent, a, b, r, mat, seg = 20) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  parent.add(m);
  return m;
}
// rounded-rect outline (optionally with a raised hump in the top edge)
function rrShape(w, h, r, hump) {
  const s = new THREE.Shape(), x0 = -w / 2, y0 = -h / 2, x1 = w / 2, y1 = h / 2;
  s.moveTo(x0 + r, y0); s.lineTo(x1 - r, y0); s.quadraticCurveTo(x1, y0, x1, y0 + r); s.lineTo(x1, y1 - r); s.quadraticCurveTo(x1, y1, x1 - r, y1);
  if (hump) {
    const { cx, w: hw, h: hh } = hump;
    s.lineTo(cx + hw / 2 + 1.2, y1); s.bezierCurveTo(cx + hw / 2 + 0.3, y1, cx + hw / 2, y1 + hh * 0.9, cx + hw / 2 - 0.6, y1 + hh);
    s.lineTo(cx - hw / 2 + 0.6, y1 + hh); s.bezierCurveTo(cx - hw / 2, y1 + hh * 0.9, cx - hw / 2 - 0.3, y1, cx - hw / 2 - 1.2, y1);
  }
  s.lineTo(x0 + r, y1); s.quadraticCurveTo(x0, y1, x0, y1 - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
  return s;
}
// extrude a front silhouette along z, centred on z=0, with soft bevelled edges
function extrudeZ(shape, depth, bevel = 0.3, segs = 4) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.01, depth - bevel * 2), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: segs, curveSegments: 24 });
  g.translate(0, 0, -(depth - bevel * 2) / 2);
  g.computeVertexNormals();
  return g;
}
// lathe a lens / grip profile [[r, z], ...] around the z axis
function latheZ(profile, seg = 64) {
  const g = new THREE.LatheGeometry(profile.map(([r, z]) => new THREE.Vector2(r, z)), seg);
  g.rotateX(Math.PI / 2);
  return g;
}
function latheY(profile, seg = 40) { return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg); }
// flat plate with slots/holes, extruded along given axis
function plate(w, h, t, holes = [], slots = [], bevel = 0.06) {
  const s = rrShape(w, h, Math.min(0.35, w / 4, h / 4));
  for (const [x, y, r] of holes) { const p = new THREE.Path(); p.absarc(x, y, r, 0, Math.PI * 2, true); s.holes.push(p); }
  for (const [x, y, sw, sh] of slots) { const p = new THREE.Path(); const r = Math.min(sw, sh) / 2; p.moveTo(x - sw / 2 + r, y - sh / 2); p.lineTo(x + sw / 2 - r, y - sh / 2); p.absarc(x + sw / 2 - r, y - sh / 2 + r, r, -Math.PI / 2, 0, false); p.lineTo(x + sw / 2, y + sh / 2 - r); p.absarc(x + sw / 2 - r, y + sh / 2 - r, r, 0, Math.PI / 2, false); p.lineTo(x - sw / 2 + r, y + sh / 2); p.absarc(x - sw / 2 + r, y + sh / 2 - r, r, Math.PI / 2, Math.PI, false); p.lineTo(x - sw / 2, y - sh / 2 + r); p.absarc(x - sw / 2 + r, y - sh / 2 + r, r, Math.PI, Math.PI * 1.5, false); s.holes.push(p); }
  return extrudeZ(s, t, bevel, 2);
}

// ---------- build the rig ----------
// Modelled after SmallRig-style kits: flat machined aluminium with small chamfers, rows of 1/4"-20 holes,
// cage hugging the body with a viewfinder cut-out and a bar around the grip, straight handles, boxy accessories.
// Units ~ cm. Lens points +z. Grip on -x.
const hard = (w, h, d, r = 0.12) => rbox(w, h, d, r);        // machined part: tiny edge radius
function extrudeY(shape, height, bevel = 0.15) {             // top-view outline (x,z) extruded upward
  const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.01, height - bevel * 2), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 20 });
  g.rotateX(Math.PI / 2); g.translate(0, height - bevel, 0); g.computeVertexNormals();
  return g;
}
const dimple = tex(canvas(128, 128, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); g.fillStyle = '#303030'; for (let y = 4; y < h; y += 16) for (let x = (y / 16) % 2 ? 12 : 4; x < w; x += 16) g.fillRect(x, y, 8, 8); }), { srgb: false, rep: [2, 6] });
const M_grip = std({ color: 0x111212, roughness: 0.85, metalness: 0, bumpMap: dimple, bumpScale: 1.4 });
const holeMat = std({ color: 0x050505, roughness: 0.6, metalness: 0.3 });

function holeGrid(parent, nx, nz, x0, x1, z0, z1, y, r = 0.17) {   // threaded holes drawn as dark insets on a flat face
  const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(r, r, 0.04, 12), holeMat, nx * nz);
  const m = new THREE.Matrix4(); let k = 0;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { m.makeTranslation(x0 + (nx === 1 ? 0 : (x1 - x0) * i / (nx - 1)), y, z0 + (nz === 1 ? 0 : (z1 - z0) * j / (nz - 1))); im.setMatrixAt(k++, m); }
  parent.add(im);
}
function holeGridX(parent, ny, nz, x, y0, y1, z0, z1, r = 0.17) {  // on a face that points along x
  const g = new THREE.CylinderGeometry(r, r, 0.04, 12); g.rotateZ(Math.PI / 2);
  const im = new THREE.InstancedMesh(g, holeMat, ny * nz);
  const m = new THREE.Matrix4(); let k = 0;
  for (let i = 0; i < ny; i++) for (let j = 0; j < nz; j++) { m.makeTranslation(x, y0 + (ny === 1 ? 0 : (y1 - y0) * i / (ny - 1)), z0 + (nz === 1 ? 0 : (z1 - z0) * j / (nz - 1))); im.setMatrixAt(k++, m); }
  parent.add(im);
}

function buildRig(rig) {
  const root = new THREE.Group();
  const body = gear(rig, 'body');
  if (!body) return root;
  const lens = gear(rig, 'lens'), cage = gear(rig, 'cage'), top = gear(rig, 'top'), sideL = gear(rig, 'sideL'), sideR = gear(rig, 'sideR');
  const mon = gear(rig, 'monitor'), bat = gear(rig, 'battery'), fan = gear(rig, 'fan'), sup = gear(rig, 'support');
  const cine = body.kind === 'c';
  const s = body.big ? 1.1 : body.small ? 0.88 : 1;
  // real-ish dimensions (a7 IV ≈ 13.1 x 9.6 x 8 cm incl. grip; body depth behind the mount ≈ 4.8)
  const W = (cine ? 12.9 : 13.1) * s, H = (cine ? 7.8 : 7.6) * s, D = (cine ? 8.5 : 4.6) * s;
  const gripH = body.grip ? 4.6 : 0;
  const y0 = gripH, cyB = y0 + H / 2;
  const hasHump = !cine && !body.small && !body.retro;
  const humpW = 5.2 * s, humpH = hasHump ? 2.3 * s : 0, humpD = D * 1.05;
  const mountX = cine ? 0.6 : 1.3 * s, mountY = y0 + (cine ? H * 0.47 : 3.9 * s);

  // ---- body: flat-faced shell with a small edge radius
  add(root, rbox(W, H, D, cine ? 0.35 : 0.45), M.body, 0, cyB, 0);
  if (!cine) {
    // EVF hump: faceted trapezoid prism
    if (hasHump) {
      const pf = new THREE.Shape();   // side profile in (z, y): raked front, flat top, eyepiece at the back
      const zf = humpD / 2, zb = -humpD / 2, rake = 1.1 * s;
      pf.moveTo(zb, 0); pf.lineTo(zf, 0); pf.lineTo(zf - rake, humpH); pf.lineTo(zb + 0.3, humpH); pf.lineTo(zb, humpH - 0.4); pf.closePath();
      const hg = new THREE.ExtrudeGeometry(pf, { depth: humpW - 0.3, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15, bevelSegments: 3 });
      hg.rotateY(-Math.PI / 2); hg.translate((humpW - 0.3) / 2, 0, 0);
      const pos = hg.attributes.position;   // taper the hump toward the top like the real prism housing
      for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); pos.setX(i, pos.getX(i) * (1 - 0.28 * Math.max(0, y) / humpH)); }
      hg.computeVertexNormals();
      add(root, hg, M.body, mountX, y0 + H - 0.2, 0);
      add(root, hard(humpW * 0.6, humpH * 0.85, 1.2, 0.35), M.rubber, mountX, y0 + H + humpH * 0.45, -D / 2 - 0.55);   // eyecup
      add(root, hard(2.0 * s, 0.35, 1.8, 0.06), M.steel, mountX, y0 + H + humpH + 0.15, -0.3);                        // hot shoe
      const logo = add(root, new THREE.PlaneGeometry(3.9 * s, 0.98 * s), brandMat(BRANDS[body.brand].name), mountX, y0 + H - 0.2 + humpH * 0.5, humpD / 2 - rake * 0.5 + 0.19);
      logo.rotation.x = -Math.atan2(rake, humpH);
      root.userData.logoDone = true;
    } else {
      add(root, hard(3.2 * s, 2.0 * s, 0.9, 0.3), M.rubber, -W / 2 + 4.6 * s, y0 + H - 1.4 * s, -D / 2 - 0.45);
      add(root, hard(2.0 * s, 0.35, 1.6, 0.06), M.steel, mountX, y0 + H + 0.17, -0.2);
    }
    // grip: top-view profile extruded upward (rounded front, flat top & bottom, like the real thing)
    const gw = 3.4 * s, gf = 3.1 * s;   // width, how far it sticks out in front of the body
    const gs = new THREE.Shape();
    gs.moveTo(-gw / 2, D / 2 - 0.4); gs.lineTo(-gw / 2, D / 2 + gf * 0.55);
    gs.bezierCurveTo(-gw / 2, D / 2 + gf * 1.05, gw / 2, D / 2 + gf * 1.05, gw / 2, D / 2 + gf * 0.45);
    gs.lineTo(gw / 2, D / 2 - 0.4); gs.closePath();
    const gh = H - 0.5 + (body.grip ? gripH : 0);
    add(root, extrudeY(gs, gh, 0.35), M.leather, -W / 2 + gw / 2 + 0.05, (body.grip ? 0 : y0) + 0.25, 0);
    // top plate controls
    add(root, cylY(0.55 * s, 0.3, 32), M.silver, -W / 2 + 1.8 * s, y0 + H + 0.15, D / 2 + gf * 0.55);       // shutter
    add(root, new THREE.TorusGeometry(0.72 * s, 0.13, 8, 32), M.dark, -W / 2 + 1.8 * s, y0 + H + 0.08, D / 2 + gf * 0.55, Math.PI / 2);
    add(root, cylY(0.75 * s, 0.45, 40), M.knurl, -W / 2 + 4.1 * s, y0 + H + 0.22, D / 2 - 0.9);              // front dial
    const dialMat = body.retro ? M.silver : M.knurl;
    add(root, cylY(1.15 * s, 0.7, 48), dialMat, W / 2 - 2.0 * s, y0 + H + 0.35, -0.5);                         // mode dial
    add(root, cylY(0.85 * s, 0.4, 48), dialMat, W / 2 - 2.0 * s, y0 + H + 0.9, -0.5);
    for (const dx of [2.6, 3.3]) add(root, cylY(0.3, 0.2, 20), M.dark, -W / 2 + dx * s, y0 + H + 0.1, -1.0);
    add(root, cylY(0.95 * s, 0.55, 48), dialMat, W / 2 - 4.4 * s, y0 + H + 0.27, -0.8);                        // exposure comp
    add(root, hard(0.8, 0.3, 0.8, 0.12), M.dark, W / 2 - 3.2 * s, y0 + H + 0.15, 0.9);
    if (body.retro) add(root, cylY(1.0 * s, 0.6, 48), M.silver, -W / 2 + 4.9 * s, y0 + H + 0.3, -0.6);
    // front: leatherette panel with a crisp edge, function buttons
    add(root, hard(W - gw - 0.8, H * 0.78, 0.08, 0.05), M.leather, gw / 2 - 0.1 + 0.4, mountY - 0.2, D / 2 + 0.03);
    add(root, cylZ(0.25, 0.25, 16), M.dark, mountX + 3.3 * s, mountY - 1.6, D / 2 + 0.1);
    // rear LCD (flip screen with its hinge seam)
    add(root, hard(W * 0.6, H * 0.7, 0.45, 0.1), M.body, W * 0.12, cyB - 0.15, -D / 2 - 0.22);
    add(root, hard(W * 0.56, H * 0.62, 0.05, 0.04), M.lcd, W * 0.12, cyB - 0.15, -D / 2 - 0.46);
    if (body.grip) {
      add(root, rbox(W - 0.3, gripH + 0.3, D, 0.4), M.body, 0, gripH / 2, 0);
      add(root, cylY(0.5, 0.3, 24), M.silver, -W / 2 + 1.8, gripH - 1.2, D / 2 + 2.6);
    }
  } else {
    // cinema box: flat panels, fan vents, top cheese plate, rec button
    for (let i = 0; i < 10; i++) add(root, hard(0.12, H * 0.6, 0.3, 0.04), M.dark, W / 2 + 0.02, cyB, -D * 0.32 + i * (D * 0.64 / 9));
    add(root, hard(W * 0.8, 0.5, D * 0.8, 0.08), M.cage, 0, y0 + H + 0.25, 0);
    holeGrid(root, 6, 3, -W * 0.3, W * 0.3, -D * 0.28, D * 0.28, y0 + H + 0.51);
    add(root, cylZ(0.4, 0.15, 24), M.ledR, W / 2 - 1.3, y0 + 1.2, D / 2 + 0.04);
    add(root, hard(W * 0.55, H * 0.55, 0.06, 0.03), M.lcd, 0, cyB, -D / 2 - 0.03);
  }
  // mount: bayonet ring, release button, brand
  add(root, latheZ([[2.4, 0], [2.95, 0], [2.95, 0.12], [2.6, 0.32], [2.4, 0.32]]), M.dark, mountX, mountY, D / 2);
  add(root, cylZ(0.32, 0.25, 20), M.silver, mountX + 2.95, mountY - 1.2, D / 2 + 0.12);
  if (!root.userData.logoDone) add(root, new THREE.PlaneGeometry(3.6 * s, 0.9 * s), brandMat(BRANDS[body.brand].name), mountX, y0 + H - 0.6 * s, D / 2 + 0.07);
  // model badge (α 7 / R6 / Z / X-H) on the front, right of the mount; strap lugs; port doors
  if (!cine) {
    const tag = body.brand === 'sony' ? 'α' + (body.id.match(/\d/) ? body.id.match(/\d/)[0] : '') : body.brand === 'canon' ? 'EOS' : body.brand === 'nikon' ? 'Z' : 'X';
    add(root, new THREE.PlaneGeometry(1.5 * s, 0.75 * s), badgeMat(tag), W / 2 - 1.3 * s, y0 + H - 1.3 * s, D / 2 + 0.05);
    for (const sx of [-1, 1]) add(root, new THREE.TorusGeometry(0.42, 0.12, 8, 20), M.steel, sx * (W / 2 + 0.15), y0 + H - 1.0, -0.4, 0, Math.PI / 2);
    add(root, hard(0.1, H * 0.45, D * 0.55, 0.05), M.rubber, W / 2 + 0.02, cyB - 0.4, -0.2);   // port door
    add(root, hard(0.1, H * 0.25, D * 0.35, 0.05), M.rubber, -W / 2 - 0.02, cyB + 0.6, -D * 0.25);
  }
  if (body.brand === 'canon') add(root, new THREE.CircleGeometry(0.22, 20), accent('#e3262f'), W / 2 - 1.1, y0 + H - 1.0, D / 2 + 0.05);
  if (body.brand === 'nikon') add(root, hard(0.3, 2.6, 0.06, 0.03), accent('#ffd400'), -W / 2 + 3.2 * s, y0 + H * 0.6, D / 2 + 1.9 * s, 0, 0.6, -0.25);
  if (body.brand === 'sony') add(root, latheZ([[2.7, 0], [2.95, 0], [2.95, 0.12], [2.7, 0.12]]), accent('#e06a1c'), mountX, mountY, D / 2 + 0.3);

  // ---- lens: straight barrel sections with machined steps (no bulges)
  if (lens) {
    const R = Math.max(3.0, lens.dia / 14), L = Math.max(5.5, lens.len / 6 + 2.6);
    const bar = lens.white ? M.lensWhite : M.lensBlack, kn = lens.white ? M.knurlW : M.knurl;
    const z = D / 2 + 0.3;
    const sec = (z0, z1, r0, r1, mat) => add(root, latheZ([[r0, z + z0], [r1, z + z1]].length ? [[0.01, z + z0], [r0, z + z0], [r1, z + z1], [0.01, z + z1]] : []), mat, mountX, mountY, 0);
    sec(0, 0.45, 2.7, 2.7, M.dark);
    sec(0.45, 0.5, 2.7, R * 0.84, bar);
    sec(0.5, L * 0.2, R * 0.9, R * 0.92, bar);
    sec(L * 0.2, L * 0.24, R * 0.92, R * 0.92, bar);
    sec(L * 0.24, L * 0.5, R * 0.96, R * 0.96, kn);                 // zoom ring
    sec(L * 0.5, L * 0.6, R * 0.93, R * 0.93, bar);
    const sc = add(root, new THREE.CylinderGeometry(R * 0.905, R * 0.905, L * 0.05, 64, 1, true, Math.PI * 0.75, Math.PI * 0.5), M.scale, mountX, mountY, z + L * 0.55, Math.PI / 2);
    add(root, new THREE.CylinderGeometry(R * 0.975, R * 0.975, L * 0.04, 64, 1, true, Math.PI * 0.7, Math.PI * 0.6), M.scale, mountX, mountY, z + L * 0.95, Math.PI / 2);
    sec(L * 0.6, L * 0.8, R * 0.96, R * 0.96, kn);                 // focus ring
    sec(L * 0.8, L * 0.92, R * 0.95, R * 0.98, bar);
    if (lens.ring) sec(L * 0.9, L * 0.91, R * 0.975, R * 0.975, accent(lens.ring));
    sec(L * 0.92, L, R, R, bar);
    add(root, latheZ([[R * 0.84, z + L], [R, z + L], [R, z + L + 0.01]]), bar, mountX, mountY, 0);
    add(root, latheZ([[R * 0.84, z + L], [R * 0.84, z + L - 0.45], [R * 0.78, z + L - 0.5]]), M.dark, mountX, mountY, 0);
    if (!lens.white) add(root, new THREE.PlaneGeometry(R * 2, R * 2), frontRingMat(lens.name.replace(/\s*\(kit\)/, '')), mountX, mountY, z + L + 0.02);
    const gr = R * 0.78, cap = Math.asin(Math.min(0.9, 1 / 2.2));
    const dome = new THREE.SphereGeometry(gr * 2.2, 64, 20, 0, Math.PI * 2, 0, cap); dome.rotateX(Math.PI / 2);
    add(root, dome, M.glass, mountX, mountY, z + L - 0.45 - gr * 2.2 * Math.cos(cap) + 0.12);
    add(root, new THREE.CircleGeometry(gr * 0.98, 64), M.glassInner, mountX, mountY, z + L - 0.62);
    void sc;
  } else {
    add(root, new THREE.CircleGeometry(2.0, 48), M.dark, mountX, mountY, D / 2 + 0.3);
    add(root, new THREE.PlaneGeometry(2.4, 1.6), std({ color: 0x3b3456, roughness: 0.1, metalness: 0.8 }), mountX, mountY, D / 2 + 0.25);
  }

  // ---- cage (form-fitted)
  const ct = 0.42;                                       // plate thickness
  const gripReach = cine ? 0 : 3.1 * s;                  // grip protrusion
  const cx0 = -W / 2 - 0.35, cx1 = W / 2 + 0.35 + ct;
  const topY = y0 + H + 0.05;                            // top plate sits on the body's top plate
  const botY = -0.05;
  const cd = D + 0.6;
  const cMat = cage ? (cage.id === 'cage3' ? M.cageGreen : cage.style === 'pro' ? M.cageTilta : M.cage) : null;
  let deckTop = y0 + H + humpH;
  if (cage) {
    const cw = cx1 - cx0, cxm = (cx0 + cx1) / 2;
    // bottom plate with arca-swiss dovetail and 1/4" holes
    add(root, hard(cw, 0.8, cd + 0.4), cMat, cxm, botY - 0.4, 0);
    add(root, hard(3.8, 0.5, cd + 0.4, 0.06), cMat, mountX * 0.3, botY - 1.05, 0);
    holeGrid(root, 7, 1, cx0 + 0.9, cx1 - 0.9, 0, 0, botY - 0.02 - 0.8 + 0.81);
    if (cage.style !== 'half') {
      // top plate with a cut-out for the viewfinder hump
      const tp = plate(cw, cd, ct, [], hasHump ? [[mountX - cxm, 0.1, humpW + 0.3, humpD + 0.3]] : []);
      add(root, tp, cMat, cxm, topY + ct / 2, 0, Math.PI / 2);
      holeGrid(root, 3, 2, cx1 - 3.6, cx1 - 0.9, -cd / 2 + 0.8, cd / 2 - 0.8, topY + ct + 0.01);
      holeGrid(root, 2, 2, cx0 + 0.8, cx0 + 2.2, -cd / 2 + 0.8, cd / 2 - 0.8, topY + ct + 0.01);
      add(root, hard(1.6, 0.3, cd - 0.6, 0.05), M.steel, cx1 - 2.2, topY + ct + 0.15, 0);           // cold shoe / NATO strip
    }
    // open-side frame (+x): two uprights joined by the plates, window for ports
    const sideH = topY + ct - botY + 0.8;
    const sideP = plate(cd + 0.4, sideH, ct, [], [[0, 0.2, cd * 0.62, sideH * 0.55]]);
    add(root, sideP, cMat, cx1 - ct / 2, botY - 0.8 + sideH / 2, 0, 0, Math.PI / 2);
    holeGridX(root, 4, 1, cx1 + 0.01, botY + 0.4, topY - 0.2, cd / 2 - 0.1, cd / 2 - 0.1);
    // grip-side bar: square-section bar that wraps around the grip
    if (cage.style !== 'half' && !cine) {
      const gx = cx0 - 0.9, gz = D / 2 + gripReach + 0.5;
      const path = new THREE.CurvePath();
      const P3 = (x, y, z) => new THREE.Vector3(x, y, z);
      const pts = [P3(cx0 + 0.6, topY + ct / 2, gz - 1.2), P3(gx, topY + ct / 2, gz - 0.4), P3(gx, topY - 1.2, gz), P3(gx, botY + 1.0, gz), P3(gx, botY - 0.4, gz - 0.4), P3(cx0 + 0.6, botY - 0.4, gz - 1.2)];
      const crv = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.15);
      const sq = new THREE.Shape(); sq.moveTo(-0.32, -0.32); sq.lineTo(0.32, -0.32); sq.lineTo(0.32, 0.32); sq.lineTo(-0.32, 0.32); sq.closePath();
      add(root, new THREE.ExtrudeGeometry(sq, { steps: 60, bevelEnabled: false, extrudePath: crv }), cMat);
      void path;
      // connectors from bar back to the top/bottom plates
      add(root, hard(Math.abs(cx0 + 0.6 - gx) + 0.6, 0.64, 0.64), cMat, (cx0 + gx) / 2 + 0.3, topY + ct / 2, gz - 1.0);
    }
    if (cage.id === 'cage3') add(root, hard(1.2, 0.5, 1.2, 0.1), M.green, cx1 - 0.6, topY + ct + 0.25, -cd / 2 + 0.9);
    if (cage.style === 'pro') { add(root, hard(0.7, 2.6, cd * 0.7), cMat, cx1 + 0.35, cyB, 0); holeGridX(root, 3, 3, cx1 + 0.71, cyB - 0.9, cyB + 0.9, -cd * 0.25, cd * 0.25); }
    deckTop = Math.max(topY + ct, y0 + H + humpH);
  }
  const plateTop = cage ? topY + ct : y0 + H;
  const leftX = cage && cage.style !== 'half' && !cine ? cx0 - 1.25 : -W / 2 - 0.4;
  const rightX = cage ? cx1 : W / 2;

  // ---- top handle: straight bar on two square posts (SmallRig style)
  let handleTop = deckTop;
  if (top) {
    const hx = cx1 - 2.2 > mountX + humpW / 2 + 1 ? cx1 - 2.2 : mountX + humpW / 2 + 1.2;
    const len = Math.max(11, D + 6), zc = D * 0.15, ph = 3.4;
    const tm = top.tone ? M.cageGreen : top.style === 'pro' ? M.cageTilta : M.cage;
    for (const dz of [-len / 2 + 1.0, len / 2 - 1.0]) {
      add(root, hard(1.6, ph, 1.6, 0.15), tm, hx, plateTop + ph / 2, zc + dz);
      add(root, hard(2.0, 0.5, 2.0, 0.1), M.steel, hx, plateTop + 0.25, zc + dz);
    }
    add(root, hard(2.0, 1.0, len, 0.2), tm, hx, plateTop + ph + 0.5, zc);                  // aluminium spine
    add(root, rbox(2.3, 1.9, len - 4.2, 0.55), M_grip, hx, plateTop + ph + 0.3, zc);        // rubber grip section
    add(root, hard(1.7, 0.35, 2.0, 0.06), M.steel, hx, plateTop + ph + 1.18, zc + len / 2 - 1.2);   // cold shoe
    add(root, hard(1.7, 0.35, 2.0, 0.06), M.steel, hx, plateTop + ph + 1.18, zc - len / 2 + 1.2);
    if (top.style === 'nato' || top.style === 'pro') add(root, cylZ(0.55, 0.9, 24), M.knurl, hx + 1.3, plateTop + 0.9, zc + len / 2 - 1.0, 0, Math.PI / 2);
    handleTop = plateTop + ph + 1.35;
    root.userData.monX = hx; root.userData.monZ = zc + len / 2 - 1.2;
  }

  // ---- monitor (Ninja V proportions) on a small ball head, screen toward the operator
  if (mon) {
    const big = mon.inch >= 7, mw = big ? 19.4 : 15.1, mh = big ? 12.2 : 9.2, md = big ? 2.6 : 2.4;
    const ax = root.userData.monX ?? mountX + humpW / 2 + 1.2, az = root.userData.monZ ?? D * 0.2, base = handleTop;
    add(root, cylY(0.45, 0.9, 20), M.steel, ax, base + 0.45, az);
    add(root, new THREE.SphereGeometry(0.75, 24, 16), M.steel, ax, base + 1.3, az);
    add(root, cylY(0.55, 0.9, 20), M.knurl, ax + 0.9, base + 1.3, az, 0, 0, Math.PI / 2);
    add(root, hard(2.8, 0.7, 2.8, 0.1), M.steel, ax, base + 2.2, az);
    const g = new THREE.Group(); g.position.set(ax - mw * 0.15, base + 2.55 + mh / 2, az); g.rotation.set(-0.12, 0.18, 0); root.add(g);
    add(g, hard(mw, mh, md, 0.3), mon.pro ? M.cageGreen : M.body, 0, 0, 0);
    add(g, hard(mw - 0.6, mh - 0.6, 0.06, 0.04), M.lcd, 0, 0, -md / 2 - 0.03);
    add(g, new THREE.PlaneGeometry(mw - 1.2, mh - 1.2), M.screenOn, 0, 0, -md / 2 - 0.07, 0, Math.PI, 0);
    for (let i = 0; i < 4; i++) add(g, hard(1.0, 0.3, 0.9, 0.08), M.dark, -mw / 2 + 1.6 + i * 1.4, mh / 2 + 0.15, 0);
    add(g, hard(1.6, 0.3, 0.9, 0.08), M.ledR, mw / 2 - 1.6, mh / 2 + 0.15, 0);
    add(g, hard(mw * 0.4, 0.5, 0.1, 0.04), M.dark, mw * 0.2, -mh / 2 + 0.6, md / 2 + 0.01);  // battery slot on back
    for (const dx of [-mw / 2 + 0.2, mw / 2 - 0.2]) add(g, hard(0.5, mh * 0.6, md * 0.8, 0.1), M.rubber, dx, 0, 0);
  }

  // ---- side handles: straight, squarish cross-section, textured rubber or wood, on a NATO arm
  const sideHandle = (x, h, dir) => {
    const len = 11.5, yb = botY - 1.2, wood = h.color === '#7a4a24';
    const armY = Math.min(plateTop - 1.2, yb + len - 1.6);
    add(root, hard(Math.abs(x - (dir < 0 ? leftX : rightX)) + 0.8, 1.4, 2.2, 0.15), M.cage, (x + (dir < 0 ? leftX : rightX)) / 2, armY, D * 0.1);  // arm to cage
    if (h.rosette) add(root, cylY(1.15, 0.8, 32), M.steel, (dir < 0 ? leftX : rightX) + dir * 0.4, armY, D * 0.1, 0, 0, Math.PI / 2);
    add(root, rbox(3.0, len, 3.4, wood ? 0.9 : 0.75), wood ? M.wood : M_grip, x, yb + len / 2 - 1.0, D * 0.1);
    add(root, hard(3.2, 0.7, 3.6, 0.2), M.cage, x, yb + len - 0.95, D * 0.1);              // top cap
    add(root, hard(3.2, 0.5, 3.6, 0.2), M.cage, x, yb - 1.0, D * 0.1);                     // bottom cap
    if (h.red) add(root, cylY(0.55, 0.3, 24), M.ledR, x, yb + len - 0.45, D * 0.1 + 0.6);
  };
  if (sideL) sideHandle(leftX - 2.4, sideL, -1);
  if (sideR) sideHandle(rightX + 2.4, sideR, 1);

  // ---- back: fan, then V-mount on 15mm rods off the base plate
  let zBack = -D / 2 - 0.5;
  if (fan && body.fan) {
    add(root, hard(5.2, 5.0, 1.7, 0.3), M.body, W * 0.12, cyB, zBack - 0.85);
    add(root, cylZ(2.0, 0.12, 40), M.dark, W * 0.12, cyB, zBack - 1.75);
    for (let i = 0; i < 7; i++) add(root, hard(0.35, 1.8, 0.06, 0.03), fan.pro ? M.green : M.steel, W * 0.12, cyB, zBack - 1.82, 0, 0, (i * Math.PI) / 7);
    zBack -= 1.9;
  }
  if (bat) {
    // V-lock plate sits flush against the fan (or the back of the body), battery clicks straight onto it
    const bh = bat.h / 7.5 + 1.2, by = cyB, pz = zBack - 0.45, bz = pz - 0.45 - 1.8;
    for (const rx of [-2.2, 2.2]) tube(root, [rx, botY - 1.5, D / 2], [rx, botY - 1.5, pz - 0.4], 0.75, M.carbon);
    add(root, hard(7.0, 1.8, 2.0, 0.15), M.cage, 0, botY - 1.5, D / 2 - 1);                 // front rod clamp
    add(root, hard(7.0, 1.8, 1.2, 0.15), M.cage, 0, botY - 1.5, pz);                        // rear clamp under the plate
    add(root, hard(1.2, by - (botY - 1.5), 0.9, 0.1), M.cage, 0, (by + botY - 1.5) / 2, pz); // riser to the plate
    add(root, hard(8.0, bh + 1.2, 0.9, 0.1), M.cage, 0, by, pz);                            // V-lock plate
    add(root, hard(7.8, bh, 3.6, 0.35), M.body, 0, by, bz);
    add(root, hard(7.8, bh * 0.3, 3.65, 0.3), M.rubber, 0, by + bh / 2 - bh * 0.15, bz);
    for (let i = 0; i < 4; i++) add(root, hard(0.6, 0.22, 0.06, 0.03), i < 3 ? M.ledG : M.dark, -2 + i * 0.9, by + 0.4, bz - 1.82);
    add(root, hard(1.2, 0.6, 0.1, 0.05), M.dark, 3, by + 0.4, bz - 1.82);
    for (const dx of [-3.5, 3.5]) add(root, hard(1.4, 0.8, 0.5, 0.1), M.steel, dx, by + bh / 2 + 0.4, bz);   // D-tap / USB ports
  }

  // ---- support (own group so framing can focus on the camera)
  const legs = new THREE.Group(); legs.name = 'support'; root.add(legs);
  if (sup) {
    const t0 = cage ? botY - 1.35 : -0.05;
    add(legs, hard(5.2, 0.9, 10, 0.1), M.steel, 0, t0 - 0.45, 0);                         // QR plate
    add(legs, hard(6.4, 0.9, 7.2, 0.15), M.body, 0, t0 - 1.35, 0);                         // head top platform
    add(legs, rbox(5.6, 4.4, 6.2, 0.5), M.body, 0, t0 - 4.0, 0);                           // head body
    add(legs, cylY(1.1, 1.0, 32), M.knurl, 3.3, t0 - 3.8, 0, 0, 0, Math.PI / 2);           // tilt drag / lock
    add(legs, cylY(0.85, 0.9, 32), M.knurl, 0, t0 - 5.0, 3.5, Math.PI / 2);
    if (sup.pro) add(legs, hard(1.8, 0.7, 0.08, 0.04), M.green, 0, t0 - 3.2, 3.12);
    add(legs, cylY(3.2, 1.2, 40), M.body, 0, t0 - 6.9, 0);                                  // 75mm bowl
    add(legs, cylY(3.6, 1.0, 6), M.cage, 0, t0 - 8.0, 0);                                   // spider (hex)
    if (sup.bar) {
      tube(legs, [-2.6, t0 - 3.4, -2.6], [-7.5, t0 - 8.5, -24], 0.48, M.steel);
      tube(legs, [-6.3, t0 - 7.2, -19.5], [-7.7, t0 - 8.7, -24.6], 0.85, M_grip);
    }
    const hihat = sup.kind === 'hihat';
    const legLen = hihat ? 13 : 64 * (sup.h || 1);
    const spread = hihat ? 0.5 : 0.33;
    if (hihat) {   // wide bowl ring with hinge knuckles (Benro / Sachtler style)
      add(legs, latheY([[3.2, 0], [5.0, 0], [5.4, 0.3], [5.4, 1.3], [5.0, 1.6], [3.2, 1.6]]), M.cage, 0, t0 - 9.4, 0);
    }
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
      const leg = new THREE.Group();
      leg.position.set(Math.cos(a) * 3.2, t0 - 8.0, Math.sin(a) * 3.2);
      leg.rotation.order = 'YZX'; leg.rotation.y = -a; leg.rotation.z = spread;
      legs.add(leg);
      add(leg, hard(1.8, 2.4, 2.8, 0.2), M.cage, 0, -0.8, 0);
      if (hihat) {
        add(leg, hard(2.2, 2.4, 2.6, 0.4), M.cage, 1.6, -0.6, 0);                                   // hinge knuckle
        add(leg, cylY(0.55, 0.2, 20), M.steel, 1.6, -0.6, 1.35, Math.PI / 2);                        // hinge bolt
        add(leg, cylY(1.25, legLen * 0.32, 32), M.cage, 1.6, -1.8 - legLen * 0.16, 0);              // upper sleeve
        add(leg, cylY(1.05, legLen * 0.5, 32), M.cage, 1.6, -1.8 - legLen * 0.48, 0);               // tube
        add(leg, latheY([[1.0, 0], [1.5, 0.25], [1.55, legLen * 0.3 - 0.25], [1.2, legLen * 0.3]]), M.knurl, 1.6, -1.8 - legLen * 0.78, 0);   // twist-lock collar
        add(leg, cylY(0.32, 1.4, 16), M.steel, 1.6, -1.8 - legLen * 0.82, 0);                        // stud
        add(leg, latheY([[0, 0], [1.7, 0], [1.6, 0.6], [1.1, 1.3], [0.4, 1.55], [0, 1.6]], 32), M.rubber, 1.6, -1.8 - legLen * 0.82 - 2.2, 0);   // dome foot
        continue;
      }
      for (const off of [-0.6, 0.6]) add(leg, cylY(0.45, legLen * 0.5, 20), sup.pro ? M.carbon : M.steel, 0, -legLen * 0.27, off);
      add(leg, hard(1.5, 2.0, 2.6, 0.2), M.dark, 0, -legLen * 0.52, 0);
      for (const off of [-0.5, 0.5]) add(leg, cylY(0.34, legLen * 0.46, 20), M.steel, 0, -legLen * 0.76, off);
      add(leg, hard(1.6, 1.4, 2.4, 0.2), M.dark, 0, -legLen * 0.99, 0);
      add(leg, cylY(0.7, 1.0, 20), M.rubber, 0, -legLen - 0.2, 0);
    }
    if (!hihat) {
      const yS = t0 - 8.0 - legLen * 0.45;
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + Math.PI / 6; const r = 3.2 + legLen * 0.45 * Math.sin(spread); tube(legs, [0, yS, 0], [Math.cos(a) * r, t0 - 8.0 - legLen * 0.45 * Math.cos(spread), Math.sin(a) * r], 0.28, M.steel, 12); }
      add(legs, hard(2.0, 1.2, 2.0, 0.2), M.cage, 0, yS, 0);
    }
  }
  return root;
}

// ---------- renderer / scene (one WebGL context, reused) ----------
let renderer, scene, camera, controls, current, shadowDisc;
function ensure() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 1;
  const key = new THREE.DirectionalLight(0xfff6ea, 2.6); key.position.set(22, 34, 30); scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.8); fill.position.set(-30, 8, 24); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 1.1); rim.position.set(-26, 14, -22); scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, 0.15));
  camera = new THREE.PerspectiveCamera(30, 1, 0.5, 2000);
  // soft contact shadow, no backdrop
  const st = tex(canvas(128, 128, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(0,0,0,.55)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }));
  shadowDisc = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: st, transparent: true, depthWrite: false }));
  shadowDisc.rotation.x = -Math.PI / 2;
  scene.add(shadowDisc);
}
function setRig(rig) {
  ensure();
  if (current) { scene.remove(current); current.traverse((o) => { if (o.isMesh && !(o.geometry.userData.keep)) o.geometry.dispose(); }); }
  current = buildRig(rig);
  scene.add(current);
  const box = new THREE.Box3().setFromObject(current);
  const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
  shadowDisc.position.set(center.x, box.min.y + 0.02, center.z);
  shadowDisc.scale.set(Math.max(size.x, size.z) * 1.3, Math.max(size.x, size.z) * 1.3, 1);
  // aim at the camera itself; legs can run out of frame like a product shot
  const cam = new THREE.Box3();
  current.children.forEach((c) => { if (c.name !== 'support') cam.expandByObject(c); });
  const cs = cam.getSize(new THREE.Vector3()), cc = cam.getCenter(new THREE.Vector3());
  const hasLegs = current.getObjectByName('support').children.length > 0;
  if (hasLegs) cc.y -= cs.y * 0.18;
  return { size: cs, center: cc, radius: cs.length() / 2 * (hasLegs ? 1.05 : 0.95), full: size.length() / 2 };
}
function frame(fit, aspect, az = 0.62, el = 0.2) {
  const dist = (fit.radius / Math.sin((camera.fov * Math.PI) / 360)) * (aspect < 1 ? 1.15 / aspect : 1.02);
  camera.aspect = aspect;
  camera.position.set(fit.center.x + dist * Math.sin(az) * Math.cos(el), fit.center.y + dist * Math.sin(el), fit.center.z + dist * Math.cos(az) * Math.cos(el));
  camera.near = dist / 50; camera.far = dist * 6;
  camera.updateProjectionMatrix();
  camera.lookAt(fit.center);
}

let viewer = null; // { el, fit }
function render() { renderer.render(scene, camera); }
function resizeViewer() {
  if (!viewer) return;
  const r = viewer.el.getBoundingClientRect();
  renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false);
  camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
  render();
}

window.Rig3D = {
  // live, draggable viewer
  show(el, rig) {
    ensure();
    const fit = setRig(rig);
    viewer = { el, fit };
    el.replaceChildren(renderer.domElement);
    renderer.domElement.className = 'rig3d-canvas';
    const r = el.getBoundingClientRect();
    renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false);
    frame(fit, r.width / Math.max(1, r.height));
    if (controls) controls.dispose();
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(fit.center);
    controls.enablePan = false;
    controls.minDistance = fit.radius * 1.2;
    controls.maxDistance = Math.max(fit.radius * 6, fit.full * 3);
    controls.rotateSpeed = 0.8;
    controls.addEventListener('change', render);
    controls.update();
    // short intro turn, then idle (no render loop)
    const start = performance.now(), az0 = 1.3;
    const spin = (now) => {
      if (!viewer) return;
      const k = Math.min(1, (now - start) / 900), e = 1 - Math.pow(1 - k, 3);
      const off = new THREE.Vector3().subVectors(camera.position, controls.target);
      const sph = new THREE.Spherical().setFromVector3(off);
      sph.theta = az0 + (0.62 - az0) * e;
      off.setFromSpherical(sph); camera.position.copy(controls.target).add(off); camera.lookAt(controls.target);
      render();
      if (k < 1) requestAnimationFrame(spin);
    };
    requestAnimationFrame(spin);
  },
  hide() { viewer = null; if (controls) { controls.dispose(); controls = null; } },
  // still image for cards/panels
  snapshot(rig, w = 520, h = 420, az = 0.62) {
    ensure();
    const wasViewer = viewer; viewer = null;
    const fit = setRig(rig);
    renderer.setSize(w, h, false);
    frame(fit, w / h, az);
    render();
    const url = renderer.domElement.toDataURL('image/png');
    if (wasViewer) { viewer = wasViewer; window.Rig3D.show(wasViewer.el, game.rig); }
    return url;
  },
};
window.addEventListener('resize', resizeViewer);
window.dispatchEvent(new Event('rig3d-ready'));
