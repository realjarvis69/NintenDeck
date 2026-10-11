#!/usr/bin/env bash

set -euo pipefail

# Step 1: Dependency Installation
echo "PROGRESS:0 Installing dependencies"
pkexec dnf install -y curl xinput xdotool picom xbindkeys feh bluez bluez-tools brightnessctl box64 zstd zenity steam-devices gtk2

# Step 2: Download Steam Setup Script
echo "PROGRESS:7 Downloading Steam Installer"
SCRIPT_URL="https://raw.githubusercontent.com/SildurFX/Switchdeck/refs/heads/main/install-steam.sh"
TEMP_SCRIPT="/tmp/install-steam.sh"

curl -sSL "$SCRIPT_URL" -o "$TEMP_SCRIPT"
chmod +x "$TEMP_SCRIPT"

# Step 3: Patch Steam Script cleanly using sed
sed -i 's/\bsudo\b/pkexec/g' "$TEMP_SCRIPT"
sed -i 's|if \[ ! -t 0 \]; then|if false; then|' "$TEMP_SCRIPT"
sed -i 's|read -p "A clean installation is recommended.*|choice="y"|' "$TEMP_SCRIPT"
sed -i 's|sleep [0-9]\+|true|g' "$TEMP_SCRIPT"

# Inject Progress Echos into the upstream script
sed -i '/Downloading steam bootstrap/i echo "PROGRESS:15 Installing Steam (this may take a while)"' "$TEMP_SCRIPT"
sed -i '/Fetching current Steam runtime/i echo "PROGRESS:20 Installing Steam (this may take a while)"' "$TEMP_SCRIPT"
sed -i '/Downloading DXVK-Sarek/i echo "PROGRESS:35 Installing Steam (this may take a while)"' "$TEMP_SCRIPT"
sed -i '/Downloading VKD3D-Proton/i echo "PROGRESS:43 Installing Steam (this may take a while)"' "$TEMP_SCRIPT"
sed -i '/Downloading Proton 11.0-1/i echo "PROGRESS:55 Installing Steam (this may take a while)"' "$TEMP_SCRIPT"
sed -i '/Installation complete!/i echo "PROGRESS:70 Installing Steam (this may take a while)"' "$TEMP_SCRIPT"

# Step 4: Execute Steam Installer
echo "PROGRESS:11 Installing Steam (this may take a while)"
bash "$TEMP_SCRIPT"
rm -f "$TEMP_SCRIPT"

# Step 5: Copy Configs & Create Symlinks
echo "PROGRESS:75 Configuring Steam assets and settings"

# Config directory & config.vdf
mkdir -p "$HOME/.steam/steam/config"
if [ -f "/usr/share/steam-config/config/config.vdf" ]; then
    cp -f /usr/share/steam-config/config/config.vdf "$HOME/.steam/steam/config/config.vdf"
fi

# steamui/movies symlinks
mkdir -p "$HOME/.steam/steam/steamui/movies"
if compgen -G "/usr/share/steam-config/steamui/movies/*" > /dev/null; then
    ln -sf /usr/share/steam-config/steamui/movies/* "$HOME/.steam/steam/steamui/movies/"
fi

# uioverrides/movies symlinks
mkdir -p "$HOME/.steam/steam/config/uioverrides/movies"
if compgen -G "/usr/share/steam-config/uioverrides/movies/*" > /dev/null; then
    ln -sf /usr/share/steam-config/uioverrides/movies/* "$HOME/.steam/steam/config/uioverrides/movies/"
fi

# Disable UPDATE_CHECK in launch-steam.sh
LAUNCH_SCRIPT="$HOME/.steam/steam/launch-steam.sh"
if [ -f "$LAUNCH_SCRIPT" ]; then
    sed -i 's/UPDATE_CHECK="true"/UPDATE_CHECK="false"/' "$LAUNCH_SCRIPT"
fi

# Step 6: Install Decky Loader
echo "PROGRESS:85 Installing Decky Loader"
DECKY_INSTALLER="/tmp/install_prerelease.sh"

curl -L -s https://github.com/SteamDeckHomebrew/decky-installer/releases/latest/download/install_prerelease.sh -o "$DECKY_INSTALLER"
chmod +x "$DECKY_INSTALLER"
bash "$DECKY_INSTALLER" --ci
rm -f "$DECKY_INSTALLER"

echo "PROGRESS:95 Steam and Decky Loader installation finished"
