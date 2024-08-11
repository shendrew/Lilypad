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
                "rightBox-order",
                "lilypad-order",
            ]
        }, this);
    }

    _init(params = {}) {
        this._settings = params?.Settings;


        let {Settings, ...args} = params;
        super._init(args);

        this._signalHandlers = [];
        this._setBehavior();

        this.rightBoxList;
        this.lilypadList;
    }
    
    _setBehavior() {
        const iconOrder = this._settings.get_strv("icon-order");

        // fill box list with icon order
        this.rightBoxList = this._rightBox_order;
        this.lilypadList = this._lilypad_order;
        for (const iconName of iconOrder) {
            let actionRow = new Adw.ActionRow({ title: iconName, selectable: false});
            actionRow.add_prefix(
                new Gtk.Image({
                icon_name: "list-drag-handle-symbolic",
                css_classes: ["dim-label"],
                }),
            );

            this.rightBoxList.insert(actionRow, -1);
        }

        const dropTarget1 = Gtk.DropTarget.new(Gtk.ListBoxRow, Gdk.DragAction.MOVE);
        const dropTarget2 = Gtk.DropTarget.new(Gtk.ListBoxRow, Gdk.DragAction.MOVE);
    
        this.rightBoxList.add_controller(dropTarget1);
        this.lilypadList.add_controller(dropTarget2);    
        
    
        // Iterate over ListBox children
        for (const row of this.rightBoxList) {
            let dragX;
            let dragY;
    
            const dropController = new Gtk.DropControllerMotion();
    
            const drag_source = new Gtk.DragSource({
                actions: Gdk.DragAction.MOVE,
            });
            
            row.add_controller(drag_source);
            row.add_controller(dropController);
    
            // Drag handling
            this._signalHandlers.push(drag_source.connect("prepare", (_source, x, y) => {
                dragX = x;
                dragY = y;
    
                const value = new GObject.Value();
                value.init(Gtk.ListBoxRow);
                value.set_object(row);
    
                return Gdk.ContentProvider.new_for_value(value);
            }));
    
            this._signalHandlers.push(drag_source.connect("drag-begin", (_source, drag) => {
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
            }));
            
            // Update row visuals during DnD operation
            
            this._signalHandlers.push(dropController.connect("enter", () => this.rightBoxList.drag_highlight_row(row) ));
            this._signalHandlers.push(dropController.connect("leave", () => this.rightBoxList.drag_unhighlight_row() ));
        }

        for (const row of this.lilypadList) {
            let dragX;
            let dragY;
    
            const dropController = new Gtk.DropControllerMotion();
    
            const drag_source = new Gtk.DragSource({
                actions: Gdk.DragAction.MOVE,
            });
            
            row.add_controller(drag_source);
            row.add_controller(dropController);
    
            // Drag handling
            this._signalHandlers.push(drag_source.connect("prepare", (_source, x, y) => {
                dragX = x;
                dragY = y;
    
                const value = new GObject.Value();
                value.init(Gtk.ListBoxRow);
                value.set_object(row);
    
                return Gdk.ContentProvider.new_for_value(value);
            }));
    
            this._signalHandlers.push(drag_source.connect("drag-begin", (_source, drag) => {
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
            }));
            
            // Update row visuals during DnD operation
            this._signalHandlers.push(dropController.connect("enter", () => this.lilypadList.drag_highlight_row(row) ));
            this._signalHandlers.push(dropController.connect("leave", () => this.lilypadList.drag_unhighlight_row() ));
        }


        this._signalHandlers.push(dropTarget1.connect("drop", (target, value, x, y) => this._onTargetDropped(target, value, x, y, this.rightBoxList)));
        this._signalHandlers.push(dropTarget2.connect("drop", (target, value, x, y) => this._onTargetDropped(target, value, x, y, this.lilypadList)));

        
    
        // Drop Handling
        // this._signalHandlers.push(dropTarget.connect("drop", (_drop, value, _x, y) => {
        //     const targetRow = rightBoxList.get_row_at_y(y);
        //     const targetIndex = targetRow.get_index();
            
        //     // If value or the target row is null, do not accept the drop
        //     if (!value || !targetRow) {
        //         return false;
        //     }

            
        //     rightBoxList.remove(value);
        //     rightBoxList.insert(value, targetIndex);
        //     targetRow.set_state_flags(Gtk.StateFlags.NORMAL, true);
            
        //     let iconOrder = [];
        //     for (const row of rightBoxList) {
        //         iconOrder.push(row.title);
        //     }
            
        //     this._settings.set_strv("icon-order", iconOrder);
        //     // If everything is successful, return true to accept the drop
        //     return true;
        // }));
    }

    _onTargetDropped(_drop, value, _x, y, listbox) {
        console.log(listbox);
        const targetRow = listbox.get_row_at_y(y);
        const targetIndex = targetRow.get_index();
        
        // If value or the target row is null, do not accept the drop
        if (!value || !targetRow) {
            return false;
        }

        
        // listbox.remove(value);
        listbox.insert(value, targetIndex);
        targetRow.set_state_flags(Gtk.StateFlags.NORMAL, true);
        
        // let iconOrder = [];
        // for (const row of listbox) {
        //     iconOrder.push(row.title);
        // }
        
        // this._settings.set_strv("icon-order", iconOrder);

        // If everything is successful, return true to accept the drop
        return true;
    }


    _destroy() {
        // Disconnect all signal handlers
        this._signalHandlers.forEach(handler => handler.disconnect());
        super._destroy();
    }
}