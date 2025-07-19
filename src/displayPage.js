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
                "select-closed-icon",
                "select-open-icon",
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
        this._initFileSelectors("closed-icon-path", "open-icon-path");
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
    }

    _initAutoCollapseSwitch(keyName) {
        this._settings.bind(keyName, this._auto_collapse_switch, 'active', Gio.SettingsBindFlags.DEFAULT);
    }

    _initFileSelectors(closedKey, openKey) {
        // set label if settings are set
        if (this._settings.get_string(closedKey))
            this._select_closed_icon.set_label(GLib.path_get_basename(this._settings.get_string(closedKey)));
        if (this._settings.get_string(openKey))
            this._select_open_icon.set_label(GLib.path_get_basename(this._settings.get_string(openKey)));

        this._select_closed_icon.connect('clicked', () => {
            this._openIconFileDialog(closedKey, 'Select Closed Icon');
        });

        this._select_open_icon.connect('clicked', () => {
            this._openIconFileDialog(openKey, 'Select Open Icon');
        });
    }

    _openIconFileDialog(settingsKey, title) {
        const dialog = new Gtk.FileDialog({
            title: title,
            modal: true,
        });
        const allowedPatterns = ['*.png', '*.jpg', '*.jpeg', '*.svg', '*.gif'];

        // file filter for images
        // GTK directory change might refresh filter, not sure if a workaround exists
        const filter = new Gtk.FileFilter();
        filter.set_name('Image files');
        filter.add_mime_type('image/*');
        allowedPatterns.forEach(pattern => filter.add_pattern(pattern));

        const filterStore = new Gio.ListStore();
        filterStore.append(filter);
        dialog.set_filters(filterStore);
        dialog.set_default_filter(filter);

        const parent = this.get_root();

        dialog.open(parent, null, (source, result) => {
            try {
                const file = dialog.open_finish(result);
                if (!file) return;
                const filePath = file.get_path();
                if (!filePath) return;

                this._settings.set_string(settingsKey, filePath);
                
                // update button label to show selected file name
                const fileName = GLib.path_get_basename(filePath);
                if (settingsKey === 'closed-icon-path') {
                    this._select_closed_icon.set_label(fileName);
                } else if (settingsKey === 'open-icon-path') {
                    this._select_open_icon.set_label(fileName);
                }
            } catch (error) {
                console.log('File selection cancelled or error:', error.message);
            }
        });
    }
}
