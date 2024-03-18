import EventEmitter from "events";
import { Reileta } from "../Reileta";
import { ErrorCodes, GenerateId, MatchTags, SafeLocalhostAdress } from "../utils/Constants";
import { MatchInstanceTagNames, ResponseInstanceInfos, SocketType } from "../utils/Interfaces";
import { ErrorMessage } from "../utils/Security";
import { InstanceCreate, InstanceManager } from "./InstanceManager";
import { getPreferedAddress } from "../server/ServerManager";
import User from "../users/User";
import { get } from "http";
import Player from "../players/Players";

export class Instance extends EventEmitter {

    public id: string = GenerateId.Instance();
    public name: string = GenerateId.InstanceName();
    private _description?: string;
    private _owner_ids: string = "";
    private _title?: string;
    private _tags: string[] = [];
    public created_at: Date = new Date();
    public updated_at: Date = new Date();
    private _capacity?: number;
    private _world_ids: string = "";
    public internal: boolean = true;
    private _server?: string;

    // GETTERS

    /**
     * Get the title of the instance
     */
    get title() {
        return this._title || getDefaultInstanceTitle();
    }

    /**
     * Get the description of the instance
     */
    get description() {
        return this._description || getDefaultInstanceDescription();
    }

    /**
     * Get the tags of the instance
     */
    get tags(): MatchInstanceTagNames[] {
        return MatchTags.Instance.optimise(this._tags || getDefaultInstanceTags());
    }

    /**
     * Get the server address (IP or domain name)
     */
    get server() {
        return (this.internal ? getPreferedAddress() : this._server) || getPreferedAddress();
    }

    /**
     * Get the sockets connected to the instance
     */
    get sockets() {
        return this.app.io.sockets.adapter.rooms.get('instance:' + this.id);
    }

    /**
     * Capacity of the instance
     */
    get capacity() {
        return this._capacity || getDefaultInstanceCapacity();
    }

    get players() {
        return Array.from(this.app.cache.cache.values())
            .filter(p => p.value instanceof Player)
            .map(p => p.value as Player)
            .filter(p => p.instanceId === this.id);
    }

    /**
     * Get the world IDS of the instance
     */
    get worldIds() {
        return this._world_ids;
    }

    /**
     * Get the owner IDS of the instance
     */
    get ownerIds() {
        return this._owner_ids;
    }


    constructor(private readonly app: Reileta, private readonly manager: InstanceManager) {
        super();
    }

    canEnter(user: User) {
        if (this.players.length >= this.capacity)
            return new ErrorMessage(ErrorCodes.InstanceIsFull);
        return true;
    }

    // METHODS

    /**
     * Convert the instance to a string
     * @param absolute Force the display of the server address
     */
    toString(absolute = false) {
        return `${this.id}@${absolute || !this.internal ? this.server : SafeLocalhostAdress}`;
    }

    /**
     * Get the world of the instance
     */
    async getWorld(who: User | "bypass") {
        if (!this._world_ids) return new ErrorMessage(ErrorCodes.WorldNotFound);
        const wid = this.app.worlds.parseString(this._world_ids);
        const world = await this.app.worlds.get(wid, who);
        if (world instanceof ErrorMessage) return world;
        const assets = wid.version && world.assets.find(a => !a.isEmpty && a.version === wid.version) || undefined;
        this._world_ids = `${world.id}${assets ? ":" + assets.id : ""}@${world.server}`;
        return world;
    }

    /**
     * Get the owner of the instance
     */
    async getOwner(who: User | "bypass"): Promise<User | ErrorMessage> {
        if (!this._owner_ids)
            return new ErrorMessage(ErrorCodes.UserNotFound);
        const oid = this.app.users.parseString(this._owner_ids);
        const owner = await this.app.users.get(oid, who);
        if (owner instanceof ErrorMessage) return owner;
        this._owner_ids = owner.toString();
        return owner;
    }


    /**
     * When a socket is connected
     * @param socket 
     */
    socketJoin(socket: SocketType) {
        this.emit('connect', socket);
        socket.join('instance:' + this.id);
        socket.on(this.id, (obj: any) => this._onSocket(socket, obj));
        socket.on('disconnecting', () => this._onDisconnect(socket));
    }

    /**
     * When a socket is disconnected
     * @param socket 
     */
    _onDisconnect(socket: SocketType) {
        this.emit('disconnect', socket);
        socket.leave('instance:' + this.id);
    }

    /**
     * When a socket sends a message
     * @param socket 
     * @param obj 
     */
    _onSocket(socket: SocketType, obj: any) {
        console.log(obj);
    }

    /**
     * Import the instance for database
     * @param instance
     */
    async import(instance_id: string): Promise<Instance | ErrorMessage> {
        const instance = await this.app.prisma.instance.findFirst({
            where: { OR: [{ id: instance_id }, { name: instance_id }] }
        });
        if (!instance || !instance.owner_ids)
            return new ErrorMessage(ErrorCodes.InstanceNotFound);
        this.id = instance.id;
        this.name = instance.name;
        this._description = instance.description || undefined;
        this._owner_ids = instance.owner_ids;
        this._title = instance.title || undefined;
        this._tags = instance.tags?.split(",") || [];
        this.created_at = instance.created_at;
        this._capacity = instance.capacity;
        this.updated_at = instance.updated_at;
        this._world_ids = instance.world_ids;
        this._server = undefined;
        this.internal = true;
        return this;
    }

    /**
     * Fetch the instance from the database
     * @param id Instance id
     * @param server Server address
     */
    async fetch(id: string, server: string): Promise<Instance | ErrorMessage> {
        const response = await this.app.server.fetch<ResponseInstanceInfos>(server, '/api/instances/' + id);
        if (response instanceof ErrorMessage)
            return response;
        const data = response.data;
        if (!data || !data.owner_ids)
            return new ErrorMessage(ErrorCodes.InstanceNotFound);
        this.id = data.id;
        this.name = data.name;
        this._description = data.description;
        this._owner_ids = data.owner_ids;
        this._title = data.title;
        this._tags = data.tags || [];
        this._capacity = data.capacity;
        this.created_at = new Date(0);
        this.updated_at = new Date(0);
        this._world_ids = data.world_ids;
        this._server = data.server;
        this.internal = false;
        return this;
    }

    /**
     * Update the instance from the database
     */
    update() {
        return this.import(this.id);
    }


    /**
     * Save the instance to the database
     */
    async save(): Promise<Instance | ErrorMessage> {
        try {
            if (!this.internal)
                return new ErrorMessage(ErrorCodes.ObjectNotInternal);
            await this.getOwner("bypass");
            const instance = await this.app.prisma.instance.upsert({
                where: { id: this.id },
                update: {
                    name: this.name,
                    description: this.description,
                    owner_ids: this._owner_ids,
                    title: this.title,
                    tags: this.tags.join(",")
                },
                create: {
                    id: this.id,
                    name: this.name,
                    description: this.description,
                    owner_ids: this._owner_ids,
                    title: this.title,
                    tags: this.tags.join(","),
                    created_at: this.created_at,
                    updated_at: this.updated_at,
                    capacity: this.capacity,
                    world_ids: this._world_ids,
                }
            });
            if (!instance)
                return new ErrorMessage(ErrorCodes.InternalError);
            return this;
        } catch (e) {
            console.warn(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }

    async create(input: InstanceCreate): Promise<Instance | ErrorMessage> {
        this.id = input.id || GenerateId.Instance();
        if (await this.manager.has(this.id))
            return new ErrorMessage(ErrorCodes.InstanceAlreadyExists);
        this.name = input.name || GenerateId.InstanceName();
        this._description = input.description;
        this._title = input.title;
        this._tags = input.tags || getDefaultInstanceTags();
        this._capacity = input.capacity || getDefaultInstanceCapacity();
        this._owner_ids = input.owner_ids;
        this._world_ids = input.world_ids;
        this.internal = true;
        this._server = undefined;
        if (!await this.save())
            return new ErrorMessage(ErrorCodes.InternalError);
        return this;
    }
}

export function getDefaultInstanceTitle() {
    return process.env.REILETA_DEFAULT_INSTANCE_TITLE || "Reileta Instance";
}

export function getDefaultInstanceDescription() {
    return process.env.REILETA_DEFAULT_INSTANCE_DESCRIPTION || "A instance created with Reileta";
}

export function getDefaultInstanceTags() {
    return (process.env.REILETA_DEFAULT_INSTANCE_TAGS || "").split(",");
}

export function getDefaultInstanceCapacity() {
    return parseInt(process.env.REILETA_DEFAULT_INSTANCE_CAPACITY || "32") || 32;
}