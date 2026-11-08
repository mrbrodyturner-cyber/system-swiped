'use strict';
/* Career layer (loaded after game.js): levels + ranks, daily streak, daily/weekly challenges, Game Day 2x XP,
   gear crates, personal records, recent projects, 300 long-haul badges, Hall of History browser, home turntable.
   Hooks game.js by overriding its global functions; everything is offline and cheap per swipe. */

// ---------------- state ----------------
const DAY_MS = 86400000;
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const weekKey = (d = new Date()) => { const m = new Date(d); m.setHours(0, 0, 0, 0); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return dayKey(m); };
const C = {
  loaded: false,
  dayStreak: 0, dayStreakBest: 0, lastDay: '',
  day: { date: '', sorted: 0, deleted: 0, selected: 0, cleared: 0, streak: 0, fast: 0, lowKeep: 0, big: 0, xp: 0, done: [] },
  week: { key: '', sorted: 0, deleted: 0, cleared: 0, days: [], done: [] },
  projects: [],
  rec: { fastest100: 0, bestKeep: 0, activeMs: 0, biggest: 0 },
  crates: 1, crateMark: -1, cratesOpened: 0, boost: 0,
  n: { night: 0, early: 0, weekend: 0, gameday: 0, challenges: 0, perfect: 0, weeks: 0, bigFolders: 0, lowKeep: 0 },
};
let swipeTimes = [], lastSwipeAt = 0, project = null;

// ---------------- levels & ranks ----------------
const levelXp = (n) => (n <= 1 ? 0 : Math.round(60 * Math.pow(n, 1.75)));       // total lifetime XP needed for level n
function levelOf(xp) { let n = 1; while (levelXp(n + 1) <= xp) n++; return n; }
const RANKS = [[1, 'Rookie'], [5, 'Walk-On'], [10, 'JV'], [15, 'Varsity'], [20, 'Starter'], [25, 'Team Captain'], [30, 'All-Conference'], [40, 'All-State'],
  [50, 'All-American'], [60, 'Draft Pick'], [70, 'Pro'], [80, 'All-Pro'], [90, 'MVP'], [100, 'Hall of Famer'], [125, 'Legend'], [150, 'GOAT']];
const rankOf = (lvl) => RANKS.filter(([n]) => lvl >= n).pop()[1];

// ---------------- Game Day + boosts ----------------
const isGameDay = () => new Date().getDay() === 6;   // Saturday
function xpMult() { return (isGameDay() ? 2 : 1) * (C.boost > 0 ? 2 : 1); }

// ---------------- challenges ----------------
function rng(seedStr) { let h = 2166136261; for (const ch of seedStr) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296; }
const DAILY_POOL = [
  { id: 'cut', key: 'deleted', ns: [100, 150, 250, 400], txt: (n) => `Cut ${n} frames`, xp: (n) => Math.round(n * 0.4) },
  { id: 'sort', key: 'sorted', ns: [150, 250, 400, 600], txt: (n) => `Sort ${n} photos`, xp: (n) => Math.round(n * 0.3) },
  { id: 'keep', key: 'selected', ns: [30, 50, 80], txt: (n) => `Pick ${n} keepers`, xp: (n) => n },
  { id: 'clear', key: 'cleared', ns: [1, 2], txt: (n) => n === 1 ? 'Clear a folder' : `Clear ${n} folders`, xp: (n) => 80 * n },
  { id: 'streak', key: 'streak', ns: [25, 50, 100], txt: (n) => `Hit a ${n}-swipe streak`, xp: (n) => n + 20 },
  { id: 'fast', key: 'fast', ns: [1], txt: () => 'Clear a 50+ photo folder in under 15 min', xp: () => 120 },
  { id: 'lowkeep', key: 'lowKeep', ns: [1], txt: () => 'Keep under 20% of a 100+ photo folder', xp: () => 100 },
];
const WEEKLY_POOL = [
  { id: 'wsort', key: 'sorted', ns: [1500, 2500, 4000], txt: (n) => `Sort ${n.toLocaleString()} photos this week`, xp: (n) => Math.round(n * 0.2) },
  { id: 'wcut', key: 'deleted', ns: [1000, 2000, 3000], txt: (n) => `Cut ${n.toLocaleString()} frames this week`, xp: (n) => Math.round(n * 0.25) },
  { id: 'wclear', key: 'cleared', ns: [3, 5, 8], txt: (n) => `Clear ${n} folders this week`, xp: (n) => n * 60 },
  { id: 'wdays', key: 'days', ns: [3, 5], txt: (n) => `Sort on ${n} different days`, xp: (n) => n * 70 },
];
function pick(pool, count, seed) {
  const r = rng(seed), list = pool.slice(), out = [];
  while (out.length < count && list.length) { const p = list.splice(Math.floor(r() * list.length), 1)[0]; out.push({ ...p, n: p.ns[Math.floor(r() * p.ns.length)] }); }
  return out;
}
const dailies = () => pick(DAILY_POOL, 3, 'd' + C.day.date);
const weeklies = () => pick(WEEKLY_POOL, 2, 'w' + C.week.key);
function rollPeriods() {
  const today = dayKey(), wk = weekKey();
  if (C.day.date !== today) C.day = { date: today, sorted: 0, deleted: 0, selected: 0, cleared: 0, streak: 0, fast: 0, lowKeep: 0, big: 0, xp: 0, done: [] };
  if (C.week.key !== wk) C.week = { key: wk, sorted: 0, deleted: 0, cleared: 0, days: [], done: [] };
}
const weekVal = (key) => (key === 'days' ? C.week.days.length : C.week[key] || 0);
function checkChallenges() {
  rollPeriods();
  let changed = false;
  for (const c of dailies()) {
    if (C.day.done.includes(c.id) || (C.day[c.key] || 0) < c.n) continue;
    C.day.done.push(c.id); C.n.challenges++; changed = true;
    addXp(c.xp(c.n)); splashCenter(`Challenge done · +${c.xp(c.n)} XP`);
    if (C.day.done.length === 3) { C.n.perfect++; setTimeout(() => splashCenter('Perfect day! All 3 dailies'), 1700); }
  }
  for (const c of weeklies()) {
    if (C.week.done.includes(c.id) || weekVal(c.key) < c.n) continue;
    C.week.done.push(c.id); C.n.challenges++; changed = true;
    addXp(c.xp(c.n)); splashCenter(`Weekly done · +${c.xp(c.n)} XP`);
    if (C.week.done.length === 2) C.n.weeks++;
  }
  if (changed) { renderChallenges(); checkBadges(false); }
}

// ---------------- 300 long-haul badges: 25 families x 12 tiers ----------------
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
const rigScoreNow = () => (game.rig.body ? rigStats().score : 0);
const timeSavedH = () => Math.max(0, (game.stats.sorted * 3.5 * 1000 - C.rec.activeMs) / 3600000);
const FAMILIES = [
  { fam: 'Volume Dealer', last: 'The Millionaire', icon: '◆', get: () => game.stats.sorted, t: [2500, 7500, 15000, 30000, 60000, 100000, 150000, 250000, 400000, 600000, 800000, 1000000], d: (n) => `Sort ${n.toLocaleString()} photos` },
  { fam: 'Cutting Machine', last: 'Thanos Snap', icon: '✕', get: () => game.stats.deleted, t: [2000, 5000, 12000, 25000, 50000, 80000, 120000, 200000, 300000, 450000, 600000, 750000], d: (n) => `Delete ${n.toLocaleString()} photos` },
  { fam: 'Gallery Curator', last: 'Museum Grade', icon: '✓', get: () => game.stats.selected, t: [1000, 2500, 5000, 10000, 20000, 35000, 50000, 75000, 100000, 150000, 200000, 300000], d: (n) => `Select ${n.toLocaleString()} keepers` },
  { fam: 'Clean Sheets', last: 'Inbox Zero Forever', icon: '🏁', get: () => game.stats.cleared, t: [25, 75, 150, 250, 400, 600, 800, 1000, 1500, 2000, 3000, 5000], d: (n) => `Clear ${n.toLocaleString()} folders` },
  { fam: 'Flow State', last: 'Unbreakable', icon: '⚡', get: () => game.stats.bestStreak, t: [400, 500, 650, 800, 1000, 1250, 1500, 2000, 2500, 3000, 4000, 5000], d: (n) => `${n.toLocaleString()} quick swipes in a row` },
  { fam: 'Daily Grind', last: '365 Club', icon: '🔥', get: () => C.dayStreakBest, t: [3, 7, 14, 21, 30, 45, 60, 90, 120, 180, 270, 365], d: (n) => `Sort photos ${n} days in a row` },
  { fam: 'Climbing the Ranks', last: 'Century', icon: '▲', get: () => levelOf(game.lifetime), t: [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 90, 100], d: (n) => `Reach level ${n}` },
  { fam: 'XP Baron', last: 'XP Emperor', icon: '★', get: () => game.lifetime, t: [5000, 10000, 25000, 50000, 75000, 100000, 150000, 250000, 400000, 600000, 800000, 1000000], d: (n) => `Earn ${n.toLocaleString()} lifetime XP` },
  { fam: 'Quest Log', last: 'Side Quest Supreme', icon: '!', get: () => C.n.challenges, t: [5, 15, 30, 60, 100, 150, 250, 400, 600, 800, 1000, 1500], d: (n) => `Complete ${n} challenges` },
  { fam: 'Perfect Game', last: 'Flawless Season', icon: '◎', get: () => C.n.perfect, t: [1, 3, 7, 14, 30, 50, 75, 100, 150, 200, 300, 365], d: (n) => `Finish all 3 dailies on ${n} days` },
  { fam: 'Week Warrior', last: 'Three-Year Starter', icon: '▣', get: () => C.n.weeks, t: [1, 2, 4, 8, 12, 16, 26, 39, 52, 78, 104, 156], d: (n) => `Finish both weeklies ${n} times` },
  { fam: 'Loot Goblin', last: 'Crate Kingpin', icon: '▦', get: () => C.cratesOpened, t: [1, 3, 5, 10, 20, 35, 50, 75, 100, 150, 200, 300], d: (n) => `Open ${n} gear crates` },
  { fam: 'Gear Acquisition Syndrome', last: 'Owns the Store', icon: '⚙', get: () => game.owned.length, t: [8, 12, 16, 20, 25, 30, 40, 50, 60, 70, 80, 90], d: (n) => `Own ${n} pieces of gear` },
  { fam: 'Set Designer', last: 'Every Backdrop', icon: '▤', get: () => game.bgs.length, t: [3, 5, 10, 20, 35, 50, 75, 100, 150, 200, 250, 313], d: (n) => `Own ${n} backgrounds` },
  { fam: 'Spec Sheet', last: 'Maxed Out', icon: '◈', get: rigScoreNow, t: [55, 60, 65, 70, 74, 78, 82, 85, 88, 91, 94, 97], d: (n) => `Reach a rig score of ${n}` },
  { fam: 'Rig Money', last: 'Studio on Sticks', icon: '$', get: () => (game.rig.body ? rigValue() : 0), t: [3000, 5000, 7500, 10000, 12500, 15000, 20000, 25000, 30000, 35000, 40000, 45000], d: (n) => `Build a $${n.toLocaleString()} rig` },
  { fam: 'Night Owl', last: 'Vampire Editor', icon: '☾', get: () => C.n.night, t: [100, 500, 1000, 2500, 5000, 10000, 20000, 35000, 50000, 75000, 100000, 150000], d: (n) => `Sort ${n.toLocaleString()} photos between midnight and 5am` },
  { fam: 'Early Bird', last: 'Sunrise Shooter', icon: '☀', get: () => C.n.early, t: [100, 500, 1000, 2500, 5000, 10000, 20000, 35000, 50000, 75000, 100000, 150000], d: (n) => `Sort ${n.toLocaleString()} photos between 5 and 8am` },
  { fam: 'Weekend Warrior', last: 'Saturday Legend', icon: '◐', get: () => C.n.weekend, t: [500, 2000, 5000, 10000, 20000, 40000, 60000, 90000, 125000, 175000, 250000, 350000], d: (n) => `Sort ${n.toLocaleString()} photos on weekends` },
  { fam: 'Game Day Grinder', last: 'Prime Time Player', icon: '🏈', get: () => C.n.gameday, t: [250, 1000, 2500, 5000, 10000, 20000, 35000, 50000, 75000, 100000, 150000, 200000], d: (n) => `Sort ${n.toLocaleString()} photos on Game Day` },
  { fam: 'Speed Demon', last: 'Light Speed', icon: '⏱', lower: true, get: () => (C.rec.fastest100 ? C.rec.fastest100 / 1000 : Infinity), t: [150, 120, 100, 90, 80, 70, 60, 55, 50, 45, 40, 35], d: (n) => `Sort 100 photos in under ${n}s` },
  { fam: 'Time Served', last: 'Ten Thousand Hours', icon: '⌛', get: () => C.rec.activeMs / 3600000, t: [5, 10, 25, 50, 75, 100, 150, 200, 300, 400, 500, 750], d: (n) => `Spend ${n} hours culling` },
  { fam: 'Card Dump Crusher', last: 'Mega Card Monster', icon: '▥', get: () => C.n.bigFolders, t: [1, 3, 5, 10, 20, 30, 50, 75, 100, 150, 200, 300], d: (n) => `Clear ${n} folders of 1,000+ photos` },
  { fam: 'Cold Blooded', last: 'Ice in the Veins', icon: '❄', get: () => C.n.lowKeep, t: [1, 3, 5, 10, 20, 35, 50, 75, 100, 150, 200, 300], d: (n) => `Keep under 15% of a 200+ photo folder, ${n} times` },
  { fam: 'Efficiency Expert', last: 'Saved a Lifetime', icon: '⌁', get: timeSavedH, t: [1, 5, 10, 25, 50, 100, 150, 250, 400, 600, 800, 1000], d: (n) => `Save an estimated ${n} hours vs. 3.5s per photo` },
];
for (const f of FAMILIES) f.t.forEach((n, i) => BADGES.push({ id: `f-${f.fam}-${i}`, fam: f.fam, tier: i, n, lower: !!f.lower, get: f.get, icon: f.icon, name: i === 11 ? f.last : `${f.fam} ${ROMAN[i]}`, desc: f.d(n) }));
const badgeVal = (b) => (b.get ? b.get() : statValue(b.stat));
const badgeMet = (b) => (b.lower ? badgeVal(b) <= b.n : badgeVal(b) >= b.n);

// ---------------- overrides of game.js ----------------
const _saveGame = saveGame;
saveGame = function () {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (!C.loaded) return;   // never overwrite career data before it has loaded
    const { xp, lifetime, brands, owned, rig, bg, bgs, badges, stats } = game;
    const { loaded, ...career } = C;
    api.saveProgress({ v: 2, xp, lifetime, brands, owned, rig, bg, bgs, badges, stats, career }).catch(() => {});
  }, 400);
};
void _saveGame;
checkBadges = function (quiet) {
  let got = 0;
  for (const b of BADGES) {
    if (game.badges.includes(b.id) || !badgeMet(b)) continue;
    game.badges.push(b.id); got++;
    if (!quiet) game.milestone = { text: b.name, badge: true };
  }
  if (got) { renderHall(); if (!quiet) saveGame(); }
};
const _addXp = addXp;
addXp = function (n) {
  const lvl = levelOf(game.lifetime);
  _addXp(n);
  if (n > 0) {
    if (C.crateMark < 0) C.crateMark = Math.floor(game.lifetime / 1000);
    while (Math.floor(game.lifetime / 1000) > C.crateMark) { C.crateMark++; C.crates++; game.milestone = { text: 'GEAR CRATE EARNED!' }; }
    const nl = levelOf(game.lifetime);
    if (nl > lvl) { game.milestone = { text: `LEVEL ${nl}!` }; setTimeout(() => splashCenter(`Level ${nl} · ${rankOf(nl)}`), 50); }
  }
  renderPlayer();
};
const _trackSwipe = trackSwipe;
trackSwipe = function (dir, k) {
  rollPeriods();
  const now = Date.now(), d = new Date(), h = d.getHours(), wd = d.getDay();
  if (k > 0) {
    // daily streak
    const today = dayKey();
    if (C.lastDay !== today) {
      C.dayStreak = C.lastDay === dayKey(new Date(now - DAY_MS)) ? C.dayStreak + 1 : 1;
      C.lastDay = today; C.dayStreakBest = Math.max(C.dayStreakBest, C.dayStreak);
    }
    if (!C.week.days.includes(today)) C.week.days.push(today);
    // active time (gaps over 15s count as a break)
    const gap = now - lastSwipeAt; lastSwipeAt = now;
    if (gap < 15000) { C.rec.activeMs += gap; if (project) project.ms += gap; }
    // fastest 100
    swipeTimes.push(now); if (swipeTimes.length > 100) swipeTimes.shift();
    if (swipeTimes.length === 100) { const t = now - swipeTimes[0]; if (!C.rec.fastest100 || t < C.rec.fastest100) C.rec.fastest100 = t; }
    if (h < 5) C.n.night++; else if (h < 8) C.n.early++;
    if (wd === 0 || wd === 6) C.n.weekend++;
    if (isGameDay()) C.n.gameday++;
    if (C.boost > 0) C.boost--;
  }
  C.day.sorted = Math.max(0, C.day.sorted + k); C.week.sorted = Math.max(0, C.week.sorted + k);
  if (dir === 'left') { C.day.deleted = Math.max(0, C.day.deleted + k); C.week.deleted = Math.max(0, C.week.deleted + k); }
  else C.day.selected = Math.max(0, C.day.selected + k);
  C.day.streak = Math.max(C.day.streak, game.streak + (k > 0 ? 1 : 0));
  if (project) { project.sorted = Math.max(0, project.sorted + k); if (dir === 'left') project.cut = Math.max(0, project.cut + k); else project.kept = Math.max(0, project.kept + k); project.left = Math.max(0, state.cards.length - state.i); project.at = now; project.xp = Math.max(0, project.xp + k * (dir === 'left' ? 2 : 1)); }
  _trackSwipe(dir, k);
  if (k > 0) checkChallenges();
  renderChallengesLite();
};
const _folderCleared = folderCleared;
folderCleared = function () {
  if (game.clearedThis) return;
  rollPeriods();
  C.day.cleared++; C.week.cleared++;
  if (project) {
    const total = project.sorted, keep = total ? project.kept / total : 1;
    project.left = 0; project.done = true;
    if (total >= 50 && project.ms < 15 * 60000) C.day.fast = 1;
    if (total >= 100 && keep < 0.2) C.day.lowKeep = 1;
    if (total >= 1000) C.n.bigFolders++;
    if (total >= 200 && keep < 0.15) C.n.lowKeep++;
    if (total >= 100 && (!C.rec.bestKeep || keep < C.rec.bestKeep)) C.rec.bestKeep = keep;
    C.rec.biggest = Math.max(C.rec.biggest, total);
  }
  _folderCleared();
  checkChallenges();
};
const _load2 = load;
load = async function (paths) {
  swipeTimes = []; lastSwipeAt = 0;
  await _load2(paths);
  if (!state.cards.length) return;
  const id = state.folders.slice().sort().join('|');
  project = C.projects.find((p) => p.id === id);
  if (!project) { project = { id, name: state.folders.map((f) => f.split('/').pop()).join(' + '), paths, sorted: 0, kept: 0, cut: 0, ms: 0, xp: 0, start: Date.now() }; C.projects.unshift(project); }
  else { C.projects.splice(C.projects.indexOf(project), 1); C.projects.unshift(project); project.paths = paths; project.done = false; }
  project.left = state.cards.length; project.at = Date.now();
  C.projects = C.projects.slice(0, 12);
  saveGame();
};
const _renderAll = renderAll;
renderAll = function () { _renderAll(); renderPlayer(); renderChallenges(); renderRecent(); renderRecords(); renderTeaser(); };

// ---------------- rendering ----------------
const fmt = (n) => Math.round(n).toLocaleString();
function renderPlayer() {
  const el = $('#playerCard');
  if (!el) return;
  const lvl = levelOf(game.lifetime), a = levelXp(lvl), b = levelXp(lvl + 1);
  const pct = Math.min(100, ((game.lifetime - a) / (b - a)) * 100);
  if (!el.dataset.built) {
    el.dataset.built = '1';
    el.innerHTML = `<div class="pc-emblem"><b id="pcLvl"></b><span>LVL</span></div>
      <div class="pc-main"><div class="pc-rank" id="pcRank"></div><div class="pc-bar"><i id="pcFill"></i></div><div class="pc-sub" id="pcSub"></div></div>
      <div class="pc-chip pc-streak" title="Days in a row with at least one swipe"><b id="pcStreak"></b><span>day streak</span></div>
      <div class="pc-chip pc-gameday" id="pcGame"></div>
      <button class="pc-chip pc-crate" id="pcCrate" title="Open a gear crate"><b id="pcCrates"></b><span>crates</span></button>`;
    $('#pcCrate').addEventListener('click', openCrate);
  }
  $('#pcLvl').textContent = lvl;
  $('#pcRank').textContent = rankOf(lvl);
  $('#pcFill').style.width = `${pct}%`;
  $('#pcSub').textContent = `${fmt(game.lifetime - a)} / ${fmt(b - a)} XP to level ${lvl + 1} · ${fmt(game.lifetime)} lifetime`;
  $('#pcStreak').textContent = `🔥 ${C.dayStreak}`;
  const gd = $('#pcGame');
  const mult = xpMult();
  gd.hidden = mult === 1;
  gd.innerHTML = mult > 1 ? `<b>${mult}× XP</b><span>${isGameDay() ? 'Game Day' : ''}${isGameDay() && C.boost ? ' + ' : ''}${C.boost ? `boost · ${C.boost} left` : ''}</span>` : '';
  $('#pcCrates').textContent = C.crates;
  $('#pcCrate').classList.toggle('has', C.crates > 0);
}
function chRow(c, val, done, weekly) {
  const pct = Math.min(100, (val / c.n) * 100);
  return `<div class="ch${done ? ' done' : ''}"><div class="ch-top"><span>${c.txt(c.n)}</span><em>+${c.xp(c.n)} XP</em></div>
    <div class="goal-track"><i style="width:${pct}%"></i></div><div class="ch-sub">${done ? 'Complete' : `${fmt(Math.min(val, c.n))} / ${fmt(c.n)}`}${weekly ? ' · this week' : ''}</div></div>`;
}
function renderChallenges() {
  const el = $('#challenges');
  if (!el) return;
  rollPeriods();
  const tomorrow = new Date(); tomorrow.setHours(24, 0, 0, 0);
  const hrs = Math.ceil((tomorrow - Date.now()) / 3600000);
  el.innerHTML = `<div class="panel-h">Challenges <em>resets in ${hrs}h</em></div>
    ${dailies().map((c) => chRow(c, C.day[c.key] || 0, C.day.done.includes(c.id))).join('')}
    <div class="ch-div">Weekly</div>
    ${weeklies().map((c) => chRow(c, weekVal(c.key), C.week.done.includes(c.id), true)).join('')}`;
}
let chTimer;
function renderChallengesLite() { if ($('#home').hidden) return; clearTimeout(chTimer); chTimer = setTimeout(renderChallenges, 300); }
function renderRecent() {
  const el = $('#recent');
  if (!el) return;
  const list = C.projects.slice(0, 5);
  el.innerHTML = `<div class="panel-h">Recent projects</div>` + (list.length ? list.map((p, i) => {
    const total = p.sorted + (p.left || 0), pct = total ? Math.round((p.sorted / total) * 100) : 0;
    const keep = p.sorted ? Math.round((p.kept / p.sorted) * 100) : 0;
    const mins = Math.max(1, Math.round(p.ms / 60000));
    return `<button class="rp" data-i="${i}"><div class="rp-top"><b></b><em>${p.done ? 'Cleared' : `${pct}%`}</em></div>
      <div class="goal-track"><i style="width:${p.done ? 100 : pct}%"></i></div>
      <div class="rp-sub">${fmt(p.sorted)} sorted · ${keep}% kept · ${mins} min · +${fmt(p.xp)} XP${p.done ? '' : ' · <u>Resume</u>'}</div></button>`;
  }).join('') : '<p class="muted-s">Your folders show up here so you can jump back in.</p>');
  el.querySelectorAll('.rp').forEach((btn) => {
    const p = list[+btn.dataset.i];
    btn.querySelector('b').textContent = p.name;
    btn.addEventListener('click', () => { if (!p.done && p.paths) load(p.paths); else toast(p.done ? 'That folder is already cleared' : 'Pick those photos again to keep going'); });
  });
}
function renderRecords() {
  const el = $('#records');
  if (!el) return;
  const pace = C.rec.activeMs > 60000 ? (game.stats.sorted / (C.rec.activeMs / 60000)) : 0;
  const tiles = [
    [fmt(game.stats.sorted), 'Photos sorted'],
    [pace ? pace.toFixed(1) : '—', 'Photos / min'],
    [C.rec.fastest100 ? `${(C.rec.fastest100 / 1000).toFixed(1)}s` : '—', 'Fastest 100'],
    [C.rec.bestKeep ? `${Math.round(C.rec.bestKeep * 100)}%` : '—', 'Best keep rate'],
    [`${C.dayStreakBest}`, 'Longest streak (days)'],
    [`${timeSavedH().toFixed(1)}h`, 'Time saved (est.)'],
  ];
  el.innerHTML = tiles.map(([v, l]) => `<div class="rec"><b>${v}</b><span>${l}</span></div>`).join('');
}

// next unlock teaser: your rig with the next item, as a glowing silhouette
function renderTeaser() {
  const el = $('#teaser');
  if (!el) return;
  const g = nextGoal();
  if (!g || !game.rig.body) { el.innerHTML = ''; return; }
  const rig = { ...game.rig };
  if (g.slot === 'side') rig[rig.sideL ? 'sideR' : 'sideL'] = g.id; else rig[g.slot] = g.id;
  if (g.slot === 'body') { for (const k of Object.keys(rig)) if (k !== 'body') delete rig[k]; }
  el.innerHTML = `<div class="teaser-art">${rigPic(rig, 360, 260)}</div>`;
}

// ---------------- hall of history (home card + full browser) ----------------
renderHall = function () {
  const earned = BADGES.filter((b) => game.badges.includes(b.id));
  const chip = (b) => `<div class="badge-chip${game.badges.includes(b.id) ? ' got' : ''}" title="${b.desc}"><i>${b.icon || badgeIcon(b)}</i><span>${b.name}</span></div>`;
  const recent = earned.slice(-6).reverse();
  $('#hallPanel').innerHTML = `<div class="panel-h">Hall of History <em>${earned.length}/${BADGES.length}</em></div>
    <div class="hall-next" id="hallNext"></div>
    <div class="badge-list">${recent.length ? recent.map(chip).join('') : '<p class="muted-s">Sort photos to earn your first badge.</p>'}</div>
    <div class="hall-stats"><div><b>${fmt(game.stats.sorted)}</b>sorted</div><div><b>${fmt(game.stats.deleted)}</b>cut</div><div><b>${game.stats.bestStreak}</b>best streak</div></div>`;
  const show = [...earned.slice(-6).reverse(), ...BADGES.filter((b) => !game.badges.includes(b.id) && !b.fam)].slice(0, 6);
  $('#homeHall').innerHTML = `<div class="panel-h">Hall of History <em>${earned.length}/${BADGES.length}</em></div>
    <div class="badge-row">${show.map(chip).join('')}</div>
    <button class="link hall-all" id="hallAll">View all ${BADGES.length} badges →</button>`;
  $('#hallAll').addEventListener('click', openHall);
  updateHallProgress();
};
function openHall() {
  closeModals();
  const groups = [{ fam: 'Starter badges', list: BADGES.filter((b) => !b.fam) }, ...FAMILIES.map((f) => ({ fam: f.fam, list: BADGES.filter((b) => b.fam === f.fam), f }))];
  $('#hallGrid').innerHTML = groups.map((g) => {
    const got = g.list.filter((b) => game.badges.includes(b.id)).length;
    const next = g.list.find((b) => !game.badges.includes(b.id));
    let prog = '';
    if (next && next.get) { const v = next.get(); const p = next.lower ? (v === Infinity ? 0 : Math.min(100, (next.n / v) * 100)) : Math.min(100, (v / next.n) * 100); prog = `<div class="hf-next"><span>Next: ${next.desc}</span><div class="goal-track"><i style="width:${p}%"></i></div></div>`; }
    return `<div class="hf"><div class="hf-h"><b>${g.fam}</b><em>${got}/${g.list.length}</em></div>${prog}
      <div class="hf-row">${g.list.map((b) => `<div class="hb${game.badges.includes(b.id) ? ' got' : ''}" title="${b.name} — ${b.desc}"><i>${b.icon || badgeIcon(b)}</i><span>${b.fam ? (b.tier === 11 ? '★' : ROMAN[b.tier]) : ''}</span></div>`).join('')}</div></div>`;
  }).join('');
  $('#hallCount').textContent = `${game.badges.length} / ${BADGES.length}`;
  $('#hallModal').hidden = false;
}

// ---------------- gear crates ----------------
function openCrate() {
  if (C.crates <= 0) { toast(`Next crate at ${fmt((C.crateMark + 1) * 1000)} lifetime XP`); return; }
  C.crates--; C.cratesOpened++;
  const r = Math.random();
  let title, sub;
  const unownedBg = BACKGROUNDS.filter((b) => !game.bgs.includes(b.id)).slice(0, 60);
  if (r < 0.5 || !unownedBg.length) {
    const amt = [100, 150, 200, 250, 300, 400, 500, 750][Math.floor(Math.pow(Math.random(), 2) * 8)];
    game.xp += amt; game.lifetime += amt; title = `+${amt} XP`; sub = 'Straight into your bank';
  } else if (r < 0.8) {
    const b = unownedBg[Math.floor(Math.random() * unownedBg.length)];
    game.bgs.push(b.id); title = b.name; sub = 'New background unlocked · equip it in the shop';
  } else {
    C.boost += 250; title = '2× XP Boost'; sub = 'Doubles XP for your next 250 swipes';
  }
  checkBadges(false); saveGame(); renderAll();
  const m = $('#crateModal');
  $('#crateTitle').textContent = title; $('#crateSub').textContent = sub;
  m.classList.remove('opened'); closeModals(); m.hidden = false;
  void m.offsetWidth; m.classList.add('opened');
}

// ---------------- home turntable (pre-rendered frames, ~10fps image swap, home screen only) ----------------
let spin = { key: '', frames: [], i: 0, timer: 0, building: false };
function buildTurntable() {
  if (!window.Rig3D || !game.rig.body) return;
  const key = JSON.stringify(game.rig);
  if (spin.key === key || spin.building) return;
  spin = { key, frames: [], i: 0, timer: spin.timer, building: true };
  const N = window.MOBILE ? 20 : 36, SW = window.MOBILE ? 420 : 560, SH = window.MOBILE ? 340 : 460;
  const idle = window.requestIdleCallback ? (cb) => requestIdleCallback(cb, { timeout: 300 }) : (cb) => setTimeout(cb, 90);
  const step = () => {
    if (spin.key !== key) return;
    const az = 0.62 + (spin.frames.length / N) * Math.PI * 2;
    try { spin.frames.push(window.Rig3D.snapshot(game.rig, SW, SH, az)); } catch { spin.building = false; return; }
    if (spin.frames.length < N) idle(step);
    else spin.building = false;
  };
  idle(step);
}
function tickTurntable() {
  const img = document.querySelector('#homeRig img');
  if (!img || spin.building || spin.frames.length < 2 || $('#home').hidden || document.hidden || !$('#rigModal').hidden) return;
  spin.i = (spin.i + 1) % spin.frames.length;
  img.src = spin.frames[spin.i];
}
setInterval(tickTurntable, 110);
const _renderRig = renderRig;
renderRig = function () { _renderRig(); spin.i = 0; buildTurntable(); renderTeaser(); };

// ---------------- load ----------------
api.loadProgress().then((d) => {
  const c = d && d.career;
  if (c) {
    for (const k of ['dayStreak', 'dayStreakBest', 'crates', 'crateMark', 'cratesOpened', 'boost']) if (typeof c[k] === 'number') C[k] = c[k];
    if (typeof c.lastDay === 'string') C.lastDay = c.lastDay;
    for (const k of ['day', 'week', 'rec', 'n']) if (c[k] && typeof c[k] === 'object') C[k] = { ...C[k], ...c[k] };
    if (Array.isArray(c.projects)) C.projects = c.projects.slice(0, 12);
  }
  // a broken streak shows as 0 until you swipe again
  if (C.lastDay && C.lastDay !== dayKey() && C.lastDay !== dayKey(new Date(Date.now() - DAY_MS))) C.dayStreak = 0;
  if (C.crateMark < 0) C.crateMark = Math.floor((game.lifetime || (d && d.lifetime) || 0) / 1000);
  rollPeriods();
  C.loaded = true;
  const wait = () => (game.loaded ? (checkBadges(true), renderAll()) : setTimeout(wait, 50));
  wait();
}).catch(() => { C.loaded = true; });
// refresh day-based bits when the app comes back after midnight
document.addEventListener('visibilitychange', () => { if (!document.hidden && C.loaded) { rollPeriods(); renderPlayer(); renderChallenges(); } });
for (const b of document.querySelectorAll('[data-close]')) b.addEventListener('click', closeModals);
for (const m of document.querySelectorAll('#hallModal, #crateModal')) m.addEventListener('click', (e) => { if (e.target === m) closeModals(); });
