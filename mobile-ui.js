'use strict';
/* iPhone-specific UI tweaks, loaded after career.js. */
(function () {
  // Done screen: your originals never leave Photos, so nothing needs saving. Rejects go to Recently Deleted
  // through a one-time "Swiped Delete" Shortcut (web apps can't delete from the library themselves).
  const SHORTCUT = 'Swiped Delete';
  const genericName = (n) => /^(image|photo|img)(\s*\(\d+\))?\.\w+$/i.test(n) || /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(n);
  function rejectPayload() {
    const list = api._rejects();
    const names = new Set();
    for (const { name } of list) { names.add(name); names.add(name.replace(/\.[^.]+$/, '')); }
    const times = list.map((r) => r.t).filter((t) => t && t < Date.now() - 10 * 60000);
    const from = times.length ? new Date(Math.min(...times) - 86400000) : new Date('2000-01-01T00:00:00');
    const ymd = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`;
    return { list, text: JSON.stringify({ names: `|${[...names].join('|')}|`, from: ymd, count: list.length }) };
  }
  const ready = () => { try { return localStorage.getItem('ss-delete-ready') === '1'; } catch { return false; } };
  function runDelete(force) {
    if (!ready() && force !== true) { $('#delGuide').hidden = false; return; }   // shortcut has to exist first
    const { list, text } = rejectPayload();
    if (!list.length) { toast('No rejects in this batch'); return; }
    const generic = list.filter((r) => genericName(r.name)).length;
    if (generic > list.length / 2) {
      toast('Your iPhone gave these photos generic names, so the Shortcut can’t match them. Delete them in Photos instead.');
      return;
    }
    try { localStorage.setItem('ss-delete-tried', '1'); } catch {}
    location.href = `shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT)}&input=text&text=${encodeURIComponent(text)}`;
  }
  const swap = (sel) => { const old = $(sel), n = old.cloneNode(true); old.replaceWith(n); return n; };   // drop the desktop click handlers
  const delBtn = swap('#openSave'), setupBtn = swap('#openDelete');
  delBtn.textContent = 'Delete rejects';
  setupBtn.textContent = 'Set up the Delete shortcut';
  delBtn.addEventListener('click', runDelete);
  setupBtn.addEventListener('click', () => { $('#delGuide').hidden = false; });
  const _finish = finish;
  finish = function () {
    _finish();
    const keep = state.saved, cut = state.deleted;
    delBtn.textContent = cut ? `Delete ${cut} reject${cut === 1 ? '' : 's'}` : 'No rejects';
    delBtn.disabled = !cut;
    let tried = false; try { tried = localStorage.getItem('ss-delete-tried') === '1'; } catch {}
    $('#summary').textContent = `${keep} kept, ${cut} cut. Your keepers are already in Photos, nothing to save. ` +
      (cut ? `Tap Delete to move the ${cut} reject${cut === 1 ? '' : 's'} to Recently Deleted (iPhone asks you to confirm).${tried ? '' : ' First time? Set up the Delete shortcut once (2 minutes).'}` : '');
  };
  // one-time setup guide for the Shortcut
  const guide = document.createElement('div');
  guide.id = 'delGuide'; guide.className = 'modal'; guide.hidden = true;
  guide.innerHTML = `<div class="modal-box del-box">
    <div class="shop-head"><h2>Set up “Delete rejects”</h2><button class="ghost small" data-close-del>Close</button></div>
    <p class="shop-sub">iPhone doesn’t let web apps delete photos, but its <b>Shortcuts</b> app can. Build this once and the Delete button sends your rejects to <b>Recently Deleted</b> (you can still recover them for 30 days). <b>Experimental:</b> it matches photos by file name.</p>
    <ol class="del-steps">
      <li>Open the <b>Shortcuts</b> app, tap <b>+</b>, then tap the name at the top and rename it to exactly <code>Swiped Delete</code> (capital S and D, one space). If the name doesn’t match, Shortcuts says “Could not find the shortcut”.</li>
      <li>Add <b>Get Dictionary from Input</b>. It uses <i>Shortcut Input</i> automatically.</li>
      <li>Add <b>Get Dictionary Value</b> and set the key to <code>names</code>.</li>
      <li>Add another <b>Get Dictionary Value</b>, key <code>from</code>. Tap its blue input and pick <b>Dictionary</b> (from step 2).</li>
      <li>Add <b>Find Photos</b> → <b>Add Filter</b> → <b>Creation Date</b> → <b>is after</b> → pick the <code>from</code> value.</li>
      <li>Add <b>Repeat with Each</b> and set it to <b>Photos</b>.</li>
      <li>Inside the repeat, add <b>Get Name</b> (of <i>Repeat Item</i>).</li>
      <li>Add <b>Text</b> and type <code>|</code>, insert the <b>Name</b> variable, then type <code>|</code> again (no spaces).</li>
      <li>Add <b>If</b>: pick the <code>names</code> value → <b>contains</b> → the <b>Text</b> from step 8.</li>
      <li>Inside the If, add <b>Add to Variable</b>: input <i>Repeat Item</i>, variable name <code>Rejects</code>.</li>
      <li>Below <b>End Repeat</b>, add <b>Delete Photos</b> and set it to <code>Rejects</code>.</li>
      <li>Done. The first run asks for Photos access: tap <b>Allow</b>. Every run asks you to confirm the delete.</li>
    </ol>
    <p class="shop-sub">After that, just tap <b>Delete rejects</b> at the end of a batch. Shortcuts opens, deletes, and you swipe back to Swiped.</p>
    <button class="primary del-done" id="delReady">I built it, delete now</button>
    <button class="ig-skip" data-close-del>Not now</button>
  </div>`;
  document.body.appendChild(guide);
  guide.querySelectorAll('[data-close-del]').forEach((b) => b.addEventListener('click', () => { guide.hidden = true; }));
  guide.querySelector('#delReady').addEventListener('click', () => {
    try { localStorage.setItem('ss-delete-ready', '1'); } catch {}
    guide.hidden = true;
    if (state.deleted) runDelete(true); else toast('Saved. The Delete button will run the shortcut from now on.');
  });
  guide.addEventListener('click', (e) => { if (e.target === guide) guide.hidden = true; });
  $('#trashDelete').hidden = true;
  $('#again').textContent = 'Pick more photos';
  $('#choose').textContent = 'Choose photos…';
  // batch helpers: a whole-folder picker (Files app / SD card) and the drag-select tip for Apple's photo picker
  const pot = $('#pot');
  const folderBtn = document.createElement('button');
  folderBtn.className = 'ghost choose-folder'; folderBtn.textContent = 'Or load a folder from Files / SD card';
  folderBtn.addEventListener('click', async () => {
    const keys = await api.pickDir();
    if (keys.length) load(keys); else toast('No photos found. On older iOS, pick the folder’s photos with Choose photos → Choose Files → Select.');
  });
  const tip = document.createElement('div');
  tip.className = 'pick-tip';
  tip.innerHTML = `<b class="pt-h">How to select a whole album fast</b>
    <ol>
      <li>Tap <b>Choose photos…</b> → <b>Photo Library</b>, then open your album under <b>Collections</b>.</li>
      <li>Put your finger on the <b>first photo</b> and <b>slide sideways</b> across 1–2 photos. Don’t lift.</li>
      <li>Now <b>drag down</b>. Every photo you pass gets a checkmark. Hold at the bottom edge and it keeps selecting as it scrolls.</li>
      <li>Lift your finger and tap <b>✓</b> (top right). Give iPhone a few seconds to hand them over.</li>
    </ol>
    <span class="pt-note"><b>Keep each batch to about 200–250 photos.</b> iPhone copies every full-size photo before handing it over, and much bigger selections can stall. Do a big shoot in a few batches; your XP and progress carry over.</span>
    <span class="pt-note">If it scrolls instead of selecting, you moved down too early. Start sideways first. (iPhone doesn’t give web apps a “Select All” button.)</span>`;
  // quick reminder the first few times the picker opens
  $('#choose').addEventListener('click', () => {
    let n = 0; try { n = +localStorage.getItem('ss-pick-hint') || 0; localStorage.setItem('ss-pick-hint', n + 1); } catch {}
    if (n < 3) toast('Tip: touch a photo, slide sideways, then drag down to select many at once');
  }, true);
  const vidBtn = document.createElement('button');
  vidBtn.className = 'ghost choose-videos'; vidBtn.textContent = 'Choose videos…';
  vidBtn.addEventListener('click', async () => { const keys = await api.pickVideos(); if (keys.length) load(keys); });
  $('#choose').after(vidBtn, tip, folderBtn);
  const ver = document.createElement('div');
  ver.className = 'app-ver'; ver.textContent = 'System Swiped · build 11.8-1325';
  $('.dash').appendChild(ver);

  // name each batch by the date the photos were taken instead of a folder
  const _scan = api.scan;
  api.scan = async (keys, pair) => {
    const res = await _scan(keys, pair);
    const t = Math.min(...res.cards.map((c) => c.mtime || Date.now()));
    const d = new Date(isFinite(t) ? t : Date.now());
    res.folders = [`Photos · ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · ${res.cards.length}`];
    return res;
  };
  // picked files can't be reopened later, so recent projects are a record, not a resume button
  const _load = load;
  load = async function (paths) {
    await _load(paths);
    if (typeof project !== 'undefined' && project) { delete project.paths; saveGame(); }
  };

  // ---- first-visit install guide: only in the browser (never in the installed app), only once ----
  (function installGuide() {
    const standalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    let seen = false;
    try { seen = localStorage.getItem('ss-install-guide') === '1'; } catch {}
    const force = /[?&#]install\b/.test(location.href);   // ?install always shows it (for testing)
    if (!force && (standalone || seen)) return;
    // the brand picker waits until the guide is closed
    window.__guideOpen = true;
    const _openOnboard = openOnboard;
    let onboardWanted = false;
    openOnboard = function () { if (window.__guideOpen) { onboardWanted = true; $('#onboard').hidden = true; return; } _openOnboard(); };
    if (!$('#onboard').hidden) { onboardWanted = true; $('#onboard').hidden = true; }
    const ua = navigator.userAgent;
    const iOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const notSafari = /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua);
    const shareIcon = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const addIcon = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    let steps;
    if (iOS && notSafari) {
      steps = `<div class="ig-warn">You’re in a browser that can’t install apps on iPhone. Copy this link and open it in <b>Safari</b>.</div>
        <button class="ghost ig-copy" id="igCopy">Copy link</button>`;
    } else if (iOS) {
      steps = `<ol class="ig-steps">
        <li><i>${shareIcon}</i><div><b>Tap the Share button</b><span>The square with an arrow at the bottom of Safari (top on iPad).</span></div></li>
        <li><i>${addIcon}</i><div><b>Tap “Add to Home Screen”</b><span>Scroll down the share menu if you don’t see it.</span></div></li>
        <li><i class="ig-num">✓</i><div><b>Tap “Add”, then open Swiped</b><span>Use the new icon on your Home Screen. It runs full screen and works offline.</span></div></li>
      </ol>`;
    } else {
      steps = `<div class="ig-warn">This version is made for iPhone. Open this link in <b>Safari on your iPhone</b>, then use Share → Add to Home Screen. On a Mac, use the desktop app instead.</div>`;
    }
    const el = document.createElement('div');
    el.className = 'install-guide';
    el.setAttribute('role', 'dialog');
    el.innerHTML = `<div class="ig-box">
      <img class="ig-icon" src="apple-touch-icon.png" alt="">
      <span class="eyebrow">Welcome to System Swiped</span>
      <h2>Save it as an app</h2>
      <p class="ig-sub">Install it once and it works like a real app: its own icon, full screen, and no internet needed.</p>
      ${steps}
      <button class="primary ig-go" id="igGo">Got it</button>
      <button class="ig-skip" id="igSkip">Just use it in the browser</button>
    </div>`;
    document.body.appendChild(el);
    const done = () => {
      try { localStorage.setItem('ss-install-guide', '1'); } catch {}
      el.remove(); window.__guideOpen = false;
      if (onboardWanted || !game.brands.length) openOnboard();
    };
    el.querySelector('#igGo').addEventListener('click', done);
    el.querySelector('#igSkip').addEventListener('click', done);
    const copy = el.querySelector('#igCopy');
    if (copy) copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(location.href); copy.textContent = 'Copied. Now open Safari'; } catch { copy.textContent = location.href; } });
  })();

  // keyboard hints don't apply on a phone; keep the screen awake-ish feel by blocking rubber-band scroll on the swipe screen
  document.addEventListener('touchmove', (e) => { if (document.body.dataset.screen === 'swipe' && !e.target.closest('.modal')) e.preventDefault(); }, { passive: false });
})();
