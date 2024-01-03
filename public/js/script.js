import {
    events,
    getInfo,
    getMe, updateMe,
    getUser,
    loginAccount, logoutAccount, deleteAccount, registerAccount,
    getHome, deleteHome, updateHome,
    getWorld, uploadWorld, deleteWorld, createWorld,
    createWorldAsset,
    uploadWorldAssetFile,
    createInstance,
} from "./api.js";

events.on('avr:*', (ev) => {
    const ez = document.getElementById("avr_" + ev.event);
    console.log(ez, ev.event, ev.data, ev.data.message)
    ez.querySelector(`#avr_${ev.event} .source`).innerHTML = (ev.data instanceof Error ? ev.data.message : JSON.stringify(ev.data, null, 4))
        .replaceAll('\n', '<br>').replaceAll(' ', '&nbsp;')
});

window.addEventListener('load', async function () {
    const node_get_info = document.getElementById("avr_get_info");
    node_get_info.querySelector("form").addEventListener('submit', function (e) {
        e.preventDefault();
        node_get_info.querySelector(".source").innerHTML = "Loading...";
        getInfo();
    });

    const node_get_me = document.getElementById("avr_get_me");
    console.log(node_get_me.querySelector("form"))
    node_get_me.querySelector("form").addEventListener('submit', function (e) {
        e.preventDefault();
        node_get_me.querySelector(".source").innerHTML = "Loading...";
        getMe();
    });

    const node_update_me = document.getElementById("avr_update_me");
    node_update_me.querySelector("form").addEventListener('submit', function (e) {
        e.preventDefault();
        node_update_me.querySelector(".source").innerHTML = "Loading...";
        const content = {
            display: e.target.display.value || undefined,
            username: e.target.username.value || undefined,
            password: e.target.password.value || undefined,
        }
        updateMe(content, e.target.thumbnail.files[0] || undefined);
    });

    const node_get_user = document.getElementById("avr_get_user");
    node_get_user.querySelector("form").addEventListener('submit', function (e) {
        e.preventDefault();
        node_get_user.querySelector(".source").innerHTML = "Loading...";
        const [id, server] = e.target.user.value.split('@');
        getUser(id, server);
    });

    const node_login = document.getElementById("avr_login");
    node_login.querySelector("form").addEventListener('submit', function (e) {
        e.preventDefault();
        node_login.querySelector(".source").innerHTML = "Loading...";
        const [username, password] = [e.target.username.value, e.target.password.value];
        loginAccount(username, password);
    });

    const node_logout = document.getElementById("avr_logout");
    node_logout.querySelector("form").addEventListener('submit', function (e) {
        e.preventDefault();
        node_logout.querySelector(".source").innerHTML = "Loading...";
        logoutAccount();
    });

    const node_delete = document.getElementById("avr_delete");
    node_delete.querySelector("form").addEventListener('submit', function (e) {
        e.preventDefault();
        node_delete.querySelector(".source").innerHTML = "Loading...";
        deleteAccount();
    });

    const node_register = document.getElementById("avr_register");
    node_register.querySelector("form").addEventListener('submit', function (e) {
        e.preventDefault();
        node_register.querySelector(".source").innerHTML = "Loading...";
        const [username, password, display] = [e.target.username.value, e.target.password.value, e.target.display.value];
        registerAccount(username, password, display || undefined);
    });

    const node_get_home = document.getElementById("avr_get_home");
    node_get_home.querySelector("form").addEventListener('submit', function (e) {
        e.preventDefault();
        node_get_home.querySelector(".source").innerHTML = "Loading...";
        getHome(e.target.version.value || undefined, e.target.platform.value || undefined);
    });

    const node_delete_home = document.getElementById("avr_delete_home");
    node_delete_home.querySelector("form").addEventListener('submit', function (e) {
        e.preventDefault();
        node_delete_home.querySelector(".source").innerHTML = "Loading...";
        deleteHome();
    });

    const node_update_home = document.getElementById("avr_update_home");
    node_update_home.querySelector("form").addEventListener('submit', function (e) {
        e.preventDefault();
        node_update_home.querySelector(".source").innerHTML = "Loading...";
        var [identity, server] = e.target.home.value.split('@');
        var [id, version] = identity.split(':');
        updateHome(id, server, version || undefined, e.target.platform.value || undefined);
    });

    const node_get_world = document.getElementById("avr_get_world");
    node_get_world.querySelector("form").addEventListener('submit', function (e) {
        e.preventDefault();
        node_get_world.querySelector(".source").innerHTML = "Loading...";
        var [id, server] = e.target.world.value.split('@');
        getWorld(id, server || undefined, e.target.empty.checked);
    });

    const node_create_world = document.getElementById("avr_create_world");
    node_create_world.querySelector("form").addEventListener('submit', function (e) {
        console.log("a", e)
        e.preventDefault();
        node_create_world.querySelector(".source").innerHTML = "Loading...";
        let content = {
            id: e.target.id.value || undefined,
            title: e.target.title.value || undefined,
            description: e.target.description.value || undefined,
            tags: e.target.tags.value.split(',').map((s) => s.trim()).filter((s) => s.length > 0),
            capacity: parseInt(e.target.capacity.value) || undefined,
        };
        content.tags = content.tags.length > 1 && content.tags[0] !== "NONE" ? content.tags : undefined;
        createWorld(content);
    });

    const node_upload_world = document.getElementById("avr_upload_world");
    node_upload_world.querySelector("form").addEventListener('submit', function (e) {
        e.preventDefault();
        node_upload_world.querySelector(".source").innerHTML = "Loading...";
        let content = {
            title: e.target.title.value || undefined,
            description: e.target.description.value || undefined,
            tags: e.target.tags.value.split(',').map((s) => s.trim()).filter((s) => s.length > 0),
            capacity: parseInt(e.target.capacity.value) || undefined,
        };
        content.tags = content.tags.length > 1 && content.tags[0] !== "NONE" ? content.tags : undefined;
        uploadWorld(e.target.id.value, content);
    });

    const node_delete_world = document.getElementById("avr_delete_world");
    node_delete_world.querySelector("form").addEventListener('submit', function (e) {
        e.preventDefault();
        node_delete_world.querySelector(".source").innerHTML = "Loading...";
        deleteWorld(e.target.world.value);
    });

    const node_create_world_asset = document.getElementById("avr_create_world_asset");
    node_create_world_asset.querySelector("form").addEventListener('submit', function (e) {
        e.preventDefault();
        node_create_world_asset.querySelector(".source").innerHTML = "Loading...";
        createWorldAsset(e.target.world.value, {
            id: e.target.id.value || undefined,
            platform: e.target.platform.value || undefined,
            version: e.target.version.value || undefined,
            engine: e.target.engine.value || undefined,
        });
    });

    const node_upload_world_asset_file = document.getElementById("avr_upload_world_asset_file");
    node_upload_world_asset_file.querySelector("form").addEventListener('submit', function (e) {
        e.preventDefault();
        node_upload_world_asset_file.querySelector(".source").innerHTML = "Loading...";
        uploadWorldAssetFile(e.target.world.value, e.target.id.value, e.target.file.files[0]);
    });

    const node_create_instance = document.getElementById("avr_create_instance");
    node_create_instance.querySelector("form").addEventListener('submit', function (e) {
        e.preventDefault();
        node_create_instance.querySelector(".source").innerHTML = "Loading...";
        createInstance({
            id: e.target.id.value || undefined,
            name: e.target.name.value || undefined,
            capacity: parseInt(e.target.capacity.value) || undefined,
            world: e.target.world.value || undefined,
            tags: e.target.tags.value.split(',').map((s) => s.trim()).filter((s) => s.length > 0),
        });
    });

});