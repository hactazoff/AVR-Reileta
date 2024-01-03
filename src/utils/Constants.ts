import { randomBytes } from "crypto";
import { ErrorCode } from "./Interfaces";
import path from "path";
import { cwd } from "process";

const { randomUUID } = require("crypto");

export const CookieValue = "_suid";

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
}

export const MatchTags = {
    Instance: {
        "avr:public": {
            for_admin: false,
            display: "Public",
            description: "Anyone can join",
            overhide: []
        }, 
        "avr:permanent": {
            for_admin: true,
            display: "Permanent",
            description: "Instance will not be deleted when empty",
            overhide: ["avr:kill_on_owner_leave"]
        },
        "avr:official": {
            for_admin: true,
            description: "Instance will be displayed in the official server list",
            display: "Official",
        },
        "avr:friends_plus": {
            for_admin: false,
            display: "Friends and friends of friends",
            description: "Friends of members can join",
            overhide: ["avr:public"]
        },
        "avr:friends_only": {
            for_admin: false,
            display: "Friends only",
            description: "Only friends of owner and master can join",
            overhide: ["avr:public", "avr:friends_plus"]
        },
        "avr:invite_plus": {
            for_admin: false,
            display: "Invite Plus",
            description: "Only invited users by members can join",
            overhide: ["avr:public", "avr:friends_plus", "avr:friends_only"]
        },
        "avr:invite_only": {
            for_admin: false,
            display: "Invite only",
            description: "Only invited users by owner and master can join",
            overhide: ["avr:public", "avr:friends_plus", "avr:friends_only", "avr:invite_plus"]
        },
        "avr:private": {
            for_admin: false,
            display: "Private",
            description: "Only owner can join",
            overhide: ["avr:public", "avr:friends_plus", "avr:friends_only", "avr:invite_plus", "avr:invite_only"]
        },
    }
}


export const GenerateId = {
    Server: () => `s_${randomUUID()}`,
    World: () => `w_${randomUUID()}`,
    User: () => `u_${randomUUID()}`,
    Avatar: () => `a_${randomUUID()}`,
    File: () => `f_${randomUUID()}`,
    Instance: () => `i_${randomUUID()}`,
}

export const TrustedDomzinRegex = [
    // raw.githubusercontent.com
    /^raw\.githubusercontent\.com$/,
    // *.hactazia.fr
    /^([a-z0-9]+)\.hactazia\.fr$/,
]


export function getMyAdress(): string {
    return process.env.REILETA_PREFERED_ADDRESS || '127.0.0.1:' + getPort();
}

export function getPort(): number {
    return Number(process.env.REILETA_PORT) || 3032;
}

export function getName() {
    return process.env.REILETA_TITLE || "Default Reileta Server";
};

export function getDescription() {
    return process.env.REILETA_DESCRIPTION || "A server AtelierVR";
}

export function getIcon() {
    return new URL(process.env.REILETA_ICON || `http${isSecure() ? 's' : ''}://${getMyAdress()}/icon.png`);
}

export function isSecure() {
    return process.env.REILETA_SECURE === 'true';
}

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
    return process.env.REILETA_DEFAULT_USER_TAGS?.split(',').map(e=>e.trim()) || [];
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

export function getFallbackWorld() {
    return process.env.REILETA_WORLD_FALLBACK || "default";
}

export function getSupportedWorldAssetPlatforms() {
    return process.env.REILETA_SUPPORTED_WORLD_ASSET_PLATFORMS?.split(',').map(e=>e.trim()) || [];
}

export function getSupportedWorldAssetEngine() {
    return process.env.REILETA_SUPPORTED_WORLD_ASSET_ENGINE?.split(',').map(e=>e.trim()) || [];
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
    }
};