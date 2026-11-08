'use strict';
/* iPhone / web version of the window.swiped API that the desktop app gets from Electron.
   Files come from the iOS photo/file picker; "moving" just records the decision. At the end you save
   keepers through the share sheet (Save Images / Save to Files). Progress lives in localStorage. */
(function () {
  window.MOBILE = true;
  const files = new Map();      // key -> File
  const urls = new Map();       // key -> object URL
  const decided = { left: new Map(), right: new Map() };   // key -> File
  let seq = 0;
  const VIDEO = /\.(mp4|mov|m4v|webm)$/i;
  const IMG = /\.(jpe?g|png|gif|webp|heic|heif|avif|bmp)$/i;

  function pick(accept, folder) {
    return new Promise((resolve) => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.multiple = true; inp.accept = accept;
      if (folder) { inp.webkitdirectory = true; inp.removeAttribute('accept'); }
      inp.style.display = 'none';
      inp.addEventListener('change', () => {
        const list = [...(inp.files || [])].filter((f) => !folder || IMG.test(f.name) || VIDEO.test(f.name) || /^(image|video)\//.test(f.type));
        inp.remove();
        resolve(list.map((f) => { const k = `f${++seq}:${f.name}`; files.set(k, f); return k; }));
      }, { once: true });
      inp.addEventListener('cancel', () => { inp.remove(); resolve([]); }, { once: true });
      document.body.appendChild(inp);
      inp.click();
    });
  }
  const nameOf = (k) => k.slice(k.indexOf(':') + 1);
  const extOf = (n) => { const i = n.lastIndexOf('.'); return i > 0 ? n.slice(i).toLowerCase() : ''; };

  async function share(keys, title) {
    const list = keys.map((k) => files.get(k)).filter(Boolean);
    if (!list.length) return false;
    const BATCH = 40;   // iOS share sheets get unhappy with hundreds of full-res files at once
    for (let i = 0; i < list.length; i += BATCH) {
      const chunk = list.slice(i, i + BATCH);
      if (!(navigator.canShare && navigator.canShare({ files: chunk }))) { toast('Sharing files isn’t supported in this browser. Use Safari on iPhone.'); return true; }
      try { await navigator.share({ files: chunk, title }); }
      catch (e) { if (e && e.name === 'AbortError') return true; throw e; }
      if (i + BATCH < list.length) {
        const more = await new Promise((res) => { const ok = confirm(`Saved ${Math.min(i + BATCH, list.length)} of ${list.length}. Save the next ${Math.min(BATCH, list.length - i - BATCH)}?`); res(ok); });
        if (!more) break;
      }
    }
    return true;
  }

  window.swiped = {
    platform: 'ios',
    pathFor: () => '',
    // Listing exact types (incl. HEIC) stops iOS from converting every photo to JPEG before handing them over,
    // which is what made big selections hang after tapping the checkmark. Videos are left out for the same reason.
    pickFolder: () => pick('image/heic,image/heif,image/jpeg,image/png,image/webp,image/gif,image/avif'),
    pickDir: () => pick('', true),
    async scan(keys, pair) {
      const groups = new Map();
      for (const k of keys) {
        const n = nameOf(k), base = pair ? n.replace(/\.[^.]+$/, '').toLowerCase() : k;
        if (!groups.has(base)) groups.set(base, []);
        groups.get(base).push(k);
      }
      const cards = [];
      for (const [, ks] of groups) {
        const fl = ks.map((k) => ({ path: k, name: nameOf(k), ext: extOf(nameOf(k)), size: files.get(k).size }));
        let pi = fl.findIndex((f) => IMG.test(f.name)); if (pi < 0) pi = fl.findIndex((f) => VIDEO.test(f.name)); if (pi < 0) pi = 0;
        cards.push({ id: ks[0], name: fl[pi].name, size: fl.reduce((a, f) => a + f.size, 0), primaryIndex: pi, files: fl, mtime: files.get(ks[0]).lastModified });
      }
      cards.sort((a, b) => (a.mtime - b.mtime) || a.name.localeCompare(b.name));
      return { cards, folders: ['iPhone'] };
    },
    async preview(k) {
      const f = files.get(k);
      if (!f) return { type: 'file' };
      if (!urls.has(k)) urls.set(k, URL.createObjectURL(f));
      if (VIDEO.test(f.name) || f.type.startsWith('video/')) return { type: 'video', url: urls.get(k) };
      if (IMG.test(f.name) || f.type.startsWith('image/')) return { type: 'image', url: urls.get(k), orientation: 1 };
      return { type: 'file' };
    },
    thumb: async () => null,
    async move(keys, dir) {
      for (const k of keys) { decided.left.delete(k); decided.right.delete(k); decided[dir].set(k, files.get(k)); }
      return keys.map((k) => ({ from: k, to: k }));
    },
    async undo(moves) {
      for (const m of moves || []) { if (!m) continue; decided.left.delete(m.from); decided.right.delete(m.from); }
      return (moves || []).map((m) => (m ? m.from : null));
    },
    // "Open Selected folder" -> save keepers via the share sheet; "Open Delete folder" -> share rejects (e.g. to review)
    async openFolder(_f, sub) { return share([...(sub === 'Selected' ? decided.right : decided.left).keys()], sub === 'Selected' ? 'Keepers' : 'Rejects'); },
    trashDelete: async () => 0,
    score: async () => ({ error: 'skip' }),
    async loadProgress() { try { return JSON.parse(localStorage.getItem('ss-progress') || 'null'); } catch { return null; } },
    async saveProgress(d) { try { localStorage.setItem('ss-progress', JSON.stringify(d)); } catch {} return true; },
    _counts: () => ({ keep: decided.right.size, cut: decided.left.size }),
    _reset() { for (const u of urls.values()) URL.revokeObjectURL(u); urls.clear(); files.clear(); decided.left.clear(); decided.right.clear(); },
  };
  // keep the installed app's data from being evicted
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch {}
  if ('serviceWorker' in navigator) {
    // when a new version takes over, reload once so the update shows immediately
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((r) => r.update()).catch(() => {}));
  }
})();
