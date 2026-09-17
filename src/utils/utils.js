import GLib from 'gi://GLib';

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
    if (!keyWords) return roleName;

    const display = keyWords ? keyWords.join('_') : roleName;
    return display;
}
