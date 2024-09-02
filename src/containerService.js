import GObject from 'gi://GObject';

import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {getRoleName} from './utils/utils.js';

export default class ContainerService extends GObject.Object {
    static {
        GObject.registerClass({}, this)
    }

    _init(args) {
        super._init();
        
        this._settings          = args["Settings"] || null;
        this._extensionPath     = args["Path"] || null;

        this._signalHandler = [];
        this._signalHandler.push({
            object: this._settings,
            id: this._settings.connect("changed::reorder", this.arrange.bind(this))
        });

        this._containerName;
    }

    clearOrder() {
        this._settings.set_strv('lilypad-order', []);
        this._settings.set_strv('rightbox-order', []);

        // store current order
        this._setIconsVisibility(true);
        this.arrange();
    }

    _setIconsVisibility(show) {
        let lilypadOrder = this._settings.get_strv('lilypad-order');

        const roleOrder = this.getOrder();
        for (let role of roleOrder) {
            const roleName = getRoleName(role);
            if (lilypadOrder.includes(roleName)) {
                const container = Main.panel.statusArea[role].container;
                
                if (show) {
                    container.show();
                } else {
                    container.hide();
                }
            }
        }
    }

    toggleIcons() {
        let showIcons = this._settings.get_boolean('show-icons');
        
        // toggle showIcons
        showIcons ^= 1;
        this._setIconsVisibility(showIcons);
        this._settings.set_boolean('show-icons', showIcons);

        return showIcons;
    }

    arrange() {
        let rightBoxOrder = this._settings.get_strv('rightbox-order');
        let lilypadOrder  = this._settings.get_strv('lilypad-order');
        let showIcons     = this._settings.get_strv('show-icons');
        const roleOrder   = this.getOrder();

        roleOrder.forEach((role) => {
            // insert new roles to arrange
            const roleName = getRoleName(role);
            if (!rightBoxOrder.includes(roleName) && !lilypadOrder.includes(roleName)) {
                rightBoxOrder.push(roleName);
            }
            
            // remove role container from panel
            const container = Main.panel.statusArea[role].container;
            const boxContainer = container.get_parent();
            boxContainer.remove_child(container);
        });

        let ind=0;
        for (let i=0; i<rightBoxOrder.length; i++) {
            const settingsRole = rightBoxOrder[i];
            for (let role of roleOrder) {
                const roleName = getRoleName(role);

                if (settingsRole === roleName) {
                    if (roleName === "lilypad") {
                        // add all grouped icons
                        for (let j=0; j<lilypadOrder.length; j++) {
                            const targetRole = lilypadOrder[j];
                            for (let groupedRole of roleOrder) {
                                const groupedRoleName = getRoleName(groupedRole);
                                
                                if (targetRole === groupedRoleName) {
                                    const groupedContainer = Main.panel.statusArea[groupedRole].container;
                                    Main.panel._rightBox.insert_child_at_index(groupedContainer, ind);

                                    if (showIcons) {
                                        groupedContainer.show();
                                    } else {
                                        groupedContainer.hide();
                                    }
                                    ind++;

                                }
                            }
                        }
                    }
                    
                    const container = Main.panel.statusArea[role].container;
                    Main.panel._rightBox.insert_child_at_index(container, ind);
                    ind++;
                }
            }
        }

        this._settings.set_strv('rightbox-order', rightBoxOrder);
    }

    // Get current order of icons in the top bar
    getOrder() {
        // GET widget role name
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

	    if (this._containerName.get(container) === undefined) continue;
            let actorName = getRoleName(this._containerName.get(container));

            // conditions to exclude
            if (!actor.visible) continue;
            if (actorName === "quickSettings") continue;
            
            if (container && actor.is_visible()) {
                // accessible name could change, so push the raw role first
                roleOrder.push(this._containerName.get(container));
            }
        }
        
        return roleOrder;
    }

    destroy() {
        this._setIconsVisibility(true);

        this._signalHandler.forEach(signal => signal.object.disconnect(signal.id));
    }
}
