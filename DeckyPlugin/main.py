#!/usr/bin/env python3

import decky
import subprocess
import re
import asyncio
import os

class Plugin:
    def __init__(self):
        self.tegrastats_process = None
        self.latest_line = ""
        self.lock = asyncio.Lock()
        self.runtime_dir = f"/run/user/{os.getuid()}"
        decky.logger.info(f"Plugin init, XDG_RUNTIME_DIR={self.runtime_dir}")

    # -------------------- OC Mode (pkexec) --------------------
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
                line = line.strip()
                if line.isdigit():
                    last_int = int(line)
            return last_int
        except Exception as e:
            decky.logger.error(f"Failed to get OC mode: {e}")
            return 0

    # -------------------- Fan Mode (pkexec) --------------------
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

    # -------------------- Brightness (using sg to add video group) --------------------
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
            # Use sg to run brightnessctl with video group (bypasses missing supplementary groups)
            subprocess.run(
                ["sg", "video", "-c", f"brightnessctl set {value}%"],
                check=True, capture_output=True, text=True
            )
            decky.logger.info(f"Brightness set to {value}% via sg video")
        except Exception as e:
            decky.logger.error(f"set_brightness failed: {e}")
            raise

    # -------------------- Volume --------------------
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

    # -------------------- TegraStats --------------------
    async def start_tegrastats(self) -> None:
        if self.tegrastats_process is not None:
            return
        try:
            self.tegrastats_process = await asyncio.create_subprocess_exec(
                "tegrastats", "--interval", "3000",
                stdout=subprocess.PIPE, stderr=subprocess.PIPE
            )
            asyncio.create_task(self._read_tegrastats_output())
            decky.logger.info("tegrastats started")
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

    async def _main(self):
        # Log groups for debugging
        import grp
        groups = [grp.getgrgid(g).gr_name for g in os.getgroups()]
        decky.logger.info(f"Plugin groups: {groups}")
        decky.logger.info("NintenDeck plugin loaded (brightness uses sg video)")

    async def _unload(self):
        await self.stop_tegrastats()
        decky.logger.info("NintenDeck plugin unloaded")
