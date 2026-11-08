'use strict';

const api = window.swiped;
const $ = (s) => document.querySelector(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const UNDO_LIMIT = 5;
const state = { cards: [], i: 0, history: [], decisions: new Map(), saved: 0, deleted: 0, folders: [], busy: false };
const previewCache = new Map();
let muted = true;

if (api.platform === 'darwin') document.body.classList.add('mac');

// ---------- settings ----------
const pairBox = $('#pair');
try { pairBox.checked = localStorage.getItem('pair') !== '0'; } catch {}
pairBox.addEventListener('change', () => {
  try { localStorage.setItem('pair', pairBox.checked ? '1' : '0'); } catch {}
});

// ---------- helpers ----------
function show(name) {
  document.body.dataset.screen = name;
  for (const id of ['home', 'swipe', 'done']) $('#' + id).hidden = id !== name;
  $('#stats').hidden = name === 'home';
  $('#newBatch').hidden = name === 'home';
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3500);
}

function fmtSize(b) {
  if (b < 1024) return `${b} B`;
  const u = ['KB', 'MB', 'GB', 'TB'];
  let i = -1;
  do { b /= 1024; i++; } while (b >= 1024 && i < u.length - 1);
  return `${b.toFixed(b < 10 ? 1 : 0)} ${u[i]}`;
}

function cleanError(err) {
  return String(err && err.message ? err.message : err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
}

function updateStats() {
  const total = state.cards.length;
  $('#statLeft').textContent = Math.max(0, total - state.i);
  $('#statSaved').textContent = state.saved;
  $('#statDeleted').textContent = state.deleted;
  const pct = total ? (state.i / total) * 100 : 0;
  $('#progressFill').style.width = `${pct}%`;
  $('#pbPct').textContent = `${Math.floor(pct)}%`;
  $('#pbCount').textContent = total ? `· ${state.i} / ${total}` : '';
  $('#pbXp').textContent = game.session;
}

// ---------- loading a batch ----------
async function load(paths) {
  if (!paths || !paths.length || state.busy) return;
  $('#loading').hidden = false;
  try {
    const res = await api.scan(paths, pairBox.checked);
    previewCache.clear();
    game.session = 0; game.streak = 0; game.cutRun = 0; game.halfShown = false;
    Object.assign(state, { cards: res.cards, folders: res.folders, i: 0, history: [], decisions: new Map(), saved: 0, deleted: 0 });
    scoreCache.clear();
    scoreData.clear();
    if (!state.cards.length) {
      show('home');
      toast('That folder has no files to swipe. Folders inside it are skipped.');
      return;
    }
    show('swipe');
    render();
  } catch (err) {
    toast(`Couldn’t read that: ${cleanError(err)}`);
  } finally {
    $('#loading').hidden = true;
  }
}

window.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  document.body.classList.add('dragging');
});
window.addEventListener('dragleave', (e) => {
  if (!e.relatedTarget) document.body.classList.remove('dragging');
});
window.addEventListener('drop', (e) => {
  e.preventDefault();
  document.body.classList.remove('dragging');
  const paths = [...e.dataTransfer.files]
    .map((f) => { try { return api.pathFor(f); } catch { return ''; } })
    .filter(Boolean);
  load(paths);
});

$('#choose').addEventListener('click', async () => load(await api.pickFolder()));
$('#newBatch').addEventListener('click', () => { if (!state.busy) show('home'); });
$('#again').addEventListener('click', () => show('home'));

// ---------- previews ----------
function primaryPath(card) { return card.files[card.primaryIndex].path; }

function getPreview(card) {
  if (!previewCache.has(card.id)) {
    previewCache.set(card.id, api.preview(primaryPath(card)).catch(() => ({ type: 'file' })));
  }
  return previewCache.get(card.id);
}

function prefetch() {
  for (let k = 1; k <= 5; k++) {
    const c = state.cards[state.i + k];
    if (!c) break;
    getPreview(c).then((p) => {
      if (p && p.type === 'image') {
        const im = new Image(); im.src = p.url; im.decode().catch(() => {});
        if (k <= 3) getScore(c); // score a few ahead so they're ready when you get there
      }
    });
  }
}

function fileTile(box, card, note) {
  box.replaceChildren();
  const tile = document.createElement('div');
  tile.className = 'filetile';
  const ext = document.createElement('div');
  ext.className = 'ext';
  ext.textContent = (card.files[card.primaryIndex].ext.replace('.', '') || 'file').toUpperCase();
  const txt = document.createElement('div');
  txt.textContent = note || 'No preview for this file type';
  tile.append(ext, txt);
  box.appendChild(tile);
}

function addImage(box, url, orientation, card) {
  const img = new Image();
  img.draggable = false;
  img.decoding = 'async';
  if ([3, 6, 8].includes(orientation)) img.className = `o${orientation}`;
  img.onerror = () => fileTile(box, card, 'Preview couldn’t be loaded');
  img.src = url;
  box.appendChild(img);
}

function fillMedia(el, card, p) {
  const box = el.querySelector('.media');
  box.replaceChildren();
  if (p.type === 'image') {
    addImage(box, p.url, p.orientation, card);
    attachScores(box, card);
  } else if (p.type === 'video') {
    const v = document.createElement('video');
    v.src = p.url;
    v.muted = muted;
    v.loop = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.onerror = async () => {
      const t = await api.thumb(primaryPath(card)).catch(() => null);
      box.replaceChildren();
      if (t) { addImage(box, t.url, 1, card); addBadge(box, 'Video can’t play here, showing a still'); }
      else fileTile(box, card, 'This video format can’t play here');
    };
    box.appendChild(v);
    addBadge(box, muted ? 'Video  ·  muted (M)' : 'Video  ·  sound on (M)');
    if (el.classList.contains('top')) v.play().catch(() => {});
  } else {
    fileTile(box, card);
  }
}

// ---------- photo scores (Apple Vision, on this Mac) ----------
const scoreCache = new Map();

const SMALL_SCORES = [
  ['composition', 'Composition'], ['exposure', 'Exposure'], ['focus', 'Focus'],
  ['expression', 'Expression'], ['eyes', 'Eyes Open'], ['action', 'Action'], ['cinematic', 'Cinematic'],
];
const scoreClass = (v) => (v > 75 ? 'good' : v >= 50 ? 'mid' : 'bad');

const scoreData = new Map(); // card id -> { scores, print, time } once loaded

function getScore(card) {
  const id = card.id;
  if (!scoreCache.has(id)) {
    scoreCache.set(id, api.score(primaryPath(card))
      .catch((e) => ({ error: cleanError(e) }))
      .then((r) => {
        if (r.error && r.error !== 'skip') scoreCache.delete(id);
        if (r.scores) scoreData.set(id, { ...r, vec: decodePrint(r.print) });
        return r;
      }));
  }
  return scoreCache.get(id);
}

// ---------- "looks like one you already saved" (burst detection) ----------
function decodePrint(b64) {
  if (!b64) return null;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Float32Array(bytes.buffer);
}
function printDistance(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) { const x = a[i] - b[i]; s += x * x; }
  return Math.sqrt(s);
}
// Tuned on Brody's own shoots: burst frames <3 s apart sit at 0.25-0.63; frames >1 min apart are almost never under 0.57.
function isSimilar(a, b) {
  if (!a.vec || !b.vec || a.vec.length !== b.vec.length) return false;
  const d = printDistance(a.vec, b.vec);
  const dt = a.time != null && b.time != null ? Math.abs(a.time - b.time) : Infinity;
  return (dt <= 5 && d <= 0.65) || (dt <= 60 && d <= 0.45) || d <= 0.30;
}
function similarSaved(card) {
  const me = scoreData.get(card.id);
  if (!me) return null;
  for (const [idx, dir] of state.decisions) {
    if (dir !== 'right') continue;
    const other = state.cards[idx];
    if (!other || other.id === card.id) continue;
    const them = scoreData.get(other.id);
    if (them && isSimilar(me, them)) return other;
  }
  return null;
}
function updateDot(el) {
  if (!el) return;
  const card = state.cards.find((c) => c.id === el.dataset.id);
  const box = el.querySelector('.media');
  box.querySelector('.similar-dot')?.remove();
  const match = card && similarSaved(card);
  if (!match) return;
  const dot = document.createElement('div');
  dot.className = 'similar-dot';
  dot.title = `Looks like ${match.name}, which you already selected`;
  box.appendChild(dot);
}

function chip(cls, value, label) {
  const d = document.createElement('div');
  const none = value == null;
  d.className = `${cls} ${none ? 'none' : scoreClass(value)}`;
  const b = document.createElement('b');
  b.textContent = none ? '—' : `${value}%`;
  if (none) d.title = 'No face found';
  const s = document.createElement('span');
  s.textContent = label;
  d.append(b, s);
  return d;
}

function attachScores(box, card) {
  const bar = document.createElement('div');
  bar.className = 'scores';
  box.appendChild(bar);
  const wait = document.createElement('span');
  wait.className = 'score-note';
  wait.textContent = 'Scoring…';
  bar.appendChild(wait);
  getScore(card).then((r) => {
    if (!bar.isConnected) return;
    if (r.error === 'skip') { bar.remove(); return; }
    if (!r.scores) { wait.textContent = `Scores unavailable: ${r.error}`; return; }
    const small = document.createElement('div');
    small.className = 'score-small';
    for (const [k, label] of SMALL_SCORES) small.appendChild(chip('s-chip', r.scores[k], label));
    bar.replaceChildren(chip('s-main', r.scores.overall, 'Overall'), small);
    updateDot(box.closest('.card'));
  });
}

function addBadge(box, text) {
  const b = document.createElement('div');
  b.className = 'badge';
  b.textContent = text;
  box.appendChild(b);
}

// ---------- cards ----------
function makeCard(card, index, role) {
  const el = document.createElement('div');
  el.className = `card ${role}`;
  el.dataset.id = card.id;
  el.innerHTML = `
    <div class="media"><div class="spinner"></div></div>
    <div class="stamp save">SELECT</div>
    <div class="stamp del">DELETE</div>
    <div class="meta"><div class="name"></div><div class="info"></div></div>`;
  el.querySelector('.name').textContent = card.name;
  const info = el.querySelector('.info');
  const exts = card.files.map((f) => (f.ext.replace('.', '') || 'file').toUpperCase()).join(' + ');
  for (const t of [exts, fmtSize(card.size), `${index + 1} of ${state.cards.length}`]) {
    const s = document.createElement('span');
    s.textContent = t;
    info.appendChild(s);
  }
  getPreview(card).then((p) => { if (el.isConnected) fillMedia(el, card, p); });
  return el;
}

function render(enterFrom) {
  updateStats();
  const stage = $('#stage');
  stage.replaceChildren();
  stage.style.setProperty('--tint', 0);
  if (state.i >= state.cards.length) { finish(); return; }
  const next = state.cards[state.i + 1];
  if (next) stage.appendChild(makeCard(next, state.i + 1, 'next'));
  const top = makeCard(state.cards[state.i], state.i, 'top');
  if (enterFrom) top.classList.add(`back-${enterFrom}`);
  stage.appendChild(top);
  attachDrag(top);
  prefetch();
  updateDot($('#stage .card.top'));
}

function advance() {
  const stage = $('#stage');
  stage.querySelector('.card.top')?.remove();
  stage.style.setProperty('--tint', 0);
  updateStats();
  if (state.i >= state.cards.length) { finish(); return; }
  const top = stage.querySelector('.card.next');
  if (!top || top.dataset.id !== state.cards[state.i].id) { render(); return; }
  top.classList.replace('next', 'top');
  attachDrag(top);
  const v = top.querySelector('video');
  if (v) { v.muted = muted; v.play().catch(() => {}); }
  const n = state.cards[state.i + 1];
  if (n) stage.insertBefore(makeCard(n, state.i + 1, 'next'), top);
  prefetch();
  updateDot($('#stage .card.top'));
}

function setDrag(el, dx, dy) {
  el.style.transform = dx || dy ? `translate(${dx}px, ${dy * 0.25}px) rotate(${dx / 22}deg)` : '';
  const k = Math.max(-1, Math.min(1, dx / 140));
  el.style.setProperty('--save-o', Math.max(0, k));
  el.style.setProperty('--del-o', Math.max(0, -k));
  $('#stage').style.setProperty('--tint', k);
}

function attachDrag(el) {
  let sx = 0, sy = 0, dx = 0, dy = 0, down = false, moved = false;
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || state.busy) return;
    down = true; moved = false; dx = dy = 0;
    sx = e.clientX; sy = e.clientY;
    el.setPointerCapture(e.pointerId);
    el.classList.add('grabbing');
    el.style.transition = 'none';
  });
  el.addEventListener('pointermove', (e) => {
    if (!down) return;
    dx = e.clientX - sx;
    dy = e.clientY - sy;
    if (Math.hypot(dx, dy) > 5) moved = true;
    setDrag(el, dx, dy);
  });
  const release = (cancelled) => {
    if (!down) return;
    down = false;
    el.classList.remove('grabbing');
    const threshold = Math.min(140, el.offsetWidth * 0.2);
    if (!cancelled && dx > threshold) decide('right');
    else if (!cancelled && dx < -threshold) decide('left');
    else {
      el.style.transition = '';
      setDrag(el, 0, 0);
      if (!moved && !cancelled) togglePlay();
    }
  };
  el.addEventListener('pointerup', () => release(false));
  el.addEventListener('pointercancel', () => release(true));
}

// ---------- decisions ----------
function pulse(dir) {
  const b = dir === 'right' ? $('#btnSave') : $('#btnDel');
  b.classList.add('pulse');
  setTimeout(() => b.classList.remove('pulse'), 180);
}

let moveChain = Promise.resolve();

function decide(dir) {
  if (state.busy || state.i >= state.cards.length) return;
  const index = state.i;
  const card = state.cards[index];
  const el = $('#stage .card.top');
  pulse(dir);
  if (el) {
    el.querySelector('video')?.pause();
    el.classList.replace('top', 'leaving');
    const sign = dir === 'right' ? 1 : -1;
    el.style.transition = 'transform .2s ease-in, opacity .2s ease-in';
    el.style.transform = `translate(${sign * window.innerWidth}px, 40px) rotate(${sign * 22}deg)`;
    el.style.opacity = '0';
    el.style.setProperty(dir === 'right' ? '--save-o' : '--del-o', 1);
    setTimeout(() => el.remove(), 230);
  }

  // Count it now so the next photo shows instantly; the move happens in the background.
  const from = card.files.map((f) => f.path);
  const entry = { index, dir, moves: null, xp: (dir === 'left' ? 2 : 1) * (typeof xpMult === 'function' ? xpMult() : 1) };
  entry.done = moveChain.then(() => api.move(from, dir)).then((moves) => {
    entry.moves = moves;
    card.files.forEach((f, j) => { if (moves[j]) f.path = moves[j].to; });
    previewCache.delete(card.id);
  }, (err) => {
    // Move failed: the file stayed where it was. Take the swipe back out of the counts.
    const k = state.history.indexOf(entry);
    if (k >= 0) state.history.splice(k, 1);
    state.decisions.delete(index);
    if (dir === 'right') state.saved--; else state.deleted--;
    addXp(-entry.xp);
    trackSwipe(dir, -1);
    updateStats();
    toast(`Couldn’t move ${card.name}: ${cleanError(err)}. It stayed in place.`);
    throw err;
  });
  moveChain = entry.done.catch(() => {});

  state.history.push(entry);
  if (state.history.length > UNDO_LIMIT) state.history.shift();   // only the last 5 can be undone
  state.decisions.set(index, dir);
  if (dir === 'right') state.saved++; else state.deleted++;
  state.i++;
  addXp(entry.xp);
  trackSwipe(dir, 1);
  advance();
  swipeFx(dir, entry.xp, popSpot($('#stage .card.top') || el, dir));
}

async function undo() {
  if (state.busy) return;
  const last = state.history.pop();
  if (!last) { toast(state.i > 0 ? `You can only go back ${UNDO_LIMIT}` : 'Nothing to undo yet'); return; }
  state.busy = true;
  try {
    const moved = await last.done.then(() => true, () => false);
    if (!moved) { state.busy = false; state.i = last.index; show('swipe'); render(last.dir); return; }
    const restored = await api.undo(last.moves);
    const card = state.cards[last.index];
    card.files.forEach((f, j) => { if (restored[j]) f.path = restored[j]; });
    previewCache.delete(card.id);
    state.i = last.index;
    state.decisions.delete(last.index);
    if (last.dir === 'right') state.saved--; else state.deleted--;
    addXp(-last.xp);
    trackSwipe(last.dir, -1);
    game.streak = 0; game.cutRun = 0;
    state.busy = false;
    show('swipe');
    render(last.dir);
  } catch (err) {
    state.history.push(last);
    state.busy = false;
    toast(`Couldn’t undo: ${cleanError(err)}`);
  }
}

function topVideo() { return $('#stage .card.top video'); }
function togglePlay() {
  const v = topVideo();
  if (!v) return;
  if (v.paused) v.play().catch(() => {}); else v.pause();
}
function toggleMute() {
  muted = !muted;
  const v = topVideo();
  if (v) {
    v.muted = muted;
    const badge = v.parentElement.querySelector('.badge');
    if (badge) badge.textContent = muted ? 'Video  ·  muted (M)' : 'Video  ·  sound on (M)';
  }
}

function finish() {
  show('done');
  folderCleared();
  updateStats();
  const s = state.saved, d = state.deleted;
  $('#summary').textContent =
    `${s} ${s === 1 ? 'item' : 'items'} moved to Selected, ${d} moved to Delete. Nothing is erased until you empty the Delete folder.`;
}

$('#btnDel').addEventListener('click', () => decide('left'));
$('#btnSave').addEventListener('click', () => decide('right'));
$('#btnUndo').addEventListener('click', undo);
$('#undoLast').addEventListener('click', undo);
$('#openSave').addEventListener('click', async () => {
  if (!(await api.openFolder(state.folders, 'Selected'))) toast('No Selected folder yet');
});
$('#openDelete').addEventListener('click', async () => {
  if (!(await api.openFolder(state.folders, 'Delete'))) toast('No Delete folder yet');
});
$('#trashDelete').addEventListener('click', async () => {
  try {
    const n = await api.trashDelete(state.folders);
    if (n === 0) toast('No Delete folder to move');
    else if (n > 0) {
      state.history = state.history.filter((h) => h.dir !== 'left');
      toast('Delete folder moved to Trash');
    }
  } catch (err) {
    toast(`Couldn’t move to Trash: ${cleanError(err)}`);
  }
});

window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (document.querySelector('.modal:not([hidden])')) { if (e.key === 'Escape') closeModals(); return; }
  const onSwipe = !$('#swipe').hidden;
  const onDone = !$('#done').hidden;
  if ((e.key === 'z' || e.key === 'Z' || e.key === 'ArrowUp') && (onSwipe || onDone)) {
    e.preventDefault();
    if (!e.repeat) undo();
    return;
  }
  if (!onSwipe || e.repeat) return;
  if (e.key === 'ArrowLeft') { e.preventDefault(); decide('left'); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); decide('right'); }
  else if (e.key === ' ') { e.preventDefault(); togglePlay(); }
  else if (e.key === 'm' || e.key === 'M') toggleMute();
});

