// Decodes photos off the main thread and returns a screen-sized JPEG, so swiping never waits on a 24-45MP decode.
self.onmessage = async ({ data: { id, file, max } }) => {
  try {
    let bmp;
    try { bmp = await createImageBitmap(file, { resizeWidth: max, resizeQuality: 'high' }); }   // fast path where resize is supported
    catch { bmp = await createImageBitmap(file); }
    let w = bmp.width, h = bmp.height;
    const s = Math.min(1, max / Math.max(w, h));
    w = Math.round(w * s); h = Math.round(h * s);
    const c = new OffscreenCanvas(w, h);
    c.getContext('2d').drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await c.convertToBlob({ type: 'image/jpeg', quality: 0.86 });
    self.postMessage({ id, blob });
  } catch (e) {
    self.postMessage({ id, error: String(e && e.message || e) });
  }
};
