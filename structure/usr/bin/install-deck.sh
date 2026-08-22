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

# ===== KDIALOG HELPERS (Only for early errors and password) =====
# These are used before Zenity is installed

show_early_error() {
    local message="$1"
    if command -v kdialog &>/dev/null; then
        kdialog --error "$message" 2>/dev/null
    else
        echo "ERROR: $message"
    fi
}

get_password_kdialog() {
    if command -v kdialog &>/dev/null; then
        kdialog --password "Enter your sudo password:" 2>/dev/null
    else
        echo "kdialog not found. Please install kdialog."
        exit 1
    fi
}

# ===== ZENITY HELPERS =====
# These are used after Zenity is installed

# Prompt for password using Zenity
get_password_zenity() {
    zenity --password --title="Authentication Required" --text="Enter your sudo password:" --width=400 2>/dev/null
}

# Show error dialog
show_error() {
    local message="$1"
    if command -v zenity &>/dev/null; then
        zenity --error --title="Error" --text="$message" --width=400 2>/dev/null
    else
        echo "ERROR: $message"
    fi
}

# Show info dialog
show_info() {
    local message="$1"
    if command -v zenity &>/dev/null; then
        zenity --info --title="Information" --text="$message" --width=400 2>/dev/null
    else
        echo "INFO: $message"
    fi
}

# Show yes/no question dialog
show_question() {
    local message="$1"
    if command -v zenity &>/dev/null; then
        zenity --question --title="Question" --text="$message" --width=400 2>/dev/null
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
        zenity --warning --title="Warning" --text="$message" --width=400 2>/dev/null
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

    # Use kdialog for warning since zenity isn't installed
    if command -v kdialog &>/dev/null; then
        kdialog --warning "Zenity is required but not installed.\n\nClick OK to install it using DNF." 2>/dev/null
    fi

    local password=$(get_password_kdialog)
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

# ===== INSTALL ALL PACKAGES =====
# Installs all required system packages in one go
install_all_packages() {
    if ! command -v dnf &>/dev/null; then
        show_warning "DNF not found. Skipping package installation.\n\nInstall manually if needed:\ncurl xinput xdotool picom xbindkeys feh bluez bluez-tools brightnessctl box64"
        return 0
    fi

    local packages=(
        curl
        xinput
        xdotool
        picom
        xbindkeys
        feh
        bluez
        bluez-tools
        brightnessctl
        box64
    )

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

# ===== STEAM INSTALLATION =====
# Downloads and runs the Switchdeck installer non-interactively
install_steam() {
    local temp_output=$(mktemp)

    # Download and modify the script to remove terminal check
    local temp_script=$(mktemp)
    if ! curl -L -o "$temp_script" "https://raw.githubusercontent.com/SildurFX/Switchdeck/refs/heads/main/install-steam.sh" 2>/dev/null; then
        show_error "Failed to download Steam installer script.\n\nPlease check your internet connection."
        rm -f "$temp_script" "$temp_output"
        return 1
    fi

    # Completely remove the terminal check section and any exec commands
    sed -i '/^# Check for terminal/,/^fi/d' "$temp_script"
    sed -i '/^[[:space:]]*exec /d' "$temp_script"
    # Also remove any lines that check for tty
    sed -i '/if \[ ! -t 0 \]/,/fi/d' "$temp_script"
    # Remove any konsole/gnome-terminal/xterm references
    sed -i '/konsole/d' "$temp_script"
    sed -i '/gnome-terminal/d' "$temp_script"
    sed -i '/xterm/d' "$temp_script"
    # Replace the read -p prompt with "y" (delete Steam folder)
    sed -i 's/read -p "A clean installation is recommended. Would you like to delete them now? (y\/N): " choice/choice="y"/' "$temp_script"
    # Remove any other read prompts
    sed -i 's/read /# read /g' "$temp_script"

    chmod +x "$temp_script"

    # Run the modified script with stdin redirected from /dev/null
    (
        bash "$temp_script" </dev/null 2>&1
    ) > "$temp_output" &

    local pid=$!
    local progress=0
    local status_message="Starting Steam installation..."

    # Monitor progress and update dialog
    while kill -0 $pid 2>/dev/null; do
        if [[ -f "$temp_output" ]]; then
            local output=$(cat "$temp_output")

            # Track progress based on output keywords
            if echo "$output" | grep -q "Checking for conflicting system packages"; then
                status_message="Checking for conflicting packages"
                progress=5
            fi

            if echo "$output" | grep -q "Cleaning up old desktop shortcuts"; then
                status_message="Cleaning up old shortcuts"
                progress=10
            fi

            if echo "$output" | grep -q "Steam directories already exist"; then
                status_message="Checking existing Steam installation"
                progress=15
            fi

            if echo "$output" | grep -q "Deleting"; then
                status_message="Deleting old Steam directories"
                progress=18
            fi

            if echo "$output" | grep -q "Downloading steam bootstrap"; then
                status_message="Downloading Steam bootstrap"
                progress=20
            fi

            if echo "$output" | grep -q "Downloading steam-runtime"; then
                status_message="Downloading Steam runtime"
                progress=35
            fi

            if echo "$output" | grep -q "Downloading DXVK-Sarek"; then
                status_message="Downloading DXVK-Sarek"
                progress=45
            fi

            if echo "$output" | grep -q "Downloading VKD3D-Proton"; then
                status_message="Downloading VKD3D-Proton"
                progress=55
            fi

            if echo "$output" | grep -q "Configuring controller permissions"; then
                status_message="Configuring controller permissions"
                progress=60
            fi

            if echo "$output" | grep -q "Starting Steam (Initial Update phase)"; then
                # Check for download percentage from Steam
                if echo "$output" | grep -q "\[[0-9]*\%\]"; then
                    local steam_percent=$(echo "$output" | grep -o "\[[0-9]*\%\]" | tail -1 | tr -d '[]%')
                    if [[ -n "$steam_percent" && "$steam_percent" =~ ^[0-9]+$ ]]; then
                        progress=$((60 + (steam_percent * 20 / 100)))
                        status_message="Downloading Steam update ($steam_percent%)"
                    fi
                else
                    status_message="Starting Steam update (this may take a while)"
                    progress=65
                fi

                if echo "$output" | grep -q "Extracting package"; then
                    status_message="Extracting Steam update"
                    progress=78
                fi

                if echo "$output" | grep -q "Installing update"; then
                    status_message="Installing Steam update"
                    progress=82
                fi

                if echo "$output" | grep -q "Update complete, launching"; then
                    progress=85
                    status_message="Steam update complete"
                fi
            fi

            if echo "$output" | grep -q "Steam exited. Downloading files to downgrade steam"; then
                status_message="Downloading downgrade files"
                progress=87
            fi

            if echo "$output" | grep -q "Applying downgrade files"; then
                status_message="Applying downgrade files"
                progress=90
            fi

            if echo "$output" | grep -q "Setting up Steam symlinks"; then
                status_message="Setting up Steam symlinks"
                progress=93
            fi

            if echo "$output" | grep -q "Creating desktop shortcuts"; then
                status_message="Creating desktop shortcuts"
                progress=96
            fi

            if echo "$output" | grep -q "Installation complete!"; then
                progress=100
                status_message="Steam installed successfully!"
            fi

            # Send progress to zenity
            echo "$progress"
            echo "# $status_message"
        fi
        sleep 1
    done

    wait $pid
    local exit_code=$?

    # Clean up
    rm -f "$temp_script" "$temp_output"

    # Check if Steam was actually installed
    if [[ -f "$HOME/.steam/steam/launch-steam.sh" ]]; then
        return 0
    else
        return 1
    fi
}

# ===== CREATE STEAM CONFIG =====
# Creates the config.vdf file with proper UI scaling
create_steam_config() {
    local config_dir="$HOME/.steam/steam/config"
    local config_file="$config_dir/config.vdf"

    # Create config directory if it doesn't exist
    mkdir -p "$config_dir"

    # Create the config.vdf file
    cat > "$config_file" << 'EOF'
"InstallConfigStore"
{
	"UI"
	{
		"display"
		{
			"Current"
			{
				"MinScaleFactor"		"0.474341660737991333"
				"MaxScaleFactor"		"2.27314615249633789"
				"IsExternalDisplay"		"1"
				"name"		"External: DSI-0|||Fullscreen-1280x720"
				"AutoScaleFactor"		"0.948683321475982666"
				"ScaleFactor"		"1.37559080123901367"
			}
			"External: DSI-0|||Fullscreen-1280x720"
			{
				"ScaleFactor"		"1.37559080123901367"
			}
		}
	}
}
EOF

    echo "Steam config file created at $config_file"
}

# ===== DISABLE STEAM UPDATES =====
# Modifies launch-steam.sh to disable update checks
disable_steam_updates() {
    local launch_script="$HOME/.steam/steam/launch-steam.sh"

    if [[ -f "$launch_script" ]]; then
        if grep -q 'UPDATE_CHECK="true"' "$launch_script" 2>/dev/null; then
            sed -i 's/UPDATE_CHECK="true"/UPDATE_CHECK="false"/g' "$launch_script"
            echo "Steam update checks disabled."
        fi
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

            # Send progress to zenity
            echo "$progress"
            echo "# $status_message"
        fi
        sleep 1
    done

    wait $pid
    local exit_code=$?
    rm -f "$temp_output"

    # Check if Decky Loader was actually installed
    if [[ $exit_code -eq 0 ]] && [[ -f "$HOME/homebrew/services/PluginLoader" ]]; then
        return 0
    else
        return 1
    fi
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
        return 1
    fi

    local failed=0

    if [[ -d "$source_dir/steamui/movies" ]]; then
        mkdir -p "$steam_root/steamui/movies"
        if ! sudo cp -rf "$source_dir/steamui/movies/." "$steam_root/steamui/movies/" 2>/dev/null; then
            failed=1
        else
            sudo chown -R "$SUDO_USER:$SUDO_USER" "$steam_root/steamui/movies" 2>/dev/null
            echo "50"
            echo "# Installing Steam UI animations..."
        fi
    fi

    if [[ -d "$source_dir/uioverrides/movies" ]]; then
        mkdir -p "$steam_root/config/uioverrides/movies"
        if ! sudo cp -rf "$source_dir/uioverrides/movies/." "$steam_root/config/uioverrides/movies/" 2>/dev/null; then
            failed=1
        else
            sudo chown -R "$SUDO_USER:$SUDO_USER" "$steam_root/config/uioverrides/movies" 2>/dev/null
            echo "100"
            echo "# Installing UI override animations..."
        fi
    fi

    if [[ $failed -eq 1 ]]; then
        return 1
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

    return 0
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
Icon=/usr/share/icons/NintenDeck/logo.png
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
    local old_desktop="$HOME/Desktop/Install NintenDeck.desktop"
    if [[ -f "$old_desktop" ]]; then
        rm -f "$old_desktop"
        echo "Removed old installer desktop file."
    fi
}

# ===== MAIN INSTALLATION =====
main() {
    # Step 1: Check internet connection - use kdialog for error
    if ! check_wifi; then
        show_early_error "No WiFi connection detected.\n\nPlease connect to a network and try again."
        exit 1
    fi

    # Step 2: Install Zenity if missing (uses kdialog for password)
    if ! install_zenity; then
        echo "Failed to install Zenity. Please install it manually: sudo dnf install zenity"
        exit 1
    fi

    # Step 3: Get sudo password using Zenity (now that it's installed)
    PASSWORD=$(get_password_zenity)
    if [[ -z "$PASSWORD" ]]; then
        show_error "No password provided. Exiting."
        exit 1
    fi

    # Step 4: Cache sudo credentials
    cache_sudo "$PASSWORD"
    unset PASSWORD

    # Step 5: Install all packages in one go
    install_all_packages

    # Step 6: Install Steam with detailed progress bar - Exit if it fails
    (
        if install_steam; then
            echo "100"
            echo "# Steam installation complete!"
        else
            echo "100"
            echo "# Steam installation failed!"
            exit 1
        fi
    ) | show_progress "Installing Steam" "Starting Steam installation..."

    # Check if Steam installation failed
    if [[ ${PIPESTATUS[0]} -ne 0 ]]; then
        show_error "Steam installation failed.\n\nPlease check your internet connection and try again."
        exit 1
    fi

    # Step 7: Create Steam config file
    create_steam_config

    # Step 8: Disable Steam updates
    disable_steam_updates

    # Step 9: Install Decky Loader with detailed progress bar - Exit if it fails
    (
        if install_decky; then
            echo "100"
            echo "# Decky Loader installation complete!"
        else
            echo "100"
            echo "# Decky Loader installation failed!"
            exit 1
        fi
    ) | show_progress "Installing Decky Loader" "Starting Decky Loader installation..."

    # Check if Decky Loader installation failed
    if [[ ${PIPESTATUS[0]} -ne 0 ]]; then
        show_error "Decky Loader installation failed.\n\nPlease check your internet connection and try again."
        exit 1
    fi

    # Step 10: Install animations - Exit if it fails
    if [[ -d "/usr/share/animations" ]]; then
        local has_animations=false
        [[ -d "/usr/share/animations/steamui/movies" ]] && [[ -n "$(ls -A /usr/share/animations/steamui/movies 2>/dev/null)" ]] && has_animations=true
        [[ -d "/usr/share/animations/uioverrides/movies" ]] && [[ -n "$(ls -A /usr/share/animations/uioverrides/movies 2>/dev/null)" ]] && has_animations=true

        if [[ "$has_animations" == "true" ]]; then
            (
                if install_animations "$HOME"; then
                    echo "100"
                    echo "# Animations installed successfully!"
                else
                    echo "100"
                    echo "# Animations installation failed!"
                    exit 1
                fi
            ) | show_progress "Installing Animations" "Copying custom animations to Steam..."

            # Check if animations installation failed
            if [[ ${PIPESTATUS[0]} -ne 0 ]]; then
                show_error "Animations installation failed.\n\nPlease make sure the animation files are properly placed in /usr/share/animations/"
                exit 1
            fi
        fi
    fi

    # Step 11: Configure SDDM for autologin
    ensure_sddm_config

    # Step 12: Apply wallpaper (non-critical - continues even if it fails)
    apply_wallpaper 2>/dev/null || true

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
