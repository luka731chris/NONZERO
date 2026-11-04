# Continuous ride and active workout adjustment

Pi 7.14.0, Phone 3.60, Worker 5.15 unchanged.

## Corrected behavior

The former full-frame photo path returned before drawing moving trail geometry whenever a photo was ready. That produced static chapters with only a small crop shift. Ride drawing was also driven solely by measured cumulative distance, so missing distance updates could freeze scenery even with fresh cadence. Continuous 3D now uses a travel state driven by fresh PM5 speed/distance deltas, with an illustrative cadence-speed fallback when those measurements are unavailable. That fallback is visual only and does not add measured distance to recorded workout data.

An OffscreenCanvas Web Worker keeps graphics construction and drawing separate from the main PM5/UI thread on supported Chromium. Main-thread messages carry only the latest travel state, with one frame in flight to prevent a render backlog. An animated Canvas fallback remains available. A locally bundled, pinned Three.js 0.160.1 WebGL renderer provides an eye-level perspective camera, depth/parallax, textured ground and trail, environmental detail and route-specific scenery across all seven themes. The Pittsburgh route uses the existing route reference, building coordinates/heights and ordered bridge stops. Ground, river and trail meshes follow that reference. Other scenes are simplified environments associated with the existing route references, not a precise terrain survey. Native HD/4K resolution is supported. This is rendered scenery, not photo-real footage, live street imagery or a claim of geographic precision.

Canvas remains an animated fallback for unsupported/lost WebGL contexts. Static photos no longer replace the ride or load during scene changes. Repeated roadside geometry uses instancing; transient geometry is disposed when switching scenes; the finite palette of materials/textures is reused to avoid shader recompilation and disposed when the renderer closes. A lost graphics context falls back to the animated Canvas route; reload to restore the preferred worker renderer. No external rendering service, runtime CDN, video subscription or new Cloudflare polling is used.

Live PM5 ingestion reaches the ride display immediately after the local telemetry response, before optional analytics/presentation work. Scene changes do not replace metric nodes, reset telemetry or create another PM5 session. Freshness is explicit; stale values clear rather than masquerading as live, and missing HR remains missing. Errors in the scenery path fall back without terminating the telemetry update path. These safeguards address scene-coupled display failures; actual USB/BLE transport behavior still requires installed-device verification.

## Active adjustments

The **Adjust** toolbar action opens a mobile sheet inside active workout mode. It supports exercise substitutions for unstarted work, repetitions/time/load, 1–8 sets and adding/removing unstarted exercises. Completed sets retain their indices and exercise names; edits that would remove/relabel them are refused. Partner prescriptions and set arrays are edited separately. The running or paused timer, session ID, rest state and source plan are preserved. Reload and finish/save keep the adjusted snapshot and change history. Movement identifiers are cleared for substituted movements so those movements cannot inherit the original lift identifier. Adjusted plans are not credited as an unchanged anchor prescription.

The same sheet offers effort, duration and calorie ride targets through the existing shared goal application function. Its validation and physiological profile are shared with the preparation widget. PM5 calories are exercise-monitor values, not dietary intake targets. Cloud sync uses the existing state flow.

## Validation and limits

Real Chromium tests drive the production Wall with the real USB bridge/HTTP server and a simulated PM5 device. They check changing scene pixels, camera progression, live watts/cadence/HR across every theme, native HD buffers, bounded draw calls, stale-data labeling, reconnect and context-loss fallback. The phone suite checks timer/session preservation, primary/partner independence, completed-set protection, additions/removals, goal editing, reload, viewport fit and saved history. Existing lifecycle, capture, coaching, pairing, cloud budget, UI and updater regressions remain in the release runner.

A physical Pi, television, USB/BLE device and real iOS browser are not present in this environment. No installed-Pi FPS or claim that all previously reported hardware failures are resolved is made. After installing, verify actual changing PM5 samples, scene movement, transitions and data capture independently.

Dependencies: Three.js MIT license is retained under vendor/three/LICENSE. Existing photo and route attribution files remain.
