import asyncio
from typing import Optional

from gi.repository import Adw, Gtk

import yafti.share
from yafti import events, log
from yafti.abc import YaftiScreen, YaftiScreenConfig
from yafti.screen.package.models import PackageConfig, PackageGroupConfig
from yafti.screen.package.screen import PackageInstallScreen, PackagePickerScreen
from yafti.screen.package.state import PackageScreenState
from yafti.screen.package.utils import generate_fingerprint, parse_packages


@Gtk.Template(string="""\
<?xml version="1.0" encoding="UTF-8"?>
<interface>
  <requires lib="gtk" version="4.0"/>
  <requires lib="libadwaita" version="1.0"/>
  <template class="YaftiPackageScreen" parent="AdwBin">
    <property name="child">
      <object class="AdwCarousel" id="pkg_carousel">
        <property name="vexpand">True</property>
        <property name="hexpand">True</property>
        <property name="allow_scroll_wheel">False</property>
        <property name="allow_mouse_drag">False</property>
        <property name="allow_long_swipes">False</property>
      </object>
    </property>
  </template>
</interface>
""")
class PackageScreen(YaftiScreen, Adw.Bin):
    __gtype_name__ = "YaftiPackageScreen"

    pkg_carousel = Gtk.Template.Child()

    class Config(YaftiScreenConfig):
        title: str
        show_terminal: bool = True
        package_manager: str
        groups: Optional[PackageGroupConfig] = None
        packages: Optional[list[PackageConfig]] = None
        package_manager_defaults: Optional[dict] = None

    def __init__(
        self,
        title: str = "Package Installation",
        package_manager: str = "yafti.plugin.flatpak",
        packages: list[PackageConfig] = None,
        groups: PackageGroupConfig = None,
        show_terminal: bool = True,
        package_manager_defaults: Optional[dict] = None,
        **kwargs,
    ):
        super().__init__(**kwargs)
        self.title = title
        self.packages = groups or packages
        self.show_terminal = show_terminal
        self.package_manager = package_manager
        self.package_manager_defaults = package_manager_defaults
        self.fingerprint = generate_fingerprint(self.packages)
        self.state = PackageScreenState(self.fingerprint)
        self.state.load(parse_packages(self.packages))
        self.active = False
        self.installation_complete = False
        self.has_failed = False
        self._resetting = False
        self._transitioning = False
        self.draw()

    def draw(self):
        self.picker = PackagePickerScreen(
            state=self.state, title=self.title, packages=self.packages
        )
        self.installer = PackageInstallScreen(
            title=self.title,
            state=self.state,
            package_manager=self.package_manager,
            package_manager_defaults=self.package_manager_defaults,
        )
        self.pkg_carousel.append(self.picker)
        self.pkg_carousel.append(self.installer)

    def register_events(self):
        events.detach("btn_next", self.next)
        events.detach("btn_back", self.back)
        events.on("btn_next", self.next)
        events.on("btn_back", self.back)

    def unregister_events(self):
        events.detach("btn_next", self.next)
        events.detach("btn_back", self.back)

    def on_activate(self):
        self.active = True
        self.register_events()

        if self.has_failed and self.installer.error_screen:
            self.pkg_carousel.scroll_to(self.installer.error_screen, True)
            if hasattr(yafti.share, "BTN_NEXT") and yafti.share.BTN_NEXT:
                yafti.share.BTN_NEXT.set_visible(False)
            if hasattr(yafti.share, "BTN_BACK") and yafti.share.BTN_BACK:
                yafti.share.BTN_BACK.set_visible(False)
            return

        current_pos = int(round(self.pkg_carousel.get_position()))

        if self.installation_complete or self.installer.started:
            if hasattr(yafti.share, "BTN_BACK") and yafti.share.BTN_BACK:
                yafti.share.BTN_BACK.set_visible(False)
            if hasattr(yafti.share, "BTN_NEXT") and yafti.share.BTN_NEXT:
                yafti.share.BTN_NEXT.set_visible(False)
        else:
            if hasattr(yafti.share, "BTN_BACK") and yafti.share.BTN_BACK:
                yafti.share.BTN_BACK.set_visible(True)
            if hasattr(yafti.share, "BTN_NEXT") and yafti.share.BTN_NEXT:
                yafti.share.BTN_NEXT.set_label("Install" if current_pos % 2 == 0 else "Next")
                yafti.share.BTN_NEXT.set_sensitive(True)
                yafti.share.BTN_NEXT.set_visible(True)

    def on_deactivate(self):
        self.active = False
        self.unregister_events()

    async def reset_for_retry(self):
        self._resetting = True
        self.has_failed = False
        self.installation_complete = False
        self._transitioning = False

        self.installer.reset_state()

        new_picker = PackagePickerScreen(
            state=self.state, title=self.title, packages=self.packages
        )
        new_installer = PackageInstallScreen(
            title=self.title,
            state=self.state,
            package_manager=self.package_manager,
            package_manager_defaults=self.package_manager_defaults,
        )

        self.pkg_carousel.append(new_picker)
        self.pkg_carousel.append(new_installer)

        self.picker = new_picker
        self.installer = new_installer

        self.pkg_carousel.scroll_to(new_picker, True)

        if hasattr(yafti.share, "BTN_NEXT") and yafti.share.BTN_NEXT:
            yafti.share.BTN_NEXT.set_label("Install")
            yafti.share.BTN_NEXT.set_visible(True)
            yafti.share.BTN_NEXT.set_sensitive(True)

        if hasattr(yafti.share, "BTN_BACK") and yafti.share.BTN_BACK:
            yafti.share.BTN_BACK.set_visible(True)

        await asyncio.sleep(0.05)
        self._resetting = False

    async def force_show_installer(self):
        if self._transitioning:
            return
        self._transitioning = True
        self.has_failed = False

        if hasattr(yafti.share, "BTN_NEXT") and yafti.share.BTN_NEXT:
            yafti.share.BTN_NEXT.set_sensitive(False)

        self.pkg_carousel.scroll_to(self.installer, True)
        if hasattr(yafti.share, "BTN_BACK") and yafti.share.BTN_BACK:
            yafti.share.BTN_BACK.set_visible(False)

        await self.installer.on_activate()
        self._transitioning = False

    async def next(self, _):
        if not self.active:
            return False

        current_page = self.pkg_carousel.get_nth_page(int(round(self.pkg_carousel.get_position())))

        if self._resetting or self._transitioning:
            return True

        if current_page == self.picker and not self.installer.started:
            asyncio.create_task(self.force_show_installer())
            return True

        if current_page == self.installer and self.installer.complete:
            self.installation_complete = True
            if hasattr(yafti.share, "BTN_BACK") and yafti.share.BTN_BACK:
                yafti.share.BTN_BACK.set_visible(False)
            return False

        if self.has_failed:
            return True

        return True

    async def back(self, _):
        if not self.active:
            return False

        current_page = self.pkg_carousel.get_nth_page(int(round(self.pkg_carousel.get_position())))

        if self._resetting or self.has_failed:
            return True

        if self.installer.started and not self.installer.complete:
            return True

        if current_page == self.installer:
            self.pkg_carousel.scroll_to(self.picker, True)
            if hasattr(yafti.share, "BTN_NEXT") and yafti.share.BTN_NEXT:
                yafti.share.BTN_NEXT.set_label("Install")
                yafti.share.BTN_NEXT.set_sensitive(True)
            if hasattr(yafti.share, "BTN_BACK") and yafti.share.BTN_BACK:
                yafti.share.BTN_BACK.set_visible(True)
            return True

        return False
