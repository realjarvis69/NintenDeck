import asyncio
import json
import re
from typing import Optional

from gi.repository import GLib, Gtk

import yafti.share
from yafti import events, log
from yafti.abc import YaftiScreen
from yafti.screen.console import ConsoleScreen
from yafti.screen.package.state import PackageScreenState

_xml = """\
<?xml version="1.0" encoding="UTF-8"?>
<interface>
  <requires lib="gtk" version="4.0"/>
  <template class="YaftiPackageInstallScreen" parent="GtkBox">
    <property name="orientation">vertical</property>
    <property name="hexpand">true</property>
    <property name="vexpand">true</property>
    <child>
      <object class="AdwStatusPage" id="status_page">
        <property name="halign">fill</property>
        <property name="valign">center</property>
        <property name="hexpand">true</property>
        <property name="vexpand">false</property>
        <property name="title" translatable="yes">Package Installation</property>
      </object>
    </child>
    <child>
      <object class="GtkBox" id="controls_box">
        <property name="orientation">vertical</property>
        <property name="halign">fill</property>
        <property name="hexpand">true</property>
        <property name="vexpand">false</property>
        <child>
          <object class="GtkProgressBar" id="pkg_progress">
            <property name="margin-start">40</property>
            <property name="margin-end">40</property>
          </object>
        </child>
        <child>
          <object class="GtkLabel" id="lbl_current_step">
            <property name="visible">True</property>
            <property name="halign">center</property>
            <property name="margin-top">8</property>
            <property name="margin-bottom">4</property>
            <style>
              <class name="dim-label"/>
              <class name="caption"/>
            </style>
          </object>
        </child>
        <child>
          <object class="GtkBox">
            <property name="orientation">horizontal</property>
            <child>
              <object class="GtkBox">
                <property name="halign">fill</property>
                <property name="hexpand">true</property>
              </object>
            </child>
            <child>
              <object class="GtkButton" id="btn_console">
                <property name="visible">True</property>
                <property name="margin-end">40</property>
                <property name="margin-top">10</property>
                <property name="margin-bottom">10</property>
                <property name="label">Show Console</property>
              </object>
            </child>
          </object>
        </child>
      </object>
    </child>
  </template>
</interface>
"""


@Gtk.Template(string=_xml)
class PackageInstallScreen(YaftiScreen, Gtk.Box):
    __gtype_name__ = "YaftiPackageInstallScreen"

    status_page = Gtk.Template.Child()
    pkg_progress = Gtk.Template.Child()
    lbl_current_step = Gtk.Template.Child()
    btn_console = Gtk.Template.Child()

    def __init__(
        self,
        state: PackageScreenState,
        title: str = "Package Installation",
        package_manager: str = "yafti.plugin.flatpak",
        package_manager_defaults: Optional[dict] = None,
        **kwargs,
    ):
        super().__init__(**kwargs)
        from yafti.registry import PLUGINS

        self.complete = False
        self.status_page.set_title(title)
        self.package_manager = PLUGINS.get(package_manager)
        self.package_manager_defaults = package_manager_defaults or {}
        self.btn_console.connect("clicked", self.toggle_console)
        self.state = state

        self.console = ConsoleScreen()
        self.started = False
        self.already_run = False
        self.error_screen = None
        self.log_screen = None

    def reset_state(self):
        self.started = False
        self.already_run = False
        self.complete = False
        events.detach("btn_next", self.next)

    async def on_activate(self):
        if self.started or self.already_run:
            return
        self.started = True
        events.detach("btn_next", self.next)
        events.on("btn_next", self.next)

        asyncio.create_task(self.draw())

    async def next(self, _):
        if not self.started or self.complete:
            events.detach("btn_next", self.next)
            return False
        return True

    def toggle_console(self, btn):
        self.show_console_mode(not self.console.get_visible())

    def show_console_mode(self, show: bool):
        if show:
            self.status_page.set_valign(Gtk.Align.START)
            self.status_page.set_vexpand(False)
            self.console.set_vexpand(True)
            self.console.set_hexpand(True)
            self.console.set_visible(True)
            self.btn_console.set_label("Hide Console")
        else:
            self.status_page.set_valign(Gtk.Align.CENTER)
            self.status_page.set_vexpand(False)
            self.console.set_visible(False)
            self.btn_console.set_label("Show Console")

    async def draw(self):
        self.show_console_mode(False)
        if not self.console.get_parent():
            self.append(self.console)
        packages = [
            item.replace("pkg:", "") for item in self.state.get_on("pkg:")
        ]
        return await self.install(packages)

    def run_package_manager(self, packge_config):
        try:
            config = json.loads(packge_config)
        except json.decoder.JSONDecodeError:
            config = {"package": packge_config}

        opts = self.package_manager_defaults.copy()
        opts.update(config)
        return self.package_manager.install(**opts)

    async def run_script_stream(
        self, cmd: str, current_idx: int, total_pkgs: int
    ):
        proc = await asyncio.create_subprocess_shell(
            cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        progress_pattern = re.compile(r"^PROGRESS:(\d+)(?:\s+(.*))?$")

        async def read_stream(stream, is_stderr=False):
            while True:
                line = await stream.readline()
                if not line:
                    break

                if is_stderr:
                    self.console.stderr(line)
                else:
                    self.console.stdout(line)
                    text = line.decode("utf-8", errors="ignore").strip()
                    match = progress_pattern.match(text)
                    if match:
                        script_percent = int(match.group(1)) / 100.0
                        step_name = match.group(2)

                        base_fraction = current_idx / total_pkgs
                        step_weight = 1.0 / total_pkgs
                        overall_fraction = base_fraction + (
                            script_percent * step_weight
                        )

                        GLib.idle_add(
                            self.pkg_progress.set_fraction, overall_fraction
                        )
                        if step_name:
                            GLib.idle_add(
                                self.lbl_current_step.set_text, step_name
                            )

        await asyncio.gather(
            read_stream(proc.stdout, is_stderr=False),
            read_stream(proc.stderr, is_stderr=True),
        )
        return_code = await proc.wait()

        if return_code != 0:
            error_msg = f"\n[ERROR] Command failed with exit code {return_code}: {cmd}\n"
            self.console.stderr(error_msg.encode("utf-8"))
            raise RuntimeError(error_msg)

        GLib.idle_add(
            self.pkg_progress.set_fraction, (current_idx + 1) / total_pkgs
        )

    async def install(self, packages: list):
        total = len(packages)

        if hasattr(yafti.share, "BTN_NEXT") and yafti.share.BTN_NEXT:
            yafti.share.BTN_NEXT.set_visible(False)
        if hasattr(yafti.share, "BTN_BACK") and yafti.share.BTN_BACK:
            yafti.share.BTN_BACK.set_visible(False)

        try:
            for idx, pkg in enumerate(packages):
                if (
                    pkg.endswith(".sh")
                    or pkg.startswith("/")
                    or pkg.startswith("bash ")
                ):
                    await self.run_script_stream(pkg, idx, total)
                else:
                    GLib.idle_add(
                        self.lbl_current_step.set_text, f"Installing {pkg}"
                    )
                    results = await self.run_package_manager(pkg)
                    if hasattr(results, "stdout"):
                        self.console.stdout(results.stdout)
                    if hasattr(results, "stderr"):
                        self.console.stderr(results.stderr)
                    if getattr(results, "returncode", 0) != 0:
                        raise RuntimeError(
                            f"Package manager failed for {pkg}"
                        )

                    GLib.idle_add(
                        self.pkg_progress.set_fraction, (idx + 1) / total
                    )

            self.console.stdout(b"\nInstallation Complete!\n")
            GLib.idle_add(
                self.lbl_current_step.set_text, "Installation Complete"
            )
            self.already_run = True
            self.complete = True

            if hasattr(yafti.share, "BTN_NEXT") and yafti.share.BTN_NEXT:
                yafti.share.BTN_NEXT.set_label("Next")
                yafti.share.BTN_NEXT.set_sensitive(True)
                yafti.share.BTN_NEXT.set_visible(True)

            if hasattr(yafti.share, "BTN_BACK") and yafti.share.BTN_BACK:
                yafti.share.BTN_BACK.set_visible(False)

            events.detach("btn_next", self.next)

        except Exception as e:
            log.error("INSTALL_SCREEN: installation failed", e)
            self.started = False
            self.complete = False
            events.detach("btn_next", self.next)

            parent = self.get_parent()
            pkg_screen = None
            carousel = None

            while parent is not None:
                if (
                    hasattr(parent, "__gtype_name__")
                    and parent.__gtype_name__ == "YaftiPackageScreen"
                ):
                    pkg_screen = parent

                if hasattr(parent, "append") and (
                    hasattr(parent, "scroll_to")
                    or hasattr(parent, "set_visible_child")
                ):
                    carousel = parent
                    break
                parent = parent.get_parent()

            if pkg_screen:
                pkg_screen.has_failed = True

            if carousel is None and hasattr(yafti.share, "CAROUSEL"):
                carousel = yafti.share.CAROUSEL

            def _handle_view_logs():
                from yafti.screen.log_viewer import LogViewerScreen

                def _return_to_error():
                    if carousel and self.error_screen:
                        if hasattr(carousel, "scroll_to"):
                            carousel.scroll_to(self.error_screen, True)
                        elif hasattr(carousel, "set_visible_child"):
                            carousel.set_visible_child(self.error_screen)

                if self.log_screen is None:
                    if self.console.get_parent():
                        self.console.get_parent().remove(self.console)

                    self.log_screen = LogViewerScreen(
                        console_widget=self.console,
                        on_back_cb=_return_to_error,
                    )
                    if carousel:
                        carousel.append(self.log_screen)

                if carousel:
                    if hasattr(carousel, "scroll_to"):
                        carousel.scroll_to(self.log_screen, True)
                    elif hasattr(carousel, "set_visible_child"):
                        carousel.set_visible_child(self.log_screen)

            def _handle_retry():
                if carousel:
                    if self.error_screen and hasattr(carousel, "remove"):
                        try:
                            carousel.remove(self.error_screen)
                        except Exception as err:
                            log.debug("Could not remove error_screen", err=err)
                    if self.log_screen and hasattr(carousel, "remove"):
                        try:
                            carousel.remove(self.log_screen)
                        except Exception as err:
                            log.debug("Could not remove log_screen", err=err)

                self.error_screen = None
                self.log_screen = None

                if pkg_screen:
                    asyncio.create_task(pkg_screen.reset_for_retry())

            from yafti.screen.error import ErrorScreen

            if self.error_screen is None:
                self.error_screen = ErrorScreen(
                    title="Installation Failed",
                    description="Please check your internet connection and try again.",
                    on_view_logs=_handle_view_logs,
                    on_retry=_handle_retry,
                )
                if carousel:
                    carousel.append(self.error_screen)

            yafti.share.LAST_ERROR_SCREEN = self.error_screen

            if carousel and self.error_screen:
                if hasattr(carousel, "scroll_to"):
                    carousel.scroll_to(self.error_screen, True)
                elif hasattr(carousel, "set_visible_child"):
                    carousel.set_visible_child(self.error_screen)

            if hasattr(yafti.share, "BTN_NEXT") and yafti.share.BTN_NEXT:
                yafti.share.BTN_NEXT.set_visible(False)
            if hasattr(yafti.share, "BTN_BACK") and yafti.share.BTN_BACK:
                yafti.share.BTN_BACK.set_visible(False)
