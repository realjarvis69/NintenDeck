from functools import partial
import json

from gi.repository import Adw, Gtk

from yafti import log
from yafti.abc import YaftiScreen
from yafti.screen.dialog import DialogBox
from yafti.screen.package.state import PackageScreenState
from yafti.screen.utils import find_parent

_xml = """\
<?xml version="1.0" encoding="UTF-8"?>
<interface>
  <requires lib="gtk" version="4.0"/>
  <template class="YaftiPackagePickerScreen" parent="AdwBin">
    <property name="hexpand">true</property>
    <property name="vexpand">true</property>
    <child>
      <object class="AdwStatusPage" id="status_page">
        <property name="hexpand">true</property>
        <property name="vexpand">true</property>
        <child>
          <object class="AdwPreferencesPage">
            <child>
              <object class="AdwPreferencesGroup" id="package_list"/>
            </child>
          </object>
        </child>
      </object>
    </child>
  </template>
</interface>
"""


@Gtk.Template(string=_xml)
class PackagePickerScreen(YaftiScreen, Adw.Bin):
    __gtype_name__ = "YaftiPackagePickerScreen"

    status_page = Gtk.Template.Child()
    package_list = Gtk.Template.Child()

    def __init__(
        self,
        state: PackageScreenState,
        title: str,
        packages: list | dict,
        **kwargs,
    ):
        super().__init__(**kwargs)
        self.status_page.set_title(title)
        self.packages = packages
        self.state = state
        self.draw()

    def draw(self):
        if isinstance(self.packages, list):
            for item in self._build_apps(self.packages):
                self.package_list.add(item)
            return

        for name, details in self.packages.items():
            action_row = Adw.ActionRow(title=name, subtitle=details.get("description"))
            is_required = details.get("required", False)

            def state_set(group, _, value):
                self.state.set(f"group:{group}", value)
                d = self.packages.get(group, {})
                for pkg in d.get("packages", []):
                    for pkg_name in pkg.values():
                        if isinstance(pkg_name, dict):
                            pkg_name = json.dumps(pkg_name, sort_keys=True)
                        self.state.set(f"pkg:{pkg_name}", value)

            initial_value = True if is_required else details.get("default", True)
            state_set(name, None, initial_value)

            switcher = Gtk.Switch(
                active=self.state.get(f"group:{name}"),
                valign=Gtk.Align.CENTER,
                sensitive=not is_required,
            )
            switcher.connect("state-set", partial(state_set, name))
            action_row.add_suffix(switcher)

            customize_btn = Gtk.Button(
                icon_name="go-next-symbolic",
                valign=Gtk.Align.CENTER,
            )
            customize_btn.add_css_class("flat")
            customize_btn.connect(
                "clicked",
                partial(self._build_picker, details.get("packages", []), is_required),
            )
            action_row.add_suffix(customize_btn)

            self.package_list.add(action_row)

    def _build_picker(self, packages: list, is_required: bool, *args):
        dialog = DialogBox(find_parent(self, Gtk.Window))

        btn_cancel = Gtk.Button(label="Cancel")
        btn_save = Gtk.Button(label="Save")
        btn_save.add_css_class("suggested-action")

        header = Adw.HeaderBar(
            show_start_title_buttons=False,
            show_end_title_buttons=False,
        )
        header.pack_start(btn_cancel)
        header.pack_end(btn_save)

        item_list = Adw.PreferencesGroup(
            description="The following list includes only applications available in your preferred package manager."
        )
        page = Adw.PreferencesPage()
        page.add(item_list)

        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        box.append(header)
        box.append(page)

        dialog.set_content(box)
        dialog.set_default_size(500, 600)

        for item in self._build_apps(packages, is_required=is_required):
            item_list.add(item)

        btn_cancel.connect("clicked", lambda x: dialog.close())
        btn_save.connect("clicked", lambda x: dialog.close())
        dialog.show()

    def _build_apps(self, packages: list, is_required: bool = False):
        for item in packages:
            for name, pkg in item.items():
                action_row = Adw.ActionRow(title=name)
                if isinstance(pkg, dict):
                    pkg = json.dumps(pkg, sort_keys=True)

                if is_required:
                    self.state.set(f"pkg:{pkg}", True)

                switcher = Gtk.Switch(
                    active=self.state.get(f"pkg:{pkg}"),
                    valign=Gtk.Align.CENTER,
                    sensitive=not is_required,
                )

                def set_state(p, btn, value):
                    self.state.set(f"pkg:{p}", value)

                switcher.connect("state-set", partial(set_state, pkg))
                action_row.add_suffix(switcher)
                yield action_row
