#!/usr/bin/env python3
"""PM5 BLE notifications → local telemetry. No browser Bluetooth permission needed.
Protocol: Concept2 PM CSAFE Communication Definition, rev 0.34, GATT 0031/32/33/36.
"""

import asyncio, json, os, signal, time
from pathlib import Path

RUNTIME = Path(os.environ.get("XDG_RUNTIME_DIR", "/tmp")) / "nonzero-wall"
OUT = RUNTIME / "erg-ble-telemetry.json"
USB = RUNTIME / "erg-telemetry.json"
UUID = lambda code: f"ce06{code}-43e5-11e4-916c-0800200c9a66"
STOP = False


def u16(b, i):
    return int.from_bytes(b[i : i + 2], "little")


def u24(b, i):
    return int.from_bytes(b[i : i + 3], "little")


def machine_type(value):
    if value in (192, 193, 194, 207, 226):
        return "BikeErg"
    if value in (128, 143, 225):
        return "SkiErg"
    if value in (0, 1, 2, 3, 5, 7, 8, 16, 17, 18, 19, 20, 32, 224):
        return "RowErg"
    return os.environ.get("NONZERO_ERG_MACHINE", "BikeErg")


class Decoder:
    def __init__(self, name="PM5"):
        self.data = {
            "connected": True,
            "source": "PM5 · Bluetooth",
            "transport": "ble",
            "machine": os.environ.get("NONZERO_ERG_MACHINE", "BikeErg"),
            "deviceName": name,
        }
        self.at = {}
        self.seq = 0

    def feed(self, code, b, now=None):
        now = int(time.time() * 1000) if now is None else now
        if code == "0031" and len(b) >= 19:
            self.data.update(
                elapsedSeconds=u24(b, 0) / 100,
                distanceMeters=u24(b, 3) / 10,
                workoutType=b[6],
                workoutState=b[8],
                dragFactor=b[18],
            )
        elif code == "0032" and len(b) >= 16:
            self.data.update(
                cadence=b[5],
                heartRate=None if b[6] == 255 else b[6],
                speedMps=u16(b, 3) / 1000,
                paceSeconds=u16(b, 7) / 100,
            )
            if len(b) > 16:
                self.data["machine"] = machine_type(b[16])
        elif code == "0033" and len(b) >= 8:
            self.data.update(watts=u16(b, 4), calories=u16(b, 6))
        elif code == "0036" and len(b) >= 9:
            self.data.update(watts=u16(b, 3), strokeCount=u16(b, 7))
        else:
            return None
        self.at[code] = now
        self.seq += 1
        data = dict(self.data)
        # A fresh status packet must not refresh old cadence/power after notification loss.
        if now - self.at.get("0032", 0) > 2500:
            data["cadence"] = 0
            data["heartRate"] = None
        if now - max(self.at.get("0033", 0), self.at.get("0036", 0)) > 2500:
            data["watts"] = 0
        data.update(
            updatedAt=now,
            readSequence=self.seq,
            bridgeState="bluetooth",
            fresh=True,
            recovering=False,
        )
        return data


def write(data):
    RUNTIME.mkdir(parents=True, exist_ok=True)
    temp = OUT.with_suffix(".tmp")
    temp.write_text(json.dumps(data, separators=(",", ":")))
    temp.replace(OUT)


def usb_live():
    try:
        d = json.loads(USB.read_text())
        age = time.time() * 1000 - float(d.get("updatedAt", 0))
        moving = float(d.get("watts") or 0) >= 5 or float(d.get("cadence") or 0) >= 3
        return bool(
            d.get("connected")
            and d.get("fresh") is not False
            and not d.get("recovering")
            and -1000 <= age < 2500
            and moving
        )
    except Exception:
        return False


async def main():
    from bleak import BleakClient, BleakScanner
    from pm5_capture import Capture

    capture = Capture()
    preferred = os.environ.get("NONZERO_PM5_BLE_ADDRESS", "").lower()
    while not STOP:
        try:
            write(
                {
                    "connected": False,
                    "source": "PM5 · Bluetooth",
                    "bridgeState": "scanning",
                    "updatedAt": int(time.time() * 1000),
                }
            )

            def match(device, ad):
                if preferred:
                    return device.address.lower() == preferred
                return (ad.local_name or device.name or "").upper().startswith(
                    "PM5"
                ) or UUID("0030") in [u.lower() for u in ad.service_uuids]

            device = await BleakScanner.find_device_by_filter(match, timeout=8)
            if not device:
                continue
            async with BleakClient(device, timeout=15) as client:
                decoder = Decoder(device.name or "PM5")
                last = [time.monotonic()]
                recorder = None
                recorder_retry = 0
                try:
                    machine = await client.read_gatt_char(UUID("0016"))
                    if machine:
                        decoder.data["machine"] = machine_type(machine[0])
                except Exception:
                    pass
                try:
                    from metrics import Recorder

                    recorder = Recorder()
                except Exception:
                    pass

                def callback(code):
                    def handle(_, packet):
                        nonlocal recorder, recorder_retry
                        receipt = capture.record(
                            "ble",
                            code,
                            {
                                "receivedAt": time.time() * 1000,
                                "deviceAddress": device.address,
                                "hex": bytes(packet).hex(),
                            },
                        )
                        data = decoder.feed(code, packet)
                        if data is None:
                            return
                        data.update(receipt)
                        last[0] = time.monotonic()
                        if recorder is None and time.monotonic() >= recorder_retry:
                            recorder_retry = time.monotonic() + 5
                            try:
                                from metrics import Recorder

                                recorder = Recorder()
                            except Exception as e:
                                data["metricsError"] = str(e)[:120]
                                data["metricsRecording"] = False
                                try:
                                    recorder.c.close()
                                except Exception:
                                    pass
                                recorder = None
                        if recorder and not usb_live():
                            try:
                                data["recordingId"] = recorder.observe(data)
                                data["metricsRecording"] = True
                            except Exception as e:
                                data["metricsError"] = str(e)[:120]
                                data["metricsRecording"] = False
                                try:
                                    recorder.c.close()
                                except Exception:
                                    pass
                                recorder = None
                        write(data)

                    return handle

                subscribed = 0
                for code in [
                    "0031",
                    "0032",
                    "0033",
                    "0035",
                    "0036",
                    "0037",
                    "0038",
                    "0039",
                    "003a",
                ]:
                    try:
                        await client.start_notify(UUID(code), callback(code))
                        subscribed += 1
                    except Exception:
                        if code in ["0031", "0032"]:
                            raise
                try:
                    await client.write_gatt_char(
                        UUID("0034"), bytes([3]), response=True
                    )
                except Exception:
                    pass  # Older firmware keeps its supported default rate.
                while client.is_connected and not STOP:
                    if time.monotonic() - last[0] > 8:
                        raise TimeoutError(
                            "No PM5 notifications; reopen PM5 Connect if needed"
                        )
                    if recorder:
                        recorder.idle()
                    await asyncio.sleep(0.5)
        except Exception as e:
            write(
                {
                    "connected": False,
                    "source": "PM5 · Bluetooth",
                    "bridgeState": "reconnecting",
                    "error": str(e)[:180],
                    "updatedAt": int(time.time() * 1000),
                }
            )
            await asyncio.sleep(3)
    write(
        {
            "connected": False,
            "source": "PM5 · Bluetooth",
            "bridgeState": "stopped",
            "updatedAt": int(time.time() * 1000),
        }
    )


if __name__ == "__main__":

    def stop(*_):
        global STOP
        STOP = True

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    asyncio.run(main())
