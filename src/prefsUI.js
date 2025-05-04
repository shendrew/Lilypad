import Gio from 'gi://Gio';
import Adw from "gi://Adw";
import GObject from "gi://GObject";
import Gdk from "gi://Gdk";
import Gtk from "gi://Gtk";
import GLib from "gi://GLib";


export default class PrefsUI extends Adw.PreferencesPage {
    static {
        GObject.registerClass({
            GTypeName: "PrefsUI",
            Template: GLib.uri_resolve_relative(import.meta.url, "../ui/prefs.ui", null),
            InternalChildren: [
                "rightbox-order",
                "lilypad-order",
                "ignored-order",
                "clear-button",
                "auto-collapse-millisecond-spin-button",
                "auto-collapse-switch",
            ]
        }, this);
    }

    _init(params = {}) {
        this._settings = params?.Settings;
        let {Settings, ...args} = params;
        super._init(args);


        this._rightBoxList = this._rightbox_order;
        this._lilypadList  = this._lilypad_order;
        this._ignoredList = this._ignored_order

        this._initDragMenu();
        this._initClearButton();
        this._initAutoCollapseMillisecondSwitchButton('auto-collapse-millisecond');
        this._initAutoCollapseSwitch('auto-collapse');
    }

    _initAutoCollapseMillisecondSwitchButton(keyName) {
        this._settings.bind(keyName, this._auto_collapse_millisecond_spin_button, "value", Gio.SettingsBindFlags.DEFAULT);
    };

    _initAutoCollapseSwitch(keyName) {
        this._settings.bind(keyName, this._auto_collapse_switch, 'active', Gio.SettingsBindFlags.DEFAULT);
    };

    /*
     * based on Workbench v46.1 Drag and Drop template
     * used under the terms of GPL-3.0
     */
    _addRow(dragBox, rowName, index) {
        let row = new Adw.ActionRow({ title: rowName, selectable: false});
        if (rowName) {
        row.add_prefix(
            new Gtk.Image({
            icon_name: "list-drag-handle-symbolic",
            css_classes: ["dim-label"],
            }),
        );

        let dragX;
        let dragY;

        const dropController = new Gtk.DropControllerMotion();
        const dragSource = new Gtk.DragSource({
            actions: Gdk.DragAction.MOVE,
        });

        row.add_controller(dragSource);
        row.add_controller(dropController);

        // Drag handling
        dragSource.connect("prepare", (_source, x, y) => {
            dragX = x;
            dragY = y;

            const value = new GObject.Value();
            value.init(Gtk.ListBoxRow);
            value.set_object(row);

            return Gdk.ContentProvider.new_for_value(value);
        });

        dragSource.connect("drag-begin", (_source, drag) => {
            const dragWidget = new Gtk.ListBox();

            dragWidget.set_size_request(row.get_width(), row.get_height());
            dragWidget.add_css_class("boxed-list");

            const dragRow = new Adw.ActionRow({ title: row.title });
            dragRow.add_prefix(
                new Gtk.Image({
                    icon_name: "list-drag-handle-symbolic",
                    css_classes: ["dim-label"],
                }),
            );

            dragWidget.append(dragRow);
            dragWidget.drag_highlight_row(dragRow);

            const icon = Gtk.DragIcon.get_for_drag(drag);
            icon.child = dragWidget;

            drag.set_hotspot(dragX, dragY);
        });

        // Update row visuals during drag
        dropController.connect("enter", () => dragBox.drag_highlight_row(row) );
        dropController.connect("leave", () => dragBox.drag_unhighlight_row() );
    }
        dragBox.insert(row, index);
    }

    _initDragMenu() {
        const rightBoxOrder = this._settings.get_strv("rightbox-order");
        const lilypadOrder = this._settings.get_strv("lilypad-order");
        const ignoredOrder = this._settings.get_strv("ignored-order");

        for (const row of this._lilypadList) {
            // setup highlighting for lilypad group placeholder
            const dropController = new Gtk.DropControllerMotion();
            row.add_controller(dropController);

            dropController.connect("enter", () => this._lilypadList.drag_highlight_row(row) );
            dropController.connect("leave", () => this._lilypadList.drag_unhighlight_row() );
        }

        const rightBoxTarget = Gtk.DropTarget.new(Gtk.ListBoxRow, Gdk.DragAction.MOVE);
        const lilypadTarget = Gtk.DropTarget.new(Gtk.ListBoxRow, Gdk.DragAction.MOVE);
        const ignoredTarget = Gtk.DropTarget.new(Gtk.ListBoxRow, Gdk.DragAction.MOVE);

        this._rightBoxList.add_controller(rightBoxTarget);
        this._lilypadList.add_controller(lilypadTarget);
        this._ignoredList.add_controller(ignoredTarget);

        // add rows to drag boxes
        for (const iconName of rightBoxOrder) {
            this._addRow(this._rightBoxList, iconName, -1);
        }
        let lilypadIndex = 0;
        for (const iconName of lilypadOrder) {
            this._addRow(this._lilypadList, iconName, lilypadIndex);
            lilypadIndex++;
        }

        for (const iconName of ignoredOrder) {
            this._addRow(this._ignoredList, iconName, -1);
        }

        if (!ignoredOrder.length) {
            this._addRow(this._ignoredList, "", -1);
        }

        rightBoxTarget.connect("drop", (target, value, x, y) => this._onTargetDropped(target, value, x, y, this._rightBoxList));
        lilypadTarget.connect("drop", (target, value, x, y) => this._onTargetDropped(target, value, x, y, this._lilypadList));
        ignoredTarget.connect("drop", (target, value, x, y) => this._onTargetDropped(target, value, x, y, this._ignoredList));
    }

    _onTargetDropped(_drop, value, _x, y, listbox) {
        const targetRow = listbox.get_row_at_y(y);
        const targetIndex = targetRow.get_index();

        this._lilypadList.drag_unhighlight_row();
        this._rightBoxList.drag_unhighlight_row();
        this._ignoredList.drag_unhighlight_row();

        // If value or the target row is null, do not accept the drop
        if (!value || !targetRow) {
            return false;
        }

        if (value.title === "lilypad" && (listbox === this._lilypadList || listbox === this._ignoredList)) {
            return false;
        }



        // remove row
        for (const row of this._lilypadList) {
            if (row === value) {
                if (targetRow.title === "-- lilypad button --") return false;

                this._lilypadList.remove(value);
                break;
            }
        }

        for (const row of this._rightBoxList) {
            if (row === value) {
                this._rightBoxList.remove(value);
                break;
            }
        }

        for (const row of this._ignoredList) {
            if (row === value) {
                this._ignoredList.remove(value);
                break;
            }
        }


        // insert row
        listbox.insert(value, targetIndex);

        // store order
        let rightBoxOrder = [];
        for (const row of this._rightBoxList) {
            rightBoxOrder.push(row.title);
        }

        let lilypadOrder = [];
        for (const row of this._lilypadList) {
            if (row.title !== "-- lilypad button --") {
                lilypadOrder.push(row.title);
            }
        }

        let ignoredOrder = [];
        for (const row of this._ignoredList) {
            if (row.title == "") {
                this._ignoredList.remove(row);
            } else {
                ignoredOrder.push(row.title);
            }
        }

        if (!ignoredOrder.length) {
            this._addRow(this._ignoredList, "", -1);
        }

        this._settings.set_strv("lilypad-order", lilypadOrder);
        this._settings.set_strv("rightbox-order", rightBoxOrder);
        this._settings.set_strv("ignored-order", ignoredOrder);

        // reorder indicators to reflect settings
        this._emitReorder();

        return true;
    }

    _initClearButton() {
        this._clear_button.connect("clicked", () => {
            const parentWindow = this.get_ancestor(Gtk.Window);

            const dialog = new Gtk.MessageDialog({
                transient_for: parentWindow,
                modal: true,
                buttons: Gtk.ButtonsType.YES_NO,
                message_type: Gtk.MessageType.QUESTION,
                text: "Are you sure you want to perform this action?",
                secondary_text: "This action cannot be undone.",
            });

            dialog.connect('response', (dialog, response) => {
                if (response === Gtk.ResponseType.YES) {
                    this._settings.set_strv('lilypad-order', []);
                    this._settings.set_strv('rightbox-order', []);
                    this._settings.set_strv('ignored-order', []);
                    this._emitReorder();

                    // close parent window if YES
                    if (parentWindow) {
                        parentWindow.close();
                    }
                }
                dialog.destroy(); // destroy popup
            });

            dialog.show();
        });

    }

    _emitReorder() {
        const reorder_state = this._settings.get_boolean("reorder");
        this._settings.set_boolean("reorder", reorder_state^1);
    }
}
