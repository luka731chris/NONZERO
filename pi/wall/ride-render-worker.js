/* Graphics owns its own thread; PM5 and workout controls stay on the main thread. */
'use strict';
let engine = null,
  firstCanvas = null;
self.onmessage = async (event) => {
  const data = event.data;
  try {
    if (data.type === 'init') {
      firstCanvas = data.canvas;
      self.document = {
        createElement(tag) {
          if (tag !== 'canvas') throw Error('Canvas only');
          const c = firstCanvas || new OffscreenCanvas(256, 256);
          firstCanvas = null;
          c.setAttribute = () => {};
          return c;
        }
      };
      importScripts('vendor/three.min.js', 'route-catalog.js', 'immersive-ride.js');
      engine = self.NonZeroImmersive.create({ parentElement: { insertBefore() {} }, style: {} });
      if (!engine) throw Error('Offscreen WebGL is unavailable');
      engine.resize(data.width, data.height);
      self.postMessage({ type: 'ready' });
    } else if (data.type === 'view' && engine) {
      engine.setView(data.yaw, data.pitch);
    } else if (data.type === 'resize' && engine) {
      engine.resize(data.width, data.height);
    } else if (data.type === 'draw' && engine) {
      const ok = engine.draw(data.theme, data.position);
      if (ok) await engine.waitForFrame();
      self.postMessage({ type: 'frame', ok, snapshot: engine.snapshot() });
    }
  } catch (e) {
    self.postMessage({ type: 'error', message: String(e.message || e) });
  }
};
