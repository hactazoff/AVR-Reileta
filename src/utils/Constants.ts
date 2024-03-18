import { randomBytes } from "crypto";
import * as Interfaces from "./Interfaces";
import path from "path";
import { cwd } from "process";
import { MatchTagValue } from "./Interfaces";

const { randomUUID } = require("crypto");

export const CookieValue = "_suid";
export const SafeLocalhostAdress = "::";
export const MatchPassword = /^.{8,}$/;
export const MatchDisplay = /^.{3,16}$/;
export const MatchName = /^[A-Za-z][A-Za-z0-9_]{3,16}$/
export const MatchInstanceName = /^[a-z0-9-_.]{3,8}$/
export const MatchID = {
    World: /^w_[a-f0-9-]{36}$/,
    User: /^u_[a-f0-9-]{36}$/,
    Avatar: /^a_[a-f0-9-]{36}$/,
    File: /^f_[a-f0-9-]{36}$/,
    Instance: /^i_[a-f0-9-]{36}$/,
    Session: /^s_[a-f0-9-]{36}$/,
}

function optimiser<T>(tags: T[], collector: [T, MatchTagValue<T>][], required_groups: number[], user_admin: boolean = false): T[] {
    const map = new Map<T, MatchTagValue<T>>(collector);
    let changed = false;
    let groups = new Set<number>();
    tags = tags.filter(e => map.has(e));

    for (const t of tags.map(e => map.get(e) as MatchTagValue<T>))
        if (t.group)
            groups.add(t.group);

    for (const [tag] of collector) {
        const info = map.get(tag) as MatchTagValue<T>;
        if (info.group && !groups.has(info.group) && required_groups.includes(info.group))
            tags.push(tag);
    }

    do {
        changed = false;
        for (const t of tags) {
            const info = map.get(t) as MatchTagValue<T>;
            if (info.for_admin && !user_admin) {
                tags = tags.filter(e => e !== t);
                changed = true;
            }
            if (info.overhide)
                for (const overhide of info.overhide)
                    if (tags.includes(overhide)) {
                        tags = tags.filter(e => e !== overhide);
                        changed = true;
                    }
        }
    } while (changed);

    return tags;
}

export const MatchTags: Interfaces.MatchTags = {
    World: {
        optimise(tags: Interfaces.MatchUserTagNames[], who?: Interfaces.UserInfo) {
            return optimiser(tags, Object.entries(this.tags), this.required_groups, who?.tags.includes("avr:admin"));
        },
        required_groups: [1, 2],
        tags: {
            "avr:public": {
                for_admin: false,
                display: "Public",
                description: "Anyone can join",
                overhide: [],
                group: 1
            },
            "avr:private": {
                for_admin: false,
                display: "Private",
                description: "World is private",
                overhide: ["avr:public"],
                group: 1
            },
            "avr:develepement": {
                for_admin: false,
                display: "Develepement",
                description: "World is in develepement",
                overhide: [],
                group: 2
            },
            "avr:release": {
                for_admin: false,
                display: "Release",
                description: "World is released",
                overhide: ["avr:develepement"],
                group: 2
            },
            "avr:official": {
                for_admin: true,
                display: "Official",
                description: "World is official",
                overhide: [],
                group: 0
            },
        }
    },
    Instance: {
        optimise(tags, who?: Interfaces.UserInfo) {
            return optimiser(tags, Object.entries(this.tags), this.required_groups, who?.tags.includes("avr:admin")) as Interfaces.MatchInstanceTagNames[];
        },
        required_groups: [1],
        tags: {
            "avr:public": {
                for_admin: false,
                display: "Public",
                description: "Anyone can join",
                overhide: [],
                group: 1
            },
            "avr:permanent": {
                for_admin: true,
                display: "Permanent",
                description: "Instance will not be deleted when empty",
                overhide: ["avr:kill_on_owner_leave"],
                group: 0
            },
            "avr:official": {
                for_admin: true,
                description: "Instance will be displayed in the official server list",
                display: "Official",
                overhide: [],
                group: 0
            },
            "avr:friends_plus": {
                for_admin: false,
                display: "Friends and friends of friends",
                description: "Friends of members can join",
                overhide: ["avr:public"],
                group: 1
            },
            "avr:friends_only": {
                for_admin: false,
                display: "Friends only",
                description: "Only friends of owner and master can join",
                overhide: ["avr:public", "avr:friends_plus"],
                group: 1
            },
            "avr:invite_plus": {
                for_admin: false,
                display: "Invite Plus",
                description: "Only invited users by members can join",
                overhide: ["avr:public", "avr:friends_plus", "avr:friends_only"],
                group: 1
            },
            "avr:invite_only": {
                for_admin: false,
                display: "Invite only",
                description: "Only invited users by owner and master can join",
                overhide: ["avr:public", "avr:friends_plus", "avr:friends_only", "avr:invite_plus"],
                group: 1
            },
            "avr:private": {
                for_admin: false,
                display: "Private",
                description: "Only owner can join",
                overhide: ["avr:public", "avr:friends_plus", "avr:friends_only", "avr:invite_plus", "avr:invite_only"],
                group: 1
            }
        }
    },
    User: {
        optimise(tags, who?: Interfaces.UserInfo) {
            return optimiser(tags, Object.entries(this.tags), this.required_groups, who?.tags.includes("avr:admin"));
        },
        required_groups: [],
        tags: {
            "avr:admin": {
                for_admin: true,
                display: "Administator",
                description: "User is admin",
                overhide: [],
                group: 0
            },
            "avr:bot": {
                for_admin: true,
                display: "Bot",
                description: "User is bot",
                overhide: [],
                group: 0
            },
            "avr:world_creator": {
                for_admin: false,
                display: "World Creator",
                description: "User can create worlds",
                overhide: [],
                group: 0
            },
            "avr:instance_creator": {
                for_admin: false,
                display: "Instance Creator",
                description: "User can create instances",
                overhide: [],
                group: 0
            },
            "avr:disabled": {
                for_admin: true,
                display: "Disabled",
                description: "User is disabled",
                overhide: [],
                group: 0
            },
            "avr:root": {
                for_admin: true,
                display: "Root",
                description: "User is root",
                overhide: [],
                group: 0
            }
        }
    }
}


export const GenerateId = {
    Server: () => `s_${randomUUID()}`,
    World: () => `w_${randomUUID()}`,
    User: () => `u_${randomUUID()}`,
    Avatar: () => `a_${randomUUID()}`,
    File: () => `f_${randomUUID()}`,
    Instance: () => `i_${randomUUID()}`,
    InstanceName: () => `${randomBytes(3).toString('hex')}`,
    UserName: () => `${randomBytes(5).toString('hex')}`,
    Session: () => `s_${randomUUID()}`,
    Player: () => `p_${randomUUID()}`,
}

export const TrustedDomainRegex = [
    /^raw\.githubusercontent\.com$/,
    /^([a-z0-9]+)\.hactazia\.fr$/,
]

export function getTmpFileExpiration() {
    return Number(process.env.REILETA_TMP_FILE_EXPIRATION) || 3e5;
}

export function getCanEditUser() {
    return process.env.REILETA_CAN_EDIT_USER === 'true';
}

export function getCanLogin() {
    return process.env.REILETA_CAN_LOGIN === 'true';
}

export function getCanRegister() {
    return process.env.REILETA_CAN_REGISTER === 'true';
}

export function getSoftHideWorlds() {
    return process.env.REILETA_SOFT_HIDE_WORLDS === 'true';
}

export function getCanEditWorld() {
    return process.env.REILETA_CAN_EDIT_WORLD === 'true';
}
export function getDefaultUserTags() {
    return process.env.REILETA_DEFAULT_USER_TAGS?.split(',').map(e => e.trim()) || [];
}

export function getCanUploadAvatar() {
    return process.env.REILETA_CAN_UPLOAD_AVATAR === 'true';
}

export function getCanUploadWorld() {
    return process.env.REILETA_CAN_UPLOAD_WORLD === 'true';
}

export function getCanUploadFile() {
    return process.env.REILETA_CAN_UPLOAD_FILE === 'true';
}

export function getSupportedWorldAssetPlatforms() {
    return process.env.REILETA_SUPPORTED_WORLD_ASSET_PLATFORMS?.split(',').map(e => e.trim()) || [];
}

export function getSupportedWorldAssetEngine() {
    return process.env.REILETA_SUPPORTED_WORLD_ASSET_ENGINE?.split(',').map(e => e.trim()) || [];
}

export function getFilePath() {
    var p = process.env.REILETA_FILE_PATH || "files";
    if (path.isAbsolute(p))
        return p;
    return path.join(cwd(), p);
}

export function getIntegrityExpiration() {
    return parseInt(process.env.REILETA_INTEGRITY_EXPIRATION || "") || 3e5;
}

export const ErrorCodes = {
    ServiceDisabled: {
        message: "Service disabled",
        code: 1,
        status: 503
    },
    RequestNotFound: {
        message: "Request not found",
        code: 2,
        status: 404
    },
    UserNotLogged: {
        message: "User not logged",
        code: 3,
        status: 403
    },
    UserDontHavePermission: {
        message: "User don't have permission",
        code: 4,
        status: 403
    },
    ServerNotFound: {
        message: "Server not found",
        code: 5,
        status: 403
    },
    NoResponseFromServer: {
        message: "No response from server",
        code: 6,
        status: 503
    },
    NoDataFromServer: {
        message: "No data from server",
        code: 7,
        status: 503
    },
    BadDataFromServer: {
        message: "Bad data from server",
        code: 8,
        status: 503
    },
    BadRedirectionFromServer: {
        message: "Bad redirection from server",
        code: 9,
        status: 503
    },
    RetryWithNewGateway: {
        message: "Retry with new gateway",
        code: 10,
        status: 307
    },
    BadStructureFromServer: {
        message: "Bad structure from server",
        code: 11,
        status: 503
    },
    UserCannotUpdate: {
        message: "User cannot update",
        code: 12,
        status: 403
    },
    RequestNotImplemented: {
        message: "Request not implemented",
        code: 13,
        status: 501
    },
    UserInvalidInput: {
        message: "User invalid input",
        code: 14,
        status: 400
    },
    UserAlreadyConnected: {
        message: "User already connected",
        code: 15,
        status: 403
    },
    InternalError: {
        message: "Internal error",
        code: 16,
        status: 500
    },
    UserNotFound: {
        message: "User not found",
        code: 17,
        status: 404
    },
    UserCannotFetch: {
        message: "User cannot fetch",
        code: 18,
        status: 403
    },
    UserCannotDelete: {
        message: "User cannot be deleted",
        code: 19,
        status: 403
    },
    SessionNotFound: {
        message: "Session not found",
        code: 20,
        status: 404
    },
    SessionInvalidInput: {
        message: "Session invalid input",
        code: 21,
        status: 400
    },
    AuthInvalidInput: {
        message: "Auth invalid input",
        code: 22,
        status: 400
    },
    AuthInvalidLogin: {
        message: "Auth invalid login",
        code: 23,
        status: 401
    },
    WorldInvalidInput: {
        message: "World invalid input",
        code: 24,
        status: 400
    },
    WorldNotFound: {
        message: "World not found",
        code: 25,
        status: 404
    },
    WorldAssetInvalidInput: {
        message: "World asset invalid input",
        code: 26,
        status: 400
    },
    WorldAssetNotFound: {
        message: "World asset not found",
        code: 27,
        status: 404
    },
    NotImplemented: {
        message: "Not implemented",
        code: 28,
        status: 501
    },
    ServerInvalidInput: {
        message: "Server invalid input",
        code: 29,
        status: 400
    },
    WorldAlreadyExist: {
        message: "World already exist",
        code: 30,
        status: 409
    },
    WorldAssetPreventUploadError: {
        message: "World asset prevent upload error",
        code: 31,
        status: 409
    },
    WorldAssetInvalidFile: {
        message: "World asset invalid file",
        code: 32,
        status: 400
    },
    InstanceInvalidInput: {
        message: "Instance invalid input",
        code: 33,
        status: 400
    },
    IntegrityInvalidInput: {
        message: "Integrity invalid input",
        code: 34,
        status: 400
    },
    IntegrityNotFound: {
        message: "Integrity not found",
        code: 35,
        status: 404
    },
    InstanceNotFound: {
        message: "Instance not found",
        code: 36,
        status: 404
    },
    AlreadyFollowing: {
        message: "Already following",
        code: 37,
        status: 409
    },
    TagNotFound: {
        message: "Tag not found",
        code: 38,
        status: 403
    },
    NotInInstance: {
        message: "Not in instance",
        code: 39,
        status: 403
    },
    InvalidModerationType: {
        message: "Invalid moderation type",
        code: 40,
        status: 400
    },
    ObjectNotInternal: {
        message: "Object not internal",
        code: 41,
        status: 403
    },
    Teapot: {
        message: "I'm a teapot",
        code: 42,
        status: 418
    },
    UserDontHaveHome: {
        message: "User don't have home",
        code: 43,
        status: 403
    },
    WorldAlreadyExists: {
        message: "World already exists",
        code: 44,
        status: 409
    },
    AssetAlreadyExists: {
        message: "Asset already exists",
        code: 45,
        status: 409
    },
    FileNotUploaded: {
        message: "File not uploaded",
        code: 46,
        status: 409
    },
    InstanceAlreadyExists: {
        message: "Instance already exists",
        code: 47,
        status: 409
    },
    InstanceIsFull: {
        message: "Instance is full",
        code: 48,
        status: 409
    },
    UserNotAllowed: {
        message: "User not allowed",
        code: 49,
        status: 403
    },
    PlayerNotFound: {
        message: "Player not found",
        code: 50,
        status: 404
    },
};