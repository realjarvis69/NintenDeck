#!/bin/bash

# NinteDeck Installer
# Installs Steam, Decky Loader, and configures NinteDeck system

# ===== CONFIGURATION =====
KDE_SESSION="plasma"
GAMING_SESSION="gamingmode"
SDDM_CONFIG_DIR="/etc/sddm.conf.d"
SDDM_CONFIG_FILE="$SDDM_CONFIG_DIR/kde_settings.conf"
CURRENT_USER=$(whoami)

# ===== WIFI CHECK =====
# Returns true if internet connection is available
check_wifi() {
    local connected=false

    if command -v nmcli &>/dev/null; then
        local state=$(nmcli -t -f CONNECTIVITY general status 2>/dev/null)
        if [[ "$state" == "full" ]]; then
            connected=true
        else
            local iface_state=$(nmcli -t -f STATE general status 2>/dev/null)
            if [[ "$iface_state" == "connected" ]]; then
                connected=true
            fi
        fi
    fi

    if [[ "$connected" == "false" ]]; then
        if ip route | grep -q default; then
            if ping -c 1 -W 2 8.8.8.8 &>/dev/null; then
                connected=true
            elif curl -s --max-time 2 https://fedoraproject.org &>/dev/null; then
                connected=true
            fi
        fi
    fi

    echo "$connected"
}

# ===== GUI HELPERS =====
# Functions that use Zenity, fallback to kdialog if needed

# Prompt for password using GUI
get_password() {
    if command -v zenity &>/dev/null; then
        zenity --password --title="Authentication Required" --text="Enter your sudo password:" --width=400
    elif command -v kdialog &>/dev/null; then
        kdialog --password "Enter your sudo password:" 2>/dev/null
    else
        echo "No GUI dialog found. Please install zenity or kdialog."
        exit 1
    fi
}

# Show error dialog
show_error() {
    local message="$1"
    if command -v zenity &>/dev/null; then
        zenity --error --title="Error" --text="$message" --width=400
    elif command -v kdialog &>/dev/null; then
        kdialog --error "$message" 2>/dev/null
    else
        echo "ERROR: $message"
    fi
}

# Show info dialog
show_info() {
    local message="$1"
    if command -v zenity &>/dev/null; then
        zenity --info --title="Information" --text="$message" --width=400
    elif command -v kdialog &>/dev/null; then
        kdialog --msgbox "$message" 2>/dev/null
    else
        echo "INFO: $message"
    fi
}

# Show yes/no question dialog
show_question() {
    local message="$1"
    if command -v zenity &>/dev/null; then
        zenity --question --title="Question" --text="$message" --width=400
        return $?
    elif command -v kdialog &>/dev/null; then
        kdialog --yesno "$message" 2>/dev/null
        return $?
    else
        echo "QUESTION: $message"
        return 1
    fi
}

# Show warning dialog
show_warning() {
    local message="$1"
    if command -v zenity &>/dev/null; then
        zenity --warning --title="Warning" --text="$message" --width=400
    elif command -v kdialog &>/dev/null; then
        kdialog --warning "$message" 2>/dev/null
    else
        echo "WARNING: $message"
    fi
}

# Show progress dialog with Zenity
show_progress() {
    local title="$1"
    local text="$2"

    if command -v zenity &>/dev/null; then
        zenity --progress \
            --title="$title" \
            --text="$text" \
            --percentage=0 \
            --width=450 \
            --auto-close \
            --no-cancel 2>/dev/null
    else
        # Fallback - just show a message
        show_info "$title\n\n$text\n\nPlease wait..."
    fi
}

# ===== INSTALL ZENITY =====
# Uses kdialog to get password and install Zenity if missing
install_zenity() {
    if command -v zenity &>/dev/null; then
        return 0
    fi

    if ! command -v dnf &>/dev/null; then
        echo "DNF not found. Please install zenity manually."
        return 1
    fi

    local password=$(kdialog --password "Enter sudo password to install Zenity:" 2>/dev/null)
    if [[ -z "$password" ]]; then
        echo "No password provided. Cannot install Zenity."
        return 1
    fi

    echo "$password" | sudo -S dnf install -y zenity 2>/dev/null

    if [[ $? -eq 0 ]] && command -v zenity &>/dev/null; then
        return 0
    else
        return 1
    fi
}

# ===== SUDO CACHING =====
# Keeps sudo active so user doesn't need to re-enter password

# Cache sudo credentials
cache_sudo() {
    local password="$1"
    echo "$password" | sudo -S -v 2>/dev/null
    if [[ $? -ne 0 ]]; then
        show_error "Incorrect password. Exiting."
        exit 1
    fi
    keep_sudo_alive
}

# Background process that refreshes sudo every 60 seconds
keep_sudo_alive() {
    while true; do
        sudo -v 2>/dev/null
        sleep 60
    done &
    SUDO_KEEPER_PID=$!
    trap "kill $SUDO_KEEPER_PID 2>/dev/null" EXIT
}

# ===== PACKAGE INSTALLATION =====
# Installs required system packages using dnf (skips if dnf not found)
install_packages() {
    if ! command -v dnf &>/dev/null; then
        show_warning "DNF not found. Skipping package installation.\n\nInstall manually if needed:\nbluez bluez-tools brightnessctl xbindkeys box64"
        return 0
    fi

    local packages=("$@")

    if ! sudo dnf install -y "${packages[@]}" 2>/dev/null; then
        show_warning "Some packages failed to install.\n\nInstall manually if needed:\n${packages[*]}"
        return 0
    fi

    return 0
}

# ===== MOVE STEAM WINDOW TO TOP RIGHT =====
# Monitors for the Steam updater window and moves it to top-right corner
move_steam_window() {
    # Check if xdotool is installed
    if ! command -v xdotool &>/dev/null; then
        # Try to install it
        if command -v dnf &>/dev/null; then
            sudo dnf install -y xdotool 2>/dev/null || return 1
        elif command -v apt &>/dev/null; then
            sudo apt install -y xdotool 2>/dev/null || return 1
        else
            return 1
        fi
    fi

    # Get screen resolution dynamically
    local screen_width=$(xrandr 2>/dev/null | awk '/\*/ {print $1}' | head -n 1 | cut -d'x' -f1)
    if [[ -z "$screen_width" ]]; then
        # Fallback using xdpyinfo if xrandr fails
        screen_width=$(xdpyinfo 2>/dev/null | grep -oP 'dimensions:\s+\K[0-9]+' | head -n 1)
    fi

    # If we still can't get resolution, use defaults
    if [[ -z "$screen_width" ]]; then
        screen_width=1920  # Default to 1080p
    fi

    # Steam updater window dimensions (roughly 430x220)
    local steam_w=430
    local padding=20

    # Calculate target X for top-right corner
    local target_x=$((screen_width - steam_w - padding))
    local target_y=20

    # Start background monitor loop
    (
        while true; do
            # Look for Steam updater window
            local wid=$(xdotool search --name "Updating Steam" 2>/dev/null | head -n 1)
            if [[ -n "$wid" ]]; then
                # Move window to top-right corner
                xdotool windowmove "$wid" "$target_x" "$target_y" 2>/dev/null
                break
            fi
            sleep 0.1
        done
    ) &

    # Store PID so we can clean it up later
    STEAM_MOVE_PID=$!
}

# ===== STEAM INSTALLATION =====
# Downloads and installs Switchdeck (custom Steam build for ARM64)
install_steam() {
    local temp_output=$(mktemp)

    # Start the window mover in background
    move_steam_window

    # Run Switchdeck installation with real-time output
    (
        # Switchdeck by SildurFX | https://github.com/SildurFX/Switchdeck
        # License: GPLv3

        set -euo pipefail

        exit_on_error() {
            printf "\nERROR: %s\n" "$1" >&2
            exit 1
        }

        STEAMROOT="$HOME/.local/share/Steam"
        STEAMHOME="$HOME/.steam"
        RTARM64ROOT="$STEAMROOT/steamrtarm64"
        DESKTOP_DIR=$(xdg-user-dir DESKTOP 2>/dev/null || echo "$HOME/Desktop")

        # Remove conflicting native Steam packages
        printf "\n[1/10] Checking for conflicting system packages...\n"
        if command -v apt-get &>/dev/null; then
            dpkg -l | grep -q "^ii  steam-launcher " && {
                printf "Found conflicting system steam package. Uninstalling..\n"
                sudo apt-get remove -y steam-launcher
            } || true
        elif command -v dnf &>/dev/null; then
            (rpm -q steam || rpm -q steam-launcher) &>/dev/null && {
                printf "Found conflicting system steam package. Uninstalling..\n"
                sudo dnf remove -y steam steam-launcher
            } || true
        elif command -v pacman &>/dev/null; then
            pacman -Qq steam &>/dev/null && {
                printf "Found conflicting system steam package. Uninstalling..\n"
                sudo pacman -Rns --noconfirm steam
            } || true
        fi

        # Clean up old Steam desktop shortcuts
        printf "\n[2/10] Cleaning up old desktop shortcuts...\n"
        for file in "$HOME/.local/share/applications/Steam.desktop" \
                    "$HOME/.local/share/applications/steam.desktop" \
                    "/usr/local/share/applications/Steam.desktop" \
                    "/usr/local/share/applications/steam.desktop" \
                    "/usr/share/applications/Steam.desktop" \
                    "/usr/share/applications/steam.desktop" \
                    "$DESKTOP_DIR/Steam.desktop" \
                    "$DESKTOP_DIR/steam.desktop"; do
            if [ -f "$file" ]; then
                if [[ "$file" == /usr/* ]]; then
                    sudo rm -f "$file"
                else
                    rm -f "$file"
                fi
            fi
        done

        command -v update-desktop-database &>/dev/null && update-desktop-database "$HOME/.local/share/applications" &>/dev/null || true

        # Ask user if they want to delete existing Steam directories
        printf "\n[3/10] Checking existing Steam installation...\n"
        if [ -d "$STEAMROOT" ] || [ -d "$STEAMHOME" ]; then
            printf "Steam directories already exist.\n"
            if show_question "Steam directories already exist.\n\nA clean installation is recommended. Would you like to delete them now?\n\n⚠️ WARNING: This will remove all Steam data including games!"; then
                printf "Deleting %s and %s...\n" "$STEAMROOT" "$STEAMHOME"
                rm -rf "$STEAMROOT"
                rm -rf "$STEAMHOME"
                mkdir -p "$STEAMROOT"
                mkdir -p "$STEAMHOME"
                ln -fsn "$STEAMROOT" "$STEAMHOME/root"
                ln -fsn "$STEAMROOT" "$STEAMHOME/steam"
            else
                printf "Continuing with dirty installation..\n"
                shopt -s extglob dotglob
                eval "rm -rf \"$STEAMROOT\"/!(compatibilitytools.d|depotcache|steamapps|userdata)"
                rm -rf "$STEAMHOME"
                mkdir -p "$STEAMROOT"
                mkdir -p "$STEAMHOME"
                ln -fsn "$STEAMROOT" "$STEAMHOME/root"
                ln -fsn "$STEAMROOT" "$STEAMHOME/steam"
            fi
        else
            printf "No existing Steam installation found. Performing fresh setup..\n"
            mkdir -p "$STEAMROOT"
            mkdir -p "$STEAMHOME"
            ln -fsn "$STEAMROOT" "$STEAMHOME/root"
            ln -fsn "$STEAMROOT" "$STEAMHOME/steam"
        fi

        # Download Steam bootstrap
        printf "\n[4/10] Downloading Steam bootstrap...\n"
        if [ ! -x "$RTARM64ROOT" ]; then
            mkdir -p "$STEAMROOT/package"
            rm -f "$STEAMROOT/package/beta"
            echo "publicbeta" > "$STEAMROOT/package/beta"
            chmod 444 "$STEAMROOT/package/beta"
            wget -q --show-progress -c -t 5 -O "$STEAMROOT/linuxarm64.zip" "https://client-update.steamstatic.com/bins_linuxarm64_linuxarm64.zip.f523fa87fc6b9b5435a5e7370cb0d664ef53b50b" || exit_on_error "steam bootstrap download failed (check your internet connection)"
            unzip -d "$STEAMROOT" "$STEAMROOT/linuxarm64.zip" "steamrtarm64/steam"
            chmod +x "$RTARM64ROOT/steam"
            rm -rf "$STEAMROOT/linuxarm64.zip"
        fi

        # Download Steam runtime
        printf "\n[5/10] Downloading Steam runtime...\n"
        if [ ! -x "$RTARM64ROOT/pv-runtime/steam-runtime-steamrt-arm64" ]; then
            mkdir -p "$RTARM64ROOT/pv-runtime"
            wget -q --show-progress -c -t 5 -O "$RTARM64ROOT/pv-runtime/steam-runtime-steamrt-arm64.tar.xz" "https://repo.steampowered.com/steamrt3c/images/latest-public-beta/steam-runtime-steamrt-arm64.tar.xz" || exit_on_error "steam runtime download failed (check your internet connection)"
            tar -xf "$RTARM64ROOT/pv-runtime/steam-runtime-steamrt-arm64.tar.xz" --directory "$RTARM64ROOT/pv-runtime" --checkpoint=200 --checkpoint-action=dot
            rm -rf "$RTARM64ROOT/pv-runtime/steam-runtime-steamrt-arm64.tar.xz"
        fi

        # Install DXVK-Sarek
        printf "\n[6/10] Downloading DXVK-Sarek...\n"
        if [ ! -d "$STEAMROOT/Switchdeck/DXVK" ]; then
            mkdir -p "$STEAMROOT/Switchdeck/DXVK"

            LATEST_JSON=$(wget -qO- "https://api.github.com/repos/pythonlover02/DXVK-Sarek/releases/latest")
            DXVK_URL=$(echo "$LATEST_JSON" | sed -n 's/.*"browser_download_url": "\([^"]*\)".*/\1/p' | head -1)
            DXVK_TAG=$(echo "$LATEST_JSON" | sed -n 's/.*"tag_name": "\([^"]*\)".*/\1/p' | head -1)

            [ -z "$DXVK_URL" ] && { printf "\nError: GitHub API URL empty. Aborting installation.\n"; exit 1; }

            wget -q --show-progress -c -t 5 -O "$STEAMROOT/Switchdeck/DXVK/dxvk-sarek.tar.gz" "$DXVK_URL"
            tar -xzf "$STEAMROOT/Switchdeck/DXVK/dxvk-sarek.tar.gz" --directory "$STEAMROOT/Switchdeck/DXVK" --strip-components=1
            rm -f "$STEAMROOT/Switchdeck/DXVK/dxvk-sarek.tar.gz"

            echo "$DXVK_TAG" > "$STEAMROOT/Switchdeck/dxvk-sarek_version.txt"
            printf "DXVK-Sarek installed successfully.\n"
        fi

        # Install VKD3D-Proton
        printf "\n[7/10] Downloading VKD3D-Proton...\n"
        if [ ! -d "$STEAMROOT/Switchdeck/VKD3D" ]; then
            mkdir -p "$STEAMROOT/Switchdeck/VKD3D"

            VK_URL="https://github.com/HansKristian-Work/vkd3d-proton/releases/download/v2.3.1/vkd3d-proton-2.3.1.tar.zst"

            command -v zstd >/dev/null || { printf "\nzstd is missing. Installing dependency.. (Requires sudo)\n"; [ -f /etc/fedora-release ] && sudo dnf install zstd -y || sudo apt install zstd -y; }

            wget -q --show-progress -c -t 5 -O "$STEAMROOT/Switchdeck/VKD3D/vkd3d.tar.zst" "$VK_URL"
            tar -xf "$STEAMROOT/Switchdeck/VKD3D/vkd3d.tar.zst" --directory "$STEAMROOT/Switchdeck/VKD3D" --strip-components=1
            rm -f "$STEAMROOT/Switchdeck/VKD3D/vkd3d.tar.zst"

            printf "VKD3D installed successfully.\n"
        fi

        # Configure controller permissions
        printf "\n[8/10] Configuring controller permissions...\n"
        CONTROLLER_RELOAD=0
        if command -v apt-get &>/dev/null; then
            dpkg -s steam-devices &>/dev/null || {
                printf "Configuring controller permissions.. (Requires sudo)\n"
                sudo apt-get update && sudo apt-get install -y steam-devices && CONTROLLER_RELOAD=1
            }
        elif command -v dnf &>/dev/null; then
            rpm -q steam-devices &>/dev/null || {
                printf "Configuring controller permissions.. (Requires sudo)\n"
                sudo dnf install -y steam-devices && CONTROLLER_RELOAD=1
            }
        elif command -v pacman &>/dev/null; then
            pacman -Qi steam-devices &>/dev/null || {
                printf "Configuring controller permissions.. (Requires sudo)\n"
                sudo pacman -S --noconfirm steam-devices && CONTROLLER_RELOAD=1
            }
        else
            if [ ! -f /etc/udev/rules.d/70-uinput.rules ]; then
                printf "Configuring controller permissions.. (Requires sudo)\n"
                printf "No supported package manager found. Configuring manually..\n"
                sudo sh -c "mkdir -p /etc/udev/rules.d && echo 'KERNEL==\"uinput\", SUBSYSTEM==\"misc\", TAG+=\"uaccess\", OPTIONS+=\"static_node=uinput\"' > /etc/udev/rules.d/70-uinput.rules"
                sudo modprobe uinput || true
                CONTROLLER_RELOAD=1
            fi
        fi

        if [ "$CONTROLLER_RELOAD" -eq 1 ]; then
            sudo udevadm control --reload-rules
            sudo udevadm trigger --sysname-match=uinput 2>/dev/null || sudo udevadm trigger
            printf "Controller permissions applied successfully.\n"
        fi

        # Run Steam initial update, then downgrade
        printf "\n[9/10] Starting Steam update (this may take a while)...\n"
        if [ -x "$RTARM64ROOT/steam" ]; then
            export LD_LIBRARY_PATH="$RTARM64ROOT:${LD_LIBRARY_PATH-}"
            "$RTARM64ROOT/steam" "$@" || true

            printf "\nSteam exited. Downloading files to downgrade steam..\n"

            TEMP_SD="$STEAMROOT/temp_sd"
            mkdir -p "$TEMP_SD"

            wget -q -t 5 -O- "https://github.com/SildurFX/Switchdeck/archive/refs/heads/main.tar.gz" | tar xz -C "$TEMP_SD" --strip-components=1 || exit_on_error "Failed to download/extract downgrade files"

            if [ -f "$TEMP_SD/files/downgrade/linuxarm64.tar.gz" ]; then
                mkdir -p "$STEAMROOT/linuxarm64"
                tar -xzf "$TEMP_SD/files/downgrade/linuxarm64.tar.gz" -C "$STEAMROOT/linuxarm64"
            fi

            if [ -f "$TEMP_SD/files/downgrade/steamrtarm64.tar.gz.partaa" ]; then
                mkdir -p "$STEAMROOT/steamrtarm64"
                cat "$TEMP_SD/files/downgrade/steamrtarm64.tar.gz.part"* > "$TEMP_SD/steamrtarm64.tar.gz"
                tar -xzf "$TEMP_SD/steamrtarm64.tar.gz" -C "$STEAMROOT/steamrtarm64"
                rm -f "$TEMP_SD/steamrtarm64.tar.gz"
            fi

            cp -f  "$TEMP_SD/files/downgrade/steam.cfg" "$STEAMROOT/steam.cfg"
            cp -f  "$TEMP_SD/files/steam/launch-steam.sh" "$STEAMROOT/"
            cp -f  "$TEMP_SD/files/steam/update-switchdeck.sh" "$STEAMROOT/"

            rm -rf "$TEMP_SD"

            chmod -R +x "$STEAMROOT"

            # Generate desktop shortcuts
            timeout 2s bash "$STEAMROOT/launch-steam.sh" 2>/dev/null || true
            pkill -x "steam|steamwebhelper" >/dev/null 2>&1 || true

            printf "\n[10/10] Steam installation complete!\n"
            printf "To launch Steam, use the provided desktop shortcuts\n"
            printf "or run launch-steam.sh in your Steam folder.\n\n"
            sleep 3
        fi
    ) > "$temp_output" 2>&1 &

    local pid=$!
    local progress=0
    local status_message="Starting Steam installation..."
    local last_progress=0
    local stuck_counter=0

    # Monitor progress and update dialog
    while kill -0 $pid 2>/dev/null; do
        if [[ -f "$temp_output" ]]; then
            local output=$(cat "$temp_output")

            # Check for numbered steps [1/10] through [10/10]
            if echo "$output" | grep -q "\[1/10\]"; then
                status_message="Checking for conflicting packages"
                progress=10
            fi

            if echo "$output" | grep -q "\[2/10\]"; then
                status_message="Cleaning up old shortcuts"
                progress=20
            fi

            if echo "$output" | grep -q "\[3/10\]"; then
                status_message="Checking existing Steam installation"
                progress=30
            fi

            if echo "$output" | grep -q "\[4/10\]"; then
                status_message="Downloading Steam bootstrap"
                progress=40
            fi

            if echo "$output" | grep -q "\[5/10\]"; then
                status_message="Downloading Steam runtime"
                progress=50
            fi

            if echo "$output" | grep -q "\[6/10\]"; then
                status_message="Downloading DXVK-Sarek"
                progress=60
            fi

            if echo "$output" | grep -q "\[7/10\]"; then
                status_message="Downloading VKD3D-Proton"
                progress=70
            fi

            if echo "$output" | grep -q "\[8/10\]"; then
                status_message="Configuring controller permissions"
                progress=80
            fi

            if echo "$output" | grep -q "\[9/10\]"; then
                status_message="Starting Steam update (this may take a while)"
                progress=90
            fi

            if echo "$output" | grep -q "\[10/10\]"; then
                progress=100
                status_message="Steam installed successfully!"
            fi

            # Check if progress is stuck
            if [[ $progress -eq $last_progress ]] && [[ $progress -gt 0 ]] && [[ $progress -lt 100 ]]; then
                stuck_counter=$((stuck_counter + 1))
                # If stuck for more than 30 seconds, try to advance
                if [[ $stuck_counter -gt 30 ]]; then
                    # Look for any new output that might indicate progress
                    if echo "$output" | grep -q "Downloading\|Installing\|Configuring"; then
                        # Still working, just not matching our step pattern
                        # Slowly increment to show progress
                        progress=$((progress + 1))
                        if [[ $progress -gt 95 ]]; then
                            progress=95
                        fi
                    fi
                    stuck_counter=0
                fi
            else
                stuck_counter=0
                last_progress=$progress
            fi

            if command -v zenity &>/dev/null; then
                echo "$progress"
                echo "# $status_message"
            fi
        fi
        sleep 1
    done

    wait $pid
    local exit_code=$?
    rm -f "$temp_output"

    # Clean up the window mover process
    if [[ -n "$STEAM_MOVE_PID" ]]; then
        kill $STEAM_MOVE_PID 2>/dev/null
    fi

    return $exit_code
}

# ===== DECKY LOADER INSTALLATION =====
# Installs Decky Loader plugin system for Steam
install_decky() {
    local temp_output=$(mktemp)

    (
        curl -L https://github.com/SteamDeckHomebrew/decky-installer/releases/download/v1.9.0/install_prerelease.sh | bash 2>&1
    ) > "$temp_output" &

    local pid=$!
    local progress=0
    local status_message="Starting Decky Loader installation..."

    while kill -0 $pid 2>/dev/null; do
        if [[ -f "$temp_output" ]]; then
            local output=$(cat "$temp_output")

            if echo "$output" | grep -q "[0-9]\+%"; then
                local percent=$(echo "$output" | grep -o "[0-9]\+%" | tail -1 | sed 's/%//')
                if [[ -n "$percent" && "$percent" =~ ^[0-9]+$ ]]; then
                    progress=$((percent * 80 / 100))
                    status_message="Downloading Decky Loader files"
                fi
            fi

            if echo "$output" | grep -q "JQ could not be found"; then
                status_message="Checking dependencies"
            elif echo "$output" | grep -q "Creating folder structure"; then
                if [[ $progress -lt 80 ]]; then
                    progress=80
                fi
                status_message="Creating folder structure"
            elif echo "$output" | grep -q "Installing version"; then
                if [[ $progress -lt 80 ]]; then
                    progress=80
                fi
                status_message="Installing Decky Loader files"
                if [[ $progress -ge 80 && $progress -lt 90 ]]; then
                    progress=$((progress + 1))
                fi
                if [[ $progress -gt 90 ]]; then
                    progress=90
                fi
            elif echo "$output" | grep -q "Check for SELinux"; then
                status_message="Configuring SELinux permissions"
            elif echo "$output" | grep -q "systemctl" || echo "$output" | grep -q "daemon-reload"; then
                if [[ $progress -lt 90 ]]; then
                    progress=90
                fi
                status_message="Creating systemd service file"
            elif echo "$output" | grep -q "started\|enabled" && echo "$output" | grep -q "plugin_loader"; then
                if [[ $progress -lt 95 ]]; then
                    progress=95
                fi
                status_message="Starting Decky Loader service"
            elif echo "$output" | grep -q "successfully" && echo "$output" | grep -q "plugin_loader"; then
                progress=100
                status_message="Decky Loader installed successfully!"
            fi

            if command -v zenity &>/dev/null; then
                echo "$progress"
                echo "# $status_message"
            fi
        fi
        sleep 1
    done

    wait $pid
    local exit_code=$?
    rm -f "$temp_output"
    return $exit_code
}

# ===== ANIMATIONS INSTALLATION =====
# Copies custom Steam animations from /usr/share/animations to user's Steam directory
install_animations() {
    local source_dir="/usr/share/animations"
    local user_dir="$1"

    if [[ ! -d "$source_dir" ]]; then
        return 0
    fi

    local steam_root="${user_dir}/.local/share/Steam"
    if [[ -L "${user_dir}/.steam/root" ]] && [[ -d "${user_dir}/.steam/root" ]]; then
        steam_root="${user_dir}/.steam/root"
    fi

    if [[ ! -d "$steam_root" ]]; then
        return 0
    fi

    # Install Steam UI animations
    if [[ -d "$source_dir/steamui/movies" ]]; then
        mkdir -p "$steam_root/steamui/movies"
        sudo cp -rf "$source_dir/steamui/movies/"* "$steam_root/steamui/movies/" 2>/dev/null || true
        sudo chown -R "$SUDO_USER:$SUDO_USER" "$steam_root/steamui/movies" 2>/dev/null || true
        echo "50"
        echo "# Installing Steam UI animations..."
    fi

    # Install UI override animations
    if [[ -d "$source_dir/uioverrides/movies" ]]; then
        mkdir -p "$steam_root/config/uioverrides/movies"
        sudo cp -rf "$source_dir/uioverrides/movies/"* "$steam_root/config/uioverrides/movies/" 2>/dev/null || true
        sudo chown -R "$SUDO_USER:$SUDO_USER" "$steam_root/config/uioverrides/movies" 2>/dev/null || true
        echo "100"
        echo "# Installing UI override animations..."
    fi

    return 0
}

# ===== WALLPAPER =====
# Applies BlueDeck wallpaper using KDE's DBus API
apply_wallpaper() {
    local wallpaper_path="/usr/share/wallpapers/BlueDeck.png"

    if [[ ! -f "$wallpaper_path" ]]; then
        return 0
    fi

    qdbus org.kde.plasmashell /PlasmaShell org.kde.PlasmaShell.evaluateScript "
        var allDesktops = desktops();
        for (i=0; i<allDesktops.length; i++) {
            d = allDesktops[i];
            d.wallpaperPlugin = 'org.kde.image';
            d.currentConfigGroup = Array('Wallpaper', 'org.kde.image', 'General');
            d.writeConfig('Image', 'file://$wallpaper_path');
        }"
}

# ===== GAMING MODE SHORTCUT =====
# Creates desktop shortcut to switch to Gaming Mode
create_gaming_shortcut() {
    local desktop_file="$HOME/Desktop/switch-gaming.desktop"

    cat > "$desktop_file" << EOF
[Desktop Entry]
Name=Switch to Gaming Mode
Comment=Switch to Gaming Mode
Exec=/usr/bin/switch-desktop
Icon=applications-games
Terminal=false
Type=Application
EOF

    chmod +x "$desktop_file"

    mkdir -p "$HOME/.local/share/applications"
    cp "$desktop_file" "$HOME/.local/share/applications/switch-gaming.desktop"
    update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
}

# ===== MAIN INSTALLATION =====
main() {
    # Check internet connection
    if ! check_wifi; then
        show_error "No WiFi connection detected.\n\nPlease connect to a network and try again."
        exit 1
    fi

    # Install Zenity if missing (uses kdialog for password)
    if ! install_zenity; then
        show_error "Failed to install Zenity. Please install it manually: sudo dnf install zenity"
        exit 1
    fi

    # Get sudo password
    PASSWORD=$(get_password)
    if [[ -z "$PASSWORD" ]]; then
        show_error "No password provided. Exiting."
        exit 1
    fi

    # Cache sudo credentials
    cache_sudo "$PASSWORD"
    unset PASSWORD

    # Install system packages
    install_packages bluez bluez-tools brightnessctl xbindkeys box64

    # Install Steam
    (
        if install_steam; then
            echo "100"
            echo "# Steam installation complete!"
        else
            show_error "Failed to install Steam.\n\nPlease check your internet connection and try again."
            exit 1
        fi
    ) | show_progress "Installing Steam" "Starting Steam installation..."

    # Install Decky Loader
    (
        if install_decky; then
            echo "100"
            echo "# Decky Loader installation complete!"
        else
            show_error "Failed to install Decky Loader.\n\nPlease check your internet connection and try again."
            exit 1
        fi
    ) | show_progress "Installing Decky Loader" "Starting Decky Loader installation..."

    # Install animations if present
    if [[ -d "/usr/share/animations" ]]; then
        local has_animations=false
        [[ -d "/usr/share/animations/steamui/movies" ]] && [[ -n "$(ls -A /usr/share/animations/steamui/movies 2>/dev/null)" ]] && has_animations=true
        [[ -d "/usr/share/animations/uioverrides/movies" ]] && [[ -n "$(ls -A /usr/share/animations/uioverrides/movies 2>/dev/null)" ]] && has_animations=true

        if [[ "$has_animations" == "true" ]]; then
            (
                install_animations "$HOME"
            ) | show_progress "Installing Animations" "Copying custom animations to Steam..."
        fi
    fi

    # Finalize setup
    apply_wallpaper
    create_gaming_shortcut
    show_info "Install finished successfully!"

    # Cleanup
    if [[ -n "$SUDO_KEEPER_PID" ]]; then
        kill $SUDO_KEEPER_PID 2>/dev/null
    fi
}

# ===== START =====
main "$@"
