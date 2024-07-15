import Gtk from "gi://Gtk";
import GLib from "gi://GLib";

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import PrefsUI from "./src/prefsUI.js";

export default class LilypadPreferences extends ExtensionPreferences {
    constructor(metadata) {
        super(metadata);
    }

    getPreferencesWidget() {
        // OVERRIDEN by fillPreferencesWindow
        return new Gtk.Label({
            label: this.metadata.name,
        });
    }

    fillPreferencesWindow(window) {
        // window.set_default_size(650, 700);
        
        let page = new PrefsUI({
            title: _('General'),
            icon_name: 'applications-other-symbolic',
            Settings: this.getSettings(),
        });
        window.add(page);
        
        // let page2 = new PrefsUI({
        //     title: _('test'),
        //     icon_name: 'applications-other-symbolic',
        // });
        // window.add(page2);
    }
}