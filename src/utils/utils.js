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
    let roleName = role;

    //* parse ayatana appindicators
    // ex: appindicator-:1.102@/org/ayatana/NotificationItem/dropbox_client_677911
    roleName = roleName.split('/');   
    roleName = roleName[roleName.length - 1];

    //* parse gnome extension uuids
    // ex: lilypad@shendrew.github.io
    roleName = roleName.split('@')[0];

    //* ignore wildcards from indicator IDs
    const regex = /((\d)*[A-Z]+(\d)*)+/gi;
    const keyWords = roleName.match(regex);

    const display = keyWords.join('_');
    return display;
}