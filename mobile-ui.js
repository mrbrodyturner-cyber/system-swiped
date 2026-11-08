'use strict';
/* iPhone-specific UI tweaks, loaded after career.js. */
(function () {
  // Done screen: saving goes through the share sheet, deleting from Photos stays manual (iOS rule)
  const _finish = finish;
  finish = function () {
    _finish();
    const keep = state.saved, cut = state.deleted;   // counts update instantly; file records catch up a moment later
    $('#summary').textContent = `${keep} keeper${keep === 1 ? '' : 's'} and ${cut} reject${cut === 1 ? '' : 's'}. Tap Save keepers, then “Save Images” to put them in Photos (or “Save to Files”). iPhone doesn’t let apps delete from your library, so remove rejects in Photos when you’re ready.`;
  };
  $('#openSave').textContent = 'Save keepers';
  $('#openDelete').textContent = 'Share rejects';
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
      <li>Lift your finger, tap <b>✓</b> (top right), and start swiping.</li>
    </ol>
    <span class="pt-note">If it scrolls instead of selecting, you moved down too early. Start sideways first. (iPhone doesn’t give web apps a “Select All” button.)</span>`;
  // quick reminder the first few times the picker opens
  $('#choose').addEventListener('click', () => {
    let n = 0; try { n = +localStorage.getItem('ss-pick-hint') || 0; localStorage.setItem('ss-pick-hint', n + 1); } catch {}
    if (n < 3) toast('Tip: touch a photo, slide sideways, then drag down to select many at once');
  }, true);
  $('#choose').after(tip, folderBtn);

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
    if (standalone || seen) return;
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
    const done = () => { try { localStorage.setItem('ss-install-guide', '1'); } catch {} el.remove(); };
    el.querySelector('#igGo').addEventListener('click', done);
    el.querySelector('#igSkip').addEventListener('click', done);
    const copy = el.querySelector('#igCopy');
    if (copy) copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(location.href); copy.textContent = 'Copied. Now open Safari'; } catch { copy.textContent = location.href; } });
  })();

  // keyboard hints don't apply on a phone; keep the screen awake-ish feel by blocking rubber-band scroll on the swipe screen
  document.addEventListener('touchmove', (e) => { if (document.body.dataset.screen === 'swipe' && !e.target.closest('.modal')) e.preventDefault(); }, { passive: false });
})();
