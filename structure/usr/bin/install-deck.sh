#!/bin/bash

# NintenDeck Installer
# Installs Steam, Decky Loader, and configures NintenDeck system

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

# Show error using kdialog (for early errors before Zenity is installed)
show_early_error() {
    local message="$1"
    if command -v kdialog &>/dev/null; then
        kdialog --error "$message" 2>/dev/null
    else
        echo "ERROR: $message"
    fi
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
        show_warning "DNF not found. Skipping package installation.\n\nInstall manually if needed:\ncurl xinput xdotool picom xbindkeys feh bluez bluez-tools brightnessctl box64"
        return 0
    fi

    local packages=("$@")

    if ! sudo dnf install -y "${packages[@]}" 2>/dev/null; then
        show_warning "Some packages failed to install.\n\nInstall manually if needed:\n${packages[*]}"
        return 0
    fi

    return 0
}

# ===== SDDM CONFIGURATION =====
# Configures SDDM for autologin
ensure_sddm_config() {
    if [ ! -d "$SDDM_CONFIG_DIR" ]; then
        echo "Creating SDDM config directory..."
        sudo mkdir -p "$SDDM_CONFIG_DIR"
    fi

    if [ ! -f "$SDDM_CONFIG_FILE" ]; then
        echo "Creating SDDM config file for user $CURRENT_USER..."
        printf '[Autologin]\nUser=%s\nSession=%s\nRelogin=true\n' "$CURRENT_USER" "$KDE_SESSION" | \
            sudo tee "$SDDM_CONFIG_FILE" > /dev/null
    else
        # Update User line using sudo sed
        if grep -q "^User=" "$SDDM_CONFIG_FILE" 2>/dev/null; then
            sudo sed -i "s/^User=.*/User=$CURRENT_USER/" "$SDDM_CONFIG_FILE"
        else
            sudo sed -i "/\[Autologin\]/a User=$CURRENT_USER" "$SDDM_CONFIG_FILE"
        fi

        # Update Session line to ensure KDE Plasma
        if grep -q "^Session=" "$SDDM_CONFIG_FILE" 2>/dev/null; then
            sudo sed -i "s/^Session=.*/Session=$KDE_SESSION/" "$SDDM_CONFIG_FILE"
        else
            sudo sed -i "/\[Autologin\]/a Session=$KDE_SESSION" "$SDDM_CONFIG_FILE"
        fi
    fi
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

        STEAMHOME="$HOME/.steam"
        STEAMROOT="$HOME/.local/share/Steam"
        RTARM64ROOT="$STEAMROOT/steamrtarm64"
        DESKTOP_DIR=$(xdg-user-dir DESKTOP 2>/dev/null || echo "$HOME/Desktop")

        # Remove conflicting native Steam packages
        printf "\n[1/15] Checking for conflicting system packages...\n"
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
        printf "\n[2/15] Cleaning up old desktop shortcuts...\n"
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
        printf "\n[3/15] Checking existing Steam installation...\n"
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
        printf "\n[4/15] Downloading Steam bootstrap...\n"
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
        printf "\n[5/15] Downloading Steam runtime...\n"
        if [ ! -x "$RTARM64ROOT/pv-runtime/steam-runtime-steamrt-arm64" ]; then
            mkdir -p "$RTARM64ROOT/pv-runtime"
            wget -q --show-progress -c -t 5 -O "$RTARM64ROOT/pv-runtime/steam-runtime-steamrt-arm64.tar.xz" "https://repo.steampowered.com/steamrt3c/images/latest-public-beta/steam-runtime-steamrt-arm64.tar.xz" || exit_on_error "steam runtime download failed (check your internet connection)"
            tar -xf "$RTARM64ROOT/pv-runtime/steam-runtime-steamrt-arm64.tar.xz" --directory "$RTARM64ROOT/pv-runtime" --checkpoint=200 --checkpoint-action=dot
            rm -rf "$RTARM64ROOT/pv-runtime/steam-runtime-steamrt-arm64.tar.xz"
        fi

        # Install DXVK-Sarek
        printf "\n[6/15] Downloading DXVK-Sarek...\n"
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
        printf "\n[7/15] Downloading VKD3D-Proton...\n"
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
        printf "\n[8/15] Configuring controller permissions...\n"
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

        # Run Steam initial update
        printf "\n[9/15] Starting Steam initial update (this may take a while)...\n"
        if [ -x "$RTARM64ROOT/steam" ]; then
            export LD_LIBRARY_PATH="$RTARM64ROOT:${LD_LIBRARY_PATH-}"
            "$RTARM64ROOT/steam" "$@" || true

            printf "\n[10/15] Steam update complete. Downloading downgrade files...\n"

            TEMP_SD="$STEAMROOT/temp_sd"
            mkdir -p "$TEMP_SD"

            wget -q -t 5 -O- "https://github.com/SildurFX/Switchdeck/archive/refs/heads/main.tar.gz" | tar xz -C "$TEMP_SD" --strip-components=1 || exit_on_error "Failed to download/extract downgrade files"

            if [ -f "$TEMP_SD/files/downgrade/linuxarm64.tar.gz" ]; then
                mkdir -p "$STEAMROOT/linuxarm64"
                tar -xzf "$TEMP_SD/files/downgrade/linuxarm64.tar.gz" -C "$STEAMROOT/linuxarm64"
            fi

            if [ -f "$TEMP_SD/files/downgrade/linux_x86_64.zip" ]; then
                unzip -q -o "$TEMP_SD/files/downgrade/linux_x86_64.zip" -d "$STEAMROOT"
            fi

            if [ -f "$TEMP_SD/files/downgrade/steamrtarm64.tar.gz.partaa" ]; then
                mkdir -p "$STEAMROOT/steamrtarm64"
                cat "$TEMP_SD/files/downgrade/steamrtarm64.tar.gz.part"* > "$TEMP_SD/steamrtarm64.tar.gz"
                tar -xzf "$TEMP_SD/steamrtarm64.tar.gz" -C "$STEAMROOT/steamrtarm64"
                rm -f "$TEMP_SD/steamrtarm64.tar.gz"
            fi

            printf "\n[11/15] Applying downgrade files...\n"
            cp -f  "$TEMP_SD/files/downgrade/steam.cfg" "$STEAMROOT/steam.cfg"
            cp -f  "$TEMP_SD/files/steam/launch-steam.sh" "$STEAMROOT/"
            cp -f  "$TEMP_SD/files/steam/update-switchdeck.sh" "$STEAMROOT/"

            rm -rf "$TEMP_SD"

            chmod -R +x "$STEAMROOT"

            # Don't trigger old version migration on a fresh install
            touch "$STEAMROOT/Switchdeck/.migration"

            printf "\n[12/15] Setting up Steam symlinks...\n"
            # Setup symlinks
            ln -fsn "$STEAMROOT" "$STEAMHOME/root"
            ln -fsn "$STEAMROOT" "$STEAMHOME/steam"
            ln -fsn "$STEAMROOT/linux32" "$STEAMHOME/sdk32"
            ln -fsn "$STEAMROOT/linux64" "$STEAMHOME/sdk64"
            ln -fsn "$STEAMROOT/linuxarm64" "$STEAMHOME/sdkarm64"
            ln -fsn "$STEAMROOT/ubuntu12_32" "$STEAMHOME/bin32"
            ln -fsn "$STEAMROOT/ubuntu12_64" "$STEAMHOME/bin64"
            ln -fsn "$STEAMHOME/bin32" "$STEAMHOME/bin"
            ln -fsn "$STEAMROOT/steamrtarm64" "$STEAMROOT/steamrtarm32"

            # Add steam to path
            mkdir -p "$HOME/.local/bin"
            ln -fsn "$STEAMROOT/launch-steam.sh" "$HOME/.local/bin/steam"

            printf "\n[13/15] Creating desktop shortcuts...\n"
            # Setup desktop path and icon
            MENU_DIR="$HOME/.local/share/applications"
            mkdir -p "$MENU_DIR"

            DESKTOP_FILE="$MENU_DIR/steam.desktop"
            cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Name=Steam
Comment=Launch Steam
Exec=$HOME/.local/bin/steam %U
Icon=$STEAMROOT/public/steam_tray_48.tga
Terminal=false
Type=Application
Categories=Game;
MimeType=x-scheme-handler/steam;
EOF

            # Create KDE right-click menu for adding games to Steam
            if [[ "${XDG_CURRENT_DESKTOP}" == *"KDE"* ]]; then
                KDE_MENU_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/kio/servicemenus"
                [ -d "$HOME/.local/share/kservices5" ] && KDE_MENU_DIR="$HOME/.local/share/kservices5/ServiceMenus"
                mkdir -p "$KDE_MENU_DIR" "$STEAMROOT/Switchdeck"
                cat << EOF > "$STEAMROOT/Switchdeck/switchdeck-add-game"
#!/bin/sh
TARGET_ITEM="\$1"
[ -z "\$TARGET_ITEM" ] && exit 1
if ! ps ax | grep -q 'steamrtarm64/[s]team'; then
    kdialog --title Error --error "Require the Steam to be active."
    exit 1
fi
encodedUrl="steam://addnonsteamgame/\$(python3 -c "import urllib.parse; print(urllib.parse.quote(\\"\$TARGET_ITEM\\", safe=''))")"
touch /tmp/addnonsteamgamefile
xdg-open \$encodedUrl
bn=\$(basename "\$TARGET_ITEM")
kdialog --passivepopup "\$bn has been added to Steam." 5
EOF
                cat > "$KDE_MENU_DIR/addtosteam.desktop" <<EOF
[Desktop Entry]
Type=Service
ServiceTypes=KonqPopupMenu/Plugin
MimeType=application/x-executable;application/x-desktop;
Actions=addToSteam
X-KDE-Priority=TopLevel
Icon=$STEAMROOT/public/steam_tray_48.tga

[Desktop Action addToSteam]
Exec=$STEAMROOT/Switchdeck/switchdeck-add-game %f
Icon=$STEAMROOT/public/steam_tray_48.tga
Name=Add to Steam
EOF
                chmod +x "$STEAMROOT/Switchdeck/switchdeck-add-game" "$KDE_MENU_DIR/addtosteam.desktop"
            fi

            chmod +x "$DESKTOP_FILE"
            ln -fs "$DESKTOP_FILE" "$DESKTOP_DIR/steam.desktop"
            update-desktop-database "$MENU_DIR" 2>/dev/null

            # Just to be safe
            chmod -R +x "$STEAMROOT"

            printf "\n[14/15] Steam installation complete!\n"
            printf "To launch Steam, use the provided desktop shortcuts\n"
            printf "or run launch-steam.sh in your Steam folder.\n\n"
            sleep 3
        fi

        printf "\n[15/15] Finalizing installation...\n"
    ) > "$temp_output" 2>&1 &

    local pid=$!
    local progress=0
    local status_message="Starting Steam installation..."
    local download_percent=0

    # Monitor progress and update dialog
    while kill -0 $pid 2>/dev/null; do
        if [[ -f "$temp_output" ]]; then
            local output=$(cat "$temp_output")

            # Track steps 1-15
            if echo "$output" | grep -q "\[1/15\]"; then
                status_message="Checking for conflicting packages"
                progress=6
            fi

            if echo "$output" | grep -q "\[2/15\]"; then
                status_message="Cleaning up old shortcuts"
                progress=12
            fi

            if echo "$output" | grep -q "\[3/15\]"; then
                status_message="Checking existing Steam installation"
                progress=18
            fi

            if echo "$output" | grep -q "\[4/15\]"; then
                status_message="Downloading Steam bootstrap"
                progress=24
            fi

            if echo "$output" | grep -q "\[5/15\]"; then
                status_message="Downloading Steam runtime"
                progress=30
            fi

            if echo "$output" | grep -q "\[6/15\]"; then
                status_message="Downloading DXVK-Sarek"
                progress=36
            fi

            if echo "$output" | grep -q "\[7/15\]"; then
                status_message="Downloading VKD3D-Proton"
                progress=42
            fi

            if echo "$output" | grep -q "\[8/15\]"; then
                status_message="Configuring controller permissions"
                progress=48
            fi

            # Track Steam download progress within step 9
            if echo "$output" | grep -q "\[9/15\]"; then
                # Check for download percentage from Steam
                if echo "$output" | grep -q "\[[0-9]*\%\]"; then
                    local steam_percent=$(echo "$output" | grep -o "\[[0-9]*\%\]" | tail -1 | tr -d '[]%')
                    if [[ -n "$steam_percent" && "$steam_percent" =~ ^[0-9]+$ ]]; then
                        # Map Steam's 0-100% to progress 48-80%
                        download_percent=$((steam_percent * 32 / 100))
                        progress=$((48 + download_percent))
                        status_message="Downloading Steam update ($steam_percent%)"
                    fi
                fi

                # Check for extracting package
                if echo "$output" | grep -q "Extracting package"; then
                    status_message="Extracting Steam update packages"
                    progress=70
                fi

                # Check for installing update
                if echo "$output" | grep -q "Installing update"; then
                    status_message="Installing Steam update"
                    progress=75
                fi

                # Check for cleaning up
                if echo "$output" | grep -q "Cleaning up"; then
                    status_message="Cleaning up Steam update"
                    progress=78
                fi

                # Check for update complete
                if echo "$output" | grep -q "Update complete, launching"; then
                    progress=80
                    status_message="Steam update complete"
                fi
            fi

            if echo "$output" | grep -q "\[10/15\]"; then
                status_message="Steam update complete. Downloading downgrade files"
                progress=82
            fi

            if echo "$output" | grep -q "\[11/15\]"; then
                status_message="Applying downgrade files"
                progress=86
            fi

            if echo "$output" | grep -q "\[12/15\]"; then
                status_message="Setting up Steam symlinks"
                progress=90
            fi

            if echo "$output" | grep -q "\[13/15\]"; then
                status_message="Creating desktop shortcuts"
                progress=94
            fi

            if echo "$output" | grep -q "\[14/15\]"; then
                progress=98
                status_message="Steam installation complete"
            fi

            if echo "$output" | grep -q "\[15/15\]"; then
                progress=100
                status_message="Finalizing installation"
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

# ===== DISABLE STEAM UPDATES =====
# Modifies launch-steam.sh to disable update checks
disable_steam_updates() {
    local launch_script="$HOME/.steam/steam/launch-steam.sh"

    # Check if the file exists
    if [[ -f "$launch_script" ]]; then
        echo "Disabling Steam update checks..."
        # Replace UPDATE_CHECK="true" with UPDATE_CHECK="false"
        if grep -q 'UPDATE_CHECK="true"' "$launch_script" 2>/dev/null; then
            sed -i 's/UPDATE_CHECK="true"/UPDATE_CHECK="false"/g' "$launch_script"
            echo "Steam update checks disabled."
        else
            echo "UPDATE_CHECK line not found or already modified."
        fi
    else
        echo "launch-steam.sh not found at $launch_script"
    fi
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
        sudo cp -rf "$source_dir/steamui/movies/." "$steam_root/steamui/movies/" 2>/dev/null || true
        sudo chown -R "$SUDO_USER:$SUDO_USER" "$steam_root/steamui/movies" 2>/dev/null || true
        echo "50"
        echo "# Installing Steam UI animations..."
    fi

    # Install UI override animations
    if [[ -d "$source_dir/uioverrides/movies" ]]; then
        mkdir -p "$steam_root/config/uioverrides/movies"
        sudo cp -rf "$source_dir/uioverrides/movies/." "$steam_root/config/uioverrides/movies/" 2>/dev/null || true
        sudo chown -R "$SUDO_USER:$SUDO_USER" "$steam_root/config/uioverrides/movies" 2>/dev/null || true
        echo "100"
        echo "# Installing UI override animations..."
    fi

    return 0
}

# ===== MODIFY STEAM UI SCALING =====
# Fixes Steam UI scaling for Switch display
modify_steam_ui_scaling() {
    local config_file="$HOME/.steam/steam/config/config.vdf"

    # Check if config file exists
    if [[ ! -f "$config_file" ]]; then
        echo "Steam config file not found at $config_file"
        return 1
    fi

    # Create a backup of the config file
    local backup_file="$config_file.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$config_file" "$backup_file"
    echo "Created backup at $backup_file"

    # Extract the display name from the UI section (case insensitive for "name")
    local display_name=$(grep -A 20 '"UI"' "$config_file" | grep -i '"name"' | head -1 | sed 's/.*"name"[[:space:]]*"\(.*\)"/\1/I')

    if [[ -z "$display_name" ]]; then
        echo "Could not find display name in config file"
        return 1
    fi

    echo "Found display name: $display_name"

    # Check if the section already exists
    if grep -q "\"$display_name\"" "$config_file"; then
        echo "Section for $display_name already exists. Updating ScaleFactor to 1.37..."
        # Update existing ScaleFactor in that section
        sed -i "/\"$display_name\"/,/}/ s/\"ScaleFactor\"[[:space:]]*\"[0-9.]*\"/\"ScaleFactor\"\t\t\"1.37\"/" "$config_file"
    else
        echo "Adding new section for $display_name with ScaleFactor 1.37..."

        # Use awk to insert the new section after the "Current" section
        awk -v display="$display_name" '
        BEGIN { in_current = 0; inserted = 0; buffer = "" }
        {
            # Store current line in buffer
            buffer = buffer $0 "\n"

            # Check if we are in the "Current" section
            if ($0 ~ /"Current"/) {
                in_current = 1
                brace_count = 0
            }

            # If we are in the "Current" section, track braces
            if (in_current) {
                # Count braces in this line
                for (i=1; i<=length($0); i++) {
                    char = substr($0, i, 1)
                    if (char == "{") brace_count++
                    if (char == "}") brace_count--
                }

                # If brace_count is 0 and we are still in_current, we found the closing brace
                if (brace_count == 0 && in_current) {
                    # Insert the new section before this closing brace
                    printf "\t\t\t\"%s\"\n", display
                    printf "\t\t\t{\n"
                    printf "\t\t\t\t\"ScaleFactor\"\t\t\"1.37\"\n"
                    printf "\t\t\t}\n"
                    in_current = 0
                    inserted = 1
                }
            }

            # If we have a buffer and we inserted, print it
            if (inserted) {
                print buffer
                buffer = ""
                inserted = 0
            }

            # If we haven't inserted and buffer is not empty, print it
            if (!inserted && buffer != "") {
                print buffer
                buffer = ""
            }
        }
        END {
            # Print any remaining buffer
            if (buffer != "") print buffer
        }' "$config_file" > "$config_file.tmp"

        # Replace original with modified
        mv "$config_file.tmp" "$config_file"
    fi

    # Verify the change
    if grep -q "\"$display_name\"" "$config_file"; then
        echo "Successfully modified Steam UI scaling for $display_name"
        return 0
    else
        echo "Failed to modify Steam UI scaling"
        # Restore backup
        cp "$backup_file" "$config_file"
        return 1
    fi
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

# ===== CLEANUP DESKTOP =====
# Removes old installer desktop file
cleanup_desktop() {
    # Remove old installer desktop file from Desktop
    local old_desktop="$HOME/Desktop/Install NintenDeck.desktop"
    if [[ -f "$old_desktop" ]]; then
        rm -f "$old_desktop"
        echo "Removed old installer desktop file."
    fi
}

# ===== MAIN INSTALLATION =====
main() {
    # Step 1: Check internet connection FIRST
    if ! check_wifi; then
        show_early_error "No WiFi connection detected.\n\nPlease connect to a network and try again."
        exit 1
    fi

    # Step 2: Install Zenity if missing (uses kdialog for password)
    if ! install_zenity; then
        echo "Failed to install Zenity. Please install it manually: sudo dnf install zenity"
        exit 1
    fi

    # Step 3: Get sudo password
    PASSWORD=$(get_password)
    if [[ -z "$PASSWORD" ]]; then
        show_error "No password provided. Exiting."
        exit 1
    fi

    # Step 4: Cache sudo credentials
    cache_sudo "$PASSWORD"
    unset PASSWORD

    # Step 5: Install system packages
    install_packages curl xinput xdotool picom xbindkeys feh bluez bluez-tools brightnessctl box64

    # Step 6: Install Steam
    (
        if install_steam; then
            echo "100"
            echo "# Steam installation complete!"
        else
            show_error "Failed to install Steam.\n\nPlease check your internet connection and try again."
            exit 1
        fi
    ) | show_progress "Installing Steam" "Starting Steam installation..."

    # Step 7: Install Decky Loader
    (
        if install_decky; then
            echo "100"
            echo "# Decky Loader installation complete!"
        else
            show_error "Failed to install Decky Loader.\n\nPlease check your internet connection and try again."
            exit 1
        fi
    ) | show_progress "Installing Decky Loader" "Starting Decky Loader installation..."

    # Step 8: Install animations if present
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

    # Step 9: Configure SDDM for autologin (ensures KDE Plasma)
    ensure_sddm_config

    # Step 10: Disable Steam updates
    disable_steam_updates

    # Step 11: Modify Steam UI scaling for Switch display
    modify_steam_ui_scaling

    # Step 12: Apply wallpaper
    apply_wallpaper

    # Step 13: Create gaming mode shortcut
    create_gaming_shortcut

    # Step 14: Cleanup old desktop file
    cleanup_desktop

    # Step 15: Show completion message
    show_info "Install finished successfully!"

    # Cleanup
    if [[ -n "$SUDO_KEEPER_PID" ]]; then
        kill $SUDO_KEEPER_PID 2>/dev/null
    fi
}

# ===== START =====
main "$@"
