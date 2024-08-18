/* extension.js
 * Copyright - 2024 Andrew Shen <github.com/shendrew>
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
import Gio from 'gi://Gio';
import St from 'gi://St';
import Clutter from 'gi://Clutter';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Panel from 'resource:///org/gnome/shell/ui/panel.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import ContainerService from './src/containerService.js';


export default class Lilypad extends Extension {
    constructor(metadata) {
        super(metadata);
    }

    enable() {
        this._containerService = new ContainerService({
            Settings: this.getSettings(),
            Path: this.path,
        });
        this._signalHandlers = [];
        this._indicator = this._initIndicator();
        
        //* modify default addContainer entrypoint
        Panel.Panel.prototype._originalAddToStatusArea = Panel.Panel.prototype.addToStatusArea;
        const arrange = () => {
            // preserves extension scope
            this._containerService.arrange();
        }
        Panel.Panel.prototype.addToStatusArea = function(role, indicator, position, box) {
            this._originalAddToStatusArea(role, indicator, position, box);
            arrange();
        };

        Main.panel.addToStatusArea(this.uuid, this._indicator);


        console.log("Lilypad extension started...")
    }

    disable() {
        Panel.Panel.prototype.addToStatusArea = Panel.Panel.prototype._originalAddToStatusArea;
        Panel.Panel.prototype._originalAddToStatusArea = undefined;

        this._signalHandlers.forEach(handler => handler.object.disconnect(handler.signal));

        this._indicator?.destroy();
        this._indicator = null;

        console.log("Lilypad extension stopped.")
    }

    

    _initIndicator() {
        let indicator = new PanelMenu.Button(0.5, _('Lilypad'), false);

        let icon = new St.Icon({
            icon_name: 'camera-shutter-symbolic',
            style_class: 'system-status-icon',
        });
        indicator.add_child(icon);

        let reorderButton = new PopupMenu.PopupMenuItem(_("Reorder"));
        reorderButton.connect('activate', this._containerService.arrange.bind(this._containerService));
        indicator.menu.addMenuItem(reorderButton);

        let clearButton = new PopupMenu.PopupMenuItem(_("Clear"));
        clearButton.connect('activate', this._containerService.clearOrder.bind(this._containerService));
        indicator.menu.addMenuItem(clearButton);

        let settingsItem = new PopupMenu.PopupMenuItem(_('Settings'));
        settingsItem.connect('activate', () => this.openPreferences());
        indicator.menu.addMenuItem(settingsItem);

        indicator.connect('button-press-event', (actor, event) => {
            switch (event.get_button()) {
                // do not show menu
                case Clutter.BUTTON_PRIMARY: indicator.menu.toggle(); this._containerService.toggleIcons(); break;
                case Clutter.BUTTON_MIDDLE: indicator.menu.toggle(); break;
            }
            return Clutter.EVENT_PROPAGATE;
        });
        
        return indicator;
    }
}
