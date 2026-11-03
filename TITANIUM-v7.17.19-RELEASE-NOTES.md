# v7.17.19 renderer-specific recovery candidate

- Detects actual NONZERO renderer responsiveness via localhost Chromium DevTools Protocol (Runtime.evaluate `1+1`), rather than equating local server health with renderer health.
- Requires stale heartbeat and three consecutive failed renderer probes before terminating browser.
- If CDP is unavailable or misconfigured, the watchdog **does not kill Chromium**; records a diagnostic event instead. This is a deliberate fail-safe, but means an Aw Snap may remain visible until the probe is restored.
- Captures incident evidence before restart, retains recovery limits (at most 12 per hour; >=180 seconds between restarts).
- Adds per-browser-process CPU measurement and retains memory, disk, crash-dump inventory and historical incident logs.
- Keeps low-work Ambient/Night/Deep Hibernate settings from v7.17.16 and nutrition/AutoPilot code from previous builds.

**Not yet hardware validated.** CDP endpoint availability and crash-dump capture must be tested on the actual Pi. This is a controlled validation build, not proof of resolved root cause.
