# NONZERO Wall v4 — Performance UI

## Design target

The v4 Wall is intentionally closer to a premium connected-fitness display than a static dashboard. The hierarchy is designed for garage viewing distance: one dominant live state, large numbers, very little framing, restrained NonZero gold, and smooth status transitions.

## Roku rendering note

Roku SceneGraph's app UI composition target is FHD on this implementation. The v4 package therefore uses a 1920×1080 SceneGraph layout plus a 3840×2160 source background asset, high-resolution splash art, large typography, and clean vector-like primitives so a 4K television's scaler has substantially better source material. The browser `/wall/` implementation is natively responsive up through 4K CSS resolution.

## Automatic states

- **PAIR** — 6-digit pairing instructions only.
- **READY** — today's programmed session, first movement, weekly KPIs.
- **LIVE** — live elapsed timer, first unchecked movement, progress, pain/energy, performance telemetry.
- **COMPLETE** — session duration, completion message, post-workout metrics when present.

## Telemetry contract

The Wall reads these optional fields without requiring them:

```json
{
  "activeWorkout": {
    "timer": {"elapsedMs": 0, "running": true, "startedAt": 0},
    "liveMetrics": {
      "heartRate": 126,
      "watts": 178,
      "cadence": 74,
      "distance": 3420
    }
  }
}
```

Fallback field names supported by the Wall include `hr`, `avgHr`, `power`, `avgWatts`, `rpm`, `rate`, and `meters`. If live metrics are absent, the Performance rail shows em dashes rather than fabricated values.

## Motion system

- subtle ambient gold sweep across the upper frame;
- breathing live indicator during active workouts;
- glowing progress head;
- rolling live timer updated locally every second;
- cloud state refresh every two seconds.

The motion is intentionally restrained so the Wall feels alive without becoming distracting during training.
