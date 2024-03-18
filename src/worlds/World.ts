import EventEmitter from "events";
import { ErrorCodes, GenerateId, MatchTags } from "../utils/Constants";
import { EngineType, MatchWorldTagNames, PlatformType, ResponseWorldInfo } from "../utils/Interfaces";
import WorldAsset, { WorldAssetCreate, WorldAssetInfos } from "./WorldAsset";
import { getPreferedAddress, isOwnServerAddress } from "../server/ServerManager";
import { Reileta } from "../Reileta";
import { WorldCreate, WorldCreateInput, WorldManager } from "./WorldManager";
import { ErrorMessage } from "../utils/Security";
import { get } from "http";
import User from "../users/User";

export default class World extends EventEmitter {
    public id: string = GenerateId.World();
    private _title?: string;
    private _description?: string;
    public created_at: Date = new Date();
    public updated_at: Date = new Date();
    private _thumbnail?: string;
    private _tags: MatchWorldTagNames[] = [];
    public internal: boolean = true;
    public assets: WorldAsset[] = [];
    private _server?: string;
    private _owner_ids: string = "";
    private _capacity?: number;

    // GETTERS

    /**
     * Get the tags of the world
     */
    get tags() {
        return MatchTags.World.optimise(this._tags || getDefaultWorldTags());
    }

    /**
     * Get the thumbnail of the world
     */
    get thumbnail() {
        try {
            return new URL(this._thumbnail || "");
        } catch {
            return undefined;
        }
    }

    /**
     * Get the title of the world
     */
    get title() {
        return this._title || getDefaultWorldTitle();
    }

    /**
     * Get the description of the world
     */
    get description() {
        return this._description || getDefaultWorldDescription();
    }

    /**
     * Get the server address (IP or domain name)
     */
    get server() {
        return this.internal || !this._server || isOwnServerAddress(this._server) ? getPreferedAddress() : this._server
    }

    get ownerIds() {
        return this._owner_ids;
    }

    get isFallback() {
        return this.internal && this.id === getFallbackWorldId();
    }

    /**
     * Get the capacity of the world
     */
    get capacity() {
        return this._capacity || getDefaultWorldCapacity();
    }

    constructor(private readonly app: Reileta, private readonly manager: WorldManager) {
        super();
    }

    toString(absolute = false, version?: string) {
        return `${this.id}${version ? `:${version}` : ""}${absolute || !this.internal ? "@" + this.server : ""}`;
    }

    async getOwner(who: User | "bypass") {
        if (!this._owner_ids)
            return new ErrorMessage(ErrorCodes.UserNotFound);
        const owner = await this.app.users.get(this.app.users.parseString(this._owner_ids), who);
        if (owner instanceof ErrorMessage)
            return owner;
        this._owner_ids = owner.toString();
        return owner;
    }


    /**
     * Import the world for database
     * @param world
     */
    async import(world_id: string): Promise<World | ErrorMessage> {
        const world = await this.app.prisma.world.findUnique({
            where: { id: world_id },
            include: { assets: true }
        });
        if (!world || !world.owner_ids)
            return new ErrorMessage(ErrorCodes.WorldNotFound);
        this.id = world.id;
        this._title = world.title || undefined;
        this._description = world.description || undefined;
        this._owner_ids = world.owner_ids;
        this._title = world.title || undefined;
        this._tags = world.tags?.split(",") || [];
        this.created_at = world.created_at;
        this._capacity = world.capacity;
        this.updated_at = world.updated_at;
        this._server = undefined;
        this.internal = true;
        this.assets = world.assets.map(asset => new WorldAsset(this.app, this.manager, this, {
            id: asset.id,
            version: asset.version,
            engine: asset.engine as EngineType,
            platform: asset.platform as PlatformType,
            url: asset.url || undefined,
            hash: asset.hash || undefined,
            size: asset.size || undefined
        }));
        return this;
    }

    /**
     * Fetch the world from the database
     * @param id World id
     * @param server Server address
     */
    async fetch(id: string, server: string): Promise<World | ErrorMessage> {
        const response = await this.app.server.fetch<ResponseWorldInfo>(server, '/api/worlds/' + id);
        if (response instanceof ErrorMessage)
            return response;
        const data = response.data;
        if (!data || !data.owner_ids)
            return new ErrorMessage(ErrorCodes.WorldNotFound);
        this.id = data.id;
        this._title = data.title;
        this._description = data.description;
        this._owner_ids = data.owner_ids;
        this._title = data.title;
        this._tags = data.tags || [];
        this._capacity = data.capacity;
        this.created_at = new Date(0);
        this.updated_at = new Date(0);
        this._server = data.server;
        this.internal = false;
        this.assets = response.data?.assets.map(asset => new WorldAsset(this.app, this.manager, this, {
            id: asset.id,
            version: asset.version,
            engine: asset.engine as EngineType,
            platform: asset.platform as PlatformType,
            url: asset.url,
            hash: asset.hash,
            size: asset.size
        })) || [];
        return this;
    }

    async createAsset(infos: WorldAssetCreate) {
        const asset = new WorldAsset(this.app, this.manager, this, {
            id: infos.id || GenerateId.File(),
            version: infos.version,
            engine: infos.engine,
            platform: infos.platform
        });
        if (this.assets.find(a => a.id === asset.id))
            return new ErrorMessage(ErrorCodes.AssetAlreadyExists);
        this.assets.push(asset);
        return asset;
    }

    async create(input: WorldCreate): Promise<World | ErrorMessage> {
        this.id = input.id || GenerateId.World();
        if (await this.manager.has(this.id))
            return new ErrorMessage(ErrorCodes.WorldAlreadyExists);
        this._title = input.title;
        this._description = input.description;
        this._tags = input.tags || getDefaultWorldTags();
        this._capacity = input.capacity || getDefaultWorldCapacity();
        this._owner_ids = input.owner_ids;
        this.internal = true;
        this._server = undefined;
        if (!await this.save())
            return new ErrorMessage(ErrorCodes.InternalError);
        return this;
    }

    async save() {
        if (!this.internal)
            return new ErrorMessage(ErrorCodes.ObjectNotInternal);
        try {
            const sq = await this.app.prisma.world.upsert({
                where: { id: this.id },
                update: {
                    title: this._title,
                    description: this._description,
                    tags: this._tags.join(","),
                    capacity: this._capacity,
                    owner_ids: this._owner_ids
                },
                create: {
                    id: this.id,
                    title: this._title || getDefaultWorldTitle(),
                    description: this._description || getDefaultWorldDescription(),
                    tags: this._tags.join(","),
                    capacity: this._capacity || getDefaultWorldCapacity(),
                    owner_ids: this._owner_ids
                }
            });
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    /**
     * Check if the user can modify the world
     * @param user User
     * @returns True if the user can modify the world
     */
    canModify(user: User) {
        return user.toString() === this._owner_ids || user.isAdministrator;
    }
}

export function getDefaultWorldTitle() {
    return process.env.REILETA_WORLD_DEFAULT_TITLE || "World";
}

export function getDefaultWorldDescription() {
    return process.env.REILETA_WORLD_DEFAULT_DESCRIPTION || "A world";
}

export function getDefaultWorldTags() {
    return process.env.REILETA_WORLD_DEFAULT_TAGS?.split(",") || [];
}

export function getDefaultWorldCapacity() {
    return parseInt(process.env.REILETA_WORLD_DEFAULT_CAPACITY || "32");
}

export function getFallbackWorldId() {
    return process.env.REILETA_WORLD_FALLBACK || "fallback";
}