import Gio from 'gi://Gio';
import Adw from "gi://Adw";
import GObject from "gi://GObject";
import Gtk from "gi://Gtk";
import GLib from "gi://GLib";

import { HideExtension } from "./common/enum.js";

export default class DisplayPage extends Adw.PreferencesPage {
    static {
        GObject.registerClass({
            GTypeName: "DisplayUI",
            Template: GLib.uri_resolve_relative(import.meta.url, "../ui/display.ui", null),
            InternalChildren: [
                "hide-indicator-dropdown",
                "auto-collapse-millisecond-spin-button",
                "auto-collapse-switch",
            ]
        }, this);
    }

    _init(params = {}) {
        this._settings = params?.Settings;
        let {Settings, ...args} = params;
        super._init(args);

        this._initHideIndicatorDropdown('hide-indicator');
        this._initAutoCollapseMillisecondSwitchButton('auto-collapse-millisecond');
        this._initAutoCollapseSwitch('auto-collapse');
    }

    _initHideIndicatorDropdown(keyname) {
        this._hide_indicator_dropdown.set_model(
            new Gtk.StringList({
                strings: HideExtension.nicks
            })
        );
        
        this._settings.bind(keyname, this._hide_indicator_dropdown, "selected", Gio.SettingsBindFlags.DEFAULT)
    }

    _initAutoCollapseMillisecondSwitchButton(keyName) {
        this._settings.bind(keyName, this._auto_collapse_millisecond_spin_button, "value", Gio.SettingsBindFlags.DEFAULT);
    };

    _initAutoCollapseSwitch(keyName) {
        this._settings.bind(keyName, this._auto_collapse_switch, 'active', Gio.SettingsBindFlags.DEFAULT);
    };

    _emitReorder() {
        const reorder_state = this._settings.get_boolean("reorder");
        this._settings.set_boolean("reorder", reorder_state^1);
    }
}
