# NONZERO Ride v7.17.0 — 360-degree camera and landmark update

All seven existing ride environments retain continuous perspective movement and their route-specific biomes. A full 360-degree horizontal look-around and limited vertical look is now supported in the WebGL scene via TV keyboard arrows (Home resets) or pointer drag on the graphics canvas. This changes camera orientation only, not workout telemetry or recorded distance. The graphics watchdog from v7.16.1 is retained.

Pittsburgh: replaced generic route-distance stadium cylinders with approximate geolocated bowl and field footprints for Acrisure Stadium and PNC Park, north of the riverfront trail. This improves orientation, but is **not** photogrammetric or survey-grade accuracy. Other routes retain stylized geometry and documented route waypoints. No claim of photo-realistic, surveyed 360-degree terrain is made.

The camera controls are on the Pi Wall, not yet mirrored in the phone app. If WebGL is unavailable the existing animated Canvas fallback continues, without 360-degree look-around. The phone v3.63 and Worker v5.16 are unchanged. Real Raspberry Pi hardware and PM5 endurance testing remain necessary.
