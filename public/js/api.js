var token = "";

/**
 * Convert a string to a SHA-256 hash
 * @param {string} string 
 * @returns 
 */
async function hash(str) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((bytes) => bytes.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

window.hash = hash;

export const events = {
    events: {},
    on(event, callback) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
    },
    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter((cb) => cb !== callback);
    },
    emit(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach((cb) => cb(data));
    },
};

/**
 * Fetch the current user's profile
 * (Requires to be logged in)
 */
export async function getMe() {
    try {
        const res = await fetch('/api/users/@me', {
            headers: {
                ...(token ? { Authorization: token } : {})
            }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error.message);
        events.emit('avr:get_me', data.data);
        events.emit('avr:*', { event: 'get_me', data: data.data });
        return data.data;
    } catch (err) {
        events.emit('avr:get_me', err);
        events.emit('avr:*', { event: 'get_me', data: err });
        return new Error(err.message);
    }
}

/**
 * 
 * @param {any} obj 
 * @param {} thumbnail 
 * @returns 
 */
export async function updateMe(obj) {
    try {
        const res = await fetch('/api/users/@me', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: token } : {})
            },
            body: thumbnail ? formData : JSON.stringify(obj)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error.message);
        events.emit('avr:update_me', data.data);
        events.emit('avr:*', { event: 'update_me', data: data.data });
        return data.data;
    } catch (err) {
        events.emit('avr:update_me', err);
        events.emit('avr:*', { event: 'update_me', data: err });
        return new Error(err.message);
    }
}

/**
 * Fetch the server's info
 */
export async function getInfo() {
    try {
        const res = await fetch('/api/server');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error.message);
        events.emit('avr:get_info', data.data);
        events.emit('avr:*', { event: 'get_info', data: data.data });
        return data.data;
    } catch (err) {
        events.emit('avr:get_info', err);
        events.emit('avr:*', { event: 'get_info', data: err });
        return new Error(err.message);
    }
}

/**
 * Fetch a user's profile
 * (Requires to be logged in if you want to fetch an user from another server)
 * @param {string?} id 
 * @param {string?} server
 */
export async function getUser(id, server) {
    try {
        const res = await fetch('/api/users/' + id + (server ? '@' + server : ''), {
            headers: {
                ...(token ? { Authorization: token } : {})
            }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error.message);
        events.emit('avr:get_user', data.data);
        events.emit('avr:*', { event: 'get_user', data: data.data });
        return data.data;
    } catch (err) {
        events.emit('avr:get_user', err);
        events.emit('avr:*', { event: 'get_user', data: err });
        return new Error(err.message);
    }
}

/**
 * Login to an existing user
 * (Requires to be logged out)
 * @param {string} username 
 * @param {string} password 
 */
export async function loginAccount(username, password) {
    try {
        if (token) throw new Error('You are already logged in');
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                ...{ 'Content-Type': 'application/json' },
                ...(token ? { Authorization: token } : {})
            },
            body: JSON.stringify({
                username: username,
                password: await hash(password)
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error.message);
        token = data.data.token;
        events.emit('avr:login', data.data);
        events.emit('avr:*', { event: 'login', data: data.data });
        return data.data;
    } catch (err) {
        events.emit('avr:login', err);
        events.emit('avr:*', { event: 'login', data: err });
        return new Error(err.message);
    }
}

/**
 * Register a new user
 * (Requires to be logged out)
 * @param {string} username 
 * @param {string} password 
 * @param {string?} display_name
 */
export async function registerAccount(username, password, display_name) {
    try {
        if (token) throw new Error('You are already logged in');
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                ...{ 'Content-Type': 'application/json' },
                ...(token ? { Authorization: token } : {})
            },
            body: JSON.stringify({
                username: username,
                password: await hash(password),
                display: display_name || undefined,
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error.message);
        token = data.data.token;
        events.emit('avr:register', data.data);
        events.emit('avr:*', { event: 'register', data: data.data });
        return data.data;
    } catch (err) {
        events.emit('avr:register', err);
        events.emit('avr:*', { event: 'register', data: err });
        return new Error(err.message);
    }
}

/**
 * Logout the current user
 * (Requires to be logged in)
 */
export async function logoutAccount() {
    try {
        const res = await fetch('/api/auth/logout', {
            headers: { ...(token ? { Authorization: token } : {}) }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error.message);
        token = "";
        events.emit('avr:logout', data.data);
        events.emit('avr:*', { event: 'logout', data: data.data });
        return data.data;
    } catch (err) {
        events.emit('avr:logout', err);
        events.emit('avr:*', { event: 'logout', data: err });
        return new Error(err.message);
    }
}

/**
 * Delete the current user
 * (Requires to be logged in)
 */
export async function deleteAccount() {
    try {
        const res = await fetch('/api/auth/logout', {
            headers: {
                ...(token ? { Authorization: token } : {})
            },
            method: 'DELETE'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error.message);
        token = "";
        events.emit('avr:delete', data.data);
        events.emit('avr:*', { event: 'delete', data: data.data });
        return data.data;
    } catch (err) {
        events.emit('avr:delete', err);
        events.emit('avr:*', { event: 'delete', data: err });
        return new Error(err.message);
    }
}

/**
 * Get the current user's home
 * (Requires to be logged in)
 * @param {string?} version
 * @param {"windows" | "linux" | "mac" | undefined} platform 
 */
export async function getHome() {
    try {
        const res = await fetch('/api/users/@me/home', {
            headers: {
                ...(token ? { Authorization: token } : {})
            }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error.message);
        events.emit('avr:get_home', data.data);
        events.emit('avr:*', { event: 'get_home', data: data.data });
        return data.data;
    } catch (err) {
        events.emit('avr:get_home', err);
        events.emit('avr:*', { event: 'get_home', data: err });
        return new Error(err.message);
    }
}

/**
 * Delete the current user's home
 * (Requires to be logged in)
 */
export async function deleteHome() {
    try {
        const res = await fetch('/api/users/@me/home', {
            headers: {
                ...(token ? { Authorization: token } : {})
            }, method: 'DELETE'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error.message);
        events.emit('avr:delete_home', data.data);
        events.emit('avr:*', { event: 'delete_home', data: data.data });
        return data.data;
    } catch (err) {
        events.emit('avr:delete_home', err);
        events.emit('avr:*', { event: 'delete_home', data: err });
        return new Error(err.message);
    }
}

/**
 * Update the current user's home
 * (Requires to be logged in)
 * @param {string} id 
 * @param {string?} server 
 * @param {string?} version 
 * @param {"windows" | "linux" | "mac" | undefined} platform 
 */
export async function updateHome(id, server, version, platform) {
    try {
        const res = await fetch('/api/users/@me/home', {
            method: 'POST',
            headers: {
                ...{ 'Content-Type': 'application/json' },
                ...(token ? { Authorization: token } : {})
            },
            body: JSON.stringify({
                id: id,
                server: server,
                version: version
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error.message);
        events.emit('avr:update_home', data.data);
        events.emit('avr:*', { event: 'update_home', data: data.data });
        return data.data;
    } catch (err) {
        events.emit('avr:update_home', err);
        events.emit('avr:*', { event: 'update_home', data: err });
        return new Error(err.message);
    }
}

/**
 * Get a world
 * (Requires to be logged in if you want to fetch a world from another server)
 * @param {string} id 
 * @param {string?} version 
 * @param {"windows" | "linux" | "mac" | undefined} platform 
 * @param {string} server 
 */
export async function getWorld(id, server, showEmpty) {
    try {
        const res = await fetch('/api/worlds/' + id + (server ? '@' + server : '') + (showEmpty ? '?empty' : ''), {
            headers: {
                ...(token ? { Authorization: token } : {})
            }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error.message);
        events.emit('avr:get_world', data.data);
        events.emit('avr:*', { event: 'get_world', data: data.data });
        return data.data;
    } catch (err) {
        events.emit('avr:get_world', err);
        events.emit('avr:*', { event: 'get_world', data: err });
        return new Error(err.message);
    }
}

export async function deleteWorld(id) {
    try {
        const res = await fetch('/api/worlds/' + id, {
            method: 'DELETE',
            headers: {
                ...(token ? { Authorization: token } : {})
            }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error.message);
        events.emit('avr:delete_world', data.data);
        events.emit('avr:*', { event: 'delete_world', data: data.data });
        return data.data;
    } catch (err) {
        events.emit('avr:delete_world', err);
        events.emit('avr:*', { event: 'delete_world', data: err });
        return new Error(err.message);
    }
}

export async function createWorld(obj) {
    try {
        const res = await fetch('/api/worlds', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: token } : {})
            },
            body: JSON.stringify(obj)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error.message);
        events.emit('avr:create_world', data.data);
        events.emit('avr:*', { event: 'create_world', data: data.data });
        return data.data;
    } catch (err) {
        events.emit('avr:create_world', err);
        events.emit('avr:*', { event: 'create_world', data: err });
        return new Error(err.message);
    }

}

export async function uploadWorld(id, obj) {
    try {
        const res = await fetch('/api/worlds/' + id, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: token } : {})
            },
            body: JSON.stringify(obj)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error.message);
        events.emit('avr:upload_world', data.data);
        events.emit('avr:*', { event: 'upload_world', data: data.data });
        return data.data;
    } catch (err) {
        events.emit('avr:upload_world', err);
        events.emit('avr:*', { event: 'upload_world', data: err });
        return new Error(err.message);
    }
}

export async function createWorldAsset(id, obj) {
    try {
        const res = await fetch('/api/worlds/' + id + '/assets', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: token } : {})
            },
            body: JSON.stringify(obj)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error.message);
        events.emit('avr:create_world_asset', data.data);
        events.emit('avr:*', { event: 'create_world_asset', data: data.data });
        return data.data;
    } catch (err) {
        events.emit('avr:create_world_asset', err);
        events.emit('avr:*', { event: 'create_world_asset', data: err });
        return new Error(err.message);
    }
}