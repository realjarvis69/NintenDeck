#!/usr/bin/env python3

import decky
import subprocess
import re
import asyncio
import os
import base64
import csv
import time
import json
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
        self.last_csv_download = 0
        self.csv_cache_duration = 12 * 60 * 60  # 12 hours in seconds
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
        """Get compatibility data with 12-hour caching."""
        online = await self.is_online()
        current_time = time.time()

        # Check if we should download fresh data
        should_download = False
        if online:
            # Only download if cache is older than 12 hours or cache doesn't exist
            if not self.cache_file.exists():
                should_download = True
                decky.logger.info("Cache file doesn't exist, downloading...")
            elif (current_time - self.last_csv_download) > self.csv_cache_duration:
                should_download = True
                decky.logger.info("Cache is older than 12 hours, refreshing...")
            else:
                decky.logger.info(f"Using cached CSV (age: {int((current_time - self.last_csv_download) / 60)} minutes)")

        # Download if needed
        data = None
        if should_download:
            try:
                decky.logger.info("Downloading fresh CSV...")
                with urlopen(self.csv_url) as response:
                    content = response.read().decode('utf-8')
                    with open(self.cache_file, 'w') as f:
                        f.write(content)
                    self.last_csv_download = current_time
                    data = content
                decky.logger.info("CSV downloaded and cached")
            except Exception as e:
                decky.logger.error(f"Failed to download CSV: {e}")
                if self.cache_file.exists():
                    with open(self.cache_file, 'r') as f:
                        data = f.read()
                    decky.logger.info("Using cached CSV (download failed)")
        else:
            # Use cached data
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
                "oc_mode": row.get('OC Profile', ''),
                "ram_oc": row.get('RAM OC', ''),
                "rating": rating,
                "avg_fps": row.get('FPS', ''),
                "compatibility_tool": row.get('Compatibility Tool', ''),
                "launch_options": row.get('Launch Options', ''),
                "extra_info": row.get('Extra Information', ''),
                "submitted_by": row.get('Submitted by', '')
            })
        return sorted(games, key=lambda x: x['name'].lower())

    async def sync_compatibility(self) -> bool:
        """Force refresh the compatibility cache."""
        try:
            decky.logger.info("Manual sync triggered")
            with urlopen(self.csv_url) as response:
                content = response.read().decode('utf-8')
                with open(self.cache_file, 'w') as f:
                    f.write(content)
                self.last_csv_download = time.time()
            decky.logger.info("CSV manually synced")
            return True
        except Exception as e:
            decky.logger.error(f"Manual sync failed: {e}")
            return False

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
        """Run reboot-hekate script with pkexec."""
        try:
            decky.logger.info("run_reboot_hekate called")
            script_path = "/usr/bin/reboot-hekate"
            if not os.path.exists(script_path):
                decky.logger.error(f"Script not found: {script_path}")
                raise FileNotFoundError(f"Script not found: {script_path}")
            env = os.environ.copy()
            env['PATH'] = '/usr/bin:/usr/local/bin:/bin:/usr/sbin:/sbin'
            env['HOME'] = os.path.expanduser('~')
            result = subprocess.run(
                ["pkexec", "--disable-internal-agent", script_path],
                capture_output=True,
                text=True,
                env=env,
                timeout=30
            )
            decky.logger.info(f"reboot-hekate exit code: {result.returncode}")
            if result.stdout:
                decky.logger.info(f"reboot-hekate stdout: {result.stdout}")
            if result.stderr:
                decky.logger.warning(f"reboot-hekate stderr: {result.stderr}")
            if result.returncode != 0:
                decky.logger.error(f"reboot-hekate failed with code {result.returncode}")
                raise subprocess.CalledProcessError(result.returncode, "reboot-hekate", result.stdout, result.stderr)
            decky.logger.info("reboot-hekate executed successfully")
        except subprocess.TimeoutExpired:
            decky.logger.error("reboot-hekate timed out")
            raise
        except Exception as e:
            decky.logger.error(f"reboot-hekate failed: {e}")
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

    # ---------- Bluetooth ----------
    async def get_bluetooth_powered(self) -> bool:
        try:
            result = subprocess.run(["bluetoothctl", "show"], capture_output=True, text=True, timeout=5)
            powered = "Powered: yes" in result.stdout
            decky.logger.info(f"[BT] Powered state: {powered}")
            return powered
        except Exception as e:
            decky.logger.error(f"[BT] get_bluetooth_powered error: {e}")
            return False

    async def set_bluetooth_power(self, on: bool) -> bool:
        try:
            cmd = "on" if on else "off"
            result = subprocess.run(["bluetoothctl", "power", cmd], capture_output=True, text=True, timeout=5)
            decky.logger.info(f"[BT] Power {cmd} result: returncode={result.returncode}")
            return result.returncode == 0
        except Exception as e:
            decky.logger.error(f"[BT] set_bluetooth_power error: {e}")
            return False

    async def ensure_bluetooth_powered(self) -> bool:
        decky.logger.info("[BT] Ensuring Bluetooth is powered on")
        try:
            powered = await self.get_bluetooth_powered()
            if powered:
                decky.logger.info("[BT] Bluetooth already powered on")
                return True
            decky.logger.info("[BT] Bluetooth not powered, attempting to power on")
            for attempt in range(3):
                success = await self.set_bluetooth_power(True)
                if success:
                    await asyncio.sleep(0.5)
                    powered = await self.get_bluetooth_powered()
                    if powered:
                        decky.logger.info(f"[BT] Bluetooth powered on successfully (attempt {attempt + 1})")
                        return True
                decky.logger.warning(f"[BT] Power on attempt {attempt + 1} failed, retrying...")
                await asyncio.sleep(0.5)
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
        decky.logger.info("[BT] ========== START SCAN ==========")
        async with self.bluetooth_lock:
            if self.bluetooth_scan_task is not None:
                decky.logger.info("[BT] Scan already running, returning")
                return
            if not await self.ensure_bluetooth_powered():
                decky.logger.error("[BT] Cannot start scan - Bluetooth failed to power on")
                return
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
                clean_line = re.sub(r'\x1b\[[0-9;]*m', '', line_str)
                decky.logger.info(f"[BT] CLEAN LINE: {clean_line}")
                if "[NEW] Device" in clean_line or clean_line.startswith("Device"):
                    decky.logger.info(f"[BT] Found device line: {clean_line}")
                    clean_line_no_new = clean_line.replace("[NEW]", "").strip()
                    parts = clean_line_no_new.split(" ", 2)
                    if len(parts) >= 3:
                        mac = parts[1]
                        name = parts[2]
                        decky.logger.info(f"[BT] Parsed: MAC={mac}, Name={name}")
                        if mac not in seen_macs:
                            seen_macs.add(mac)
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
        async with self.bluetooth_lock:
            device_count = len(self.discovered_devices)
            decky.logger.info(f"[BT] get_discovered_devices returning {device_count} devices")
            return list(self.discovered_devices)

    async def get_paired_devices(self):
        decky.logger.info("[BT] get_paired_devices called")
        try:
            result = subprocess.run(["bluetoothctl", "devices", "Trusted"], capture_output=True, text=True, timeout=5)
            decky.logger.info(f"[BT] Trusted devices command: returncode={result.returncode}")
            paired_result = subprocess.run(["bluetoothctl", "devices", "Paired"], capture_output=True, text=True, timeout=5)
            devices = []
            processed_macs = set()
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
                            devices.append({"mac": mac, "name": name, "paired": True, "connected": connected})
                            decky.logger.info(f"[BT] Trusted device: {name} ({mac}), connected={connected}")
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
                            devices.append({"mac": mac, "name": name, "paired": True, "connected": connected})
                            decky.logger.info(f"[BT] Paired device: {name} ({mac}), connected={connected}")
            decky.logger.info(f"[BT] Found {len(devices)} trusted/paired devices")
            return devices
        except Exception as e:
            decky.logger.error(f"[BT] get_paired_devices error: {e}")
            return []

    async def get_connected_devices(self):
        decky.logger.info("[BT] get_connected_devices called")
        try:
            result = subprocess.run(["bluetoothctl", "devices", "Connected"], capture_output=True, text=True, timeout=5)
            devices = []
            for line in result.stdout.split('\n'):
                if line.startswith("Device"):
                    parts = line.split(" ", 2)
                    if len(parts) >= 3:
                        mac = parts[1]
                        name = parts[2]
                        devices.append({"mac": mac, "name": name, "connected": True})
                        decky.logger.info(f"[BT] Connected device: {name} ({mac})")
            decky.logger.info(f"[BT] Found {len(devices)} connected devices")
            return devices
        except Exception as e:
            decky.logger.error(f"[BT] get_connected_devices error: {e}")
            return []

    async def get_bluetooth_status(self):
        decky.logger.info("[BT] get_bluetooth_status called")
        try:
            powered = await self.get_bluetooth_powered()
            decky.logger.info(f"[BT] Bluetooth powered: {powered}")
            return {"enabled": powered}
        except Exception as e:
            decky.logger.error(f"[BT] get_bluetooth_status error: {e}")
            return {"enabled": False}

    async def toggle_bluetooth(self):
        decky.logger.info("[BT] Toggle called")
        try:
            try:
                powered = await self.get_bluetooth_powered()
            except Exception as e:
                decky.logger.error(f"[BT] Error getting powered state: {e}")
                powered = False
            if powered:
                decky.logger.info("[BT] Toggling OFF")
                await self.stop_bluetooth_scan()
                await self.set_bluetooth_power(False)
                await asyncio.sleep(0.5)
                powered = await self.get_bluetooth_powered()
                if powered:
                    decky.logger.warning("[BT] Bluetooth didn't turn off, trying again")
                    await self.set_bluetooth_power(False)
                decky.logger.info("[BT] Powered OFF")
            else:
                decky.logger.info("[BT] Toggling ON")
                if await self.ensure_bluetooth_powered():
                    decky.logger.info("[BT] Powered ON")
                    await self.start_bluetooth_scan()
                else:
                    decky.logger.error("[BT] Failed to power on Bluetooth")
                    return False
            return True
        except Exception as e:
            decky.logger.error(f"[BT] Toggle error: {e}")
            return False

    async def refresh_bluetooth(self):
        decky.logger.info("[BT] Refresh called")
        try:
            await self.stop_bluetooth_scan()
            await self.set_bluetooth_power(False)
            await asyncio.sleep(0.5)
            if await self.ensure_bluetooth_powered():
                await self.start_bluetooth_scan()
                return True
            else:
                decky.logger.error("[BT] Refresh failed - could not power on Bluetooth")
                return False
        except Exception as e:
            decky.logger.error(f"[BT] Refresh error: {e}")
            return False

    async def connect_bluetooth(self, mac: str):
        decky.logger.info(f"[BT] Connecting {mac}")
        try:
            await self.stop_bluetooth_scan()
            if not await self.ensure_bluetooth_powered():
                decky.logger.error("[BT] Cannot connect - Bluetooth failed to power on")
                return False
            await asyncio.sleep(0.5)
            decky.logger.info(f"[BT] Running: bluetoothctl trust {mac}")
            trust_result = subprocess.run(["bluetoothctl", "trust", mac], capture_output=True, text=True, timeout=5)
            decky.logger.info(f"[BT] Trust result: returncode={trust_result.returncode}")
            decky.logger.info(f"[BT] Running: bluetoothctl connect {mac}")
            result = subprocess.run(["bluetoothctl", "connect", mac], capture_output=True, text=True, timeout=10)
            decky.logger.info(f"[BT] Connect result: returncode={result.returncode}")
            success = result.returncode == 0
            if success:
                decky.logger.info(f"[BT] Connected to {mac}")
            else:
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
        decky.logger.info(f"[BT] Pairing {mac} (deprecated, use trust+connect)")
        return await self.connect_bluetooth(mac)

    async def pair_and_connect_bluetooth(self, mac: str):
        decky.logger.info(f"[BT] Connecting {mac} using trust method")
        return await self.connect_bluetooth(mac)

    # ---------- Display ----------
    async def get_display_info(self) -> list:
        """Get information about all connected displays using xrandr with proper parsing."""
        try:
            decky.logger.info("[Display] Getting display info with xrandr")

            # Set up environment for xrandr
            env = os.environ.copy()
            env['DISPLAY'] = ':0'
            env['XAUTHORITY'] = os.path.expanduser('~/.Xauthority')
            env['PATH'] = '/usr/bin:/usr/local/bin:/bin:/usr/sbin:/sbin'

            # Try to find the actual display if :0 doesn't work
            try:
                display_check = subprocess.run(
                    ["ps", "e", "-o", "args"],
                    capture_output=True, text=True, timeout=2
                )
                for line in display_check.stdout.split('\n'):
                    if 'Xorg' in line or 'Xwayland' in line:
                        import re
                        match = re.search(r':(\d+)', line)
                        if match:
                            env['DISPLAY'] = f":{match.group(1)}"
                            break
            except Exception as e:
                decky.logger.warning(f"[Display] Could not auto-detect display: {e}")

            result = subprocess.run(
                ["xrandr", "--query"],
                capture_output=True,
                text=True,
                timeout=5,
                env=env
            )

            output = result.stdout
            decky.logger.info(f"[Display] xrandr exit code: {result.returncode}")

            if result.returncode != 0:
                decky.logger.warning("[Display] xrandr failed, trying with sudo...")
                result = subprocess.run(
                    ["sudo", "xrandr", "--query"],
                    capture_output=True, text=True, timeout=5,
                    env=env
                )
                output = result.stdout
                decky.logger.info(f"[Display] sudo xrandr exit code: {result.returncode}")

            if not output or output.strip() == "":
                decky.logger.error("[Display] xrandr returned empty output")
                return []

            # Parse xrandr output using the proper method
            displays = self._parse_xrandr_query(output)
            decky.logger.info(f"[Display] Found {len(displays)} displays")
            return displays
        except Exception as e:
            decky.logger.error(f"[Display] get_display_info error: {e}")
            return []

    def _parse_xrandr_query(self, output: str) -> list:
        """
        Parses `xrandr --query` output, returning connected displays with ALL available
        resolutions and their associated refresh rates.
        """
        displays = []
        lines = output.splitlines()
        current_display = None

        for line in lines:
            # 1. Connected display header (e.g. "DP-0 connected primary 1280x720+0+0...")
            header_match = re.match(r"^(\S+)\s+connected(?:\s+(primary))?", line)
            if header_match:
                if current_display:
                    displays.append(current_display)

                current_display = {
                    "name": header_match.group(1),
                    "display_name": self._format_display_name(header_match.group(1)),
                    "is_primary": bool(header_match.group(2)),
                    "current_resolution": None,
                    "current_refresh_rate": None,
                    "resolutions": {},  # resolution -> [refresh_rates]
                    "connected": True
                }
                continue

            # 2. Disconnected display or global header ("Screen 0:")
            if re.match(r"^\S+\s+disconnected", line) or line.startswith("Screen "):
                if current_display:
                    displays.append(current_display)
                current_display = None
                continue

            # 3. Process mode lines for the current display (indented lines like "  1280x720 60.00*+ 144.00")
            if current_display and line.startswith("   "):
                parts = line.strip().split()
                if not parts:
                    continue

                resolution = parts[0]
                rates = []

                for rate_str in parts[1:]:
                    # Check for active (*) and preferred (+) flags
                    is_active = "*" in rate_str

                    # Strip out flags to isolate numeric float values
                    clean_rate_str = re.sub(r"[^*+\d.]", "", rate_str).replace("*", "").replace("+", "")

                    if clean_rate_str:
                        try:
                            rate = float(clean_rate_str)
                            rates.append(rate)
                            if is_active:
                                current_display["current_resolution"] = resolution
                                current_display["current_refresh_rate"] = rate
                        except ValueError:
                            pass

                # Add this resolution and its rates to the resolutions dict
                if rates:
                    current_display["resolutions"][resolution] = rates

        # Save the last parsed display in the loop
        if current_display:
            displays.append(current_display)

        # Sort resolutions (by pixel count) for each display
        for display in displays:
            if display.get("resolutions"):
                sorted_res = dict(sorted(
                    display["resolutions"].items(),
                    key=lambda x: int(x[0].split('x')[0]) * int(x[0].split('x')[1])
                ))
                display["resolutions"] = sorted_res
                # Sort refresh rates for each resolution
                for res, rates in display["resolutions"].items():
                    display["resolutions"][res] = sorted(rates)

        return displays

    def _format_display_name(self, name: str) -> str:
        """Format display name for UI display."""
        if name.startswith("DSI"):
            return f"Built-in Display ({name})"
        else:
            return f"External Monitor ({name})"

    async def get_current_display_name(self) -> str:
        """Get the current primary display name."""
        try:
            env = os.environ.copy()
            env['DISPLAY'] = ':0'
            result = subprocess.run(["xrandr", "--query"], capture_output=True, text=True, timeout=5, env=env)
            for line in result.stdout.split('\n'):
                if " connected primary" in line:
                    return line.split()[0]
                elif " connected" in line:
                    return line.split()[0]
            return "eDP-1"
        except Exception as e:
            decky.logger.error(f"[Display] get_current_display_name error: {e}")
            return "eDP-1"

    async def is_dsi_display(self) -> bool:
        """Check if the current display is DSI-0 (internal display)."""
        try:
            current = await self.get_current_display_name()
            return current.startswith("DSI")
        except Exception as e:
            decky.logger.error(f"[Display] is_dsi_display error: {e}")
            return False

    async def set_display_resolution(self, name: str, resolution: str) -> bool:
        """Set resolution for a specific display."""
        try:
            decky.logger.info(f"[Display] Setting resolution for {name} to {resolution}")
            env = os.environ.copy()
            env['DISPLAY'] = ':0'
            result = subprocess.run(
                ["xrandr", "--output", name, "--mode", resolution],
                capture_output=True, text=True, timeout=5,
                env=env
            )
            if result.returncode == 0:
                decky.logger.info(f"[Display] Resolution set to {resolution}")
                return True
            else:
                decky.logger.error(f"[Display] Failed to set resolution: {result.stderr}")
                return False
        except Exception as e:
            decky.logger.error(f"[Display] set_display_resolution error: {e}")
            return False

    async def set_display_refresh_rate(self, name: str, refresh_rate: float) -> bool:
        """Set refresh rate for a specific display."""
        try:
            decky.logger.info(f"[Display] Setting refresh rate for {name} to {refresh_rate}Hz")
            env = os.environ.copy()
            env['DISPLAY'] = ':0'

            result = subprocess.run(
                ["xrandr", "--output", name, "--rate", str(refresh_rate)],
                capture_output=True, text=True, timeout=5,
                env=env
            )
            if result.returncode == 0:
                decky.logger.info(f"[Display] Refresh rate set to {refresh_rate}Hz")
                return True
            else:
                decky.logger.error(f"[Display] Failed to set refresh rate: {result.stderr}")
                return False
        except Exception as e:
            decky.logger.error(f"[Display] set_display_refresh_rate error: {e}")
            return False

    # ---------- Audio ----------
    async def get_audio_sinks(self) -> list:
        """Get all audio output devices (sinks) with their properties using pactl."""
        try:
            decky.logger.info("[Audio] Getting audio sinks with pactl")

            env = os.environ.copy()
            env['XDG_RUNTIME_DIR'] = f"/run/user/{os.getuid()}"
            pulse_socket = f"/run/user/{os.getuid()}/pulse/native"
            if os.path.exists(pulse_socket):
                env['PULSE_SERVER'] = f'unix:{pulse_socket}'
            else:
                alt_socket = f"/run/user/{os.getuid()}/pulse/native.sock"
                if os.path.exists(alt_socket):
                    env['PULSE_SERVER'] = f'unix:{alt_socket}'

            # Get default sink
            default_result = subprocess.run(
                ["pactl", "get-default-sink"],
                capture_output=True, text=True, timeout=5,
                env=env
            )
            default_sink = default_result.stdout.strip()
            decky.logger.info(f"[Audio] Default sink: {default_sink}")

            # Get full sink list with awk-style parsing
            result = subprocess.run(
                ["pactl", "list", "sinks"],
                capture_output=True, text=True, timeout=5,
                env=env
            )
            output = result.stdout
            decky.logger.info(f"[Audio] pactl exit code: {result.returncode}")

            if not output or output.strip() == "":
                decky.logger.error("[Audio] No sinks found")
                return []

            devices = []
            current_device = {}
            in_device = False

            for line in output.split('\n'):
                line = line.strip()

                if line.startswith('Sink #'):
                    if current_device and 'name' in current_device:
                        # Get volume and mute from the stored info
                        if 'volume' not in current_device:
                            current_device['volume'] = 50
                        if 'muted' not in current_device:
                            current_device['muted'] = False
                        devices.append(current_device)
                    current_device = {}
                    in_device = True
                    continue

                if not in_device:
                    continue

                # Parse Name
                if line.startswith('Name:'):
                    current_device['name'] = line.split(':', 1)[1].strip()

                # Parse Description
                elif line.startswith('Description:'):
                    desc = line.split(':', 1)[1].strip()
                    # Clean up description - remove extra parts
                    if ' + ' in desc:
                        desc = desc.split(' + ')[0]
                    current_device['description'] = desc

                # Parse Volume
                elif line.startswith('Volume:'):
                    vol_match = re.search(r'(\d+)%', line)
                    if vol_match:
                        current_device['volume'] = int(vol_match.group(1))

                # Parse Mute
                elif line.startswith('Mute:'):
                    current_device['muted'] = 'yes' in line

            # Add the last device
            if current_device and 'name' in current_device:
                if 'volume' not in current_device:
                    current_device['volume'] = 50
                if 'muted' not in current_device:
                    current_device['muted'] = False
                devices.append(current_device)

            # Add is_default flag
            for device in devices:
                device['is_default'] = device.get('name') == default_sink
                # Add id for compatibility
                device['id'] = device.get('name', '')

            decky.logger.info(f"[Audio] Found {len(devices)} audio sinks")
            return devices
        except Exception as e:
            decky.logger.error(f"[Audio] get_audio_sinks error: {e}")
            return []

    async def get_audio_sources(self) -> list:
        """Get all audio input devices (sources) with their properties using pactl."""
        try:
            decky.logger.info("[Audio] Getting audio sources with pactl")

            env = os.environ.copy()
            env['XDG_RUNTIME_DIR'] = f"/run/user/{os.getuid()}"
            pulse_socket = f"/run/user/{os.getuid()}/pulse/native"
            if os.path.exists(pulse_socket):
                env['PULSE_SERVER'] = f'unix:{pulse_socket}'
            else:
                alt_socket = f"/run/user/{os.getuid()}/pulse/native.sock"
                if os.path.exists(alt_socket):
                    env['PULSE_SERVER'] = f'unix:{alt_socket}'

            # Get default source
            default_result = subprocess.run(
                ["pactl", "get-default-source"],
                capture_output=True, text=True, timeout=5,
                env=env
            )
            default_source = default_result.stdout.strip()
            decky.logger.info(f"[Audio] Default source: {default_source}")

            # Get full source list with awk-style parsing
            result = subprocess.run(
                ["pactl", "list", "sources"],
                capture_output=True, text=True, timeout=5,
                env=env
            )
            output = result.stdout
            decky.logger.info(f"[Audio] pactl exit code: {result.returncode}")

            if not output or output.strip() == "":
                decky.logger.error("[Audio] No sources found")
                return []

            devices = []
            current_device = {}
            in_device = False

            for line in output.split('\n'):
                line = line.strip()

                if line.startswith('Source #'):
                    if current_device and 'name' in current_device:
                        # Skip dummy or built-in sources if they're not default
                        if 'volume' not in current_device:
                            current_device['volume'] = 50
                        if 'muted' not in current_device:
                            current_device['muted'] = False
                        # Skip dummy and monitor sources
                        if 'dummy' in current_device.get('name', '').lower():
                            current_device = {}
                            in_device = False
                            continue
                        if 'monitor' in current_device.get('name', '').lower():
                            current_device = {}
                            in_device = False
                            continue
                        devices.append(current_device)
                    current_device = {}
                    in_device = True
                    continue

                if not in_device:
                    continue

                # Parse Name
                if line.startswith('Name:'):
                    current_device['name'] = line.split(':', 1)[1].strip()

                # Parse Description
                elif line.startswith('Description:'):
                    desc = line.split(':', 1)[1].strip()
                    # Skip if it's a monitor or dummy
                    if 'monitor' in desc.lower() or 'dummy' in desc.lower():
                        in_device = False
                        current_device = {}
                        continue
                    current_device['description'] = desc

                # Parse Volume
                elif line.startswith('Volume:'):
                    vol_match = re.search(r'(\d+)%', line)
                    if vol_match:
                        current_device['volume'] = int(vol_match.group(1))

                # Parse Mute
                elif line.startswith('Mute:'):
                    current_device['muted'] = 'yes' in line

            # Add the last device
            if current_device and 'name' in current_device:
                if 'description' in current_device:
                    if 'volume' not in current_device:
                        current_device['volume'] = 50
                    if 'muted' not in current_device:
                        current_device['muted'] = False
                    if 'dummy' not in current_device.get('name', '').lower():
                        devices.append(current_device)

            # Add is_default flag
            for device in devices:
                device['is_default'] = device.get('name') == default_source
                device['id'] = device.get('name', '')

            decky.logger.info(f"[Audio] Found {len(devices)} audio sources")
            return devices
        except Exception as e:
            decky.logger.error(f"[Audio] get_audio_sources error: {e}")
            return []

    async def set_default_sink(self, name: str) -> bool:
        """Set the default audio output device."""
        try:
            decky.logger.info(f"[Audio] Setting default sink to {name}")
            env = os.environ.copy()
            env['XDG_RUNTIME_DIR'] = f"/run/user/{os.getuid()}"
            result = subprocess.run(
                ["pactl", "set-default-sink", name],
                capture_output=True, text=True, timeout=5,
                env=env
            )
            if result.returncode == 0:
                decky.logger.info(f"[Audio] Default sink set to {name}")
                return True
            else:
                decky.logger.error(f"[Audio] Failed to set default sink: {result.stderr}")
                return False
        except Exception as e:
            decky.logger.error(f"[Audio] set_default_sink error: {e}")
            return False

    async def set_default_source(self, name: str) -> bool:
        """Set the default audio input device."""
        try:
            decky.logger.info(f"[Audio] Setting default source to {name}")
            env = os.environ.copy()
            env['XDG_RUNTIME_DIR'] = f"/run/user/{os.getuid()}"
            result = subprocess.run(
                ["pactl", "set-default-source", name],
                capture_output=True, text=True, timeout=5,
                env=env
            )
            if result.returncode == 0:
                decky.logger.info(f"[Audio] Default source set to {name}")
                return True
            else:
                decky.logger.error(f"[Audio] Failed to set default source: {result.stderr}")
                return False
        except Exception as e:
            decky.logger.error(f"[Audio] set_default_source error: {e}")
            return False

    async def set_sink_volume(self, name: str, volume: int) -> bool:
        """Set volume for a sink by name."""
        try:
            volume = int(volume)
            decky.logger.info(f"[Audio] Setting volume for {name} to {volume}%")
            env = os.environ.copy()
            env['XDG_RUNTIME_DIR'] = f"/run/user/{os.getuid()}"

            # Find sink index
            result = subprocess.run(
                ["pactl", "list", "sinks", "short"],
                capture_output=True, text=True, timeout=5,
                env=env
            )
            sink_id = None
            for line in result.stdout.strip().split('\n'):
                if line and name in line:
                    sink_id = line.split()[0]
                    break

            if sink_id is None:
                decky.logger.error(f"[Audio] Could not find sink ID for {name}")
                return False

            result = subprocess.run(
                ["pactl", "set-sink-volume", sink_id, f"{volume}%"],
                capture_output=True, text=True, timeout=5,
                env=env
            )
            if result.returncode == 0:
                decky.logger.info(f"[Audio] Volume set to {volume}%")
                return True
            else:
                decky.logger.error(f"[Audio] Failed to set volume: {result.stderr}")
                return False
        except Exception as e:
            decky.logger.error(f"[Audio] set_sink_volume error: {e}")
            return False

    async def set_source_volume(self, name: str, volume: int) -> bool:
        """Set volume for a source by name."""
        try:
            volume = int(volume)
            decky.logger.info(f"[Audio] Setting volume for {name} to {volume}%")
            env = os.environ.copy()
            env['XDG_RUNTIME_DIR'] = f"/run/user/{os.getuid()}"

            # Find source index
            result = subprocess.run(
                ["pactl", "list", "sources", "short"],
                capture_output=True, text=True, timeout=5,
                env=env
            )
            source_id = None
            for line in result.stdout.strip().split('\n'):
                if line and name in line:
                    source_id = line.split()[0]
                    break

            if source_id is None:
                decky.logger.error(f"[Audio] Could not find source ID for {name}")
                return False

            result = subprocess.run(
                ["pactl", "set-source-volume", source_id, f"{volume}%"],
                capture_output=True, text=True, timeout=5,
                env=env
            )
            if result.returncode == 0:
                decky.logger.info(f"[Audio] Volume set to {volume}%")
                return True
            else:
                decky.logger.error(f"[Audio] Failed to set volume: {result.stderr}")
                return False
        except Exception as e:
            decky.logger.error(f"[Audio] set_source_volume error: {e}")
            return False

    async def toggle_sink_mute(self, name: str) -> bool:
        """Toggle mute for a sink."""
        try:
            decky.logger.info(f"[Audio] Toggling mute for {name}")
            env = os.environ.copy()
            env['XDG_RUNTIME_DIR'] = f"/run/user/{os.getuid()}"

            result = subprocess.run(
                ["pactl", "list", "sinks", "short"],
                capture_output=True, text=True, timeout=5,
                env=env
            )
            sink_id = None
            for line in result.stdout.strip().split('\n'):
                if line and name in line:
                    sink_id = line.split()[0]
                    break

            if sink_id is None:
                decky.logger.error(f"[Audio] Could not find sink ID for {name}")
                return False

            result = subprocess.run(
                ["pactl", "set-sink-mute", sink_id, "toggle"],
                capture_output=True, text=True, timeout=5,
                env=env
            )
            if result.returncode == 0:
                decky.logger.info(f"[Audio] Mute toggled")
                return True
            else:
                decky.logger.error(f"[Audio] Failed to toggle mute: {result.stderr}")
                return False
        except Exception as e:
            decky.logger.error(f"[Audio] toggle_sink_mute error: {e}")
            return False

    async def toggle_source_mute(self, name: str) -> bool:
        """Toggle mute for a source."""
        try:
            decky.logger.info(f"[Audio] Toggling mute for {name}")
            env = os.environ.copy()
            env['XDG_RUNTIME_DIR'] = f"/run/user/{os.getuid()}"

            result = subprocess.run(
                ["pactl", "list", "sources", "short"],
                capture_output=True, text=True, timeout=5,
                env=env
            )
            source_id = None
            for line in result.stdout.strip().split('\n'):
                if line and name in line:
                    source_id = line.split()[0]
                    break

            if source_id is None:
                decky.logger.error(f"[Audio] Could not find source ID for {name}")
                return False

            result = subprocess.run(
                ["pactl", "set-source-mute", source_id, "toggle"],
                capture_output=True, text=True, timeout=5,
                env=env
            )
            if result.returncode == 0:
                decky.logger.info(f"[Audio] Mute toggled")
                return True
            else:
                decky.logger.error(f"[Audio] Failed to toggle mute: {result.stderr}")
                return False
        except Exception as e:
            decky.logger.error(f"[Audio] toggle_source_mute error: {e}")
            return False

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
