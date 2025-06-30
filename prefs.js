import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import OrderPage from "./src/orderPage.js";
import DisplayPage from './src/displayPage.js';

export default class LilypadPreferences extends ExtensionPreferences {
    constructor(metadata) {
        super(metadata);
    }

    fillPreferencesWindow(window) {
        window.set_default_size(750, 900);
        
        let orderPage = new OrderPage({
            title: _('General'),
            icon_name: 'applications-other-symbolic',
            Settings: this.getSettings(),
        });
        window.add(orderPage);
        
        let behaviorPage = new DisplayPage({
            title: _('Display'),
            icon_name: 'display-symbolic',
            Settings: this.getSettings(),
        });
        window.add(behaviorPage);
    }
}