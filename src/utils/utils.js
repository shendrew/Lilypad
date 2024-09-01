import GLib from 'gi://GLib';

export function readJSON(filePath) {
    let data = {};

    try {
        let [status, content] = GLib.file_get_contents(filePath);
        data = JSON.parse(content);
    } catch {
        console.log(`File not found, creating new ${filePath}.`)
    }
    return data
}


export function saveJSON(filePath, data) {
    let jsonData = JSON.stringify(data, null, '\t');
    GLib.file_set_contents(filePath, jsonData);
}

export function getRoleName(role) {
    let roleName;
    if (role.includes("appindicator")) {
        roleName = role.split('@/');
        role = roleName[roleName.length - 1];
    }
    
    roleName = role.split('/');         // for parsing ayatana appindicators
    return roleName[roleName.length - 1].split('@')[0];
}