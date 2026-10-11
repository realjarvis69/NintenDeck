import asyncio
from typing import Optional

import gi

gi.require_version("Gtk", "4.0")
gi.require_version("Adw", "1")
from gi.repository import Adw, Gtk

import yafti.share
from yafti import events, log
from yafti.abc import YaftiScreen, YaftiScreenConfig

_xml = """\
<?xml version="1.0" encoding="UTF-8"?>
<interface>
  <requires lib="gtk" version="4.0"/>
  <requires lib="libadwaita" version="1.0"/>
  <template class="YaftiErrorScreen" parent="AdwBin">
    <property name="child">
      <object class="AdwStatusPage" id="status_page">
        <property name="icon-name">dialog-error-symbolic</property>
        <property name="title">Error</property>
        <property name="description">An unexpected error occurred.</property>
      </object>
    </property>
  </template>
</interface>
"""


@Gtk.Template(string=_xml)
class ErrorScreen(YaftiScreen, Adw.Bin):
    __gtype_name__ = "YaftiErrorScreen"

    status_page = Gtk.Template.Child()

    class Config(YaftiScreenConfig):
        title: str = "Installation Failed"
        description: str = "Please check your internet connection and try again."
        icon: Optional[str] = "dialog-error-symbolic"

    def __init__(
        self,
        title: str = "Installation Failed",
        description: str = "Please check your internet connection and try again.",
        icon: str = "dialog-error-symbolic",
        on_retry=None,
        on_view_logs=None,
        **kwargs,
    ):
        super().__init__(**kwargs)
        self.status_page.set_title(title)
        self.status_page.set_description(description)
        self.status_page.set_icon_name(icon)

        self.append_action_buttons(on_retry, on_view_logs)

    def on_activate(self):
        if hasattr(yafti.share, "BTN_BACK") and yafti.share.BTN_BACK:
            yafti.share.BTN_BACK.set_visible(False)

    def append_action_buttons(self, on_retry_cb, on_view_logs_cb):
        box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
        box.set_halign(Gtk.Align.CENTER)

        retry_btn = Gtk.Button(label="Restart Installation")
        retry_btn.add_css_class("suggested-action")
        retry_btn.add_css_class("pill")

        def _on_retry_click(_btn):
            log.debug("ERROR_SCREEN: Restart installation clicked")

            # Clean up listeners and reset installation screen state
            if hasattr(yafti.share, "INSTALL_SCREEN") and yafti.share.INSTALL_SCREEN:
                install_screen = yafti.share.INSTALL_SCREEN
                if hasattr(install_screen, "reset_for_retry"):
                    install_screen.reset_for_retry()
                elif hasattr(install_screen, "reset_state"):
                    install_screen.reset_state()

            # Clean up package screen state and listeners
            if hasattr(yafti.share, "PACKAGE_SCREEN") and yafti.share.PACKAGE_SCREEN:
                pkg_screen = yafti.share.PACKAGE_SCREEN
                if hasattr(pkg_screen, "back"):
                    events.detach("btn_back", pkg_screen.back)
                if hasattr(pkg_screen, "reset_state"):
                    pkg_screen.reset_state()

            # Re-enable navigation controls
            if hasattr(yafti.share, "BTN_NEXT") and yafti.share.BTN_NEXT:
                yafti.share.BTN_NEXT.set_visible(True)
                yafti.share.BTN_NEXT.set_sensitive(True)

            if hasattr(yafti.share, "BTN_BACK") and yafti.share.BTN_BACK:
                yafti.share.BTN_BACK.set_visible(True)
                yafti.share.BTN_BACK.set_sensitive(True)

            if on_retry_cb:
                if asyncio.iscoroutinefunction(on_retry_cb):
                    asyncio.create_task(on_retry_cb())
                else:
                    on_retry_cb()

            # Scroll back to a freshly spawned Wi-Fi screen
            if hasattr(yafti.share, "MAIN_WINDOW") and yafti.share.MAIN_WINDOW:
                yafti.share.MAIN_WINDOW.restart_flow_to_wifi()

        retry_btn.connect("clicked", _on_retry_click)
        box.append(retry_btn)

        if on_view_logs_cb:
            logs_btn = Gtk.Button(label="View Logs")
            logs_btn.add_css_class("pill")

            def _on_logs_click(_btn):
                if asyncio.iscoroutinefunction(on_view_logs_cb):
                    asyncio.create_task(on_view_logs_cb())
                else:
                    on_view_logs_cb()

            logs_btn.connect("clicked", _on_logs_click)
            box.append(logs_btn)

        self.status_page.set_child(box)
