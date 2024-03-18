import EventEmitter from "events";
import { ErrorCodes, GenerateId, getFilePath } from "../utils/Constants";
import { EngineType, PlatformType } from "../utils/Interfaces";
import { WorldManager } from "./WorldManager";
import { Reileta } from "../Reileta";
import World from "./World";
import { ErrorMessage, hashFile } from "../utils/Security";
import User from "../users/User";
import { renameSync, statSync } from "fs";
import { join } from "path";
import { randomBytes } from "crypto";

export default class WorldAsset extends EventEmitter {
    public id: string = GenerateId.File();
    public created_at: Date = new Date();
    public updated_at: Date = new Date();
    public version: string = "0.0.1";
    public engine: EngineType = "other";
    public platform: PlatformType = "other";
    public _url?: string;
    public hash?: string;
    public size?: number;
    public internal: boolean = true;

    get url() {
        if (this._url)
            try {
                const url = new URL(this._url);
                if (url.protocol === "file:")
                    return new URL(`/api/worlds/${this.world.id}/assets/${this.id}/file`, this.app.server.getInfos().gateways.http);
                return url;
            } catch { }
        return undefined;
    }

    get isEmpty(): boolean {
        return this.size === 0 || !this.hash || !this.url;
    }

    constructor(private readonly app: Reileta, private readonly manager: WorldManager, private readonly world: World, infos?: WorldAssetInfos) {
        super();

        if (infos) {
            this.id = infos.id || this.id;
            this.version = infos.version;
            this.engine = infos.engine;
            this.platform = infos.platform;
            this.created_at = infos.created_at || new Date(0);
            this.updated_at = infos.updated_at || new Date(0);
            this.hash = infos.hash;
            this.size = infos.size;
            this.internal = world.internal;
            this._url = infos.url;
        }
    }

    async save() {
        if (!this.internal)
            return new ErrorMessage(ErrorCodes.ObjectNotInternal);
        const sq = await this.app.prisma.worldAsset.upsert({
            where: { id: this.id },
            update: {
                version: this.version,
                engine: this.engine,
                platform: this.platform,
                url: this._url,
                hash: this.hash,
                size: this.size,
                world_id: this.world.id
            },
            create: {
                id: this.id,
                world_id: this.world.id,
                version: this.version,
                engine: this.engine,
                platform: this.platform,
                url: this._url,
                hash: this.hash,
                size: this.size
            }
        });
        if (sq) {
            this.id = sq.id;
            this.created_at = sq.created_at;
            this.updated_at = sq.updated_at;
        } else return false;
        return true;
    }

    async setFile(file: Express.Multer.File, who?: User | "bypass") {
        if (!this.internal)
            return new ErrorMessage(ErrorCodes.ObjectNotInternal);
        if (!who || who !== "bypass" && !this.world.canModify(who))
            return new ErrorMessage(ErrorCodes.UserDontHavePermission);
        const id = randomBytes(16).toString("hex");
        const path = join(getFilePath(), id);
        renameSync(file.path, path);
        this._url = `file://` + id;
        this.hash = hashFile(path);
        this.size = statSync(path).size;
        return this.save();
    }
}

export interface WorldAssetInfos {
    id?: string;
    version: string;
    engine: EngineType;
    platform: PlatformType;
    empty?: boolean;
    url?: string;
    created_at?: Date;
    updated_at?: Date;
    hash?: string;
    size?: number;
}

export interface WorldAssetCreate {
    id?: string;
    version: string;
    engine: EngineType;
    platform: PlatformType;
}