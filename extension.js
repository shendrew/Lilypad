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

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import LilypadButton from './src/lilypadButton.js';


export default class Lilypad extends Extension {
    constructor(metadata) {
        super(metadata);
    }

    enable() {
        let settings = this.getSettings();
        
        this._indicator = new LilypadButton(
            {
                Settings: settings,
                Path: this.path,
            }
        );

        let settingsItem = new PopupMenu.PopupMenuItem(_('Settings'));
        settingsItem.connect('activate', () => {
            this.openPreferences()
        });
        this._indicator.menu.addMenuItem(settingsItem);

        Main.panel.addToStatusArea(this.uuid, this._indicator);

        console.log("Lilypad extension started...")
    }

    disable() {
        this._indicator?.destroy();
        this._indicator = null;

        console.log("Lilypad extension stopped...")
    }
}
