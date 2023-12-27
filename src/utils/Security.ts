import { randomBytes, scryptSync } from "crypto";
import { readFileSync } from "fs";
import { spawn } from "node:child_process";
import { join } from "path";
import Undici, { Dispatcher } from "undici";
import crypto from "crypto";
import { Tag, User, World } from "@prisma/client";
import { ErrorCode, LoginInput, ResponseBase, ResponseServerInfo, ResponseUserInfo, UserInfo, UserInput, WorldAssetInput, WorldInfos, WorldInput, WorldSearchInput } from "./Interfaces";
import { MatchDisplay, MatchID, MatchName, MatchPassword, getDefaultUserTags, getSupportedWorldAssetEngine, getSupportedWorldAssetPlatforms } from "./Constants";
import e from "express";

export function hash(password: string): string {
    const salt = randomBytes(8).toString("base64");
    return salt + ":" + scryptSync(password, salt, 64).toString('base64');
}

export function hashFile(path: string) {
    return crypto.createHash('sha256').update(readFileSync(path)).digest('hex');
}
export function verify(password: string, hash: string) {
    const [salt, key] = hash.split(":");
    return key === scryptSync(password, salt, 64).toString('base64')
}

export function getPublicKey() {
    if (typeof process.env.OPENSSL_PUBLIC_KEY !== "string")
        return null;
    const source = process.env.OPENSSL_PUBLIC_KEY;
    if (source.startsWith('file:'))
        try {
            return readFileSync(source.slice(5), 'utf-8');
        } catch { return null }
    else return source;
}

export function getPrivateKey() {
    if (typeof process.env.OPENSSL_PRIVATE_KEY !== "string")
        return null;
    const source = process.env.OPENSSL_PRIVATE_KEY;
    if (source.startsWith('file:'))
        try {
            return readFileSync(source.slice(5), 'utf-8');
        } catch { return null }
    else return source;
}

export function trustedURL(url: string) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch { return false }
}

export async function getContentType(path: string) {
    // invoke "python3 ./get_content_type.py <path>"
    // and return the output
    const py = spawn('python3', [join(__dirname, 'get_content_type.py'), path]);
    return new Promise<Object | null>((resolve, reject) => {
        py.stdout.on('data', (data: string) => {
            try {
                resolve(JSON.parse(data.toString().trim()))
            } catch {
                reject(null);
            }
        });
        py.stderr.on('data', (data: string) => {
            reject(null);
        });
    });
}

export function getGoodURL(protocol: string, secure: boolean, address: string) {
    const url = new URL('g://h');
    url.protocol = protocol;
    url.hostname = address;
    return address;
}

export function checkServerResponse(data: any): data is ResponseServerInfo {
    var i = typeof data === "object"
        && typeof data.id === "string"
        && typeof data.title === "string"
        && typeof data.address === "string"
        && typeof data.gateways === "object"
        && typeof data.gateways.http === "string"
        && typeof data.gateways.ws === "string"
        && typeof data.secure === "boolean"
        && typeof data.version === "string"
        && typeof data.ready_at === "number"
        && typeof data.icon === "string";
    if (!i) return false;
    try {
        new URL(data.gateways.http);
        new URL(data.gateways.ws);
        new URL(data.icon);
        new URL('h://' + data.address + '/')
    } catch { return false }
    return true;
}

export function checkUserResponse(data: any): data is ResponseUserInfo {
    var i = typeof data === "object"
        && typeof data.id === "string"
        && typeof data.username === "string"
        && typeof data.display === "string"
        && (typeof data.thumbnail === "string" || typeof data.thumbnail === "undefined")
        && (typeof data.banner === "string" || typeof data.banner === "undefined")
        && typeof data.tags === "object"
        && typeof data.server === "string";
    console.log(data, i);
    if (!i) return false;
    try {
        new URL('h://' + data.server + '/')
        if (typeof data.thumbnail === "string")
            new URL(data.thumbnail)
        if (typeof data.banner === "string")
            new URL(data.banner)
    } catch { return false }
    return true;
}

export function generateSessionToken() {
    return randomBytes(1 << 6).toString('base64');
}

export function checkBaseResponse<T>(data: any): data is ResponseBase<T> {
    return typeof data === "object"
        && typeof data.request === "string"
        && typeof data.time === "number"
        && (typeof data.error === "object" || typeof data.data != "undefined")
}

export function checkUserTags(user: UserInfo, names: string[]) {
    return [...user.tags, ...getDefaultUserTags()].some((t: string) => names.includes(t));
}

export function checkUserInput(user: any): user is UserInput {
    var i = typeof user === "object"
        && typeof user.id === "string"
        && MatchID.User.test(user.id)
        && ((typeof user.username === "string" && MatchName.test(user.username)) || typeof user.username === "undefined")
        && ((typeof user.display === "string" && MatchDisplay.test(user.display)) || typeof user.display === "undefined")
        && ((typeof user.password === "string" && MatchPassword.test(user.password)) || typeof user.password === "undefined")
        && ((Array.isArray(user.tags) && user.tags.every((t: any) => typeof t === "string")) || typeof user.tags === "undefined");
    if (!i) return false;
    return true;
}

export function checkLoginInput(user: any): user is LoginInput {
    return typeof user === "object"
        && typeof user.username === "string"
        && typeof user.password === "string"
        && MatchName.test(user.username)
        && MatchPassword.test(user.password);
}

export function checkRegisterInput(user: any): user is UserInput {
    return typeof user === "object"
        && typeof user.username === "string"
        && typeof user.password === "string"
        && ((
            typeof user.display === "string"
            && MatchDisplay.test(user.display)
        ) || typeof user.display === "undefined")
        && MatchName.test(user.username)
        && MatchPassword.test(user.password);
}

export class ErrorMessage extends Error {

    message: string;
    code: number;
    status: number;

    constructor(error: ErrorCode) {
        super(error.message);
        this.message = error.message;
        this.code = error.code;
        this.status = error.status || 400;
    }

    toJSON() {
        return {
            message: this.message,
            code: this.code,
            status: this.status
        }
    }
}

export function checkWorldInput(world: any, id_optional = false): world is WorldInput {
    var i = typeof world === "object"
        && ((typeof world.id === "string" && MatchID.World.test(world.id)) || (typeof world.id === "undefined" && id_optional))
        && ((typeof world.title === "string" && world.title.length <= 64) || typeof world.title === "undefined")
        && ((typeof world.description === "string" && world.description.length <= 256) || typeof world.description === "undefined")
        && ((typeof world.capacity === "number" && world.capacity > 0 && world.capacity <= 128) || typeof world.capacity === "undefined")
        && ((Array.isArray(world.tags) && world.tags.every((t: any) => typeof t === "string")) || typeof world.tags === "undefined");
    if (!i) return false;
    return true;
}

export function checkWorldSearchInput(search: any): search is WorldSearchInput {
    return typeof search === "object"
        && ((typeof search.id === "string" && MatchID.World.test(search.id)) || typeof search.id === "undefined")
        && ((typeof search.user_id === "string" && MatchID.User.test(search.user_id)) || typeof search.user_id === "undefined")
        && ((typeof search.take === "number" && search.take > 0 && search.take <= 100) || typeof search.take === "undefined")
        && ((typeof search.page === "number" && search.page >= 0) || typeof search.page === "undefined")
}

export function checkWorldAssetInput(asset: any, id_optional = false): asset is WorldAssetInput {
    var i = typeof asset === "object"
        && ((typeof asset.id === "string" && MatchID.File.test(asset.id)) || (typeof asset.id === "undefined" && id_optional))
        && ((typeof asset.version === "string" && asset.version.length <= 32) || typeof asset.version === "undefined")
        && ((typeof asset.engine === "string" && getSupportedWorldAssetEngine().includes(asset.engine)) || typeof asset.engine === "undefined")
        && ((typeof asset.platform === "string" && getSupportedWorldAssetPlatforms().includes(asset.platform)) || typeof asset.platform === "undefined")
    if (!i) return false;
    return true;
}

export function checkWorldResponse(world: any): world is WorldInfos {
    var i = typeof world === "object"
        && typeof world.id === "string"
        && MatchID.World.test(world.id)
        && typeof world.title === "string"
        && (typeof world.description === "string" || typeof world.description === "undefined")
        && typeof world.capacity === "number"
        && world.capacity > 0
        && world.capacity <= 128
        && typeof world.owner_id === "string"
        && MatchID.User.test(world.owner_id)
        && typeof world.server === "string"
        && typeof world.created_at === "number"
        && typeof world.updated_at === "number"
        && (typeof world.thumbnail === "string" || typeof world.thumbnail === "undefined")
        && Array.isArray(world.tags)
        && typeof world.external === "boolean"
        && typeof world.fallback === "boolean"
        && typeof world.assets === "object";
    if (!i) return false;
    return true;
}