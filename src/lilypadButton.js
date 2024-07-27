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

        let reorderButton = new PopupMenu.PopupMenuItem(_("Reorder"));
        reorderButton.connect('activate', this._arrangeIcons.bind(this));
        this.menu.addMenuItem(reorderButton);

        let clearButton = new PopupMenu.PopupMenuItem(_("Clear"));
        clearButton.connect('activate', this._clearOrder.bind(this));
        this.menu.addMenuItem(clearButton);
        
        this._roleMap = {};
    }

    _clearOrder() {
        this._settings.set_strv('icon-order', []);
    }

    _arrangeIcons() {
        let settingsIconOrder = this._settings.get_strv('icon-order');
        const {iconOrder, actorList} = this._getIconOrder();

        // reverse rightBox order to match system
        iconOrder.reverse();

        let hasNewIcon = false;
        let indexArray = [];
        for (let i = 0; i < iconOrder.length; i++) {
            const storedIndex = settingsIconOrder.indexOf(iconOrder[i]);
            hasNewIcon = hasNewIcon || storedIndex == -1;
            indexArray.push(storedIndex)
        }

        if (!hasNewIcon) {
            if (JSON.stringify(indexArray) === JSON.stringify(indexArray.toSorted((a, b) => a - b))) {
                // compare with numerically sorted array
                return;
            }
        }


        log("NEED TO REORDER TO", JSON.stringify(settingsIconOrder));

        iconOrder.forEach((icon) => {
            if (!settingsIconOrder.includes(icon)) {
                settingsIconOrder.push(icon);
            }
        });

        //! new order
        actorList.forEach((actor) => {
            let container = Main.panel._rightBox;
            container.remove_child(actor);
        });

        settingsIconOrder.forEach((actorName) => {
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
        let containerRole = new Map();
        for (const role in Main.panel.statusArea) {
            // roles are keys for the statusArea
            let container = Main.panel.statusArea[role].container;
            containerRole.set(container, role);
            // log("role: ", role, container.get_parent().name);
        }
        
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
            
            if (extension && actor.is_visible()) {
                // has a visible container
                // spotify's accessible name could change
                log(actorName, actor?.accessible_name, containerRole.get(extension), i);
                iconOrder.push(actorName);
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