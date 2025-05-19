/* extension.js
 * Copyright - 2024 Andrew Shen <github.com/shendrew>
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
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
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import Gio from 'gi://Gio';
import St from 'gi://St';
import Clutter from 'gi://Clutter';

import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

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
        this._settings = this.getSettings();

        this._containerService = new ContainerService({
            settings: this._settings,
            path: this.path,
        });

        // create icons
        this._closedIcon = new St.Icon({
            gicon: Gio.icon_new_for_string(`${this.path}/icons/closed_icon.svg`),
            style_class: 'system-status-icon',
            icon_size: 16,
        });
        this._openIcon = new St.Icon({
            gicon: Gio.icon_new_for_string(`${this.path}/icons/open_icon.svg`),
            style_class: 'system-status-icon',
            icon_size: 16,
        });

        this._indicator = new PanelMenu.Button(0.5, _('Lilypad'), false);
        this._initIndicator(this._indicator);

        this._max_collapse_retry_times = 5;

        //* modify default addContainer entrypoint
        Panel.Panel.prototype._originalAddToStatusArea = Panel.Panel.prototype.addToStatusArea;
        const arrange = () => {
            // preserves extension scope
            this._containerService.arrange();
        }
        Panel.Panel.prototype.addToStatusArea = function (role, indicator, position, box) {
            this._originalAddToStatusArea(role, indicator, position, box);
            arrange();
        };

        Main.panel.addToStatusArea(this.uuid, this._indicator);


        this._containerService._addIconVisibilityListeners(this._onIconVisibilityChange.bind(this));
        console.log("Lilypad extension started...")
    }

    _onIconVisibilityChange(actor, show, destroy = false) {
        actor.track_hover = show;
        for (let menu of Main.panel.menuManager._menus) {
            if (menu.sourceActor == actor) {
                menu.actor.track_hover = show;
            }
        }
    }

    disable() {
        Panel.Panel.prototype.addToStatusArea = Panel.Panel.prototype._originalAddToStatusArea;
        Panel.Panel.prototype._originalAddToStatusArea = null;

        this._containerService?.destroy();
        this._containerService = null;

        this._indicator?.destroy();
        this._indicator = null;

        this._closedIcon?.destroy();
        this._closedIcon = null;
        this._openIcon?.destroy();
        this._openIcon = null;

        this._settings = null;
        clearTimeout(this._timerId);
        this._timerId = null;

        console.log("Lilypad extension stopped.")
    }

    _initIndicator() {
        this._setIcon(this._settings.get_boolean("show-icons"));

        let settingsItem = new PopupMenu.PopupMenuItem(_('Settings'));
        settingsItem.connect('activate', () => this.openPreferences());
        this._indicator.menu.addMenuItem(settingsItem);

        this._indicator.track_hover = true

        this._indicator.connect('button-press-event', (actor, event) => {            
            switch (event.get_button()) {
                // do not show menu on left click
                case Clutter.BUTTON_PRIMARY:
                    this._toggleIcons();
                    this._toggleMenu();
                    break;
                case Clutter.BUTTON_MIDDLE:
                    this._toggleMenu();
                    break;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        this._indicator.connect('touch-event', (actor, event) => {
            // only handle initial tap
            switch (event.type()) {
                case Clutter.EventType.TOUCH_BEGIN:
                    this._toggleIcons();
                    this._toggleMenu();
                    break;
                default:
                    // ignore others, only touch_begin toggles gjs.button menu
                    break;
            }

            return Clutter.EVENT_PROPAGATE;
        });
    }

    _toggleMenu() {
        this._indicator.menu.toggle();
    }

    _toggleIcons() {
        if (this._settings.get_strv("lilypad-order").length === 0) {
            this._setIcon(false);     // closed icon
            return false;
        }

        let isVisible = this._containerService.toggleIcons();
        this._setIcon(isVisible);

        if (isVisible) {
            this._tryStartAutoCollapseTimerIfVisible();
        }
        return isVisible;
    }

    _setIcon(visible) {
        // remove existing icon
        if (this._indicator.get_children().length) {
            this._indicator.remove_all_children();
        }

        if (visible) {
            this._indicator.add_child(this._openIcon);
        } else {
            this._indicator.add_child(this._closedIcon);
        }
    };

    _tryStartAutoCollapseTimerIfVisible(times = 0) {
        let autoCollapse = this._settings.get_boolean('auto-collapse');
        let showIcons = this._settings.get_boolean('show-icons');
        if (showIcons && autoCollapse) {
            clearTimeout(this._timerId);
            let autoCollapseMillisecond = this._settings.get_int('auto-collapse-millisecond') / this._max_collapse_retry_times;
            this._timerId = setTimeout(() => {
                let detectActors = [];
                detectActors.push(this._indicator);
                detectActors.push(...this._containerService.getOrderActors());

                let collapse = true;

                for (let menu of Main.panel.menuManager._menus) {
                    for (let orderActor of detectActors) {
                        if ( ((menu.actor?.hover || menu.actor?.is_visible()) && menu.sourceActor == orderActor)
                                || orderActor.hover) {
                            collapse = false;
                            break;
                        }
                    }
                    if (!collapse) {
                        break;
                    }
                }

                if (collapse) {
                    if (times >= this._max_collapse_retry_times) {
                        this._containerService.switchIcons(false);
                        this._setIcon(false);
                    }
                    this._tryStartAutoCollapseTimerIfVisible(++times);
                } else {
                    this._tryStartAutoCollapseTimerIfVisible(0);
                }
            }, autoCollapseMillisecond);
        }
    }
}
