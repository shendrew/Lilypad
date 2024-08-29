import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import PrefsUI from "./src/prefsUI.js";

export default class LilypadPreferences extends ExtensionPreferences {
    constructor(metadata) {
        super(metadata);
    }

    fillPreferencesWindow(window) {
        window.set_default_size(750, 900);
        
        let page = new PrefsUI({
            title: _('General'),
            icon_name: 'applications-other-symbolic',
            Settings: this.getSettings(),
        });
        window.add(page);
    }
}