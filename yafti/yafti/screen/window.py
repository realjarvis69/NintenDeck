import asyncio
import importlib

from gi.repository import Adw, Gtk

import yafti.share
from yafti import events
from yafti.registry import SCREENS
from yafti.screen.wifi import WifiScreen

SCREENS["wifi"] = WifiScreen
SCREENS["yafti.screen.wifi"] = WifiScreen

_xml = """\
<?xml version="1.0" encoding="UTF-8"?>
<interface>
  <requires lib="gtk" version="4.0"/>
  <requires lib="libadwaita" version="1.0" />
  <template class="YaftiWindow" parent="AdwApplicationWindow">
    <property name="default-width">750</property>
    <property name="default-height">640</property>
    <property name="title">Welcome!</property>
    <child>
      <object class="GtkBox">
        <property name="orientation">vertical</property>
        <child>
          <object class="AdwHeaderBar" id="headerbar">
            <style>
              <class name="flat" />
            </style>
            <property name="title_widget">
              <object class="AdwCarouselIndicatorDots" id="carousel_indicator">
                <property name="carousel">carousel</property>
                <property name="orientation">horizontal</property>
                <property name="height-request">20</property>
                <property name="width-request">100</property>
              </object>
            </property>
            <property name="show-end-title-buttons">False</property>
            <child type="start">
              <object class="GtkButton" id="btn_back">
                <property name="label" translatable="yes">Back</property>
                <property name="halign">center</property>
                <property name="visible">False</property>
              </object>
            </child>
            <child type="end">
              <object class="GtkButton" id="btn_next">
                <property name="label" translatable="yes">Next</property>
                <property name="halign">center</property>
                <property name="visible">False</property>
                <style>
                  <class name="suggested-action" />
                </style>
              </object>
            </child>
          </object>
        </child>
        <child>
          <object class="AdwToastOverlay" id="toasts">
            <child>
              <object class="AdwCarousel" id="carousel">
                <property name="vexpand">True</property>
                <property name="hexpand">True</property>
                <property name="allow_scroll_wheel">False</property>
                <property name="allow_mouse_drag">False</property>
                <property name="allow_long_swipes">False</property>
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
class Window(Adw.ApplicationWindow):
    __gtype_name__ = "YaftiWindow"

    carousel_indicator = Gtk.Template.Child()
    carousel = Gtk.Template.Child()
    headerbar = Gtk.Template.Child()
    btn_back = Gtk.Template.Child()
    btn_next = Gtk.Template.Child()
    toasts = Gtk.Template.Child()

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        self.app = kwargs.get("application")
        self._active_page_idx = 0
        self._last_activated_screen = None
        self._built = False

        events.register("btn_next")
        events.register("btn_back")

        yafti.share.BTN_BACK = self.btn_back
        yafti.share.BTN_NEXT = self.btn_next
        yafti.share.MAIN_WINDOW = self

        self.connect("show", self.draw)
        self.connect("close-request", self.app.quit)

        self.btn_next.connect("clicked", self._on_btn_next_clicked)
        self.btn_back.connect("clicked", self._on_btn_back_clicked)
        self.carousel.connect("page-changed", self._on_carousel_page_changed)

    def _on_btn_next_clicked(self, _):
        async def _handle_next():
            handled = await events.emit("btn_next", self)
            if not handled:
                await self.next(None)

        asyncio.create_task(_handle_next())

    def _on_btn_back_clicked(self, _):
        async def _handle_back():
            handled = await events.emit("btn_back", self)
            if not handled:
                await self.back(None)

        asyncio.create_task(_handle_back())

    def draw(self, _) -> None:
        if not self._built:
            self._built = True
            asyncio.ensure_future(self.build_screens())

    async def build_screens(self):
        screens = self.app.config.screens or {}

        for name, details in screens.items():
            screen_cls = None
            if details.source in SCREENS:
                screen_cls = SCREENS.get(details.source)
            else:
                try:
                    mod_name, cls_name = details.source.rsplit(".", 1)
                    mod = importlib.import_module(mod_name)
                    screen_cls = getattr(mod, cls_name)
                except Exception:
                    pass

            if screen_cls is None:
                continue

            try:
                s = await screen_cls.from_config(details.values)
                if s is not None:
                    self.carousel.append(s)
            except Exception:
                pass

        wifi_s = WifiScreen()
        n_pages = self.carousel.get_n_pages()
        insert_pos = 1 if n_pages > 0 else 0
        self.carousel.insert(wifi_s, insert_pos)

        first_screen = self.carousel.get_nth_page(0)
        if first_screen:
            self.carousel.scroll_to(first_screen, False)

        self.carousel_indicator.set_carousel(self.carousel)
        self._active_page_idx = 0
        self.changed(0)

    @property
    def idx(self) -> int:
        return self._active_page_idx

    def goto(self, page: int, animate: bool = True) -> None:
        n_pages = self.carousel.get_n_pages()
        if n_pages == 0:
            return

        page = max(0, min(page, n_pages - 1))
        self._active_page_idx = page

        next_screen = self.carousel.get_nth_page(page)
        if next_screen:
            self.carousel.scroll_to(next_screen, animate)

        self.changed(page)

    def restart_flow_to_wifi(self) -> None:
        """Spawns a fresh WifiScreen with back button hidden, replaces old instance, and scrolls to it."""
        new_wifi_s = WifiScreen(hide_back=True)

        for i in range(self.carousel.get_n_pages()):
            page = self.carousel.get_nth_page(i)
            if isinstance(page, WifiScreen):
                self.carousel.remove(page)
                break

        insert_pos = 1 if self.carousel.get_n_pages() > 0 else 0
        self.carousel.insert(new_wifi_s, insert_pos)
        self.carousel_indicator.set_carousel(self.carousel)

        self.goto(insert_pos, animate=True)

    def is_last_page_for(self, page_idx: int) -> bool:
        n_pages = self.carousel.get_n_pages()
        if n_pages <= 1:
            return False
        return page_idx >= n_pages - 1

    @property
    def is_last_page(self) -> bool:
        return self.is_last_page_for(self.idx)

    async def next(self, _) -> None:
        if self.is_last_page:
            self.app.quit()
        else:
            self.goto(self.idx + 1)

    async def back(self, _) -> None:
        self.goto(self.idx - 1)

    def _on_carousel_page_changed(self, carousel, index: int) -> None:
        self.changed(index)

    def changed(self, page_idx: int | None = None, *args) -> None:
        if not isinstance(page_idx, int):
            page_idx = self.idx

        n_pages = self.carousel.get_n_pages()
        if n_pages == 0:
            return

        self._active_page_idx = page_idx
        is_last = self.is_last_page_for(page_idx)
        current_screen = self.carousel.get_nth_page(page_idx)

        is_same_screen = (
            current_screen is not None
            and self._last_activated_screen == current_screen
        )

        if not is_same_screen:
            if is_last:
                self.btn_back.set_visible(False)
                self.btn_next.set_visible(True)
                self.btn_next.set_label("Done")
            else:
                hide_back = getattr(current_screen, "hide_back", False)
                next_label = getattr(
                    current_screen,
                    "btn_next_label",
                    getattr(current_screen, "next_label", "Next"),
                )
                self.btn_back.set_visible(page_idx > 0 and not hide_back)
                self.btn_next.set_visible(True)
                self.btn_next.set_label(next_label)

            old_screen = self._last_activated_screen
            self._last_activated_screen = current_screen

            if old_screen:
                if hasattr(old_screen, "deactivate"):
                    res = old_screen.deactivate()
                    if asyncio.iscoroutine(res):
                        asyncio.create_task(res)
                elif hasattr(old_screen, "on_deactivate"):
                    res = old_screen.on_deactivate()
                    if asyncio.iscoroutine(res):
                        asyncio.create_task(res)

            if hasattr(current_screen, "activate"):
                res = current_screen.activate()
                if asyncio.iscoroutine(res):
                    asyncio.create_task(res)
            elif hasattr(current_screen, "on_activate"):
                res = current_screen.on_activate()
                if asyncio.iscoroutine(res):
                    asyncio.create_task(res)
