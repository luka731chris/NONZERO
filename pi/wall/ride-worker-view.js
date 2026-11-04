(function (root) {
  'use strict';
  function create(fallback) {
    if (
      !root.Worker ||
      !root.HTMLCanvasElement?.prototype.transferControlToOffscreen ||
      !fallback.parentElement
    )
      return null;
    const canvas = document.createElement('canvas');
    canvas.id = 'rideImmersiveCanvas';
    canvas.hidden = true;
    canvas.setAttribute('aria-label', 'Continuous ride scenery');
    fallback.parentElement.insertBefore(canvas, fallback);
    let lastPose = '';
    // Look-around is independent of telemetry and never modifies recorded distance.
    let yaw = 0, pitch = 0, dragging = false, lastX = 0, lastY = 0;
    function updateView() {
      if (ready && !failed) worker.postMessage({ type: 'view', yaw, pitch });
      lastPose = '';
    }
    canvas.addEventListener('pointerdown', (e) => {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      canvas.setPointerCapture?.(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      yaw = Math.max(-Math.PI, Math.min(Math.PI, yaw - (e.clientX-lastX)*0.006));
      pitch = Math.max(-0.65, Math.min(0.65, pitch + (e.clientY-lastY)*0.004));
      lastX = e.clientX; lastY = e.clientY; updateView();
    });
    canvas.addEventListener('pointerup', () => { dragging = false; });
    canvas.addEventListener('pointercancel', () => { dragging = false; });
    // TV keyboard: arrows pan, Home centers the camera. Ignore typing in form fields.
    function keyLook(e) {
      if (closed || canvas.hidden || /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName || '')) return;
      if (e.key === 'ArrowLeft') yaw -= 0.18;
      else if (e.key === 'ArrowRight') yaw += 0.18;
      else if (e.key === 'ArrowUp') pitch += 0.12;
      else if (e.key === 'ArrowDown') pitch -= 0.12;
      else if (e.key === 'Home') { yaw = 0; pitch = 0; }
      else return;
      e.preventDefault();
      yaw = Math.max(-Math.PI, Math.min(Math.PI, yaw));
      pitch = Math.max(-0.65, Math.min(0.65, pitch)); updateView();
    }
    function remoteLook(e) {
      const action = e.detail?.action;
      if (action === 'ride-left') yaw -= 0.25;
      else if (action === 'ride-right') yaw += 0.25;
      else if (action === 'ride-up') pitch += 0.15;
      else if (action === 'ride-down') pitch -= 0.15;
      else if (action === 'ride-center') { yaw = 0; pitch = 0; }
      else return;
      yaw = Math.max(-Math.PI, Math.min(Math.PI, yaw));
      pitch = Math.max(-0.65, Math.min(0.65, pitch));
      updateView();
    }
    root.addEventListener('nonzero:ride-look', remoteLook);
    document.addEventListener('keydown', keyLook);
    let worker,
      ready = false,
      frame = false,
      pending = false,
      failed = false,
      width = 1,
      height = 1,
      lastSnapshot = { renderer: 'webgl', worker: true, frames: 0, failed: false },
      closed = false,
      pendingSince = 0;
    function fail(message) {
      failed = true;
      pending = false;
      pendingSince = 0;
      worker?.terminate();
      canvas.hidden = true;
      fallback.style.visibility = '';
      lastSnapshot = { ...lastSnapshot, failed: true, error: message };
    }
    try {
      worker = new Worker('ride-render-worker.js?v=7.17.3');
      const offscreen = canvas.transferControlToOffscreen();
      worker.postMessage(
        {
          type: 'init',
          canvas: offscreen,
          width: fallback.width || 1,
          height: fallback.height || 1
        },
        [offscreen]
      );
    } catch {
      worker?.terminate();
      canvas.remove();
      return null;
    }
    worker.onmessage = ({ data }) => {
      if (closed) return;
      if (data.type === 'ready') {
        root.clearTimeout(startupTimeout);
        ready = true;
        updateView();
        worker.postMessage({ type: 'resize', width, height });
      }
      if (data.type === 'frame') {
        pending = false;
        pendingSince = 0;
        lastSnapshot = { ...data.snapshot, worker: true };
        if (!data.ok) fail('Graphics unavailable');
        else {
          frame = true;
          canvas.hidden = false;
          fallback.style.visibility = 'hidden';
        }
      }
      if (data.type === 'error') fail(data.message);
    };
    worker.onerror = () => fail('Graphics worker unavailable');
    // A worker that never becomes ready must not linger indefinitely.
    const startupTimeout = root.setTimeout(() => {
      if (!ready && !closed && !failed) fail('Graphics worker startup timeout');
    }, 4000);
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      fail('Graphics context lost');
      worker.terminate();
    });
    return {
      draw(theme, position) {
        if (failed || closed) return false;
        const pose = theme + '|' + Math.round(position * 200) + '|' + width + '|' + height;
        if (pending && Date.now() - pendingSince > 3000) {
          fail('Graphics frame timeout; switched to animated fallback');
          return false;
        }
        if (ready && !pending && pose !== lastPose) {
          lastPose = pose;
          pending = true;
          pendingSince = Date.now();
          worker.postMessage({ type: 'draw', theme, position });
        }
        return frame;
      },
      resize(w, h) {
        width = w;
        height = h;
        if (ready) worker.postMessage({ type: 'resize', width: w, height: h });
      },
      snapshot: () => ({
        ...lastSnapshot,
        width: lastSnapshot.width || width,
        height: lastSnapshot.height || height
      }),
      dispose() {
        closed = true;
        root.clearTimeout(startupTimeout);
        document.removeEventListener('keydown', keyLook);
        root.removeEventListener('nonzero:ride-look', remoteLook);
        worker.terminate();
        canvas.remove();
        fallback.style.visibility = '';
      }
    };
  }
  root.NonZeroImmersiveWorker = { create };
})(typeof window !== 'undefined' ? window : globalThis);
