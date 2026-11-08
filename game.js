'use strict';
/* System Swiped game layer: XP, camera-brand paths, rig builder, backgrounds, Hall of History.
   Loaded after renderer.js; uses its globals (api, state, $, toast). Everything is offline. */

const XP_PER_DOLLAR = 2;
const BRAND_LICENSE = 10000;

// ---------------- catalog (approx. US street prices; XP = $ x 2) ----------------
const BRANDS = {
  sony: { name: 'Sony', accent: '#ff7a1a', tag: 'Alpha / Cinema Line' },
  canon: { name: 'Canon', accent: '#e3262f', tag: 'EOS R / Cinema EOS' },
  nikon: { name: 'Nikon', accent: '#ffd400', tag: 'Z Series' },
  fujifilm: { name: 'Fujifilm', accent: '#36c27a', tag: 'X Series / GFX' },
};

// body: kind m = mirrorless, c = cinema box. fan = takes a clip-on cooling fan.
const B = (brand, id, name, usd, kind, fan, extra = {}) => ({ slot: 'body', brand, id, name, usd, kind, fan, ...extra });
const BODIES = [
  B('sony', 'a6400', 'Sony a6400', 900, 'm', false, { starter: true, small: true }),
  B('sony', 'a6700', 'Sony a6700', 1400, 'm', true, { small: true }),
  B('sony', 'fx30', 'Sony FX30', 1800, 'c', false),
  B('sony', 'a7c2', 'Sony a7C II', 2200, 'm', true, { small: true }),
  B('sony', 'a74', 'Sony a7 IV', 2500, 'm', true),
  B('sony', 'a7v', 'Sony a7 V', 2898, 'm', true),
  B('sony', 'a7s3', 'Sony a7S III', 3500, 'm', true),
  B('sony', 'fx3', 'Sony FX3', 3900, 'c', false),
  B('sony', 'a7r5', 'Sony a7R V', 3900, 'm', true),
  B('sony', 'a93', 'Sony a9 III', 6000, 'm', true),
  B('sony', 'fx6', 'Sony FX6', 6300, 'c', false, { big: true }),
  B('sony', 'a12', 'Sony a1 II', 6500, 'm', true),
  B('sony', 'burano', 'Sony Burano', 25000, 'c', false, { big: true }),
  B('canon', 'r50', 'Canon EOS R50', 680, 'm', false, { starter: true, small: true }),
  B('canon', 'r10', 'Canon EOS R10', 980, 'm', false, { small: true }),
  B('canon', 'r8', 'Canon EOS R8', 1500, 'm', true),
  B('canon', 'r7', 'Canon EOS R7', 1500, 'm', true),
  B('canon', 'r62', 'Canon EOS R6 Mark II', 2500, 'm', true),
  B('canon', 'r52', 'Canon EOS R5 Mark II', 4300, 'm', true),
  B('canon', 'r5c', 'Canon EOS R5 C', 4500, 'm', false),
  B('canon', 'c70', 'Canon EOS C70', 5500, 'c', false),
  B('canon', 'r3', 'Canon EOS R3', 6000, 'm', false, { grip: true }),
  B('canon', 'r1', 'Canon EOS R1', 6300, 'm', false, { grip: true }),
  B('canon', 'c400', 'Canon EOS C400', 8000, 'c', false, { big: true }),
  B('nikon', 'z502', 'Nikon Z50 II', 910, 'm', false, { starter: true, small: true }),
  B('nikon', 'z52', 'Nikon Z5 II', 1700, 'm', true),
  B('nikon', 'zf', 'Nikon Zf', 2000, 'm', true, { retro: true }),
  B('nikon', 'zr', 'Nikon ZR', 2200, 'c', false),
  B('nikon', 'z63', 'Nikon Z6III', 2500, 'm', true),
  B('nikon', 'z8', 'Nikon Z8', 4000, 'm', true),
  B('nikon', 'z9', 'Nikon Z9', 5500, 'm', false, { grip: true }),
  B('fujifilm', 'xt30', 'Fujifilm X-T30 II', 900, 'm', false, { starter: true, small: true, retro: true }),
  B('fujifilm', 'xs20', 'Fujifilm X-S20', 1300, 'm', true, { small: true }),
  B('fujifilm', 'xt5', 'Fujifilm X-T5', 1700, 'm', true, { retro: true }),
  B('fujifilm', 'xh2', 'Fujifilm X-H2', 2000, 'm', true),
  B('fujifilm', 'xh2s', 'Fujifilm X-H2S', 2500, 'm', true),
  B('fujifilm', 'gfx100s2', 'Fujifilm GFX100S II', 5000, 'm', false, { big: true }),
  B('fujifilm', 'gfx1002', 'Fujifilm GFX100 II', 7500, 'm', false, { big: true }),
  B('fujifilm', 'eterna', 'Fujifilm GFX Eterna', 16500, 'c', false, { big: true }),
];

const L = (brand, id, name, usd, len, dia, extra = {}) => ({ slot: 'lens', brand, id, name, usd, len, dia, ...extra });
const LENSES = [
  L('sony', 'fe2860', 'FE 28-60mm f/4-5.6 (kit)', 450, 34, 50, { starter: true }),
  L('sony', 'fe50', 'FE 50mm f/1.8', 250, 30, 48),
  L('sony', 'gm35', 'FE 35mm f/1.4 GM', 1400, 52, 58, { ring: '#ff7a1a' }),
  L('sony', 'gm85', 'FE 85mm f/1.4 GM II', 1800, 62, 64, { ring: '#ff7a1a' }),
  L('sony', 'gm50', 'FE 50mm f/1.2 GM', 2000, 60, 66, { ring: '#ff7a1a' }),
  L('sony', 'gm2470', 'FE 24-70mm f/2.8 GM II', 2300, 74, 66, { ring: '#ff7a1a' }),
  L('sony', 'gm70200', 'FE 70-200mm f/2.8 GM II', 2800, 118, 70, { ring: '#ff7a1a', white: true }),
  L('sony', 'gm400', 'FE 400mm f/2.8 GM', 13000, 170, 92, { ring: '#ff7a1a', white: true }),
  L('canon', 'rf2450', 'RF 24-50mm f/4.5-6.3 (kit)', 300, 30, 50, { starter: true }),
  L('canon', 'rf50', 'RF 50mm f/1.8 STM', 200, 26, 48),
  L('canon', 'rf35', 'RF 35mm f/1.8 Macro', 500, 40, 52),
  L('canon', 'rf2470', 'RF 24-70mm f/2.8L', 2400, 80, 66, { ring: '#e3262f' }),
  L('canon', 'rf85', 'RF 85mm f/1.2L', 2700, 66, 72, { ring: '#e3262f' }),
  L('canon', 'rf70200', 'RF 70-200mm f/2.8L', 2800, 96, 70, { ring: '#e3262f', white: true }),
  L('canon', 'rf2870', 'RF 28-70mm f/2L', 3100, 92, 76, { ring: '#e3262f' }),
  L('canon', 'rf400', 'RF 400mm f/2.8L', 12000, 168, 92, { ring: '#e3262f', white: true }),
  L('nikon', 'z2450', 'Z 24-50mm f/4-6.3 (kit)', 400, 30, 50, { starter: true }),
  L('nikon', 'z50', 'Z 50mm f/1.8 S', 600, 44, 54),
  L('nikon', 'z35', 'Z 35mm f/1.4', 700, 46, 56),
  L('nikon', 'z2470', 'Z 24-70mm f/2.8 S', 2300, 80, 66, { ring: '#ffd400' }),
  L('nikon', 'z135', 'Z 135mm f/1.8 S Plena', 2500, 80, 70, { ring: '#ffd400' }),
  L('nikon', 'z70200', 'Z 70-200mm f/2.8 S', 2700, 112, 70, { ring: '#ffd400' }),
  L('nikon', 'z85', 'Z 85mm f/1.2 S', 2800, 74, 74, { ring: '#ffd400' }),
  L('nikon', 'z400', 'Z 400mm f/2.8 TC VR S', 14000, 172, 92, { ring: '#ffd400' }),
  L('fujifilm', 'xc1545', 'XC 15-45mm (kit)', 300, 28, 48, { starter: true }),
  L('fujifilm', 'xf35', 'XF 35mm f/2', 400, 30, 44),
  L('fujifilm', 'xf23', 'XF 23mm f/1.4 R LM WR', 900, 42, 54),
  L('fujifilm', 'xf56', 'XF 56mm f/1.2 R WR', 1000, 40, 58),
  L('fujifilm', 'xf1655', 'XF 16-55mm f/2.8 II', 1100, 52, 58, { ring: '#c9ccc9' }),
  L('fujifilm', 'xf50140', 'XF 50-140mm f/2.8', 1600, 100, 64, { ring: '#c9ccc9' }),
  L('fujifilm', 'gf80', 'GF 80mm f/1.7', 2300, 60, 72, { ring: '#c9ccc9' }),
  L('fujifilm', 'gf500', 'GF 500mm f/5.6', 3500, 150, 80, { ring: '#c9ccc9' }),
  L('all', 'sig35', 'Sigma 35mm f/1.4 DG DN Art', 850, 48, 60, { ring: '#c9ccc9' }),
  L('all', 'sig2470', 'Sigma 28-45mm f/1.8 DG DN Art', 1350, 70, 70, { ring: '#c9ccc9' }),
];

const A = (slot, id, name, usd, extra = {}) => ({ slot, brand: 'all', id, name, usd, ...extra });
const ACCESSORIES = [
  A('cage', 'cage1', 'SmallRig Half Cage', 50, { style: 'half' }),
  A('cage', 'cage2', 'SmallRig Full Cage', 100, { style: 'full' }),
  A('cage', 'cage3', 'SmallRig HawkLock Cage Kit', 180, { style: 'full', tone: '#2a2d2c' }),
  A('cage', 'cage4', 'Tilta Full Camera Cage Pro', 260, { style: 'pro', tone: '#30302a' }),
  A('top', 'top1', 'SmallRig Top Handle (Lite)', 35, { style: 'lite' }),
  A('top', 'top2', 'SmallRig NATO Top Handle', 55, { style: 'nato' }),
  A('top', 'top3', 'SmallRig HawkLock QR Top Handle', 90, { style: 'nato', tone: '#1f6b4c' }),
  A('top', 'top4', 'Tilta Top Handle w/ Rosette', 140, { style: 'pro' }),
  A('side', 'side1', 'SmallRig Rubber Side Handle', 40, { color: '#1b1d1c' }),
  A('side', 'side2', 'SmallRig Wooden Side Handle', 55, { color: '#7a4a24' }),
  A('side', 'side3', 'SmallRig Rosette Handle', 85, { color: '#2a2a2a', rosette: true }),
  A('side', 'side4', 'Wireless Control Side Handle', 160, { color: '#1b1d1c', red: true }),
  A('monitor', 'mon1', 'Feelworld F5 Pro 5.5"', 180, { inch: 5.5 }),
  A('monitor', 'mon2', 'Portkeys PT5 5"', 300, { inch: 5 }),
  A('monitor', 'mon3', 'Atomos Ninja V 5"', 600, { inch: 5, rec: true }),
  A('monitor', 'mon4', 'Atomos Ninja Ultra 5.2"', 700, { inch: 5.2, rec: true }),
  A('monitor', 'mon5', 'Atomos Shinobi 7"', 500, { inch: 7 }),
  A('monitor', 'mon6', 'Blackmagic Video Assist 7" 12G', 1300, { inch: 7, rec: true }),
  A('monitor', 'mon7', 'SmallHD Indie 7', 1500, { inch: 7 }),
  A('monitor', 'mon8', 'SmallHD Cine 7', 3000, { inch: 7, rec: true, pro: true }),
  A('battery', 'vb50', 'SmallRig VB50 Mini V-Mount', 150, { h: 46 }),
  A('battery', 'vb99', 'SmallRig VB99 Pro V-Mount', 270, { h: 56 }),
  A('battery', 'nano', 'Core SWX Nano Micro V', 260, { h: 44 }),
  A('battery', 'idx', 'IDX Imicro-98 V-Mount', 400, { h: 54 }),
  A('battery', 'vb212', 'SmallRig VB212 Mini V-Mount', 420, { h: 66 }),
  A('fan', 'fan1', 'Ulanzi Camera Cooling Fan', 30, {}),
  A('fan', 'fan2', 'SmallRig Camera Cooling Fan', 45, {}),
  A('fan', 'fan3', 'SmallRig Smart Cooling Fan (app)', 70, { pro: true }),
  A('support', 'tri1', 'Ulanzi Zero Y Travel Tripod', 180, { kind: 'tripod', h: 1 }),
  A('support', 'tri2', 'SmallRig AD-01 Video Tripod', 200, { kind: 'tripod', h: 1.1 }),
  A('support', 'hat1', 'SmallRig Hi-Hat + Fluid Head', 300, { kind: 'hihat' }),
  A('support', 'tri3', 'Manfrotto 504X Fluid Head Kit', 900, { kind: 'tripod', h: 1.15, bar: true }),
  A('support', 'hat2', 'Sachtler Ace Hi-Hat Kit', 1100, { kind: 'hihat', bar: true }),
  A('support', 'tri4', 'Sachtler Flowtech 75 System', 1500, { kind: 'tripod', h: 1.2, bar: true, pro: true }),
];
const SLOTS = [
  ['body', 'Body'], ['lens', 'Lens'], ['cage', 'Cage'], ['top', 'Top handle'], ['sideL', 'Side handle L'],
  ['sideR', 'Side handle R'], ['monitor', 'Monitor'], ['battery', 'V-mount'], ['fan', 'Fan'], ['support', 'Tripod / hi-hat'],
];
const GEAR = [...BODIES, ...LENSES, ...ACCESSORIES];
for (const g of GEAR) g.cost = g.usd * XP_PER_DOLLAR;
const gearById = new Map(GEAR.map((g) => [g.id, g]));
const slotOf = (s) => (s === 'sideL' || s === 'sideR' ? 'side' : s);


// ---------------- rig performance stats ----------------
const STAT_NAMES = [['image', 'Image'], ['video', 'Video'], ['af', 'Autofocus'], ['low', 'Low light'], ['stab', 'Stability'],
  ['hand', 'Handling'], ['mon', 'Monitoring'], ['batt', 'Battery'], ['cool', 'Cooling']];
const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));
function itemStats(it) {
  const id = it.id, usd = it.usd;
  if (it.slot === 'body') {
    const base = 28 + Math.log2(Math.max(1, usd / 600)) * 13;
    const has = (re) => re.test(id);
    return {
      image: base + (it.big ? 16 : 0) + (has(/r5|a7r|z8|z9|gfx|r1|a12|r52|xt5|xh2$/) ? 10 : 0),
      video: base + (it.kind === 'c' ? 18 : 0) + (has(/a7s|fx|c70|c400|zr|xh2s|eterna|burano|r5c|z63/) ? 14 : 0) - (it.big && it.kind !== 'c' ? 10 : 0),
      af: base + (has(/a93|a12|r3|r1|z9|z8|r52|a7v|xh2s/) ? 16 : 0) - (has(/gfx/) ? 14 : 0),
      low: base + (has(/a7s|fx3|fx6|r3|zf|z63|r62|burano/) ? 16 : 0) - (it.small ? 6 : 0),
      cool: it.kind === 'c' ? 70 : 10,
      batt: it.big || it.grip ? 25 : it.kind === 'c' ? 20 : 10,
      hand: it.grip ? 18 : it.small ? 6 : 10,
    };
  }
  if (it.slot === 'lens') {
    const fast = /f\/1\.[0-4]/.test(it.name) ? 18 : /f\/1\.[5-9]|f\/2[^.]/.test(it.name) ? 10 : /f\/2\.8/.test(it.name) ? 8 : 0;
    return { image: Math.min(34, 6 + usd / 110), low: fast, af: Math.min(12, 2 + usd / 300), video: Math.min(10, usd / 300) };
  }
  if (it.slot === 'cage') return { stab: 8 + usd / 18, hand: 6 + usd / 30 };
  if (it.slot === 'top') return { hand: 8 + usd / 14, stab: 3 + usd / 40 };
  if (it.slot === 'side') return { hand: 6 + usd / 22, stab: 4 + usd / 40, video: it.red ? 6 : 0 };
  if (it.slot === 'monitor') return { mon: 22 + it.inch * 4 + (it.rec ? 10 : 0) + (it.pro ? 12 : 0) + usd / 150, video: it.rec ? 10 : 3 };
  if (it.slot === 'battery') return { batt: 22 + usd / 12 };
  if (it.slot === 'fan') return { cool: 30 + usd / 3 };
  if (it.slot === 'support') return { stab: 22 + usd / 45 + (it.bar ? 6 : 0) };
  return {};
}
for (const g of GEAR) { g.stats = itemStats(g); for (const k in g.stats) g.stats[k] = Math.round(g.stats[k]); }
function rigStats(rig = game.rig) {
  const t = {};
  for (const [k] of STAT_NAMES) t[k] = 0;
  for (const [sl] of SLOTS) { const it = rig[sl] && gearById.get(rig[sl]); if (it) for (const k in it.stats) t[k] += it.stats[k]; }
  for (const k in t) t[k] = clamp(t[k]);
  t.score = Math.round(STAT_NAMES.reduce((acc, [k]) => acc + t[k], 0) / STAT_NAMES.length);
  return t;
}
function statLine(it) {
  return Object.entries(it.stats).filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1]).slice(0, 2)
    .map(([k, v]) => `+${v} ${STAT_NAMES.find((n) => n[0] === k)[1]}`).join(' · ');
}

// ---------------- backgrounds: 13 styles x 24 palettes = 312, cheaper/plainer first ----------------
const PALETTES = [
  ['Spartan', '#2a8c63', '#0d3b28'], ['Ice', '#7fd3ff', '#123246'], ['Crimson', '#e2333d', '#3b0c10'],
  ['Gold Rush', '#ffc23d', '#3a2805'], ['Royal', '#4c6fff', '#0f1846'], ['Sunset', '#ff7a45', '#40130f'],
  ['Neon Club', '#ff3df2', '#2a0636'], ['Teal Tide', '#1fd1c1', '#06302d'], ['Steel', '#a7b4bf', '#1d2328'],
  ['Mint', '#7dffb5', '#0b3322'], ['Ember', '#ff5a1f', '#2b0b04'], ['Violet', '#9b5cff', '#1d0b3d'],
  ['Lime', '#b8ff3d', '#1f3305'], ['Rose', '#ff6f9c', '#3a0d1d'], ['Ocean', '#2f8bff', '#071d3a'],
  ['Sand', '#e8c48e', '#33261a'], ['Laser', '#3dffea', '#03262b'], ['Blood Moon', '#ff2a2a', '#1a0303'],
  ['Night Game', '#e9f3ff', '#0b1220'], ['Forest', '#3ea85b', '#0a2312'], ['Copper', '#d88a4e', '#2c1608'],
  ['Ultraviolet', '#6a3dff', '#0c0430'], ['Champagne', '#f2e2b8', '#2a2416'], ['Spectrum', '#ff3d6e', '#1a0f3d'],
];
const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const STYLES = [
  { name: 'Glow', anim: '', css: (a, b) => `radial-gradient(70% 60% at 50% 45%, ${hexA(a, .22)}, transparent 70%), linear-gradient(${b}, #050505)` },
  { name: 'Sweep', anim: '', css: (a, b) => `linear-gradient(135deg, ${hexA(a, .30)}, transparent 45%), linear-gradient(315deg, ${hexA(b, .9)}, #050505 60%)` },
  { name: 'Field Lines', anim: '', css: (a, b) => `repeating-linear-gradient(90deg, ${hexA(a, .22)} 0 2px, transparent 2px 90px), repeating-linear-gradient(0deg, ${hexA(a, .10)} 0 1px, transparent 1px 45px), radial-gradient(80% 70% at 50% 50%, ${b}, #030303)` },
  { name: 'Pinstripe', anim: '', css: (a, b) => `repeating-linear-gradient(90deg, ${hexA(a, .16)} 0 1px, transparent 1px 14px), linear-gradient(180deg, ${b}, #050505)` },
  { name: 'Halftone', anim: '', css: (a, b) => `radial-gradient(${hexA(a, .30)} 1.5px, transparent 2px) 0 0/16px 16px, radial-gradient(90% 80% at 0% 100%, ${hexA(a, .25)}, transparent 60%), linear-gradient(${b}, #040404)` },
  { name: 'Carbon', anim: '', css: (a, b) => `linear-gradient(27deg, #111 5px, transparent 5px) 0 5px/20px 20px, linear-gradient(207deg, #111 5px, transparent 5px) 10px 0/20px 20px, linear-gradient(27deg, #1b1b1b 5px, transparent 5px) 0 10px/20px 20px, linear-gradient(207deg, #1b1b1b 5px, transparent 5px) 10px 5px/20px 20px, radial-gradient(80% 60% at 50% 0%, ${hexA(a, .30)}, transparent 70%), #0c0c0c` },
  { name: 'Diamond', anim: '', css: (a, b) => `repeating-conic-gradient(from 45deg, ${hexA(a, .12)} 0 25%, transparent 0 50%) 0 0/40px 40px, radial-gradient(70% 70% at 50% 50%, ${b}, #030303)` },
  { name: 'Mowed Pitch', anim: '', css: (a, b) => `radial-gradient(80% 70% at 50% 50%, transparent, rgba(0,0,0,.7)), repeating-linear-gradient(90deg, ${hexA(a, .20)} 0 110px, ${hexA(a, .08)} 110px 220px), ${b}` },
  { name: 'Stadium Lights', anim: 'a-breathe', css: (a, b) => `radial-gradient(28% 50% at 8% -4%, rgba(255,255,255,.35), transparent 70%), radial-gradient(28% 50% at 92% -4%, rgba(255,255,255,.35), transparent 70%), radial-gradient(60% 40% at 50% 110%, ${hexA(a, .35)}, transparent 70%), linear-gradient(${b}, #030303)` },
  { name: 'Aurora', anim: 'a-drift', css: (a, b) => `radial-gradient(38% 30% at 30% 40%, ${hexA(a, .55)}, transparent 70%), radial-gradient(30% 26% at 70% 62%, ${hexA(a, .35)}, transparent 70%), radial-gradient(25% 20% at 55% 25%, rgba(255,255,255,.08), transparent 70%), ${b}` },
  { name: 'Starfield', anim: 'a-stars', css: (a, b) => `radial-gradient(1.5px 1.5px at 20px 30px, #fff, transparent 60%) 0 0/170px 170px, radial-gradient(1px 1px at 90px 110px, ${a}, transparent 60%) 0 0/170px 170px, radial-gradient(2px 2px at 140px 60px, rgba(255,255,255,.8), transparent 60%) 0 0/170px 170px, radial-gradient(1px 1px at 60px 150px, rgba(255,255,255,.6), transparent 60%) 0 0/170px 170px, radial-gradient(70% 60% at 50% 100%, ${hexA(a, .30)}, transparent 70%), #020306` },
  { name: 'Club Lasers', anim: 'a-spin', css: (a, b) => `repeating-conic-gradient(from 0deg at 50% 110%, ${hexA(a, .32)} 0 2deg, transparent 2deg 14deg), radial-gradient(60% 50% at 50% 100%, ${hexA(a, .45)}, transparent 70%), ${b}` },
  { name: 'Prime Time', anim: 'a-breathe', css: (a, b) => `radial-gradient(26% 46% at 10% -4%, rgba(255,255,255,.4), transparent 70%), radial-gradient(26% 46% at 90% -4%, rgba(255,255,255,.4), transparent 70%), linear-gradient(100deg, transparent 40%, ${hexA(a, .18)} 50%, transparent 60%), repeating-linear-gradient(90deg, rgba(255,255,255,.07) 0 2px, transparent 2px 100px), repeating-linear-gradient(90deg, ${hexA(a, .22)} 0 100px, ${hexA(a, .12)} 100px 200px), ${b}` },
];
const BACKGROUNDS = [{ id: 'bg0', name: 'Blackout', style: 'Classic', cost: 0, css: '#0b0c0c', anim: '' }];
STYLES.forEach((st, si) => PALETTES.forEach(([pn, a, b], pi) => {
  const i = si * PALETTES.length + pi + 1;
  BACKGROUNDS.push({ id: `bg${i}`, name: `${pn} ${st.name}`, style: st.name, cost: Math.round((60 + i * 14 + i * i * 0.42) / 10) * 10, css: st.css(a, b), anim: st.anim });
}));
const bgById = new Map(BACKGROUNDS.map((b) => [b.id, b]));

// ---------------- Hall of History badges ----------------
const BADGES = [
  ['sorted', 100, 'Rookie Card', 'Sort 100 photos'], ['sorted', 500, 'Starting Lineup', 'Sort 500 photos'],
  ['sorted', 1000, 'Thousand Frame Club', 'Sort 1,000 photos'], ['sorted', 5000, 'Shutter Marathon', 'Sort 5,000 photos'],
  ['sorted', 10000, 'Card Reader Legend', 'Sort 10,000 photos'], ['sorted', 25000, 'The Archivist', 'Sort 25,000 photos'],
  ['sorted', 50000, 'Hall of Framer', 'Sort 50,000 photos'], ['sorted', 100000, 'Swiped GOAT', 'Sort 100,000 photos'],
  ['deleted', 250, 'Trigger Finger', 'Delete 250 photos'], ['deleted', 1000, 'Cutting Room', 'Delete 1,000 photos'],
  ['deleted', 5000, 'Ruthless Editor', 'Delete 5,000 photos'], ['deleted', 10000, 'Efficiency Maxer', 'Delete 10,000 photos'],
  ['deleted', 50000, 'The Shredder', 'Delete 50,000 photos'],
  ['selected', 100, 'Keeper Eye', 'Select 100 photos'], ['selected', 1000, 'Selects Specialist', 'Select 1,000 photos'],
  ['selected', 5000, 'Portfolio Builder', 'Select 5,000 photos'],
  ['bestStreak', 25, 'Heat Check', '25 quick swipes in a row'], ['bestStreak', 100, 'No-Look Pass', '100 quick swipes in a row'],
  ['bestStreak', 250, 'Locked In', '250 quick swipes in a row'],
  ['cleared', 1, 'First Whistle', 'Clear your first folder'], ['cleared', 10, 'Season Ticket', 'Clear 10 folders'],
  ['cleared', 50, 'Dynasty', 'Clear 50 folders'],
  ['gear', 5, 'Gearhead', 'Own 5 pieces of gear'], ['slots', 10, 'Fully Rigged', 'Fill every slot on your rig'],
  ['brands', 2, 'Dual Mount', 'Unlock a second brand'],
].map(([stat, n, name, desc]) => ({ id: `${stat}${n}`, stat, n, name, desc }));

// ---------------- state ----------------
const game = {
  xp: 0, lifetime: 0, brands: [], owned: [], rig: {}, bg: 'bg0', bgs: ['bg0'], badges: [],
  stats: { sorted: 0, deleted: 0, selected: 0, bestStreak: 0, cleared: 0 },
  session: 0, streak: 0, cutRun: 0, lastAt: 0, halfShown: false, milestone: null, loaded: false,
};
let saveTimer;
function saveGame() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const { xp, lifetime, brands, owned, rig, bg, bgs, badges, stats } = game;
    api.saveProgress({ v: 2, xp, lifetime, brands, owned, rig, bg, bgs, badges, stats }).catch(() => {});
  }, 400);
}

function statValue(stat) {
  if (stat === 'gear') return game.owned.length;
  if (stat === 'slots') return SLOTS.filter(([s]) => game.rig[s]).length;
  if (stat === 'brands') return game.brands.length;
  return game.stats[stat] || 0;
}
function checkBadges(quiet) {
  for (const b of BADGES) {
    if (game.badges.includes(b.id) || statValue(b.stat) < b.n) continue;
    game.badges.push(b.id);
    if (!quiet) game.milestone = { text: b.name, badge: true };
    renderHall();
  }
}

function addXp(n) {
  if (!n) return;
  const before = game.lifetime;
  game.xp = Math.max(0, game.xp + n);
  game.lifetime = Math.max(0, game.lifetime + n);
  game.session = Math.max(0, game.session + n);
  renderXp();
  saveGame();
  if (n > 0) {
    if (Math.floor(game.lifetime / 1000) > Math.floor(before / 1000)) game.milestone = { text: `${(Math.floor(game.lifetime / 1000) * 1000).toLocaleString()} XP!` };
    const g = nextGoal();
    if (g && game.xp >= g.cost && game.xp - n < g.cost) game.milestone = { text: `${g.short || g.name} UNLOCKED!`, badge: false };
  }
}
function trackSwipe(dir, k) {
  const s = game.stats;
  s.sorted = Math.max(0, s.sorted + k);
  if (dir === 'left') s.deleted = Math.max(0, s.deleted + k); else s.selected = Math.max(0, s.selected + k);
  if (k > 0) checkBadges(false);
  updateHallProgress();
  saveGame();
}
function folderCleared() {
  if (game.clearedThis) return;
  game.clearedThis = true;
  game.stats.cleared++;
  checkBadges(false);
  saveGame();
}

// cheapest thing you can't afford yet in your path: the "next goal"
function nextGoal() {
  if (!game.brands.length) return null;
  const cur = (slot) => Math.max(0, ...SLOTS.filter(([s]) => slotOf(s) === slot && game.rig[s]).map(([s]) => gearById.get(game.rig[s]).cost));
  const body = game.rig.body && gearById.get(game.rig.body);
  const items = GEAR.filter((g) => !game.owned.includes(g.id) && (g.brand === 'all' || game.brands.includes(g.brand))
    && g.cost > cur(g.slot) && !(g.slot === 'fan' && body && !body.fan) && !(g.slot === 'lens' && body && g.brand !== 'all' && g.brand !== body.brand));
  items.sort((a, b) => a.cost - b.cost);
  return items.find((g) => g.cost > 0) || null;
}

// ---------------- rig drawing (inline SVG, only redrawn when the rig changes) ----------------
// 3/4 product-shot view. Camera axes: d = along the lens axis (front = negative, drawn to the left),
// w = across the body (0 = side facing you), h = up. Oblique projection, painter's order.
const KX = -0.48, KY = -0.24;
const P = (d, w, h) => [d + KX * w, -h + KY * w];
function hull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function rigSVG(rig, opts = {}) {
  const g = (s) => (rig[s] ? gearById.get(rig[s]) : null);
  const body = g('body'), lens = g('lens'), cage = g('cage'), top = g('top'), sideL = g('sideL'), sideR = g('sideR');
  const mon = g('monitor'), bat = g('battery'), fan = g('fan'), sup = g('support');
  if (!body) return '<svg viewBox="0 0 400 300" class="rig-svg"><text x="200" y="150" text-anchor="middle" fill="#555" font-size="16" font-family="Avenir Next Condensed">NO BODY EQUIPPED</text></svg>';
  const out = [];
  let X0 = 1e9, Y0 = 1e9, X1 = -1e9, Y1 = -1e9;
  const track = (pts) => { for (const [x, y] of pts) { X0 = Math.min(X0, x); Y0 = Math.min(Y0, y); X1 = Math.max(X1, x); Y1 = Math.max(Y1, y); } };
  const poly = (pts, fill, extra = '') => { track(pts); out.push(`<path d="M${pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L')}Z" fill="${fill}" ${extra}/>`); };
  const line = (a, b, stroke, wdt, extra = '') => { track([a, b]); out.push(`<path d="M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}" stroke="${stroke}" stroke-width="${wdt}" stroke-linecap="round" ${extra}/>`); };
  // a box from (d0,w0,h0) to (d1,w1,h1): draws the top, front (d0) and near side (w0) faces
  const box = (d0, w0, h0, d1, w1, h1, c, e = 'stroke="#000" stroke-opacity=".35" stroke-width=".8"') => {
    poly([P(d0, w0, h1), P(d1, w0, h1), P(d1, w1, h1), P(d0, w1, h1)], c.top, e);
    poly([P(d0, w0, h0), P(d0, w1, h0), P(d0, w1, h1), P(d0, w0, h1)], c.front, e);
    poly([P(d0, w0, h0), P(d1, w0, h0), P(d1, w0, h1), P(d0, w0, h1)], c.side, e);
  };
  const ell = (d, wc, hc, r, n = 32) => Array.from({ length: n }, (_, i) => { const t = (i / n) * Math.PI * 2; return P(d, wc + r * Math.cos(t), hc + r * Math.sin(t)); });
  const cyl = (d0, d1, wc, hc, r, fill, e = '') => poly(hull([...ell(d0, wc, hc, r), ...ell(d1, wc, hc, r)]), fill, e);
  const dark = { top: '#3b403e', front: '#262a29', side: '#1b1e1d' };
  const metal = { top: '#565c5a', front: '#3a3f3d', side: '#2d3130' };
  const cageC = cage ? { top: cage.tone ? '#3e4a44' : '#3d4241', front: cage.tone || '#2a2e2d', side: cage.tone ? '#1f2522' : '#202423' } : null;

  const cine = body.kind === 'c';
  const s = body.big ? 1.12 : body.small ? 0.88 : 1;
  const D = (cine ? 92 : 62) * s, W = (cine ? 118 : 132) * s, H = (cine ? 112 : 88) * s + (body.grip ? 34 : 0);
  const hump = !cine && !body.small && !body.retro ? 20 * s : 0;
  const t = cage ? 7 : 0;
  const base = cage || sup ? 12 : 0;            // plate under the body
  const lw = W * 0.55, lh = (body.grip ? 34 : 0) + (H - (body.grip ? 34 : 0)) * 0.48 + base;   // lens centre on the front face

  // far-side handle (behind everything)
  const handleZ = (side, h) => {
    const w = side < 0 ? -t - 22 : W + t + 6, d0 = D * 0.25, d1 = d0 + 18;
    const hTop = H + base + (cage ? t : 0) - 6, hBot = hTop - Math.max(100, H * 1.05);
    const c = h.color === '#7a4a24' ? { top: '#a46b38', front: '#7a4a24', side: '#8a5629' } : { top: '#2a2d2c', front: '#161817', side: '#1d1f1e' };
    box(d0 + 3, w + 6, hTop - 10, d0 + 13, w + 16, hTop + 4, metal);
    box(d0, w, hBot, d1, w + 16, hTop, c, 'stroke="#000" stroke-opacity=".5" stroke-width=".8"');
    if (h.color !== '#7a4a24') for (let y = hBot + 8; y < hTop - 6; y += 7) line(P(d0, w, y), P(d1, w, y), '#0b0c0c', 1.2);
    else for (const f of [0.3, 0.55, 0.8]) line(P(d0 + 18 * f, w, hBot + 6), P(d0 + 18 * f, w, hTop - 6), 'rgba(50,25,5,.5)', 1);
    if (h.red) poly(ell(d0 + 9, w + 8, hTop + 4, 5).map(([x, y]) => [x, y]), '#e3262f');
    if (h.rosette) poly(hull(ell(d0 + 8, w + 8, hTop - 3, 9)), '#2f3332', 'stroke="#4a4f4d"');
  };
  if (sideR) handleZ(1, sideR);

  // tripod / hi-hat under the plate
  if (sup) {
    const [hx, hy] = P(D * 0.45, W * 0.5, 0);
    const hihat = sup.kind === 'hihat';
    box(D * 0.2, W * 0.25, -32, D * 0.75, W * 0.75, 0, dark);                 // fluid head
    poly(hull(ell(D * 0.2, W * 0.25 - 4, -16, 7)), '#141615', 'stroke="#444"');
    if (sup.pro) box(D * 0.2 - 1, W * 0.45, -14, D * 0.2, W * 0.6, -8, { top: '#2a8c63', front: '#2a8c63', side: '#2a8c63' });
    if (sup.bar) { line(P(D * 0.75, W * 0.4, -18), P(D * 0.75 + 150, W * 0.2, -90), '#3a3f3d', 8); line(P(D * 0.75 + 120, W * 0.2, -74), P(D * 0.75 + 152, W * 0.2, -92), '#141615', 14); }
    const top0 = [hx, hy + 44], ground = hihat ? hy + 110 : hy + 200 * (sup.h || 1);
    box(D * 0.1, W * 0.2, -46, D * 0.85, W * 0.8, -32, { top: '#2a2e2d', front: '#1a1c1b', side: '#151716' });
    for (const [dx, dz] of [[-118, 0], [118, 0], [-30, -40]]) {
      const sc = hihat ? 0.62 : 1;
      const foot = [hx + dx * sc, ground + dz * (hihat ? 0.4 : 1)];
      const knee = [top0[0] + (foot[0] - top0[0]) * 0.5, top0[1] + (foot[1] - top0[1]) * 0.5];
      const far = dz < 0;
      line(top0, knee, far ? '#232625' : '#2e3231', far ? 8 : 11);
      line(knee, foot, far ? '#2a2e2d' : '#454b49', far ? 5 : 7);
      out.push(`<rect x="${(knee[0] - 7).toFixed(1)}" y="${(knee[1] - 5).toFixed(1)}" width="14" height="10" rx="2" fill="#121413"/>`);
      if (hihat) out.push(`<ellipse cx="${foot[0].toFixed(1)}" cy="${(foot[1] + 2).toFixed(1)}" rx="11" ry="4" fill="#0e0f0f"/>`);
    }
  }
  // V-mount on the back
  if (bat) {
    const bh = bat.h * 1.25;
    box(D + 6, W * 0.2, base + 10, D + 6 + 9, W * 0.8, base + 10 + bh * 0.9, metal);        // plate
    box(D + 15, W * 0.22, base + 8, D + 15 + 30, W * 0.78, base + 8 + bh, { top: '#303433', front: '#1c1f1e', side: '#232726' });
    for (let i = 0; i < 4; i++) box(D + 22 + i * 5, -0.5, base + 8 + bh - 14, D + 25 + i * 5, 0, base + 8 + bh - 10, { top: '#000', front: '#000', side: i < 3 ? '#35d07f' : '#3a3d3c' }, '');
    line(P(D + 18, W * 0.22, base + 18), P(D + 42, W * 0.22, base + 18), '#0b0c0c', 2);
  }
  // cooling fan clipped on the back screen
  if (fan && body.fan) {
    box(D, W * 0.3, base + H * 0.35, D + 16, W * 0.75, base + H * 0.75, dark);
    for (let i = 0; i < 4; i++) line(P(D + 3 + i * 3.4, W * 0.3, base + H * 0.45), P(D + 3 + i * 3.4, W * 0.3, base + H * 0.66), fan.pro ? '#2a8c63' : '#4a4f4d', 1.4);
  }
  // base plate + body
  if (base) box(-8, -t - 4, 0, D + 10, W + t + 4, base, cageC || metal);
  box(0, 0, base, D, W, base + H, dark);
  if (hump) box(D * 0.12, W * 0.3, base + H, D * 0.85, W * 0.7, base + H + hump, dark);
  // grip on the far front corner + top details
  if (!cine) {
    box(-14 * s, W - 38 * s, base + (body.grip ? 4 : 6), 0, W, base + H - 4, { top: '#2b2f2e', front: '#121413', side: '#171918' });
    box(D * 0.3, W * 0.72, base + H, D * 0.62, W * 0.9, base + H + 6, { top: body.retro ? '#d4d8d6' : '#4a4f4d', front: body.retro ? '#a8adab' : '#2b2f2e', side: body.retro ? '#b9bebc' : '#303433' });
    box(D * 0.2, W * 0.06, base + H, D * 0.5, W * 0.22, base + H + 5, { top: body.retro ? '#d4d8d6' : '#4a4f4d', front: '#2b2f2e', side: '#303433' });
    if (body.grip) line(P(0, 4, base + 34), P(0, W - 40 * s, base + 34), '#0d0e0e', 1.5);
  } else {
    for (let i = 0; i < 8; i++) line(P(D * 0.25 + i * 6, 0, base + H * 0.3), P(D * 0.25 + i * 6, 0, base + H * 0.8), '#0d0f0e', 3);
    box(D * 0.2, W * 0.3, base + H, D * 0.8, W * 0.7, base + H + 6, metal);
  }
  // brand on the front face, sheared into the face plane
  {
    const [tx, ty] = P(0, lw + W * 0.36, base + H - 14 * s + (hump ? hump * 0.6 : 0));
    out.push(`<text transform="matrix(${-KX} ${-KY} 0 1 ${tx.toFixed(1)} ${ty.toFixed(1)})" font-size="${11 * s + 2}" font-weight="800" fill="#e8eae9" font-family="Avenir Next, Helvetica" letter-spacing="1.4">${BRANDS[body.brand].name.toUpperCase()}</text>`);
    if (body.brand === 'canon') poly(ell(0, W * 0.12, base + H - 12, 3), '#e3262f');
    if (body.brand === 'nikon') poly([P(0, W * 0.9, base + H - 6), P(0, W * 0.84, base + H - 6), P(0, W * 0.72, base + H * 0.55), P(0, W * 0.78, base + H * 0.55)], '#ffd400');
  }
  // cage on the near side + top
  if (cage) {
    const y0 = base, y1 = base + H + (hump ? hump : 0) + t;
    const c = cageC;
    if (cage.style !== 'half') box(-4, -t, y1 - t, D + 4, W + t, y1, c);            // top bar
    box(-4, -t, y0, 4, 0, y1, c);                                                   // front upright
    box(D - 4, -t, y0, D + 4, 0, y1, c);                                            // rear upright
    box(-4, -t, y0, D + 4, 0, y0 + 8, c);                                           // bottom rail
    if (cage.style !== 'half') box(-4, -t, y0 + (y1 - y0) * 0.5, D + 4, -t + 3, y0 + (y1 - y0) * 0.5 + 6, c);
    for (let i = 1; i < 6; i++) { const [x, y] = P(-4 + (D + 8) * i / 6, -t, y0 + 4); out.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.6" fill="#050606"/>`); }
    for (let i = 1; i < 6; i++) { const [x, y] = P(0, -t, y0 + (y1 - y0) * i / 6); out.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.4" fill="#050606"/>`); }
    if (cage.id === 'cage3') box(D * 0.3, -t - 0.5, y1 - t + 1, D * 0.6, -t, y1 - 1, { top: '#2a8c63', front: '#2a8c63', side: '#2a8c63' }, '');
    if (cage.style === 'pro') box(D * 0.2, -t - 6, y0 + 20, D * 0.8, -t, y0 + 34, c);
  }
  // lens (cylinder sections toward the viewer)
  if (lens) {
    const R = Math.max(30, lens.dia * 0.74), L = Math.max(44, lens.len * 1.25 + 18);
    const wht = !!lens.white;
    const barrel = wht ? 'url(#rg-lens-w)' : 'url(#rg-lens-b)';
    cyl(0, -8, lw, lh, R * 0.82, '#0d0e0e');                                       // mount
    cyl(-8, -L * 0.35, lw, lh, R * 0.92, barrel, 'stroke="#000" stroke-opacity=".4"');
    cyl(-L * 0.35, -L * 0.62, lw, lh, R * 0.96, wht ? '#9ea4a1' : '#111312');     // focus ring
    const t0 = Math.PI * 0.55, t1 = Math.PI * 1.45;
    for (let k = 0; k <= 14; k++) { const a = t0 + (t1 - t0) * k / 14; const w = lw + R * 0.96 * Math.cos(a), h = lh + R * 0.96 * Math.sin(a); line(P(-L * 0.36, w, h), P(-L * 0.61, w, h), wht ? '#7f8582' : '#050606', 1.2); }
    cyl(-L * 0.62, -L, lw, lh, R, barrel, 'stroke="#000" stroke-opacity=".4"');
    if (lens.ring) cyl(-L * 0.88, -L * 0.9, lw, lh, R + 0.4, lens.ring);
    poly(ell(-L, lw, lh, R), wht ? '#d0d4d1' : '#1a1c1b', 'stroke="#000" stroke-opacity=".5"');
    poly(ell(-L, lw, lh, R * 0.86), '#050606');
    poly(ell(-L, lw, lh, R * 0.74), 'url(#rg-glass)');
    const hl = ell(-L, lw, lh, R * 0.6).slice(4, 11);
    out.push(`<path d="M${hl.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L')}" stroke="rgba(255,255,255,.45)" stroke-width="2" fill="none" stroke-linecap="round"/>`);
    const [gx, gy] = P(-L, lw - R * 0.25, lh - R * 0.2);
    out.push(`<circle cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" r="${(R * 0.12).toFixed(1)}" fill="rgba(120,160,255,.35)"/>`);
  } else {
    poly(ell(0, lw, lh, 30), '#a3a8a6'); poly(ell(0, lw, lh, 25), '#0b0c0c');
  }
  // top handle
  const cageTop = base + H + (hump || 0) + t;
  let topH = cageTop;
  if (top) {
    const w0 = W * 0.42, w1 = W * 0.58, hh = cageTop + 22;
    box(-6, w0, cageTop, 6, w1, hh, metal);
    box(D - 10, w0, cageTop, D + 2, w1, hh, metal);
    box(-24, w0 - 2, hh, D + 14, w1 + 2, hh + 12, { top: top.tone ? '#2d6f52' : '#2a2d2c', front: top.tone || '#151716', side: top.tone ? '#1a4a35' : '#1b1d1c' });
    for (let i = 0; i < 9; i++) line(P(-10 + i * (D + 10) / 9, w0 - 2, hh + 2), P(-10 + i * (D + 10) / 9, w0 - 2, hh + 10), '#090a0a', 1.4);
    if (top.style === 'pro') poly(hull(ell(D + 14, w0 + 6, hh + 6, 9)), '#2f3332', 'stroke="#4a4f4d"');
    topH = hh + 12;
  }
  // near-side handle
  if (sideL) handleZ(-1, sideL);
  // monitor, flipped out off the back, screen facing you
  if (mon) {
    const big = mon.inch >= 7, mw = big ? 120 : 94, mh = big ? 76 : 60;
    const d0 = D * 0.35, w = W * 0.15, h0 = topH + 16;
    box(D * 0.55, W * 0.4, topH - 2, D * 0.7, W * 0.55, h0 + 6, metal);
    poly(hull(ell(D * 0.62, W * 0.47, h0 + 6, 6)), '#2b2f2e', 'stroke="#4a4f4d"');
    box(d0, w, h0, d0 + mw, w + 10, h0 + mh, { top: '#2a2d2c', front: '#1a1c1b', side: mon.pro ? '#163a2a' : '#141615' }, `stroke="${mon.pro ? '#2a8c63' : '#000'}" stroke-width="1"`);
    const scr = [P(d0 + 5, w - .2, h0 + 12), P(d0 + mw - 5, w - .2, h0 + 12), P(d0 + mw - 5, w - .2, h0 + mh - 5), P(d0 + 5, w - .2, h0 + mh - 5)];
    poly(scr, 'url(#rg-screen)');
    poly([P(d0 + 5, w - .3, h0 + 12), P(d0 + 5, w - .3, h0 + mh * 0.45), P(d0 + mw * 0.35, w - .3, h0 + mh * 0.62), P(d0 + mw * 0.55, w - .3, h0 + mh * 0.38), P(d0 + mw * 0.78, w - .3, h0 + mh * 0.55), P(d0 + mw - 5, w - .3, h0 + mh * 0.42), P(d0 + mw - 5, w - .3, h0 + 12)], '#1b4a32', 'opacity=".9"');
    for (const f of [0.08, 0.3]) line(P(d0 + mw * f, w - .4, h0 + mh - 10), P(d0 + mw * f + 14, w - .4, h0 + mh - 10), 'rgba(255,255,255,.6)', 2);
    if (mon.rec) { const [rx, ry] = P(d0 + mw - 11, w - .4, h0 + mh - 10); out.push(`<circle cx="${rx.toFixed(1)}" cy="${ry.toFixed(1)}" r="3" fill="#ff3b3b"/>`); }
  }
  const w = X1 - X0, h = Y1 - Y0, pad = Math.max(w, h) * 0.04;
  return `<svg viewBox="${(X0 - pad).toFixed(0)} ${(Y0 - pad).toFixed(0)} ${(w + pad * 2).toFixed(0)} ${(h + pad * 2).toFixed(0)}" class="rig-svg${opts.cls ? ' ' + opts.cls : ''}" aria-hidden="true">${out.join('')}</svg>`;
}

// small thumbnail of one item, drawn by putting it alone on a stock body
function gearThumb(item) {
  const rig = {};
  if (item.slot === 'body') rig.body = item.id;
  else {
    rig.body = (game.rig.body && gearById.get(game.rig.body)) ? game.rig.body : BODIES.find((b) => b.brand === (item.brand !== 'all' ? item.brand : (game.brands[0] || 'sony')) && b.starter).id;
    rig[item.slot === 'side' ? 'sideR' : item.slot] = item.id;
    if (item.slot === 'monitor') rig.top = 'top1';
    if (item.slot === 'fan' && !gearById.get(rig.body).fan) rig.body = BODIES.find((b) => b.fan).id;
  }
  return rigSVG(rig, { cls: item.slot === 'body' ? 'focus-body' : '' });
}

// ---------------- rendering hooks ----------------
function rigValue() { return SLOTS.reduce((t, [s]) => t + (game.rig[s] ? gearById.get(game.rig[s]).usd : 0), 0); }
function renderXp() {
  $('#xpTotal').textContent = game.xp.toLocaleString();
  if ($('#pbXp')) $('#pbXp').textContent = game.session;
  const g = nextGoal();
  $('#shopBtn').classList.toggle('ready', !!g && game.xp >= g.cost);
  const ng = $('#nextGoal');
  if (ng) {
    if (g) {
      ng.innerHTML = `<span>Next goal</span><b></b><div class="goal-track"><i style="width:${Math.min(100, (game.xp / g.cost) * 100)}%"></i></div><em></em>`;
      ng.querySelector('b').textContent = g.name;
      ng.querySelector('em').textContent = game.xp >= g.cost ? 'Ready to buy' : `${(g.cost - game.xp).toLocaleString()} XP to go`;
    } else ng.textContent = '';
  }
}
const snapCache = new Map();
function rigPic(rig, w, h) {
  if (!window.Rig3D || !rig.body) return rigSVG(rig);
  const key = JSON.stringify(rig) + w + 'x' + h;
  if (!snapCache.has(key)) { try { snapCache.set(key, window.Rig3D.snapshot(rig, w, h)); } catch { return rigSVG(rig); } }
  return `<img class="rig-svg rig-img" alt="" src="${snapCache.get(key)}">`;
}
window.addEventListener('rig3d-ready', () => { if (game.loaded) renderRig(); if (!$('#onboard').hidden) openOnboard(); });
function renderRig() {
  const svg = rigPic(game.rig, 640, 520);
  $('#homeRig').innerHTML = game.brands.length ? svg : '';
  $('#rigPanel').innerHTML = `<div class="panel-h">My rig</div>${rigPic(game.rig, 400, 400)}<div class="panel-sub"></div>`;
  $('#rigPanel .panel-sub').textContent = game.rig.body ? `Rig score ${rigStats().score} · $${rigValue().toLocaleString()}` : '';
  const body = game.rig.body && gearById.get(game.rig.body);
  $('#rigTitle').textContent = body ? 'Your rig' : 'Build a rig';
  $('#rigSub').textContent = body ? `${body.name} · Rig score ${rigStats().score} · $${rigValue().toLocaleString()} of gear` : 'Pick a brand to start your path';
}
function renderHall() {
  const earned = BADGES.filter((b) => game.badges.includes(b.id));
  const html = (list) => list.map((b) => `<div class="badge-chip${game.badges.includes(b.id) ? ' got' : ''}" title="${b.desc}"><i>${badgeIcon(b)}</i><span>${b.name}</span></div>`).join('');
  const recent = earned.slice(-6).reverse();
  $('#hallPanel').innerHTML = `<div class="panel-h">Hall of History <em>${earned.length}/${BADGES.length}</em></div>
    <div class="hall-next" id="hallNext"></div>
    <div class="badge-list">${recent.length ? html(recent) : '<p class="muted-s">Sort photos to earn your first badge.</p>'}</div>
    <div class="hall-stats"><div><b>${game.stats.sorted.toLocaleString()}</b>sorted</div><div><b>${game.stats.deleted.toLocaleString()}</b>cut</div><div><b>${game.stats.bestStreak}</b>best streak</div></div>`;
  $('#homeHall').innerHTML = `<div class="panel-h">Hall of History <em>${earned.length}/${BADGES.length}</em></div><div class="badge-row">${html([...BADGES.filter((b) => game.badges.includes(b.id)).reverse(), ...BADGES.filter((b) => !game.badges.includes(b.id))].slice(0, 8))}</div>`;
  updateHallProgress();
}
function badgeIcon(b) {
  return { sorted: '◆', deleted: '✕', selected: '✓', bestStreak: '⚡', cleared: '🏁', gear: '⚙', slots: '★', brands: '◎' }[b.stat] || '◆';
}
function updateHallProgress() {
  const el = $('#hallNext');
  if (!el) return;
  const next = BADGES.filter((b) => !game.badges.includes(b.id) && ['sorted', 'deleted', 'selected'].includes(b.stat))
    .sort((a, b) => (1 - statValue(a.stat) / a.n) - (1 - statValue(b.stat) / b.n))[0];
  if (!next) { el.textContent = ''; return; }
  const v = statValue(next.stat);
  if (el.dataset.id !== next.id) {
    el.dataset.id = next.id;
    el.innerHTML = '<span>Next badge</span><b></b><div class="goal-track"><i></i></div><em></em>';
    el.querySelector('b').textContent = next.name;
  }
  el.querySelector('i').style.width = `${Math.min(100, (v / next.n) * 100)}%`;
  el.querySelector('em').textContent = `${v.toLocaleString()} / ${next.n.toLocaleString()}`;
}
function applyBg() {
  const b = bgById.get(game.bg) || BACKGROUNDS[0];
  const layer = $('#bgLayer');
  layer.style.background = b.css;
  layer.className = b.anim;
}
function renderAll() { applyBg(); renderXp(); renderRig(); renderHall(); }

// ---------------- load ----------------
function starterKit(brand) {
  const body = BODIES.find((b) => b.brand === brand && b.starter);
  const lens = LENSES.find((l) => l.brand === brand && l.starter);
  for (const it of [body, lens]) if (!game.owned.includes(it.id)) game.owned.push(it.id);
  if (!game.rig.body) { game.rig.body = body.id; game.rig.lens = lens.id; }
}
api.loadProgress().then((d) => {
  if (d) {
    game.xp = Math.max(0, d.xp | 0);
    game.lifetime = Math.max(game.xp, d.lifetime | 0);
    if (d.v === 2) {
      for (const k of ['brands', 'owned', 'bgs', 'badges']) if (Array.isArray(d[k])) game[k] = d[k].filter((x) => typeof x === 'string');
      if (d.rig && typeof d.rig === 'object') for (const [s] of SLOTS) if (game.owned.includes(d.rig[s])) game.rig[s] = d.rig[s];
      if (bgById.has(d.bg) && game.bgs.includes(d.bg)) game.bg = d.bg;
      if (d.stats) for (const k in game.stats) game.stats[k] = Math.max(0, d.stats[k] | 0);
    } else if (Array.isArray(d.unlocked) && d.unlocked.length > 1) {
      game.xp += (d.unlocked.length - 1) * 200;   // refund old v1 backgrounds
    }
  }
  if (!game.bgs.includes('bg0')) game.bgs.unshift('bg0');
  game.loaded = true;
  checkBadges(true);
  renderAll();
  if (!game.brands.length) openOnboard();
}).catch(() => { renderAll(); openOnboard(); });

// ---------------- onboarding: pick a brand path ----------------
function brandCards(container, onPick, filter) {
  container.replaceChildren();
  for (const [id, br] of Object.entries(BRANDS)) {
    if (filter && !filter(id)) continue;
    const starter = BODIES.find((b) => b.brand === id && b.starter);
    const top = BODIES.filter((b) => b.brand === id).sort((a, b) => b.usd - a.usd)[0];
    const btn = document.createElement('button');
    btn.className = 'brand-card';
    btn.style.setProperty('--acc', br.accent);
    btn.innerHTML = `<div class="bc-art">${rigPic({ body: starter.id, lens: LENSES.find((l) => l.brand === id && l.starter).id }, 420, 300)}</div>
      <div class="bc-name">${br.name}</div><div class="bc-tag">${br.tag}</div>
      <div class="bc-path">Start: <b>${starter.name.replace(br.name + ' ', '')}</b> → Top: <b>${top.name.replace(br.name + ' ', '')}</b></div>`;
    btn.addEventListener('click', () => onPick(id));
    container.appendChild(btn);
  }
}
function openOnboard() {
  closeModals();
  brandCards($('#onboardGrid'), (id) => {
    game.brands = [id];
    starterKit(id);
    saveGame(); renderAll(); closeModals();
    splashCenter(`${BRANDS[id].name} path locked in`);
  });
  $('#onboard').hidden = false;
}

// ---------------- rig detail ----------------
function openRig() {
  if (!game.brands.length) { openOnboard(); return; }
  const m = $('#rigModal');
  $('#rigBig').innerHTML = window.Rig3D ? '' : rigSVG(game.rig);
  const spent = SLOTS.reduce((t, [s]) => t + (game.rig[s] ? gearById.get(game.rig[s]).cost : 0), 0);
  const filled = SLOTS.filter(([s]) => game.rig[s]).length;
  $('#rigStats').innerHTML = `
    <div class="rs score"><b>${rigStats().score}</b><span>Rig score</span></div>
    <div class="rs"><b>$${rigValue().toLocaleString()}</b><span>Rig value</span></div>
    <div class="rs"><b>${filled}/10</b><span>Slots filled</span></div>
    <div class="rs"><b>${game.owned.length}</b><span>Gear owned</span></div>
    <div class="rs"><b>${game.brands.map((b) => BRANDS[b].name).join(' + ')}</b><span>Brand path</span></div>
    <div class="stat-bars">${STAT_NAMES.map(([k, n]) => { const v = rigStats()[k]; return `<div class="sb"><span>${n}</span><div class="goal-track"><i style="width:${v}%"></i></div><b>${v}</b></div>`; }).join('')}</div>`;
  const list = $('#rigSlots');
  list.replaceChildren();
  const body = game.rig.body && gearById.get(game.rig.body);
  for (const [s, label] of SLOTS) {
    const it = game.rig[s] && gearById.get(game.rig[s]);
    const row = document.createElement('button');
    row.className = 'slot-row' + (it ? ' on' : '');
    const na = s === 'fan' && body && !body.fan;
    row.innerHTML = `<span class="sl">${label}</span><span class="sv"></span><span class="sp"></span>`;
    if (it) { const st = document.createElement('small'); st.textContent = statLine(it); row.querySelector('.sv').after(st); }
    row.querySelector('.sv').textContent = it ? it.name : na ? (body.kind === 'c' ? 'Built-in fan' : 'Not compatible with this body') : 'Empty';
    row.querySelector('.sp').textContent = it ? `$${it.usd.toLocaleString()}` : na ? '' : 'Shop →';
    row.addEventListener('click', () => { if (!na) openShop('gear', slotOf(s)); });
    list.appendChild(row);
  }
  closeModals();
  m.hidden = false;
  if (window.Rig3D) window.Rig3D.show($('#rigBig'), game.rig);
}

// ---------------- shop ----------------
let shopTab = 'gear', shopSlot = 'body', bgPage = 0;
function canBuyBrand(item) { return item.brand === 'all' || game.brands.includes(item.brand); }
function equip(item) {
  if (item.slot === 'side') {
    if (game.rig.sideL === item.id && !game.rig.sideR) game.rig.sideR = item.id;
    else if (!game.rig.sideL) game.rig.sideL = item.id;
    else if (!game.rig.sideR) game.rig.sideR = item.id;
    else game.rig.sideL = item.id;
  } else game.rig[item.slot] = item.id;
  if (item.slot === 'body') {
    const lens = game.rig.lens && gearById.get(game.rig.lens);
    if (lens && lens.brand !== 'all' && lens.brand !== item.brand) {
      const own = LENSES.find((l) => game.owned.includes(l.id) && (l.brand === item.brand || l.brand === 'all'));
      if (own) game.rig.lens = own.id; else delete game.rig.lens;
    }
    if (!item.fan) delete game.rig.fan;
  }
}
function buy(item) {
  if (game.owned.includes(item.id)) { equip(item); }
  else {
    if (game.xp < item.cost || !canBuyBrand(item)) return;
    game.xp -= item.cost;
    game.owned.push(item.id);
    equip(item);
    splashCenter(`${item.name} added to your rig`);
  }
  checkBadges(false);
  saveGame(); renderAll(); renderShop();
}
function renderShop() {
  $('#shopXp').textContent = game.xp.toLocaleString();
  for (const t of document.querySelectorAll('.shop-tabs button')) t.classList.toggle('on', t.dataset.tab === shopTab);
  const sub = $('#shopSub'), grid = $('#shopGrid');
  sub.replaceChildren(); grid.replaceChildren();
  grid.className = `shop-grid t-${shopTab}`;
  if (shopTab === 'gear') {
    for (const [s, label] of [['body', 'Bodies'], ['lens', 'Lenses'], ['cage', 'Cages'], ['top', 'Top handles'], ['side', 'Side handles'], ['monitor', 'Monitors'], ['battery', 'V-mount'], ['fan', 'Fans'], ['support', 'Tripods']]) {
      const b = document.createElement('button');
      b.textContent = label; b.className = s === shopSlot ? 'on' : '';
      b.addEventListener('click', () => { shopSlot = s; renderShop(); });
      sub.appendChild(b);
    }
    const body = game.rig.body && gearById.get(game.rig.body);
    const items = GEAR.filter((g) => g.slot === shopSlot && (g.brand === 'all' || game.brands.includes(g.brand) || g.slot === 'body')).sort((a, b) => a.cost - b.cost);
    for (const it of items) {
      const owned = game.owned.includes(it.id);
      const on = Object.values(game.rig).includes(it.id);
      const brandLocked = !canBuyBrand(it);
      const fanNo = it.slot === 'fan' && body && !body.fan;
      const lensNo = it.slot === 'lens' && body && it.brand !== 'all' && it.brand !== body.brand;
      const tile = document.createElement('button');
      tile.className = `gear-tile${on ? ' active' : ''}${owned ? ' owned' : ''}${!owned && (game.xp < it.cost || brandLocked) ? ' locked' : ''}`;
      tile.innerHTML = `<div class="g-art">${gearThumb(it)}</div><div class="t-name"></div><div class="t-desc"></div><div class="t-cta"></div>`;
      tile.querySelector('.t-name').textContent = it.name;
      tile.querySelector('.t-desc').textContent = `$${it.usd.toLocaleString()}${it.kind === 'c' ? ' · cinema' : ''}${it.slot === 'body' && it.fan ? ' · fan ready' : ''}`;
      const sl = document.createElement('div'); sl.className = 't-stats'; sl.textContent = statLine(it); tile.querySelector('.t-desc').after(sl);
      tile.querySelector('.t-cta').textContent = on ? 'Equipped'
        : brandLocked ? `${BRANDS[it.brand].name} path locked`
          : fanNo ? 'Your body can’t take a fan'
            : lensNo ? (owned ? 'Needs a ' + BRANDS[it.brand].name + ' body' : `${it.cost.toLocaleString()} XP · ${BRANDS[it.brand].name} mount`)
              : owned ? 'Equip' : game.xp >= it.cost ? `Buy · ${it.cost.toLocaleString()} XP` : `${it.cost.toLocaleString()} XP · ${(it.cost - game.xp).toLocaleString()} to go`;
      tile.addEventListener('click', () => {
        if (brandLocked || fanNo || (lensNo && owned)) return;
        if (on && it.slot !== 'side') return;
        buy(it);
      });
      grid.appendChild(tile);
    }
  } else if (shopTab === 'bg') {
    const pages = STYLES.length + 1;
    const names = ['Starter', ...STYLES.map((s) => s.name)];
    for (let i = 0; i < pages; i++) {
      const b = document.createElement('button');
      const first = i === 0 ? BACKGROUNDS[0] : BACKGROUNDS[(i - 1) * PALETTES.length + 1];
      b.textContent = names[i];
      b.className = (i === bgPage ? 'on' : '') + (game.lifetime < first.cost && game.xp < first.cost ? ' dim' : '');
      b.addEventListener('click', () => { bgPage = i; renderShop(); });
      sub.appendChild(b);
    }
    const list = bgPage === 0 ? BACKGROUNDS.slice(0, 1) : BACKGROUNDS.slice((bgPage - 1) * PALETTES.length + 1, bgPage * PALETTES.length + 1);
    for (const b of list) {
      const owned = game.bgs.includes(b.id);
      const tile = document.createElement('button');
      tile.className = `bg-tile${owned ? ' owned' : ''}${game.bg === b.id ? ' active' : ''}${!owned && game.xp < b.cost ? ' locked' : ''}`;
      tile.innerHTML = '<div class="swatch"></div><div class="t-name"></div><div class="t-cta"></div>';
      tile.querySelector('.swatch').style.background = b.css;
      tile.querySelector('.t-name').textContent = b.name;
      tile.querySelector('.t-cta').textContent = game.bg === b.id ? 'Equipped' : owned ? 'Equip' : game.xp >= b.cost ? `Unlock · ${b.cost.toLocaleString()} XP` : `${b.cost.toLocaleString()} XP`;
      tile.addEventListener('click', () => {
        if (!owned) { if (game.xp < b.cost) return; game.xp -= b.cost; game.bgs.push(b.id); }
        game.bg = b.id;
        saveGame(); renderAll(); renderShop();
      });
      grid.appendChild(tile);
    }
  } else if (shopTab === 'brands') {
    const note = document.createElement('p');
    note.className = 'shop-note';
    note.textContent = `Add another brand path for ${BRANDS_COST()} XP. You can mix gear, but your rig runs one body and one lens at a time.`;
    sub.appendChild(note);
    brandCards(grid, (id) => {
      if (game.brands.includes(id)) return;
      if (game.xp < BRAND_LICENSE) { toast(`You need ${(BRAND_LICENSE - game.xp).toLocaleString()} more XP to add ${BRANDS[id].name}`); return; }
      game.xp -= BRAND_LICENSE;
      game.brands.push(id);
      starterKit(id);
      checkBadges(false); saveGame(); renderAll(); renderShop();
      splashCenter(`${BRANDS[id].name} unlocked`);
    });
    for (const card of grid.children) {
      const id = Object.keys(BRANDS)[[...grid.children].indexOf(card)];
      const own = game.brands.includes(id);
      card.classList.toggle('owned', own);
      card.classList.toggle('locked', !own && game.xp < BRAND_LICENSE);
      const tag = document.createElement('div');
      tag.className = 't-cta';
      tag.textContent = own ? 'Your path' : `Unlock · ${BRAND_LICENSE.toLocaleString()} XP`;
      card.appendChild(tag);
    }
  }
}
const BRANDS_COST = () => BRAND_LICENSE.toLocaleString();
function openShop(tab, slot) {
  if (!game.brands.length) { openOnboard(); return; }
  if (tab) shopTab = tab;
  if (slot) shopSlot = slot;
  closeModals();
  renderShop();
  $('#shop').hidden = false;
}
function closeModals() {
  if (window.Rig3D) window.Rig3D.hide(); for (const m of document.querySelectorAll('.modal')) if (m.id !== 'onboard' || game.brands.length) m.hidden = true; }

$('#shopBtn').addEventListener('click', () => openShop());
$('#shopCard').addEventListener('click', () => openShop());
$('#rigCard').addEventListener('click', openRig);
$('#rigPanel').addEventListener('click', openRig);
$('#rigToShop').addEventListener('click', () => openShop('gear'));
for (const t of document.querySelectorAll('.shop-tabs button')) t.addEventListener('click', () => { shopTab = t.dataset.tab; renderShop(); });
for (const b of document.querySelectorAll('[data-close]')) b.addEventListener('click', closeModals);
for (const m of document.querySelectorAll('.modal')) m.addEventListener('click', (e) => { if (e.target === m) closeModals(); });

// ---------------- pop-ups ----------------
function popSpot(el, dir) {
  const stage = $('#stage').getBoundingClientRect();
  const media = el?.querySelector('.media');
  const img = media?.querySelector('img, video');
  if (!media) return { x: stage.width / 2, y: 24, side: 'top' };
  const m = media.getBoundingClientRect();
  const ready = img && (img.tagName === 'VIDEO' ? img.videoWidth : img.complete && img.naturalWidth);
  const r = ready ? img.getBoundingClientRect() : m;   // not loaded yet: assume it fills the well
  const left = dir === 'left';
  const sideSpace = left ? r.left - m.left : m.right - r.right;
  if (sideSpace >= 150) {
    const x = left ? (m.left + r.left) / 2 : (r.right + m.right) / 2;
    return { x: x - stage.left, y: m.top + m.height * 0.42 - stage.top, side: 'side', w: sideSpace };
  }
  const topSpace = r.top - m.top;
  if (topSpace >= 54) {
    return { x: (left ? r.left + r.width * 0.25 : r.left + r.width * 0.75) - stage.left, y: m.top + topSpace / 2 - stage.top, side: 'top' };
  }
  const meta = el.querySelector('.meta').getBoundingClientRect();
  return { x: (left ? meta.left + meta.width * 0.55 : meta.left + meta.width * 0.78) - stage.left, y: meta.top + meta.height / 2 - stage.top, side: 'meta' };
}
function pop(spot, text, cls, dy = 0, sub) {
  const d = document.createElement('div');
  d.className = `pop ${cls} at-${spot.side}`;
  d.style.left = `${spot.x}px`;
  d.style.top = `${spot.y + dy}px`;
  d.style.setProperty('--tilt', `${(Math.random() * 8 - 4).toFixed(1)}deg`);
  const t = document.createElement('span');
  t.className = 'pop-t';
  t.textContent = text;
  d.appendChild(t);
  if (sub) { const s = document.createElement('small'); s.textContent = sub; d.appendChild(s); }
  d.addEventListener('animationend', (e) => { if (e.target === d) d.remove(); });
  $('#stage').appendChild(d);
}
function splashCenter(text) {
  const d = document.createElement('div');
  d.className = 'splash-center';
  d.textContent = text;
  d.addEventListener('animationend', () => d.remove(), { once: true });
  document.body.appendChild(d);
}
const STREAK_CALLS = { 10: '10 IN A ROW!', 25: 'ON FIRE!', 50: 'UNSTOPPABLE!', 100: '100 STRAIGHT!', 200: 'LEGENDARY!' };
const CUT_WORDS = ['CUT!', 'GONE!', 'TRASHED!', 'SWIPED!', 'NOPE!'];
const KEEP_WORDS = ['KEEPER!', 'MONEY!', 'CLEAN!', 'SELECT!', 'BANGER!'];
function swipeFx(dir, xp, spot) {
  const now = performance.now();
  game.streak = now - game.lastAt < 4000 ? game.streak + 1 : 1;
  game.lastAt = now;
  if (game.streak > game.stats.bestStreak) { game.stats.bestStreak = game.streak; checkBadges(false); }
  game.cutRun = dir === 'left' ? game.cutRun + 1 : 0;
  const words = dir === 'left' ? CUT_WORDS : KEEP_WORDS;
  const word = game.streak >= 10 ? words[game.streak % words.length] : words[0];
  pop(spot, `+${xp} ${word}`, dir === 'left' ? 'p-cut' : 'p-keep', 0, game.streak >= 5 ? `x${game.streak} streak` : '');
  let call = STREAK_CALLS[game.streak], badge = false;
  if (!call && game.cutRun > 0 && game.cutRun % 8 === 0) call = 'RUTHLESS!';
  const total = state.cards.length;
  if (!call && total >= 20 && !game.halfShown && state.i >= total / 2) { call = 'HALFTIME!'; game.halfShown = true; }
  if (!call && game.milestone) { call = game.milestone.text; badge = game.milestone.badge; game.milestone = null; }
  if (call) pop(spot, call, badge ? 'p-call p-badge' : 'p-call', spot.side === 'side' ? 70 : spot.side === 'top' ? 0 : -46, badge ? 'BADGE EARNED' : '');
}

// reset per folder (called by renderer's load())
const _load = load;
load = async function (paths) { game.session = 0; game.streak = 0; game.cutRun = 0; game.halfShown = false; game.clearedThis = false; return _load(paths); };
