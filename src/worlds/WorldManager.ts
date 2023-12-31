import { Reileta } from "../Reileta";
import { WorldAPIWeb } from "./WorldAPIWeb";
import { Tag, World, WorldAsset } from "@prisma/client";
import { ErrorCodes, GenerateId, getCanEditWorld, getFallbackWorld, getFilePath, getMyAdress, getSoftHideWorlds, getSupportedWorldAssetEngine, getSupportedWorldAssetPlatforms } from "../utils/Constants";
import { ErrorMessage, checkUserTags, checkValidityWorldAsset, checkWorldAssetInput, checkWorldInput, checkWorldResponse, checkWorldSearchInput, hashFile, isURL } from "../utils/Security";
import { UserInfo, WorldAssetInfos, WorldAssetInput, WorldInfos, WorldSearchInput } from "../utils/Interfaces";
import path, { join } from "path";
import { renameSync, rmSync, statSync } from "fs";


export interface WorldInput {
    id: string;
    title?: string;
    description?: string;
    capacity?: number;
    tags?: string[];
}

export class WorldManager {
    api_web: WorldAPIWeb;

    constructor(private readonly app: Reileta) {
        this.api_web = new WorldAPIWeb(app, this);
        console.log(`Soft hide: ${getSoftHideWorlds() ? "enable" : "disable"}`);
    }

    async createInternalWorld(input?: WorldInput, who?: UserInfo): Promise<WorldInfos | ErrorMessage> {
        try {
            if (!who)
                return new ErrorMessage(ErrorCodes.UserNotLogged);
            if (!checkWorldInput(input, true))
                return new ErrorMessage(ErrorCodes.WorldInvalidInput);
            if (!checkUserTags(who, ['avr:admin']) && !getCanEditWorld())
                return new ErrorMessage(ErrorCodes.UserDontHavePermission);
            let id = input.id || GenerateId.World();
            const world = await this.app.prisma.world.findFirst({ where: { id: input.id } });
            if (world)
                return new ErrorMessage(ErrorCodes.WorldAlreadyExist);
            await this.app.prisma.world.create({
                data: {
                    id,
                    title: input.title || "New world",
                    description: input.description,
                    capacity: input.capacity || 10,
                    owner_id: who.id,
                    tags: { connect: input.tags?.map(t => ({ name: t })) }
                }
            });

            return await this.getInternalWorld(id, who);
        } catch (e) {
            console.error(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }

    async getInternalWorldAssetFile(id?: string, asset?: string, user?: UserInfo): Promise<{ path: string, is_url: boolean } | ErrorMessage> {
        try {
            if (!checkWorldSearchInput({ id }))
                return new ErrorMessage(ErrorCodes.WorldInvalidInput);
            const asset_obj = await this.getInternalWorldAsset(id, asset, user);
            if (asset_obj instanceof ErrorMessage) return asset_obj;
            console.log(asset_obj);
            if (asset_obj.is_external_url)
                return {
                    path: asset_obj.url?.href || "",
                    is_url: true
                };
            return {
                path: path.join(getFilePath(), asset_obj.hash || asset_obj.id || ""),
                is_url: false
            };
        } catch (e) {
            console.error(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }


    async uploadInternalWorldAssetFile(id?: string, asset?: string, file?: Express.Multer.File, who?: UserInfo): Promise<ErrorMessage | WorldAssetInfos> {
        try {
            if (!who)
                return new ErrorMessage(ErrorCodes.UserNotLogged);
            if (!checkWorldSearchInput({ id }) || !id || !checkWorldAssetInput({ id: asset }, true) || !asset || !file)
                return new ErrorMessage(ErrorCodes.WorldAssetInvalidInput);
            const world = await this.getInternalWorld(id, who);
            if (world instanceof ErrorMessage) return world;
            const asset_obj = await this.getInternalWorldAsset(id, asset, who);
            if (asset_obj instanceof ErrorMessage) return asset_obj;
            if (!asset_obj.engine || !asset_obj.platform
                || !getSupportedWorldAssetEngine().includes(asset_obj.engine)
                || !getSupportedWorldAssetPlatforms().includes(asset_obj.platform)
            ) return new ErrorMessage(ErrorCodes.WorldAssetPreventUploadError);
            if (!checkUserTags(who, ['avr:admin']) && !getCanEditWorld() && who?.id !== world.owner_id)
                return new ErrorMessage(ErrorCodes.UserDontHavePermission);
            var out = await checkValidityWorldAsset(file, asset_obj.engine, asset_obj.platform);
            if (!out || out.content_type !== "world" || out.platform !== asset_obj.platform || out.engine !== asset_obj.engine)
                return new ErrorMessage(ErrorCodes.WorldAssetInvalidFile);
            const hash = hashFile(file.path);
            const size = statSync(file.path).size;
            renameSync(file.path, join(getFilePath(), hash));
            await this.app.prisma.worldAsset.update({
                where: { id: asset },
                data: { url: null, hash, size }
            });
            return await this.getInternalWorldAsset(id, asset, who);
        } catch (e) {
            console.error(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }

    async getInternalWorld(id?: string, who?: UserInfo): Promise<WorldInfos | ErrorMessage> {
        try {
            if (!checkWorldSearchInput({ id }))
                return new ErrorMessage(ErrorCodes.WorldInvalidInput);

            const world = await this.app.prisma.world.findFirst({
                where: { id },
                include: { tags: true, assets: true }
            });
            if (!world)
                return new ErrorMessage(ErrorCodes.WorldNotFound);

            return {
                id: world.id,
                title: world.title,
                description: world.description || undefined,
                capacity: world.capacity,
                tags: world.tags.map(t => t.name),
                owner_id: world.owner_id,
                server: getMyAdress(),
                created_at: world.created_at,
                updated_at: world.updated_at,
                assets: world.assets.map<WorldAssetInfos>(a => ({
                    id: a.id,
                    version: a.version,
                    platform: a.platform || "unknown",
                    url: new URL(isURL(a.url || "")
                        ? a.url || ""
                        : `/api/worlds/${a.world_id}/assets/${a.id}/file`,
                        this.app.server.getInfo.gateways.http),
                    is_external_url: isURL(a.url || ""),
                    engine: a.engine || "unknown",
                    hash: a.hash || "unknown",
                    empty: !a.platform || !a.engine || !a.hash || !a.size || undefined,
                    size: a.size || 0,
                    created_at: a.created_at,
                    updated_at: a.updated_at
                })),
                external: false,
                fallback: false
            }
        } catch (e) {
            console.error(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }

    async getExternalWorld(search?: string, address?: string, who?: UserInfo): Promise<WorldInfos | ErrorMessage> {
        return new ErrorMessage(ErrorCodes.NotImplemented);
    }

    async getExternalWorldAsset(id?: string, asset_id?: string, address?: string, who?: UserInfo): Promise<WorldAssetInfos | ErrorMessage> {
        return new ErrorMessage(ErrorCodes.NotImplemented);
    }

    async uploadInternalWorld(id?: string, input?: WorldInput, who?: UserInfo): Promise<WorldInfos | ErrorMessage> {
        try {
            if (!who)
                return new ErrorMessage(ErrorCodes.UserNotLogged);
            if (!checkWorldInput(input, true))
                return new ErrorMessage(ErrorCodes.WorldInvalidInput);
            let world = await this.getInternalWorld(id, who);
            if (world instanceof ErrorMessage) return world;
            if (!checkUserTags(who, ['avr:admin']) && !getCanEditWorld() && who?.id !== world.owner_id)
                return new ErrorMessage(ErrorCodes.UserDontHavePermission);
            await this.app.prisma.world.update({
                where: { id },
                data: {
                    title: input.title,
                    description: input.description,
                    capacity: input.capacity,
                    tags: { set: input.tags?.map(t => ({ name: t })) }
                }
            });
            return await this.getInternalWorld(id, who);
        } catch (e) {
            console.error(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }

    async deleteInternalWorld(id?: string, who?: UserInfo): Promise<ErrorMessage | null> {
        try {
            if (!who)
                return new ErrorMessage(ErrorCodes.UserNotLogged);
            if (!checkWorldSearchInput({ id }))
                return new ErrorMessage(ErrorCodes.WorldInvalidInput);
            let world = await this.getInternalWorld(id, who);
            if (world instanceof ErrorMessage) return world;
            if (!checkUserTags(who, ['avr:admin']) && !getCanEditWorld() && who?.id !== world.owner_id)
                return new ErrorMessage(ErrorCodes.UserDontHavePermission);
            await this.app.prisma.world.delete({ where: { id } });
        } catch (e) {
            console.error(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
        return null;
    }

    async createInternalWorldAsset(id?: string, input?: WorldAssetInput, who?: UserInfo): Promise<WorldAssetInfos | ErrorMessage> {
        try {
            if (!who)
                return new ErrorMessage(ErrorCodes.UserNotLogged);
            if (!checkWorldSearchInput({ id }) || !id)
                return new ErrorMessage(ErrorCodes.WorldInvalidInput);
            if (!checkWorldAssetInput(input, true) || !input.version || !input.platform || !input.engine)
                return new ErrorMessage(ErrorCodes.WorldAssetInvalidInput);
            let world = await this.getInternalWorld(id, who);
            if (world instanceof ErrorMessage) return world;
            if (!checkUserTags(who, ['avr:admin']) && !getCanEditWorld() && who?.id !== world.owner_id)
                return new ErrorMessage(ErrorCodes.UserDontHavePermission);
            let asset = await this.app.prisma.worldAsset.create({
                data: {
                    id: input.id || GenerateId.File(),
                    world_id: id,
                    version: input.version,
                    engine: input.engine,
                    platform: input.platform,
                }
            });
            return await this.getInternalWorldAsset(id, asset.id, who);
        } catch (e) {
            console.error(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }

    async getInternalWorldAsset(id?: string, asset_id?: string, who?: UserInfo): Promise<WorldAssetInfos | ErrorMessage> {
        try {
            if (!checkWorldSearchInput({ id }) || !id)
                return new ErrorMessage(ErrorCodes.WorldInvalidInput);
            const world = await this.getInternalWorld(id, who);
            if (world instanceof ErrorMessage) return world;
            const asset = await this.app.prisma.worldAsset.findFirst({
                where: { id: asset_id, world_id: id },
            });
            if (!asset)
                return new ErrorMessage(ErrorCodes.WorldAssetNotFound);
            return {
                id: asset.id,
                version: asset.version,
                platform: asset.platform || "unknown",
                url: new URL(
                    isURL(asset.url || "")
                        ? asset.url || ""
                        : `/api/worlds/${asset.world_id}/assets/${asset.id}/file`,
                    this.app.server.getInfo.gateways.http
                ),
                is_external_url: isURL(asset.url || ""),
                engine: asset.engine || "unknown",
                hash: asset.hash || "unknown",
                empty: !asset.platform || !asset.engine || !asset.url || !asset.hash || !asset.size || undefined,
                size: asset.size || 0,
                created_at: asset.created_at,
                updated_at: asset.updated_at
            }
        } catch (e) {
            console.error(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }

    async uploadInternalWorldAsset(id?: string, asset_id?: string, input?: WorldAssetInput, who?: UserInfo): Promise<WorldAssetInfos | ErrorMessage> {
        try {
            if (!who)
                return new ErrorMessage(ErrorCodes.UserNotLogged);
            if (!checkWorldSearchInput({ id }) || !id)
                return new ErrorMessage(ErrorCodes.WorldInvalidInput);
            if (!checkWorldAssetInput(input, true) || !input.version || !input.platform || !input.engine)
                return new ErrorMessage(ErrorCodes.WorldAssetInvalidInput);
            const asset = await this.getInternalWorldAsset(id, asset_id, who);
            if (asset instanceof ErrorMessage) return asset;
            const world = await this.getInternalWorld(id, who);
            if (world instanceof ErrorMessage) return world;
            if (!checkUserTags(who, ['avr:admin']) && !getCanEditWorld() && who?.id !== world.owner_id)
                return new ErrorMessage(ErrorCodes.UserDontHavePermission);
            await this.app.prisma.worldAsset.update({
                where: { id: asset_id },
                data: {
                    version: input.version,
                    engine: input.engine,
                    platform: input.platform,
                }
            });
            return await this.getInternalWorldAsset(id, asset_id, who);
        } catch (e) {
            console.error(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }

    async deleteInternalWorldAsset(id?: string, asset_id?: string, who?: UserInfo): Promise<ErrorMessage | null> {
        try {
            if (!who)
                return new ErrorMessage(ErrorCodes.UserNotLogged);
            if (!checkWorldSearchInput({ id }) || !id)
                return new ErrorMessage(ErrorCodes.WorldInvalidInput);
            const asset = await this.getInternalWorldAsset(id, asset_id, who);
            if (asset instanceof ErrorMessage) return asset;
            const world = await this.getInternalWorld(id, who);
            if (world instanceof ErrorMessage) return world;
            if (!checkUserTags(who, ['avr:admin']) && !getCanEditWorld() && who?.id !== world.owner_id)
                return new ErrorMessage(ErrorCodes.UserDontHavePermission);
            await this.app.prisma.worldAsset.deleteMany({ where: { id: asset_id, world_id: id } });
        } catch (e) {
            console.error(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
        return null;
    }

    strIdToObject(sid?: string) {
        // w_id[:version][@server]
        var obj: { id: string, version?: string, server?: string } = {
            id: "undefined",
            version: undefined,
            server: undefined
        }
        var [fist, server] = sid?.split("@") || [];
        if (!fist) return null;
        obj.server = server;
        var [id, version] = fist.split(":");
        if (!id) return null;
        obj.id = id;
        obj.version = version;
        return obj;
    }

    async getFallbackWorld(): Promise<WorldInfos | ErrorMessage> {
        const root = await this.app.users.getInternalUser("root");
        if (root instanceof ErrorMessage)
            return new ErrorMessage(ErrorCodes.InternalError);
        return await this.getInternalWorld(getFallbackWorld(), root);
    }
}