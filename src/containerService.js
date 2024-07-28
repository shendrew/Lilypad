import GObject from 'gi://GObject';

import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {getRoleName, getDisplayName, readJSON, saveJSON} from './utils/utils.js';

export default class ContainerService extends GObject.Object {
    static {
        GObject.registerClass({}, this)
    }

    _init(args) {
        super._init();
        
        this._settings          = args["Settings"] || null;
        this._extensionPath     = args["Path"] || null;
    }

    _containerName;

    clearOrder() {
        this._settings.set_strv('icon-order', []);
    }

    arrange() {
        let settingsIconOrder = this._settings.get_strv('icon-order');
        const roleOrder = this.getOrder();

        let hasNewIcon = false;
        let indexArray = [];
        for (let role of roleOrder) {
            const storedIndex = settingsIconOrder.indexOf(getRoleName(role));
            hasNewIcon = hasNewIcon || storedIndex == -1;
            indexArray.push(storedIndex);
        }

        if (!hasNewIcon) {
            if (JSON.stringify(indexArray) === JSON.stringify(indexArray.toSorted((a, b) => a - b))) {
                // compare with numerically sorted array
                return;
            }
        }


        log("NEED TO REORDER TO", JSON.stringify(settingsIconOrder));
        roleOrder.forEach((role) => {
            // insert new roles to arrange
            const roleName = getRoleName(role);
            if (!settingsIconOrder.includes(roleName)) {
                settingsIconOrder.push(roleName);
            }
            
            // remove container from panel
            const container = Main.panel.statusArea[role].container;
            const boxContainer = container.get_parent();
            boxContainer.remove_child(container);
        });

        for (let ind=0; ind<settingsIconOrder.length; ind++) {
            const settingsRole = settingsIconOrder[ind];
            for (let role of roleOrder) {
                const roleName = getRoleName(role);
                const container = Main.panel.statusArea[role].container;
                // const container = containerHolder[role];

                if (settingsRole == roleName) {
                    Main.panel._rightBox.insert_child_at_index(container, ind);
                }
            }
        }

        this._settings.set_strv('icon-order', settingsIconOrder);
    }

    // Get current order of icons in the top bar
    getOrder() {

        let jsonData = readJSON(`${this._extensionPath}/settings.json`);

        // ! GET widget role name
        this._containerName = new Map();
        for (const role in Main.panel.statusArea) {
            // roles are keys for the statusArea
            let container = Main.panel.statusArea[role].container;
            this._containerName.set(container, role);
        }
        
        let roleOrder = [];
        let children = Main.panel._rightBox.get_children();
        for (let i = 0; i < children.length; i++) {
            let container = children[i];
            let actor = container.get_first_child();
            let actorName = getDisplayName(actor);

            // conditions to exclude
            if (!actor.visible) continue;
            if (actorName === "System") continue;
            
            if (container && actor.is_visible()) {
                // has a visible container
                // spotify's accessible name could change, so push the raw role first
                roleOrder.push(this._containerName.get(container));
            }
        }

        log("detected: ",roleOrder)

        // save to settings
        jsonData.roleOrder = roleOrder;
        
        return roleOrder;
    }
}