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
            ]
        }, this);
    }

    _init(params = {}) {
        this._settings = params?.Settings;


        let {Settings, ...args} = params;
        super._init(args);

        this._signalHandlers = [];
        
        this._rightBoxList = this._rightbox_order;
        this._lilypadList  = this._lilypad_order;

        this._initDragMenu();
    }
    
    /*
     * based on Workbench v46.1 Drag and Drop template
     * used under the terms of GPL-3.0
     */
    _addRow(dragBox, rowName, index) {
        let row = new Adw.ActionRow({ title: rowName, selectable: false});
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
        this._signalHandlers.push({
            object: dragSource,
            signal: dragSource.connect("prepare", (_source, x, y) => {
                dragX = x;
                dragY = y;
    
                const value = new GObject.Value();
                value.init(Gtk.ListBoxRow);
                value.set_object(row);
    
                return Gdk.ContentProvider.new_for_value(value);
            })
        });

        this._signalHandlers.push({
            object: dragSource,
            signal: dragSource.connect("drag-begin", (_source, drag) => {
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
            })
        });
        
        // Update row visuals during drag
        this._signalHandlers.push({
            object: dropController,
            signal: dropController.connect("enter", () => dragBox.drag_highlight_row(row) )
        });
        this._signalHandlers.push({
            object: dropController,
            signal: dropController.connect("leave", () => dragBox.drag_unhighlight_row() )
        });

        dragBox.insert(row, index);
    }
    
    _initDragMenu() {
        const rightBoxOrder = this._settings.get_strv("rightbox-order");
        const lilypadOrder = this._settings.get_strv("lilypad-order");

        for (const row of this._lilypadList) {
            // setup highlighting for lilypad group placeholder
            const dropController = new Gtk.DropControllerMotion();
            row.add_controller(dropController);

            this._signalHandlers.push({
                object: dropController,
                signal: dropController.connect("enter", () => this._lilypadList.drag_highlight_row(row) )
            });
            this._signalHandlers.push({
                object: dropController,
                signal: dropController.connect("leave", () => this._lilypadList.drag_unhighlight_row() )
            });
        }

        const rightBoxTarget = Gtk.DropTarget.new(Gtk.ListBoxRow, Gdk.DragAction.MOVE);
        const lilypadTarget = Gtk.DropTarget.new(Gtk.ListBoxRow, Gdk.DragAction.MOVE);
    
        this._rightBoxList.add_controller(rightBoxTarget);
        this._lilypadList.add_controller(lilypadTarget);    
        
        // add rows to drag boxes
        for (const iconName of rightBoxOrder) {
            this._addRow(this._rightBoxList, iconName, -1);
        }
        let lilypadIndex = 0;
        for (const iconName of lilypadOrder) {
            this._addRow(this._lilypadList, iconName, lilypadIndex);
            lilypadIndex++;
        }

        this._signalHandlers.push(rightBoxTarget.connect("drop", (target, value, x, y) => this._onTargetDropped(target, value, x, y, this._rightBoxList)));
        this._signalHandlers.push(lilypadTarget.connect("drop", (target, value, x, y) => this._onTargetDropped(target, value, x, y, this._lilypadList)));
    }

    _onTargetDropped(_drop, value, _x, y, listbox) {
        const targetRow = listbox.get_row_at_y(y);
        const targetIndex = targetRow.get_index();
        
        // If value or the target row is null, do not accept the drop
        if (!value || !targetRow) {
            return false;
        }

        if (value.title === "lilypad" && listbox === this._lilypadList) {
            return false;
        }

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

        listbox.insert(value, targetIndex);
        
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
        
        this._settings.set_strv("lilypad-order", lilypadOrder);
        this._settings.set_strv("rightbox-order", rightBoxOrder);
        
        const reorder_state = this._settings.get_boolean("reorder");
        this._settings.set_boolean("reorder", reorder_state^1);

        return true;
    }


    _destroy() {
        // Disconnect all signal handlers
        this._signalHandlers.forEach(handler => handler.object.disconnect(handler.signal));
        super._destroy();
    }
}