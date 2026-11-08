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

  // keyboard hints don't apply on a phone; keep the screen awake-ish feel by blocking rubber-band scroll on the swipe screen
  document.addEventListener('touchmove', (e) => { if (document.body.dataset.screen === 'swipe' && !e.target.closest('.modal')) e.preventDefault(); }, { passive: false });
})();
