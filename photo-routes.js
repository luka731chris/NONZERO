/* Genuine place photographs, in route order. Distance advances photo chapters;
   gentle crop movement is an animation, not continuous ride-camera footage. */
(function (root) {
  'use strict';
  const photos = {
    pittsburgh: [
      {
        m: 0,
        file: 'pittsburgh-start',
        label: 'North Shore · Acrisure Stadium view',
        credit: 'Dough4872 · CC BY-SA 4.0'
      },
      {
        m: 1800,
        file: 'pittsburgh-pnc',
        label: 'North Shore · PNC Park view',
        credit: 'Dough4872 · CC BY-SA 4.0'
      }
    ],
    france: [
      {
        m: 0,
        file: 'france-bedoin',
        label: 'Bédoin · village and vineyards',
        credit: 'Véronique PAGNIER · CC BY-SA 3.0'
      },
      {
        m: 14500,
        file: 'france-reynard',
        label: 'Chalet Reynard · southern approach',
        credit: 'Véronique PAGNIER · public domain'
      },
      {
        m: 20500,
        file: 'france-summit',
        label: 'Mont Ventoux · summit',
        credit: 'Véronique PAGNIER · public domain'
      }
    ],
    rockies: [
      {
        m: 0,
        file: 'rockies-rainbow',
        label: 'Rainbow Curve · Trail Ridge Road',
        credit: 'NPS · public domain'
      },
      {
        m: 28000,
        file: 'rockies-rockcut',
        label: 'Rock Cut · Trail Ridge Road',
        credit: 'NPS / John Marino · public domain'
      }
    ],
    'mountain-bike': [
      {
        m: 0,
        file: 'mountain-bike',
        label: 'Slickrock Bike Trail · Moab, Utah',
        credit: 'Acp~commonswiki · CC BY-SA 3.0'
      }
    ],
    // No Cape Cod photographs are reused for Hilton Head. Until properly
    // licensed Hilton Head imagery is bundled, use the generated 3D scenery.
    beach: []
  };
  const cache = new Map();
  function chapter(id, d) {
    const a = photos[id];
    if (!a) return null;
    let i = 0;
    while (i < a.length - 1 && d >= a[i + 1].m) i++;
    return { ...a[i], index: i, count: a.length, next: a[i + 1] || null };
  }
  function load(id) {
    if (!root.Image) return;
    for (const p of photos[id] || []) {
      if (cache.has(p.file)) continue;
      const image = new root.Image(),
        item = { image, ready: false };
      cache.set(p.file, item);
      image.onload = () => {
        item.ready = true;
      };
      image.onerror = () => {
        item.failed = true;
      };
      image.src = 'assets/routes/' + p.file + '.jpg';
    }
  }
  function draw(c, w, h, id, d, time) {
    load(id);
    const p = chapter(id, d);
    if (!p) return null;
    const item = cache.get(p.file);
    if (!item?.ready) return null;
    const img = item.image,
      iw = img.naturalWidth || img.width,
      ih = img.naturalHeight || img.height;
    // Preserve aspect and architectural proportions; never warp buildings or terrain.
    const zoom = 1.035 + Math.min(0.025, (d - p.m) / 20000),
      scale = Math.max(w / iw, h / ih) * zoom,
      dw = iw * scale,
      dh = ih * scale;
    const shift = Math.min(
      1,
      Math.max(0, (d - p.m) / Math.max(1500, (p.next?.m || p.m + 6000) - p.m))
    );
    c.drawImage(img, -(dw - w) * (0.35 + shift * 0.3), -(dh - h) * 0.45, dw, dh);
    const shade = c.createLinearGradient(0, 0, 0, h);
    shade.addColorStop(0, '#06131b70');
    shade.addColorStop(0.3, '#06131b00');
    shade.addColorStop(0.65, '#06131b00');
    shade.addColorStop(1, '#06131b9c');
    c.fillStyle = shade;
    c.fillRect(0, 0, w, h);
    return p;
  }
  root.NonZeroPhotoRoutes = { photos, chapter, load, draw };
  if (typeof module !== 'undefined') module.exports = { photos, chapter };
})(typeof globalThis !== 'undefined' ? globalThis : this);
