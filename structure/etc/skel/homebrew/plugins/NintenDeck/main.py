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
        self.csv_url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRXdwrjkDeIWCDMEyFhKGKrkTBTMqS1C0hkfG2rsctXGxGtry-H-S-K3hzUcmqHDiXa9wV4NT5cGtgA/pub?gid=1002118274&single=true&output=csv"
        self.config_dir = Path.home() / ".config" / "NintenDeck"
        self.config_dir.mkdir(parents=True, exist_ok=True)
        self.cache_file = self.config_dir / "compatibility.csv"
        decky.logger.info("Plugin initialised (offline CSV, 1s temps, Bluetooth fixed)")

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
            games.append({
                "name": row.get('Game', ''),
                "switch_model": row.get('Switch Model', ''),
                "oc_mode": row.get('OC Mode', ''),
                "rating": row.get('Rating', 'Unknown'),
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
            subprocess.run(["reboot-hekate"], check=True, capture_output=True, text=True)
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

    # ---------- Bluetooth (simple 15‑second scan, fixed pairing) ----------
    async def scan_bluetooth_devices(self):
        decky.logger.info("[BT] Starting 15-second scan")
        try:
            subprocess.run(["bluetoothctl", "power", "on"], capture_output=True, timeout=5)
            result = subprocess.run(
                ["bluetoothctl", "--timeout", "15", "scan", "on"],
                capture_output=True, text=True, timeout=20
            )
            decky.logger.info("[BT] Scan completed, processing results")
            devices_result = subprocess.run(["bluetoothctl", "devices"], capture_output=True, text=True, timeout=5)
            devices = []
            for line in devices_result.stdout.split('\n'):
                if line.startswith("Device"):
                    parts = line.split(" ", 2)
                    if len(parts) >= 3:
                        mac = parts[1]
                        name = parts[2]
                        info = subprocess.run(["bluetoothctl", "info", mac], capture_output=True, text=True, timeout=3)
                        paired = "Paired: yes" in info.stdout
                        connected = "Connected: yes" in info.stdout
                        trusted = "Trusted: yes" in info.stdout
                        devices.append({
                            "mac": mac,
                            "name": name,
                            "paired": paired,
                            "connected": connected,
                            "trusted": trusted
                        })
            decky.logger.info(f"[BT] Found {len(devices)} devices")
            return devices
        except Exception as e:
            decky.logger.error(f"[BT] scan_bluetooth_devices error: {e}")
            return []

    async def get_paired_devices(self):
        try:
            result = subprocess.run(["bluetoothctl", "devices"], capture_output=True, text=True, timeout=5)
            devices = []
            for line in result.stdout.split('\n'):
                if line.startswith("Device"):
                    parts = line.split(" ", 2)
                    if len(parts) >= 3:
                        mac = parts[1]
                        name = parts[2]
                        info = subprocess.run(["bluetoothctl", "info", mac], capture_output=True, text=True, timeout=3)
                        if "Paired: yes" in info.stdout:
                            devices.append({
                                "mac": mac,
                                "name": name,
                                "paired": True,
                                "connected": "Connected: yes" in info.stdout,
                                "trusted": "Trusted: yes" in info.stdout
                            })
            return devices
        except Exception as e:
            decky.logger.error(f"[BT] get_paired_devices error: {e}")
            return []

    async def get_bluetooth_status(self):
        try:
            power = subprocess.run(["bluetoothctl", "show"], capture_output=True, text=True, timeout=5)
            enabled = "Powered: yes" in power.stdout
            devices = subprocess.run(["bluetoothctl", "devices"], capture_output=True, text=True, timeout=5)
            connected = []
            for line in devices.stdout.split('\n'):
                if line.startswith("Device"):
                    parts = line.split(" ", 2)
                    if len(parts) >= 3:
                        mac = parts[1]
                        info = subprocess.run(["bluetoothctl", "info", mac], capture_output=True, text=True, timeout=3)
                        if "Connected: yes" in info.stdout:
                            connected.append({"mac": mac, "name": parts[2]})
            return {"enabled": enabled, "connected_devices": connected}
        except Exception as e:
            decky.logger.error(f"[BT] get_bluetooth_status error: {e}")
            return {"enabled": False, "connected_devices": []}

    async def toggle_bluetooth(self):
        decky.logger.info("[BT] Toggle called")
        try:
            status = await self.get_bluetooth_status()
            if status["enabled"]:
                subprocess.run(["bluetoothctl", "power", "off"], capture_output=True, timeout=5)
                decky.logger.info("[BT] Powered off")
            else:
                subprocess.run(["bluetoothctl", "power", "on"], capture_output=True, timeout=5)
                decky.logger.info("[BT] Powered on")
            return True
        except Exception as e:
            decky.logger.error(f"[BT] Toggle error: {e}")
            return False

    async def pair_bluetooth(self, mac: str):
        decky.logger.info(f"[BT] Pairing {mac}")
        try:
            # Use NoAgent to avoid interactive prompts
            result = subprocess.run(
                ["bluetoothctl", "--agent", "NoAgent", "pair", mac],
                capture_output=True, text=True, timeout=15
            )
            if result.returncode != 0:
                decky.logger.error(f"[BT] Pair command failed: {result.stderr}")
                return False
            # Verify pairing status
            info = subprocess.run(["bluetoothctl", "info", mac], capture_output=True, text=True, timeout=3)
            if "Paired: yes" not in info.stdout:
                decky.logger.error(f"[BT] Pairing verification failed for {mac}")
                return False
            subprocess.run(["bluetoothctl", "trust", mac], capture_output=True, timeout=5)
            decky.logger.info(f"[BT] Paired and trusted {mac}")
            return True
        except Exception as e:
            decky.logger.error(f"[BT] Pair error: {e}")
            return False

    async def connect_bluetooth(self, mac: str):
        decky.logger.info(f"[BT] Connecting {mac}")
        try:
            result = subprocess.run(["bluetoothctl", "connect", mac], capture_output=True, text=True, timeout=10)
            success = result.returncode == 0
            if success:
                decky.logger.info(f"[BT] Connected to {mac}")
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

    # ---------- Lifecycle ----------
    async def _main(self):
        import grp
        groups = [grp.getgrgid(g).gr_name for g in os.getgroups()]
        decky.logger.info(f"Plugin groups: {groups}")
        decky.logger.info("NintenDeck plugin loaded (offline CSV, 1s temps, Bluetooth fixed)")

    async def _unload(self):
        await self.stop_tegrastats()
        decky.logger.info("NintenDeck plugin unloaded")
