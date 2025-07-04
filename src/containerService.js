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

        this._settings          = args["settings"] || null;
        this._extensionPath     = args["path"] || null;
        this._containerName;
    }

    setIconVisibilityListeners(listener) {
        this._iconVisibilityListener = listener;
    }

    _setIconsVisibility(show, destroy = false) {
        const orderActors = this.getGroupedActors()
        orderActors.forEach(actor => {
            if (show) {
                actor.container.show();
            } else {
                actor.container.hide();
            }
            this._iconVisibilityListener(actor, show, destroy);
        });
    }

    getGroupedActors() {
        let lilypadOrder = this._settings.get_strv('lilypad-order');
        const orderActors = []
        const roleOrder = this.getOrder();
        for (let role of roleOrder) {
            const roleName = getRoleName(role);
            if (lilypadOrder.includes(roleName)) {
                orderActors.push(Main.panel.statusArea[role]);
            }
        }
        return orderActors;
    }

    switchIcons(showIcons) {
        this._setIconsVisibility(showIcons);
        this._settings.set_boolean('show-icons', showIcons);
    }

    toggleIcons() {
        let showIcons = this._settings.get_boolean('show-icons');

        // toggle showIcons
        showIcons ^= 1;
        this.switchIcons(showIcons);

        return showIcons;
    }

    arrange() {
        let rightBoxOrder = this._settings.get_strv('rightbox-order');
        let lilypadOrder  = this._settings.get_strv('lilypad-order');
        let showIcons     = this._settings.get_boolean('show-icons');
        const roleOrder   = this.getOrder();

        // if order was reset, change to CLOSED icon
        if (rightBoxOrder.length === 0) {
            this._setIconsVisibility(false);
        }

        // remove all icons from the right box
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

        // add all grouped icons from offset
        // returns: number of grouped icons
        function addGroupedIcons(offset) {
            var numIcons = 0;
            for (let i=0; i<lilypadOrder.length; i++) {
                const targetRole = lilypadOrder[i];
                for (let groupedRole of roleOrder) {
                    const groupedRoleName = getRoleName(groupedRole);

                    if (targetRole === groupedRoleName) {
                        const groupedContainer = Main.panel.statusArea[groupedRole].container;
                        Main.panel._rightBox.insert_child_at_index(groupedContainer, numIcons+offset);

                        if (showIcons) {
                            groupedContainer.show();
                        } else {
                            groupedContainer.hide();
                        }
                        numIcons++;
                    }
                }
            }

            return numIcons;
        }

        // add all icons to the right box
        let ind=0;
        for (let i=0; i<rightBoxOrder.length; i++) {
            const settingsRole = rightBoxOrder[i];
            for (let role of roleOrder) {
                const roleName = getRoleName(role);

                if (settingsRole === roleName) {
                    if (roleName === "lilypad") {
                        const numGroupedIcons = addGroupedIcons(ind);
                        ind += numGroupedIcons;
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
        const ignoredOrder = this._settings.get_strv('ignored-order');
        const lilypadOrder = this._settings.get_strv('lilypad-order');
        // GET widget role name
        this._containerName = new Map();
        for (const role in Main.panel.statusArea) {
            // roles are keys for the statusArea
            let indicator = Main.panel.statusArea[role];
            if (!indicator || !indicator.container) continue;
            this._containerName.set(indicator.container, role);
        }

        let roleOrder = [];
        let children = Main.panel._rightBox.get_children();
        for (let i = 0; i < children.length; i++) {
            let container = children[i];
            if (!container || !container.get_first_child()) continue;

            let actor = container.get_first_child();

            // skip if actor or container has been removed w/o cleanup
            if (!actor || !this._containerName.get(container)) continue;
            let actorName = getRoleName(this._containerName.get(container));

            // conditions to exclude
            if (actorName !== "lilypad" && !lilypadOrder.includes(actorName) && !actor.visible) continue;
            if (actorName === "quickSettings" ||  ignoredOrder.includes(actorName)) continue;

            // accessible name could change, so push the raw role first
            roleOrder.push(this._containerName.get(container));
        }

        return roleOrder;
    }

    destroy() {
        this._setIconsVisibility(true, true);
    }
}
