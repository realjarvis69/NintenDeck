import os
import time
from gi.repository import Adw, GLib, Gtk

import yafti.share
from yafti import log
from yafti.abc import YaftiScreen
from yafti.screen.console import ConsoleScreen


class LogViewerScreen(YaftiScreen, Gtk.Box):
    def __init__(self, console_widget: ConsoleScreen, on_back_cb=None, **kwargs):
        super().__init__(**kwargs)
        self.set_orientation(Gtk.Orientation.VERTICAL)
        self.set_hexpand(True)
        self.set_vexpand(True)

        self.console = console_widget
        self.on_back_cb = on_back_cb

        self.overlay = Adw.ToastOverlay()
        self.overlay.set_hexpand(True)
        self.overlay.set_vexpand(True)

        main_content = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        main_content.set_hexpand(True)
        main_content.set_vexpand(True)

        # Header / Action Bar aligned to match Install tab margins (40px)
        action_bar = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL)
        action_bar.set_margin_start(40)
        action_bar.set_margin_end(40)
        action_bar.set_margin_top(16)
        action_bar.set_margin_bottom(12)

        # Return to error screen button
        back_btn = Gtk.Button(label="← Back to Error Screen")
        back_btn.add_css_class("pill")
        back_btn.connect("clicked", self._on_back_click)
        action_bar.append(back_btn)

        # Spacer pushes export button to align with right terminal edge
        spacer = Gtk.Box()
        spacer.set_hexpand(True)
        action_bar.append(spacer)

        # Export logs button restored to primary blue styling
        self.export_btn = Gtk.Button(label="Export Logs")
        self.export_btn.add_css_class("suggested-action")
        self.export_btn.add_css_class("pill")
        self.export_btn.connect("clicked", self._on_export_click)
        action_bar.append(self.export_btn)

        main_content.append(action_bar)

        # Console sizing and layout matching Install tab proportions
        self.console.set_visible(True)
        self.console.set_hexpand(True)
        self.console.set_vexpand(True)
        self.console.set_margin_start(40)
        self.console.set_margin_end(40)
        self.console.set_margin_bottom(20)
        main_content.append(self.console)

        self.overlay.set_child(main_content)
        self.append(self.overlay)

    def _on_back_click(self, _btn):
        if self.on_back_cb:
            self.on_back_cb()

    def _extract_console_text(self) -> str:
        lines = []

        if hasattr(self.console, "console_output"):
            box = self.console.console_output
            child = box.get_first_child()
            while child is not None:
                if hasattr(child, "get_text"):
                    lines.append(child.get_text())
                elif hasattr(child, "get_buffer"):
                    buf = child.get_buffer()
                    lines.append(buf.get_text(buf.get_start_iter(), buf.get_end_iter(), True))
                child = child.get_next_sibling()

        return "\n".join(lines)

    def _on_export_click(self, _btn):
        log_text = self._extract_console_text()

        timestamp = time.strftime("%Y-%m-%d_%H-%M-%S")
        filename = f"nintendeck_install_{timestamp}.log"
        dest_path = os.path.expanduser(f"~/{filename}")

        try:
            with open(dest_path, "w", encoding="utf-8") as f:
                f.write(log_text if log_text.strip() else "No output captured in log buffer.")

            toast = Adw.Toast.new(f"Exported to ~/{filename}")
            toast.set_timeout(3)
            self.overlay.add_toast(toast)

            self.export_btn.set_label("✓ Exported")

            def _reset_btn():
                self.export_btn.set_label("Export Logs")
                return False

            GLib.timeout_add(2500, _reset_btn)
            log.info("Exported logs successfully", path=dest_path)

        except Exception as e:
            log.error("Failed to export logs", e=e)
            toast = Adw.Toast.new("Failed to export logs")
            self.overlay.add_toast(toast)
