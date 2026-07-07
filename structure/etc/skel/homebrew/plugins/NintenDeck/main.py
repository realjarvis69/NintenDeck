#!/usr/bin/env python3

import decky
import subprocess
import re
import asyncio
import os
import base64
import csv
from urllib.request import urlopen
from pathlib import Path

class Plugin:
    def __init__(self):
        self.tegrastats_process = None
        self.latest_line = ""
        self.lock = asyncio.Lock()
        self.runtime_dir = f"/run/user/{os.getuid()}"
        self.csv_url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTw6ZTmWBZ9G9-to_9GT763UzFVmuRdu5PCH-WSa4ui9tSeWGS0o_eJQHs8VyoGcy5DXm569xCW3Ybu/pub?gid=1002118274&single=true&output=csv"
        self.config_dir = Path.home() / ".config" / "NintenDeck"
        self.config_dir.mkdir(parents=True, exist_ok=True)
        self.cache_file = self.config_dir / "compatibility.csv"
        # Bluetooth streaming
        self.bluetooth_scan_process = None
        self.bluetooth_scan_task = None
        self.discovered_devices = []
        self.bluetooth_lock = asyncio.Lock()
        decky.logger.info("Plugin initialised (offline CSV, 1s temps, Bluetooth streaming)")

    # ---------- Helper: check internet ----------
    async def is_online(self) -> bool:
        try:
            subprocess.run(["ping", "-c", "1", "-W", "2", "8.8.8.8"], capture_output=True, timeout=3)
            return True
        except:
            return False

    # ---------- Compatibility with offline cache ----------
    async def get_compatibility_data(self, show_all: bool) -> list:
        online = await self.is_online()
        data = None
        if online:
            try:
                with urlopen(self.csv_url) as response:
                    content = response.read().decode('utf-8')
                    with open(self.cache_file, 'w') as f:
                        f.write(content)
                    data = content
                decky.logger.info("CSV downloaded and cached")
            except Exception as e:
                decky.logger.error(f"Failed to download CSV: {e}")
                if self.cache_file.exists():
                    with open(self.cache_file, 'r') as f:
                        data = f.read()
                    decky.logger.info("Using cached CSV")
        else:
            decky.logger.info("Offline, using cached CSV")
            if self.cache_file.exists():
                with open(self.cache_file, 'r') as f:
                    data = f.read()
        if not data:
            return []
        reader = csv.DictReader(data.splitlines())
        games = []
        for row in reader:
            if not row.get('Game'):
                continue
            rating = row.get('Rating', 'Unknown')
            games.append({
                "name": row.get('Game', ''),
                "switch_model": row.get('Switch Model', ''),
                "oc_mode": row.get('OC Mode', ''),
                "rating": rating,
                "avg_fps": row.get('Average FPS', ''),
                "proton_version": row.get('Proton Version', ''),
                "launch_options": row.get('Launch Options', ''),
                "extra_info": row.get('Extra Information', ''),
                "submitted_by": row.get('Submitted by', '')
            })
        return sorted(games, key=lambda x: x['name'].lower())

    async def get_installed_games(self) -> list:
        steam_path = Path.home() / ".steam" / "steam" / "steamapps" / "common"
        if not steam_path.exists():
            return []
        exclude = {"Steam Linux Runtime", "Steam Linux Runtime 2.0", "Proton 3.7", "Proton 4.2",
                   "Proton 5.0", "Proton 5.13", "Proton 6.3", "Proton 7.0", "Proton 8.0",
                   "Proton 9.0", "Proton Experimental", "Proton Hotfix",
                   "Steamworks Common Redistributables", "SteamVR", "Steam Link"}
        games = []
        for folder in steam_path.iterdir():
            if folder.is_dir() and folder.name not in exclude and not folder.name.startswith('.'):
                games.append(folder.name)
        return sorted(games)

    async def get_icon_base64(self, status: str) -> str:
        filename = f"{status.lower()}.png"
        icon_path = Path(__file__).parent / filename
        if not icon_path.exists():
            return ""
        try:
            with open(icon_path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode()
                return f"data:image/png;base64,{b64}"
        except Exception as e:
            decky.logger.error(f"Failed to load icon {filename}: {e}")
            return ""

    # ---------- OC & Fan ----------
    async def set_oc_mode(self, value: int) -> None:
        try:
            subprocess.run(["pkexec", "nvpmodel", "-m", str(value)], check=True)
            decky.logger.info(f"OC mode set to {value}")
        except subprocess.CalledProcessError as e:
            decky.logger.error(f"Failed to set OC mode: {e}")
            raise

    async def get_current_oc_mode(self) -> int:
        try:
            result = subprocess.run(["pkexec", "nvpmodel", "-q"], capture_output=True, text=True, check=True)
            last_int = 0
            for line in result.stdout.strip().splitlines():
                if line.strip().isdigit():
                    last_int = int(line.strip())
            return last_int
        except Exception as e:
            decky.logger.error(f"Failed to get OC mode: {e}")
            return 0

    FAN_NAME_TO_INDEX = {"Console": 0, "Handheld": 1, "Cool": 2}
    FAN_INDEX_TO_NAME = {0: "Console", 1: "Handheld", 2: "Cool"}

    async def set_fan_mode(self, value: int) -> None:
        name = self.FAN_INDEX_TO_NAME.get(value, "Console")
        try:
            subprocess.run(["pkexec", "nvpmodel", "-d", name], check=True)
            decky.logger.info(f"Fan mode set to {name} (index {value})")
        except subprocess.CalledProcessError as e:
            decky.logger.error(f"Failed to set fan mode: {e}")
            raise

    async def get_current_fan_mode(self) -> int:
        try:
            result = subprocess.run(["pkexec", "nvpmodel", "-q"], capture_output=True, text=True, check=True)
            lines = result.stdout.strip().splitlines()
            if lines:
                first_line = lines[0]
                match = re.search(r":\s*(.+)", first_line)
                if match:
                    fan_name = match.group(1).strip()
                    return self.FAN_NAME_TO_INDEX.get(fan_name, 0)
            return 0
        except Exception as e:
            decky.logger.error(f"Failed to get fan mode: {e}")
            return 0

    # ---------- Brightness ----------
    async def get_brightness(self) -> int:
        try:
            result = subprocess.run(["brightnessctl", "get"], capture_output=True, text=True, check=True)
            current = int(result.stdout.strip())
            max_result = subprocess.run(["brightnessctl", "max"], capture_output=True, text=True, check=True)
            max_val = int(max_result.stdout.strip())
            percent = int((current / max_val) * 100)
            return percent
        except Exception as e:
            decky.logger.error(f"get_brightness failed: {e}")
            return 50

    async def set_brightness(self, value: int) -> None:
        value = max(1, min(100, value))
        try:
            subprocess.run(["sg", "video", "-c", f"brightnessctl set {value}%"], check=True, capture_output=True, text=True)
            decky.logger.info(f"Brightness set to {value}% via sg video")
        except:
            try:
                subprocess.run(["brightnessctl", "set", f"{value}%"], check=True, capture_output=True, text=True)
                decky.logger.info(f"Brightness set to {value}% directly")
            except Exception as e:
                decky.logger.error(f"set_brightness failed: {e}")
                raise

    # ---------- Volume ----------
    async def get_volume(self) -> int:
        try:
            env = os.environ.copy()
            env['XDG_RUNTIME_DIR'] = self.runtime_dir
            result = subprocess.run(
                ["pactl", "get-sink-volume", "@DEFAULT_SINK@"],
                capture_output=True, text=True, check=True, env=env
            )
            match = re.search(r'(\d+)%', result.stdout)
            if match:
                return int(match.group(1))
        except Exception as e:
            decky.logger.error(f"get_volume failed: {e}")
        return 50

    async def set_volume(self, value: int) -> None:
        value = max(0, min(100, value))
        try:
            env = os.environ.copy()
            env['XDG_RUNTIME_DIR'] = self.runtime_dir
            subprocess.run(
                ["pactl", "set-sink-volume", "@DEFAULT_SINK@", f"{value}%"],
                check=True, capture_output=True, text=True, env=env
            )
            decky.logger.info(f"Volume set to {value}%")
        except Exception as e:
            decky.logger.error(f"set_volume failed: {e}")
            raise

    # ---------- Run scripts ----------
    async def run_reboot_hekate(self) -> None:
        try:
            subprocess.run(["echo", "h"], check=True, capture_output=True, text=True)
            decky.logger.info("reboot-hekate executed")
        except Exception as e:
            decky.logger.error(f"reboot-hekate failed: {e}")
            raise

    async def run_switch_desktop(self) -> None:
        try:
            subprocess.run(["switch-desktop"], check=True, capture_output=True, text=True)
            decky.logger.info("switch-desktop executed")
        except Exception as e:
            decky.logger.error(f"switch-desktop failed: {e}")
            raise

    # ---------- Temperatures (1 second interval) ----------
    async def start_tegrastats(self) -> None:
        if self.tegrastats_process is not None:
            return
        try:
            self.tegrastats_process = await asyncio.create_subprocess_exec(
                "tegrastats", "--interval", "1000",
                stdout=subprocess.PIPE, stderr=subprocess.PIPE
            )
            asyncio.create_task(self._read_tegrastats_output())
            decky.logger.info("tegrastats started (1s interval)")
        except FileNotFoundError:
            decky.logger.error("tegrastats not found")
        except Exception as e:
            decky.logger.error(f"Failed to start tegrastats: {e}")

    async def _read_tegrastats_output(self) -> None:
        while self.tegrastats_process:
            try:
                line = await self.tegrastats_process.stdout.readline()
                if not line:
                    break
                async with self.lock:
                    self.latest_line = line.decode().strip()
            except Exception as e:
                decky.logger.error(f"Error reading tegrastats: {e}")
                break
        self.tegrastats_process = None

    async def stop_tegrastats(self) -> None:
        if self.tegrastats_process:
            self.tegrastats_process.terminate()
            await self.tegrastats_process.wait()
            self.tegrastats_process = None
            async with self.lock:
                self.latest_line = ""
            decky.logger.info("tegrastats stopped")

    async def get_tegrastats_data(self) -> dict:
        async with self.lock:
            line = self.latest_line
        if not line:
            return {"cpu": "--", "gpu": "--", "battery": "--"}
        cpu_match = re.search(r'CPU@([\d\.]+)C', line)
        gpu_match = re.search(r'GPU@([\d\.]+)C', line)
        battery_match = re.search(r'battery@([\d\.]+)C', line)

        def fmt(match):
            try:
                return f"{float(match.group(1)):.1f}"
            except:
                return "--"

        return {
            "cpu": fmt(cpu_match) if cpu_match else "--",
            "gpu": fmt(gpu_match) if gpu_match else "--",
            "battery": fmt(battery_match) if battery_match else "--"
        }

    # ---------- Wi‑Fi ----------
    async def get_wifi_status(self):
        env = self._get_nmcli_env()
        decky.logger.info("[WiFi] Getting status")
        try:
            radio = subprocess.run(["nmcli", "-t", "-f", "WIFI", "general"], capture_output=True, text=True, env=env)
            enabled = radio.stdout.strip() == "enabled"
            current_ssid = None
            if enabled:
                conns = subprocess.run(["nmcli", "-t", "-f", "NAME,DEVICE", "connection", "show", "--active"], capture_output=True, text=True, env=env)
                for line in conns.stdout.strip().split('\n'):
                    if not line:
                        continue
                    parts = line.split(':')
                    if len(parts) >= 2 and parts[1] and parts[1] != "lo":
                        current_ssid = parts[0]
                        break
            decky.logger.info(f"[WiFi] Status: enabled={enabled}, ssid={current_ssid}")
            return {"enabled": enabled, "current_ssid": current_ssid}
        except Exception as e:
            decky.logger.error(f"[WiFi] get_wifi_status error: {e}")
            return {"enabled": False, "current_ssid": None}

    async def scan_wifi_networks(self):
        env = self._get_nmcli_env()
        decky.logger.info("[WiFi] Scanning networks")
        try:
            process = await asyncio.create_subprocess_exec(
                "nmcli", "-t", "-f", "SSID,SIGNAL,SECURITY", "device", "wifi", "list",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env
            )
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=15.0)
            result = stdout.decode()
            if stderr:
                decky.logger.warning(f"[WiFi] Scan stderr: {stderr.decode()}")
            networks = []
            for line in result.strip().split('\n'):
                if not line:
                    continue
                parts = line.split(':')
                if len(parts) >= 3 and parts[0]:
                    networks.append({
                        "ssid": parts[0],
                        "signal": int(parts[1]) if parts[1].isdigit() else 0,
                        "secured": parts[2] != ''
                    })
            decky.logger.info(f"[WiFi] Found {len(networks)} networks")
            return networks[:30]
        except asyncio.TimeoutError:
            decky.logger.error("[WiFi] Scan timeout")
            return []
        except Exception as e:
            decky.logger.error(f"[WiFi] Scan error: {e}")
            return []

    async def connect_wifi(self, ssid: str, password: str = None):
        env = self._get_nmcli_env()
        decky.logger.info(f"[WiFi] Connecting to {ssid}")
        try:
            subprocess.run(["nmcli", "connection", "delete", ssid], capture_output=True, env=env)
            if password:
                result = subprocess.run(
                    ["nmcli", "device", "wifi", "connect", ssid, "password", password],
                    capture_output=True, text=True, env=env
                )
            else:
                result = subprocess.run(
                    ["nmcli", "device", "wifi", "connect", ssid],
                    capture_output=True, text=True, env=env
                )
            if result.returncode == 2:
                decky.logger.warning("[WiFi] Wrong password")
                return {"success": False, "error": "wrong_password"}
            elif result.returncode != 0:
                decky.logger.error(f"[WiFi] Connection failed: {result.stderr}")
                return {"success": False, "error": result.stderr}
            decky.logger.info("[WiFi] Connection successful")
            return {"success": True, "error": None}
        except Exception as e:
            decky.logger.error(f"[WiFi] Connect error: {e}")
            return {"success": False, "error": str(e)}

    async def disconnect_wifi(self):
        env = self._get_nmcli_env()
        decky.logger.info("[WiFi] Disconnecting")
        try:
            status = await self.get_wifi_status()
            if status["current_ssid"]:
                subprocess.run(["nmcli", "connection", "down", status["current_ssid"]], check=True, capture_output=True, env=env)
                decky.logger.info("[WiFi] Disconnected")
            return True
        except Exception as e:
            decky.logger.error(f"[WiFi] Disconnect error: {e}")
            return False

    async def toggle_wifi(self):
        env = self._get_nmcli_env()
        decky.logger.info("[WiFi] Toggling")
        try:
            status = await self.get_wifi_status()
            if status["enabled"]:
                subprocess.run(["nmcli", "radio", "wifi", "off"], check=True, capture_output=True, env=env)
            else:
                subprocess.run(["nmcli", "radio", "wifi", "on"], check=True, capture_output=True, env=env)
            decky.logger.info("[WiFi] Toggled")
            return True
        except Exception as e:
            decky.logger.error(f"[WiFi] Toggle error: {e}")
            return False

    def _get_nmcli_env(self):
        env = os.environ.copy()
        if 'DBUS_SESSION_BUS_ADDRESS' not in env:
            try:
                result = subprocess.run(
                    ["ps", "e", "-u", str(os.getuid())],
                    capture_output=True, text=True
                )
                for line in result.stdout.splitlines():
                    if "DBUS_SESSION_BUS_ADDRESS" in line:
                        match = re.search(r'DBUS_SESSION_BUS_ADDRESS=([^\s]+)', line)
                        if match:
                            env['DBUS_SESSION_BUS_ADDRESS'] = match.group(1)
                            break
                if 'DBUS_SESSION_BUS_ADDRESS' not in env:
                    dbus_out = subprocess.run(["dbus-launch"], capture_output=True, text=True)
                    for line in dbus_out.stdout.splitlines():
                        if line.startswith("DBUS_SESSION_BUS_ADDRESS="):
                            env['DBUS_SESSION_BUS_ADDRESS'] = line.split('=', 1)[1]
                            break
            except Exception as e:
                decky.logger.error(f"Failed to set DBus env: {e}")
        return env

    # ---------- Bluetooth with proper power management ----------
    async def get_bluetooth_powered(self) -> bool:
        """Check if Bluetooth is powered on via bluetoothctl show."""
        try:
            result = subprocess.run(["bluetoothctl", "show"], capture_output=True, text=True, timeout=5)
            powered = "Powered: yes" in result.stdout
            decky.logger.info(f"[BT] Powered state: {powered}")
            return powered
        except Exception as e:
            decky.logger.error(f"[BT] get_bluetooth_powered error: {e}")
            return False

    async def set_bluetooth_power(self, on: bool) -> bool:
        """Set Bluetooth power state."""
        try:
            cmd = "on" if on else "off"
            result = subprocess.run(["bluetoothctl", "power", cmd], capture_output=True, text=True, timeout=5)
            decky.logger.info(f"[BT] Power {cmd} result: returncode={result.returncode}, stdout='{result.stdout.strip()}', stderr='{result.stderr.strip()}'")
            return result.returncode == 0
        except Exception as e:
            decky.logger.error(f"[BT] set_bluetooth_power error: {e}")
            return False

    async def ensure_bluetooth_powered(self) -> bool:
        """Ensure Bluetooth is powered on, handling the NotReady error."""
        decky.logger.info("[BT] Ensuring Bluetooth is powered on")
        try:
            # First, try to get the current state
            powered = await self.get_bluetooth_powered()
            if powered:
                decky.logger.info("[BT] Bluetooth already powered on")
                return True

            # If not powered, try to power on
            decky.logger.info("[BT] Bluetooth not powered, attempting to power on")

            # Try power on with a small delay to let the adapter initialize
            for attempt in range(3):
                success = await self.set_bluetooth_power(True)
                if success:
                    await asyncio.sleep(0.5)
                    # Verify it's actually powered on
                    powered = await self.get_bluetooth_powered()
                    if powered:
                        decky.logger.info(f"[BT] Bluetooth powered on successfully (attempt {attempt + 1})")
                        return True
                decky.logger.warning(f"[BT] Power on attempt {attempt + 1} failed, retrying...")
                await asyncio.sleep(0.5)

            # If we still can't power on, try a reset
            decky.logger.info("[BT] Trying Bluetooth reset...")
            await self.set_bluetooth_power(False)
            await asyncio.sleep(0.5)
            await self.set_bluetooth_power(True)
            await asyncio.sleep(0.5)
            powered = await self.get_bluetooth_powered()
            if powered:
                decky.logger.info("[BT] Bluetooth powered on after reset")
                return True

            decky.logger.error("[BT] Failed to power on Bluetooth after multiple attempts")
            return False
        except Exception as e:
            decky.logger.error(f"[BT] ensure_bluetooth_powered error: {e}")
            return False

    async def start_bluetooth_scan(self):
        """Start streaming Bluetooth scan using --timeout 15."""
        decky.logger.info("[BT] ========== START SCAN ==========")
        async with self.bluetooth_lock:
            if self.bluetooth_scan_task is not None:
                decky.logger.info("[BT] Scan already running, returning")
                return

            # Ensure Bluetooth is powered on first
            if not await self.ensure_bluetooth_powered():
                decky.logger.error("[BT] Cannot start scan - Bluetooth failed to power on")
                return

            # Clear discovered devices list
            self.discovered_devices = []
            decky.logger.info("[BT] Starting scan subprocess: bluetoothctl --timeout 15 scan on")
            self.bluetooth_scan_process = await asyncio.create_subprocess_exec(
                "bluetoothctl", "--timeout", "15", "scan", "on",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            decky.logger.info(f"[BT] Scan process started with PID: {self.bluetooth_scan_process.pid if self.bluetooth_scan_process else 'None'}")
            self.bluetooth_scan_task = asyncio.create_task(self._read_bluetooth_scan_output())
            decky.logger.info("[BT] Scan task created, waiting for output")

    async def _read_bluetooth_scan_output(self):
        """Read lines from the scan process as they arrive (incremental)."""
        decky.logger.info("[BT] _read_bluetooth_scan_output task started")
        seen_macs = set()
        line_count = 0
        raw_output_lines = []

        while self.bluetooth_scan_process:
            try:
                line = await self.bluetooth_scan_process.stdout.readline()
                if not line:
                    decky.logger.info("[BT] stdout EOF, scan process finished")
                    break
                line_count += 1
                line_str = line.decode().strip()
                raw_output_lines.append(line_str)
                decky.logger.info(f"[BT] RAW LINE {line_count}: {line_str}")

                # Clean ANSI escape codes
                clean_line = re.sub(r'\x1b\[[0-9;]*m', '', line_str)
                decky.logger.info(f"[BT] CLEAN LINE: {clean_line}")

                # Process lines that contain "[NEW] Device" or "Device"
                if "[NEW] Device" in clean_line or clean_line.startswith("Device"):
                    decky.logger.info(f"[BT] Found device line: {clean_line}")

                    # Remove "[NEW]" prefix if present
                    clean_line_no_new = clean_line.replace("[NEW]", "").strip()
                    # Split into parts: "Device", "MAC", "Name"
                    parts = clean_line_no_new.split(" ", 2)

                    if len(parts) >= 3:
                        mac = parts[1]  # This is the MAC address
                        name = parts[2]  # This is the device name
                        decky.logger.info(f"[BT] Parsed: MAC={mac}, Name={name}")

                        if mac not in seen_macs:
                            seen_macs.add(mac)
                            # Get device status - check if already paired/trusted
                            info = subprocess.run(["bluetoothctl", "info", mac], capture_output=True, text=True, timeout=3)
                            paired = "Paired: yes" in info.stdout
                            connected = "Connected: yes" in info.stdout
                            trusted = "Trusted: yes" in info.stdout
                            device = {
                                "mac": mac,
                                "name": name,
                                "paired": paired,
                                "connected": connected,
                                "trusted": trusted
                            }
                            self.discovered_devices.append(device)
                            decky.logger.info(f"[BT] Added device: {device}")
                        else:
                            decky.logger.info(f"[BT] Duplicate device: {mac}")
                    else:
                        decky.logger.info(f"[BT] Could not parse line: {clean_line}")
            except Exception as e:
                decky.logger.error(f"[BT] Error reading scan: {e}")
                break

        # Log all raw output at the end for debugging
        decky.logger.info(f"[BT] Total lines read: {line_count}")
        if raw_output_lines:
            decky.logger.info(f"[BT] Full raw output:\n" + "\n".join(raw_output_lines))
        else:
            decky.logger.warning("[BT] No output received from bluetoothctl scan")

        decky.logger.info(f"[BT] Scan completed, discovered {len(self.discovered_devices)} devices")
        self.bluetooth_scan_process = None
        self.bluetooth_scan_task = None
        decky.logger.info("[BT] ========== SCAN END ==========")

    async def stop_bluetooth_scan(self):
        """Stop the scan (don't power off)."""
        decky.logger.info("[BT] stop_bluetooth_scan called")
        async with self.bluetooth_lock:
            if self.bluetooth_scan_process:
                decky.logger.info("[BT] Terminating scan process")
                self.bluetooth_scan_process.terminate()
                await self.bluetooth_scan_process.wait()
                self.bluetooth_scan_process = None
            if self.bluetooth_scan_task:
                decky.logger.info("[BT] Cancelling read task")
                self.bluetooth_scan_task.cancel()
                self.bluetooth_scan_task = None
            decky.logger.info("[BT] Scan stopped (power remains on)")

    async def get_discovered_devices(self):
        """Return current list of discovered devices (incremental)."""
        async with self.bluetooth_lock:
            device_count = len(self.discovered_devices)
            decky.logger.info(f"[BT] get_discovered_devices returning {device_count} devices")
            return list(self.discovered_devices)

    async def get_paired_devices(self):
        """Return paired devices (using Trusted devices)."""
        decky.logger.info("[BT] get_paired_devices called")
        try:
            # Use "devices Trusted" to get trusted/paired devices
            result = subprocess.run(["bluetoothctl", "devices", "Trusted"], capture_output=True, text=True, timeout=5)
            decky.logger.info(f"[BT] Trusted devices command: returncode={result.returncode}, stdout='{result.stdout.strip()}'")

            # Also check regular paired devices as fallback
            paired_result = subprocess.run(["bluetoothctl", "devices", "Paired"], capture_output=True, text=True, timeout=5)
            decky.logger.info(f"[BT] Paired devices command: returncode={paired_result.returncode}, stdout='{paired_result.stdout.strip()}'")

            devices = []
            processed_macs = set()

            # Process Trusted devices first
            for line in result.stdout.split('\n'):
                if line.startswith("Device"):
                    parts = line.split(" ", 2)
                    if len(parts) >= 3:
                        mac = parts[1]
                        name = parts[2]
                        if mac not in processed_macs:
                            processed_macs.add(mac)
                            info = subprocess.run(["bluetoothctl", "info", mac], capture_output=True, text=True, timeout=3)
                            connected = "Connected: yes" in info.stdout
                            devices.append({
                                "mac": mac,
                                "name": name,
                                "paired": True,
                                "connected": connected
                            })
                            decky.logger.info(f"[BT] Trusted device: {name} ({mac}), connected={connected}")

            # Then process Paired devices that weren't already found
            for line in paired_result.stdout.split('\n'):
                if line.startswith("Device"):
                    parts = line.split(" ", 2)
                    if len(parts) >= 3:
                        mac = parts[1]
                        name = parts[2]
                        if mac not in processed_macs:
                            processed_macs.add(mac)
                            info = subprocess.run(["bluetoothctl", "info", mac], capture_output=True, text=True, timeout=3)
                            connected = "Connected: yes" in info.stdout
                            devices.append({
                                "mac": mac,
                                "name": name,
                                "paired": True,
                                "connected": connected
                            })
                            decky.logger.info(f"[BT] Paired device: {name} ({mac}), connected={connected}")

            decky.logger.info(f"[BT] Found {len(devices)} trusted/paired devices")
            return devices
        except Exception as e:
            decky.logger.error(f"[BT] get_paired_devices error: {e}")
            return []

    async def get_connected_devices(self):
        """Return currently connected devices."""
        decky.logger.info("[BT] get_connected_devices called")
        try:
            result = subprocess.run(["bluetoothctl", "devices", "Connected"], capture_output=True, text=True, timeout=5)
            decky.logger.info(f"[BT] Connected devices command: returncode={result.returncode}, stdout='{result.stdout.strip()}'")
            devices = []
            for line in result.stdout.split('\n'):
                if line.startswith("Device"):
                    parts = line.split(" ", 2)
                    if len(parts) >= 3:
                        mac = parts[1]
                        name = parts[2]
                        devices.append({
                            "mac": mac,
                            "name": name,
                            "connected": True
                        })
                        decky.logger.info(f"[BT] Connected device: {name} ({mac})")
            decky.logger.info(f"[BT] Found {len(devices)} connected devices")
            return devices
        except Exception as e:
            decky.logger.error(f"[BT] get_connected_devices error: {e}")
            return []

    async def get_bluetooth_status(self):
        """Return enabled status (persistent)."""
        decky.logger.info("[BT] get_bluetooth_status called")
        try:
            powered = await self.get_bluetooth_powered()
            decky.logger.info(f"[BT] Bluetooth powered: {powered}")
            return {"enabled": powered}
        except Exception as e:
            decky.logger.error(f"[BT] get_bluetooth_status error: {e}")
            return {"enabled": False}

    async def toggle_bluetooth(self):
        """Toggle Bluetooth power state with proper error handling."""
        decky.logger.info("[BT] Toggle called")
        try:
            # First, try to get the current state
            try:
                powered = await self.get_bluetooth_powered()
            except Exception as e:
                decky.logger.error(f"[BT] Error getting powered state: {e}")
                powered = False

            if powered:
                decky.logger.info("[BT] Toggling OFF")
                await self.stop_bluetooth_scan()
                await self.set_bluetooth_power(False)
                # Verify it turned off
                await asyncio.sleep(0.5)
                powered = await self.get_bluetooth_powered()
                if powered:
                    decky.logger.warning("[BT] Bluetooth didn't turn off, trying again")
                    await self.set_bluetooth_power(False)
                decky.logger.info("[BT] Powered OFF")
            else:
                decky.logger.info("[BT] Toggling ON")
                # Ensure Bluetooth powers on properly
                if await self.ensure_bluetooth_powered():
                    decky.logger.info("[BT] Powered ON")
                    # Start scan after power on
                    await self.start_bluetooth_scan()
                else:
                    decky.logger.error("[BT] Failed to power on Bluetooth")
                    return False
            return True
        except Exception as e:
            decky.logger.error(f"[BT] Toggle error: {e}")
            return False

    async def refresh_bluetooth(self):
        """Refresh: power off, power on, then scan."""
        decky.logger.info("[BT] Refresh called")
        try:
            # Stop current scan
            await self.stop_bluetooth_scan()
            # Power off
            await self.set_bluetooth_power(False)
            await asyncio.sleep(0.5)
            # Power on using ensure method
            if await self.ensure_bluetooth_powered():
                # Start fresh scan
                await self.start_bluetooth_scan()
                return True
            else:
                decky.logger.error("[BT] Refresh failed - could not power on Bluetooth")
                return False
        except Exception as e:
            decky.logger.error(f"[BT] Refresh error: {e}")
            return False

    async def connect_bluetooth(self, mac: str):
        """Connect to a device using trust (no pair)."""
        decky.logger.info(f"[BT] Connecting {mac}")
        try:
            # Stop scan if running
            await self.stop_bluetooth_scan()

            # Ensure Bluetooth is powered on
            if not await self.ensure_bluetooth_powered():
                decky.logger.error("[BT] Cannot connect - Bluetooth failed to power on")
                return False

            await asyncio.sleep(0.5)

            # Trust the device first (more reliable than pair)
            decky.logger.info(f"[BT] Running: bluetoothctl trust {mac}")
            trust_result = subprocess.run(["bluetoothctl", "trust", mac], capture_output=True, text=True, timeout=5)
            decky.logger.info(f"[BT] Trust result: returncode={trust_result.returncode}, stdout='{trust_result.stdout.strip()}', stderr='{trust_result.stderr.strip()}'")

            # Then connect
            decky.logger.info(f"[BT] Running: bluetoothctl connect {mac}")
            result = subprocess.run(["bluetoothctl", "connect", mac], capture_output=True, text=True, timeout=10)
            decky.logger.info(f"[BT] Connect result: returncode={result.returncode}, stdout='{result.stdout.strip()}', stderr='{result.stderr.strip()}'")

            success = result.returncode == 0
            if success:
                decky.logger.info(f"[BT] Connected to {mac}")
            else:
                # Try one more time with a different approach
                decky.logger.info(f"[BT] First connect attempt failed, trying again...")
                await asyncio.sleep(0.5)
                result = subprocess.run(["bluetoothctl", "connect", mac], capture_output=True, text=True, timeout=10)
                success = result.returncode == 0
                if success:
                    decky.logger.info(f"[BT] Connected to {mac} on second attempt")
                else:
                    decky.logger.error(f"[BT] Connect failed: {result.stderr}")
            return success
        except Exception as e:
            decky.logger.error(f"[BT] Connect error: {e}")
            return False

    async def disconnect_bluetooth(self, mac: str):
        decky.logger.info(f"[BT] Disconnecting {mac}")
        try:
            result = subprocess.run(["bluetoothctl", "disconnect", mac], capture_output=True, text=True, timeout=10)
            decky.logger.info(f"[BT] Disconnect result: returncode={result.returncode}, stdout='{result.stdout.strip()}', stderr='{result.stderr.strip()}'")
            success = result.returncode == 0
            if success:
                decky.logger.info(f"[BT] Disconnected from {mac}")
            else:
                decky.logger.error(f"[BT] Disconnect failed: {result.stderr}")
            return success
        except Exception as e:
            decky.logger.error(f"[BT] Disconnect error: {e}")
            return False

    async def forget_bluetooth(self, mac: str):
        decky.logger.info(f"[BT] Forgetting {mac}")
        try:
            result = subprocess.run(["bluetoothctl", "remove", mac], capture_output=True, text=True, timeout=10)
            decky.logger.info(f"[BT] Forget result: returncode={result.returncode}, stdout='{result.stdout.strip()}', stderr='{result.stderr.strip()}'")
            success = result.returncode == 0
            if success:
                decky.logger.info(f"[BT] Forgotten {mac}")
            else:
                decky.logger.error(f"[BT] Forget failed: {result.stderr}")
            return success
        except Exception as e:
            decky.logger.error(f"[BT] Forget error: {e}")
            return False

    async def pair_bluetooth(self, mac: str):
        """Pair a device (kept for compatibility, but we prefer trust+connect)."""
        decky.logger.info(f"[BT] Pairing {mac} (deprecated, use trust+connect)")
        # Just trust and connect instead
        return await self.connect_bluetooth(mac)

    async def pair_and_connect_bluetooth(self, mac: str):
        """Pair and connect a device using trust (no actual pair needed)."""
        decky.logger.info(f"[BT] Connecting {mac} using trust method")
        return await self.connect_bluetooth(mac)

    # ---------- Lifecycle ----------
    async def _main(self):
        import grp
        groups = [grp.getgrgid(g).gr_name for g in os.getgroups()]
        decky.logger.info(f"Plugin groups: {groups}")
        decky.logger.info("NintenDeck plugin loaded (offline CSV, 1s temps, Bluetooth streaming)")

    async def _unload(self):
        await self.stop_tegrastats()
        await self.stop_bluetooth_scan()
        decky.logger.info("NintenDeck plugin unloaded")
