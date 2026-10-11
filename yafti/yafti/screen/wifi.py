import asyncio
import subprocess
from gi.repository import Adw, Gtk

import yafti.share
from yafti import log
from yafti.abc import YaftiScreen


class WifiScreen(YaftiScreen, Gtk.Box):
    __gtype_name__ = "YaftiWifiScreen"

    def __init__(
        self,
        title: str = "Connect to Network",
        description: str = "Select a Wi-Fi network or verify your connection to continue.",
        hide_back: bool = False,
        **kwargs,
    ):
        super().__init__(orientation=Gtk.Orientation.VERTICAL, **kwargs)

        self.hide_back = hide_back
        self.has_scanned = False
        self._is_active = False
        self._scan_task: asyncio.Task | None = None

        self.scrolled_window = Gtk.ScrolledWindow()
        self.scrolled_window.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        self.scrolled_window.set_hexpand(True)
        self.scrolled_window.set_vexpand(True)

        self.status_page = Adw.StatusPage()
        self.status_page.set_title(title)
        self.status_page.set_description(description)
        self.status_page.set_icon_name("network-wireless-symbolic")

        content_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=16)
        content_box.set_halign(Gtk.Align.CENTER)
        content_box.set_size_request(420, -1)
        content_box.set_margin_top(12)
        content_box.set_margin_bottom(24)

        self.btn_refresh = Gtk.Button(label="Scan Networks")
        self.btn_refresh.set_halign(Gtk.Align.CENTER)
        self.btn_refresh.connect("clicked", lambda _: self._start_scan_task())
        content_box.append(self.btn_refresh)

        self.list_box = Gtk.ListBox()
        self.list_box.set_selection_mode(Gtk.SelectionMode.NONE)
        self.list_box.add_css_class("boxed-list")
        content_box.append(self.list_box)

        self.status_page.set_child(content_box)
        self.scrolled_window.set_child(self.status_page)
        self.append(self.scrolled_window)

        self.connecting = False
        self.scanning = False

    def deactivate(self):
        self._is_active = False
        if self._scan_task and not self._scan_task.done():
            self._scan_task.cancel()

        if self.hide_back and hasattr(yafti.share, "BTN_BACK") and yafti.share.BTN_BACK:
            yafti.share.BTN_BACK.set_visible(True)

        super().deactivate()

    async def on_activate(self):
        self._is_active = True

        if self.hide_back and hasattr(yafti.share, "BTN_BACK") and yafti.share.BTN_BACK:
            yafti.share.BTN_BACK.set_visible(False)

        await self._ensure_wifi_enabled()
        if self._is_active:
            self._start_scan_task()

    def _start_scan_task(self):
        if self._scan_task and not self._scan_task.done():
            self._scan_task.cancel()
        self._scan_task = asyncio.create_task(self.scan_wifi())

    def _clear_list_box(self):
        while child := self.list_box.get_first_child():
            self.list_box.remove(child)

    def _sync_get_active_connections(self) -> tuple[str | None, str | None]:
        lan_name = None
        wifi_ssid = None

        try:
            res_dev = subprocess.run(
                ["nmcli", "-t", "-f", "TYPE,STATE,CONNECTION", "device"],
                capture_output=True,
                text=True,
                timeout=2,
            )
            if res_dev.returncode == 0:
                for line in res_dev.stdout.strip().split("\n"):
                    if not line:
                        continue
                    parts = line.split(":", 2)
                    if len(parts) >= 2:
                        dev_type, state = parts[0].strip(), parts[1].strip()
                        conn_name = parts[2].strip() if len(parts) > 2 else ""
                        if dev_type == "ethernet" and state == "connected":
                            lan_name = conn_name or "Wired Connection 1"
                        elif dev_type == "wifi" and state == "connected":
                            wifi_ssid = conn_name or None
        except Exception:
            pass

        return lan_name, wifi_ssid

    def _update_next_button(self, connected: bool):
        if not self._is_active:
            return

        if hasattr(yafti.share, "BTN_NEXT") and yafti.share.BTN_NEXT is not None:
            yafti.share.BTN_NEXT.set_sensitive(connected)

    async def _ensure_wifi_enabled(self):
        try:
            proc = await asyncio.create_subprocess_exec(
                "nmcli",
                "radio",
                "wifi",
                "on",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await proc.communicate()
        except Exception as e:
            log.error("Failed to enable Wi-Fi radio", exc=e)

    def _add_lan_row(self, connection_name: str):
        row = Adw.ActionRow()
        row.set_title(connection_name)

        icon = Gtk.Image.new_from_icon_name("network-wired-symbolic")
        row.add_prefix(icon)

        btn_connected = Gtk.Button(label="Connected")
        btn_connected.set_valign(Gtk.Align.CENTER)
        btn_connected.set_sensitive(False)
        row.add_suffix(btn_connected)

        self.list_box.append(row)

    async def scan_wifi(self):
        if self.connecting or self.scanning or not self._is_active:
            return

        self.scanning = True
        self.btn_refresh.set_sensitive(False)

        lan_name, active_ssid = await asyncio.to_thread(self._sync_get_active_connections)

        if not self._is_active:
            self.scanning = False
            return

        self._clear_list_box()

        if lan_name:
            self._add_lan_row(lan_name)

        if active_ssid:
            self._add_wifi_row(active_ssid, "--", active=True)

        loading_row = Adw.ActionRow()
        spinner_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        spinner_box.set_valign(Gtk.Align.CENTER)
        spinner_box.set_halign(Gtk.Align.CENTER)
        spinner_box.set_margin_top(12)
        spinner_box.set_margin_bottom(12)

        spinner = Gtk.Spinner()
        spinner.start()
        spinner_label = Gtk.Label(label="Scanning for Wi-Fi networks...")
        spinner_label.add_css_class("dim-label")

        spinner_box.append(spinner)
        spinner_box.append(spinner_label)
        loading_row.set_child(spinner_box)
        self.list_box.append(loading_row)

        is_connected = bool(lan_name or active_ssid)
        self._update_next_button(is_connected)

        try:
            proc = await asyncio.create_subprocess_exec(
                "nmcli",
                "-t",
                "-f",
                "IN-USE,SSID,SECURITY",
                "device",
                "wifi",
                "list",
                "--rescan",
                "yes",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await proc.communicate()

            if not self._is_active:
                return

            self._clear_list_box()

            if proc.returncode != 0:
                if lan_name:
                    self._add_lan_row(lan_name)
                row = Adw.ActionRow(title="Error scanning networks")
                row.set_subtitle(stderr.decode().strip() or "Check NetworkManager service")
                self.list_box.append(row)
                return

            lines = stdout.decode("utf-8", errors="ignore").strip().split("\n")
            seen_ssids = set()
            is_connected = False

            if lan_name:
                self._add_lan_row(lan_name)
                is_connected = True

            connected_wifi_list = []
            unconnected_wifi_list = []

            for line in lines:
                if not line:
                    continue
                parts = line.split(":")
                if len(parts) >= 3:
                    in_use_flag = parts[0].strip() == "*"
                    ssid = parts[1].strip()
                    security = parts[2].strip()

                    if ssid and ssid not in seen_ssids:
                        seen_ssids.add(ssid)
                        is_active_network = in_use_flag or (active_ssid is not None and ssid == active_ssid)

                        if is_active_network:
                            connected_wifi_list.append((ssid, security))
                            is_connected = True
                        else:
                            unconnected_wifi_list.append((ssid, security))

            for ssid, security in connected_wifi_list:
                self._add_wifi_row(ssid, security, active=True)

            for ssid, security in unconnected_wifi_list:
                self._add_wifi_row(ssid, security, active=False)

            if not seen_ssids and not lan_name:
                row = Adw.ActionRow(title="No networks found")
                self.list_box.append(row)

            self._update_next_button(is_connected)
            self.has_scanned = True

        except asyncio.CancelledError:
            pass
        except Exception as e:
            log.error("Failed to execute nmcli", exc=e)
        finally:
            self.scanning = False
            if self._is_active:
                self.btn_refresh.set_sensitive(True)

    def _add_wifi_row(self, ssid: str, security: str, active: bool):
        row = Adw.ActionRow()
        row.set_title(ssid)

        icon = Gtk.Image.new_from_icon_name("network-wireless-symbolic")
        row.add_prefix(icon)

        if active:
            btn_connected = Gtk.Button(label="Connected")
            btn_connected.set_valign(Gtk.Align.CENTER)
            btn_connected.set_sensitive(False)
            row.add_suffix(btn_connected)
        else:
            btn_connect = Gtk.Button(label="Connect")
            btn_connect.set_valign(Gtk.Align.CENTER)
            btn_connect.connect(
                "clicked",
                lambda btn, s=ssid, sec=security, r=row: asyncio.create_task(
                    self.connect_wifi(s, sec, btn, r)
                ),
            )
            row.add_suffix(btn_connect)

        self.list_box.append(row)

    async def connect_wifi(
        self, ssid: str, security: str, btn: Gtk.Button, row: Adw.ActionRow
    ):
        self.connecting = True
        is_secured = security and security != "--"

        if is_secured:
            success = await self._prompt_dialog_and_connect(ssid, row, btn)
            self.connecting = False
            if success and self._is_active:
                self._start_scan_task()
            return

        btn.set_sensitive(False)
        success = await self._perform_network_connection(ssid, None)
        if success and self._is_active:
            self._start_scan_task()
        else:
            btn.set_sensitive(True)

        self.connecting = False

    async def _prompt_dialog_and_connect(
        self, ssid: str, row: Adw.ActionRow, btn: Gtk.Button
    ) -> bool:
        loop = asyncio.get_running_loop()
        future = loop.create_future()

        window = Adw.Window()
        window.set_transient_for(self.get_native())
        window.set_modal(True)
        window.set_default_size(360, -1)
        window.set_resizable(False)

        header = Adw.HeaderBar()
        header.set_show_end_title_buttons(True)

        title_widget = Adw.WindowTitle(title=f"Connect to {ssid}")
        header.set_title_widget(title_widget)

        content = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=16)
        content.append(header)

        main_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=16)
        main_box.set_margin_top(16)
        main_box.set_margin_bottom(20)
        main_box.set_margin_start(20)
        main_box.set_margin_end(20)

        entry = Gtk.PasswordEntry()
        entry.set_property("placeholder-text", "Enter Password")
        entry.set_show_peek_icon(True)
        main_box.append(entry)

        status_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        status_box.set_halign(Gtk.Align.CENTER)

        dialog_spinner = Gtk.Spinner()
        dialog_spinner_label = Gtk.Label(label="Connecting...")
        dialog_spinner_label.add_css_class("dim-label")

        status_box.append(dialog_spinner)
        status_box.append(dialog_spinner_label)
        status_box.set_visible(False)
        main_box.append(status_box)

        error_label = Gtk.Label()
        error_label.add_css_class("error")
        error_label.set_visible(False)
        main_box.append(error_label)

        btn_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        btn_box.set_halign(Gtk.Align.END)

        btn_cancel = Gtk.Button(label="Cancel")
        btn_submit = Gtk.Button(label="Connect")
        btn_submit.add_css_class("suggested-action")

        btn_box.append(btn_cancel)
        btn_box.append(btn_submit)
        main_box.append(btn_box)

        content.append(main_box)
        window.set_content(content)

        def close_dialog(result: bool):
            window.destroy()
            if not future.done():
                future.set_result(result)

        def on_cancel_clicked(_):
            close_dialog(False)

        def on_submit_clicked(_):
            btn_submit.set_sensitive(False)
            btn_cancel.set_sensitive(False)
            entry.set_sensitive(False)
            error_label.set_visible(False)

            status_box.set_visible(True)
            dialog_spinner.start()

            async def do_connect():
                pwd = entry.get_text()
                success = await self._perform_network_connection(ssid, pwd)

                dialog_spinner.stop()
                status_box.set_visible(False)

                if success:
                    close_dialog(True)
                else:
                    error_label.set_text("Failed to connect. Check password.")
                    error_label.set_visible(True)
                    btn_submit.set_sensitive(True)
                    btn_cancel.set_sensitive(True)
                    entry.set_sensitive(True)

            asyncio.create_task(do_connect())

        btn_cancel.connect("clicked", on_cancel_clicked)
        btn_submit.connect("clicked", on_submit_clicked)
        entry.connect("activate", on_submit_clicked)

        window.present()
        return await future

    async def _perform_network_connection(
        self, ssid: str, password: str | None
    ) -> bool:
        proc_del = await asyncio.create_subprocess_exec(
            "nmcli",
            "connection",
            "delete",
            ssid,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        await proc_del.communicate()

        cmd_add = [
            "nmcli",
            "connection",
            "add",
            "type",
            "wifi",
            "con-name",
            ssid,
            "ssid",
            ssid,
        ]
        if password:
            cmd_add.extend(
                [
                    "wifi-sec.key-mgmt",
                    "wpa-psk",
                    "wifi-sec.psk",
                    password,
                ]
            )

        proc_add = await asyncio.create_subprocess_exec(
            *cmd_add, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        _, stderr_add = await proc_add.communicate()

        if proc_add.returncode == 0:
            proc_up = await asyncio.create_subprocess_exec(
                "nmcli",
                "connection",
                "up",
                ssid,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            _, stderr_up = await proc_up.communicate()

            if proc_up.returncode == 0:
                log.info(f"Connected to {ssid}")
                return True
            else:
                log.error(f"Failed to activate network {ssid}: {stderr_up.decode()}")
                return False
        else:
            log.error(
                f"Failed to add connection profile for {ssid}: {stderr_add.decode()}"
            )
            return False
