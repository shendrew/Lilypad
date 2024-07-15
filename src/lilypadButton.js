import St from 'gi://St';
import GObject from 'gi://GObject';

import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {getActorName, readJSON, saveJSON} from './utils/utils.js';

export default class LilypadButton extends PanelMenu.Button {
    static {
        GObject.registerClass({}, this)
    }

    _init(args) {
        super._init(0.5, _('Lilypad'));
        
        this._settings          = args["Settings"] || null;
        this._extensionPath     = args["Path"] || null;
        
        let icon = new St.Icon({
            icon_name: 'camera-shutter-symbolic',
            style_class: 'system-status-icon',
        });
        this.add_child(icon);

        let item = new PopupMenu.PopupMenuItem(_("Reorder"));
        item.connect('activate', this._arrangeIcons.bind(this));
        this.menu.addMenuItem(item);
        
    }

    _arrangeIcons() {
        let settingsIconOrder = this._settings.get_strv('icon-order');
        const {iconOrder, actorList} = this._getIconOrder();

        // reverse rightBox order to match system
        iconOrder.reverse();

        if (JSON.stringify(settingsIconOrder) === JSON.stringify(iconOrder)) {
            // no icon order updtes
            return;
        }

        log("NEED TO REORDER TO", JSON.stringify(settingsIconOrder));
        log(JSON.stringify(iconOrder));

        iconOrder.forEach(function(icon) {
            if (!settingsIconOrder.includes(icon)) {
                settingsIconOrder.push(icon);
            }
        });

        // new order
        actorList.forEach(function(actor) {
            let container = Main.panel._rightBox;
            container.remove_child(actor);
        });

        settingsIconOrder.forEach(function(actorName) {
            for (let i=0; i<actorList.length; i++) {
                let actor = actorList[i].get_first_child();
                let extensionName = getActorName(actor);

                if (actorName == extensionName) {
                    Main.panel._rightBox.insert_child_at_index(actorList[i], 0);
                }
            }
        });

        this._settings.set_strv('icon-order', settingsIconOrder);
    }

    // Get current order of icons in the top bar
    _getIconOrder() {

        let jsonData = readJSON(`${this._extensionPath}/settings.json`);

        // ! GET widget role name
        // for (const role in Main.panel.statusArea) {
        //     let container = Main.panel.statusArea[role].container;
        //     log("role: ", role);
        //     if (container) {
        //         log(container.get_child()?._indicator?._uniqueId)
        //     }
        // }
        
        let iconOrder = [];
        let actorList = [];
        let children = Main.panel._rightBox.get_children();
        for (let i = 0; i < children.length; i++) {
            let extension = children[i];
            let actor = extension.get_first_child();
            let actorName = getActorName(actor);

            // conditions to exclude
            if (!actor.visible) continue;
            if (actorName === "System") continue;
            
            iconOrder.push(actorName);
            if (extension && actor.is_visible()) {
                // has a visible container
                log(actorName, i);
                actorList.push(extension);
            }
        }

        log("detected: ",iconOrder)

        // save to settings
        jsonData.iconOrder = iconOrder;
        
        return {
            iconOrder: iconOrder,
            actorList: actorList,
        };
    }
}