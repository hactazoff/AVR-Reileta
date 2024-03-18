import EventEmitter from "events";
import { GenerateId } from "../utils/Constants";
import { Instance } from "../instance/Instance";
import { SocketType } from "../utils/Interfaces";
import User from "../users/User";
import { Reileta } from "../Reileta";
import World from "../worlds/World";
import { isOwnServerAddress } from "../server/ServerManager";

export default class Player extends EventEmitter {
    public id: string = GenerateId.Player();
    private _instance_id: string;
    private _socket_id: string;
    private _user_ids: string;
    public joined_at: Date = new Date();
    private _display: string;
    private _role: PlayerRoleTypes = "normal";
    public is_bot: boolean = false;

    public transforms: PlayerTransforms = {
        '/body': {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0, w: 0 },
            scale: { x: 1, y: 1, z: 1 },
            velocity: { x: 0, y: 0, z: 0 },
            angular_velocity: { x: 0, y: 0, z: 0 },
            at: 0
        },
        '/body/head': {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0, w: 0 },
            scale: { x: 1, y: 1, z: 1 },
            velocity: { x: 0, y: 0, z: 0 },
            angular_velocity: { x: 0, y: 0, z: 0 },
            at: 0
        },
        '/body/left_hand': {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0, w: 0 },
            scale: { x: 1, y: 1, z: 1 },
            velocity: { x: 0, y: 0, z: 0 },
            angular_velocity: { x: 0, y: 0, z: 0 },
            at: 0
        },
        '/body/right_hand': {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0, w: 0 },
            scale: { x: 1, y: 1, z: 1 },
            velocity: { x: 0, y: 0, z: 0 },
            angular_velocity: { x: 0, y: 0, z: 0 },
            at: 0
        }
    };

    // GETTERS

    /**
     * Get the role of the player
     */
    get role() {
        return this._role;
    }

    /**
     * Get the display of the player
     */
    get display() {
        return this._display || "Unknown";
    }

    set role(role: PlayerRoleTypes) {
        this.emit("role", role);
        this._role = role;
    }

    /**
     * Get the instance of the player
     */
    get instance() {
        return this.app.instances.get({ id: this._instance_id }, "bypass");
    }

    /**
     * Get instance id of the player
     */
    get instanceId() {
        return this._instance_id;
    }

    /**
     * Get the socket of the player
     */
    get socket() {
        return this.app.io.sockets.sockets.get(this._socket_id);
    }

    /**
     * Get the user of the player
     */
    async getUser(who: User | "bypass") {
        const ids = this.app.users.parseString(this._user_ids);
        return await this.app.users.get(ids, who);
    }

    constructor(private app: Reileta, instance: Instance, socket: SocketType, user: User) {
        super();
        this._instance_id = instance.id;
        this._socket_id = socket.id;
        this._user_ids = user.toString();
        this._display = user.display;

        this._role = "normal";
        if (user.isAdministrator)
            this._role = "admin";
        if (user.tags.includes("avr:bot"))
            this.is_bot = true;
    }


}

export type PlayerRoleTypes = 'admin' | 'master' | 'moderator' | 'normal';
export const PlayerRoles: { [key in PlayerRoleTypes]: { receive_logs: boolean; can_moderate: PlayerRoleTypes[] } } = {
    'admin': {
        receive_logs: true,
        can_moderate: ['admin', 'moderator', 'normal'],
    },
    'master': {
        receive_logs: true,
        can_moderate: ['moderator', 'normal'],
    },
    'moderator': {
        receive_logs: true,
        can_moderate: ['normal'],
    },
    'normal': {
        receive_logs: false,
        can_moderate: [],
    }
}

export interface Transform {
    position: {
        x: number;
        y: number;
        z: number;
    }
    rotation: {
        x: number;
        y: number;
        z: number;
        w: number;
    }
    scale: {
        x: number;
        y: number;
        z: number;
    },
    velocity: {
        x: number;
        y: number;
        z: number;
    },
    angular_velocity: {
        x: number;
        y: number;
        z: number;
    },
    at: number;
}

export interface PlayerTransforms {
    '/body': Transform;
    '/body/head': Transform;
    '/body/left_hand': Transform;
    '/body/right_hand': Transform;
    [key: string]: Transform;
}