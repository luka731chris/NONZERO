#!/usr/bin/env python3
"""Read-only PM5 connection diagnostics; does not claim the bridge's USB interface."""

import json, os, sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "vendor"))
result = {}
try:
    import usb.core, usb.backend.libusb1

    result["usbRuntimeAvailable"] = usb.backend.libusb1.get_backend() is not None
    result["concept2Devices"] = [
        {"vendor": hex(d.idVendor), "product": hex(d.idProduct)}
        for d in usb.core.find(find_all=True, idVendor=0x17A4)
    ]
except Exception as exc:
    result["usbError"] = str(exc)
p = Path(os.environ.get("XDG_RUNTIME_DIR", "/tmp")) / "nonzero-wall/erg-telemetry.json"
try:
    result["telemetry"] = json.loads(p.read_text())
    result["sampleAgeSeconds"] = round(
        time.time() - result["telemetry"].get("updatedAt", 0) / 1000, 1
    )
except Exception as exc:
    result["bridgeError"] = str(exc)
print(json.dumps(result, indent=2))
