import Adw from "gi://Adw";
import GObject from "gi://GObject";
import Gdk from "gi://Gdk";
import Gtk from "gi://Gtk";
import GLib from "gi://GLib";


export default class OrderPage extends Adw.PreferencesPage {
    static {
        GObject.registerClass({
            GTypeName: "OrderUI",
            Template: GLib.uri_resolve_relative(import.meta.url, "../ui/order.ui", null),
            InternalChildren: [
                "rightbox-order",
                "lilypad-order",
                "ignored-order",
                "clear-button",
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

        this._initDragMenu("rightbox-order", this._rightBoxList);
        this._initDragMenu("lilypad-order", this._lilypadList);
        this._initDragMenu("ignored-order", this._ignoredList);
        this._initClearButton("rightbox-order", "lilypad-order", "ignored-order");
    }

    /*
     * based on Workbench v46.1 Drag and Drop template
     * used under the terms of GPL-3.0
     */
    _addRow(dragBox, rowName, index) {
        let row = new Adw.ActionRow({ title: rowName, selectable: false});
        const dropController = new Gtk.DropControllerMotion();
        row.add_controller(dropController);

        if (rowName) {
            // drag controller
            row.add_prefix(
                new Gtk.Image({
                icon_name: "list-drag-handle-symbolic",
                css_classes: ["dim-label"],
                }),
            );

            let dragX;
            let dragY;

            const dragSource = new Gtk.DragSource({
                actions: Gdk.DragAction.MOVE,
            });

            row.add_controller(dragSource);

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
        }

        // Update row visuals during drag
        dropController.connect("enter", () => dragBox.drag_highlight_row(row) );
        dropController.connect("leave", () => dragBox.drag_unhighlight_row() );
        dragBox.insert(row, index);
    }

    _initDragMenu(keyname, listbox) {
        const orderSetting = this._settings.get_strv(keyname);
        const boxTarget = Gtk.DropTarget.new(Gtk.ListBoxRow, Gdk.DragAction.MOVE);
        listbox.add_controller(boxTarget);

        // add rows to drag boxes
        for (const iconName of orderSetting)
            this._addRow(listbox, iconName, -1);
        if (!orderSetting.length)
            this._addRow(listbox, null, -1);

        boxTarget.connect("drop", (target, value, x, y) => this._onTargetDropped(target, value, x, y, listbox));
    }

    _removeRow(oldRow, listbox) {
        for (const row of listbox) {
            if (row === oldRow) {
                listbox.remove(oldRow);
                return;
            }
        }
    }

    _storeOrder(listbox, orderSetting) {
        let order = [];
        for (const row of listbox) {
            if (row.title == "")
                listbox.remove(row);
            else
                order.push(row.title);
        }

        // add blank row if empty
        if (!order.length)
            this._addRow(listbox, null, -1);

        this._settings.set_strv(orderSetting, order);
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

        // find and remove row
        this._removeRow(value, this._rightBoxList);
        this._removeRow(value, this._lilypadList);
        this._removeRow(value, this._ignoredList);

        // insert row
        listbox.insert(value, targetIndex);

        // store order
        this._storeOrder(this._rightBoxList, "rightbox-order");
        this._storeOrder(this._lilypadList, "lilypad-order");
        this._storeOrder(this._ignoredList, "ignored-order");

        // reorder indicators to reflect settings
        this._emitReorder();

        return true;
    }

    _initClearButton(...keynames) {
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
                    for (const keyname of keynames) {
                        this._settings.reset(keyname);
                    }
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
