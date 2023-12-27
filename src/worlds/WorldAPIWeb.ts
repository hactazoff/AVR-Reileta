import { Reileta } from "../Reileta";
import { WorldManager } from "./WorldManager";
import { ErrorMessage } from "../utils/Security";
import { ARequest, AResponse, ResponseWorldAssetInfo, ResponseWorldInfo } from "../utils/Interfaces";
import Express from "express";
import { ErrorCodes } from "../utils/Constants";

export class WorldAPIWeb {
    constructor(private readonly app: Reileta, private readonly manager: WorldManager) {
        // TODO: Worlds API
        this.app.express.get('/api/worlds', (q, s: any) => this.app.server.api_web.notImplemented(q, s));
        this.app.express.put('/api/worlds', Express.json(), (q, s: any) => this.makeWorld(q, s));

        // TODO: External World Assets API
        this.app.express.get('/api/worlds/:id@:server/assets', (q, s: any) => this.app.server.api_web.notImplemented(q, s));
        this.app.express.post('/api/worlds/:id@:server/assets', Express.json(), (q, s: any) => this.app.server.api_web.notImplemented(q, s));
        this.app.express.get('/api/worlds/:id@:server/assets/:asset', (q, s: any) => this.getExternalWorldAsset(q, s));
        this.app.express.post('/api/worlds/:id@:server/assets/:asset', Express.json(), (q, s: any) => this.app.server.api_web.notImplemented(q, s));
        this.app.express.delete('/api/worlds/:id@:server/assets/:asset', (q, s: any) => this.app.server.api_web.notImplemented(q, s));

        // TODO: World Assets API
        this.app.express.get('/api/worlds/:id/assets', (q, s: any) => this.app.server.api_web.notImplemented(q, s));
        this.app.express.put('/api/worlds/:id/assets', Express.json(), (q, s: any) => this.makeWorldAsset(q, s));
        this.app.express.get('/api/worlds/:id/assets/:asset', (q, s: any) => this.getWorldAsset(q, s));
        this.app.express.post('/api/worlds/:id/assets/:asset', Express.json(), (q, s: any) => this.uploadWorldAsset(q, s));
        this.app.express.delete('/api/worlds/:id/assets/:asset', (q, s: any) => this.deleteWorldAsset(q, s));

        // TODO: External World API
        this.app.express.get('/api/worlds/:id@:server', (q, s: any) => this.getExternalWorld(q, s));
        this.app.express.post('/api/worlds/:id@:server', Express.json(), (q, s: any) => this.app.server.api_web.notImplemented(q, s));
        this.app.express.delete('/api/worlds/:id@:server', (q, s: any) => this.app.server.api_web.notImplemented(q, s));

        // TODO: World API
        this.app.express.get('/api/worlds/:id', (q, s: any) => this.getWorld(q, s));
        this.app.express.post('/api/worlds/:id', Express.json(), (q, s: any) => this.uploadWorld(q, s));
        this.app.express.delete('/api/worlds/:id', (q, s: any) => this.deleteWorld(q, s));
    }

    async makeWorld(request: ARequest, response: AResponse) {
        const world = await this.manager.createInternalWorld(request.body, request.data?.user);
        if (world instanceof ErrorMessage)
            return response.send(world);
        const res: ResponseWorldInfo = {
            id: world.id,
            title: world.title,
            description: world.description,
            thumbnail: world.thumbnail?.href,
            tags: world.tags,
            server: world.server,
            capacity: world.capacity,
            owner_id: world.owner_id,
            external: world.external,
            fallback: world.fallback,
            assets: world.assets.map(e => ({
                id: e.id,
                version: e.version,
                empty: typeof request.query.empty !== 'undefined' ? true : e.empty,
                url: typeof request.query.empty !== 'undefined' ? "unknown" : (e.url?.href || "unknown"),
                hash: typeof request.query.empty !== 'undefined' ? "unknown" : e.hash,
                engine: typeof request.query.empty !== 'undefined' ? "unknown" : e.engine,
                size: typeof request.query.empty !== 'undefined' ? 0 : e.size,
                platform: typeof request.query.empty !== 'undefined' ? "unknown" : e.platform,
            }))
        }
        response.send({ data: res });
    }

    async getWorld(request: ARequest, response: AResponse) {
        const world = await this.manager.getInternalWorld(request.params.id, request.data?.user);
        if (world instanceof ErrorMessage)
            return response.send(world);
        const res: ResponseWorldInfo = {
            id: world.id,
            title: world.title,
            description: world.description,
            thumbnail: world.thumbnail?.href,
            tags: world.tags,
            server: world.server,
            capacity: world.capacity,
            owner_id: world.owner_id,
            external: world.external,
            fallback: world.fallback,
            assets: world.assets.filter(e => !e.empty || (typeof request.query.empty !== 'undefined' && e.empty)).map(e => ({
                id: e.id,
                version: e.version,
                empty: e.empty || undefined,
                url: e.url?.href || "unknown",
                hash: e.hash || "unknown",
                engine: e.engine || "unknown",
                size: e.size || 0,
                platform: e.platform || "unknown",
            }))
        }
        response.send({ data: res });
    }

    async uploadWorld(request: ARequest, response: AResponse) {
        const world = await this.manager.uploadInternalWorld(request.params.id, request.body, request.data?.user);
        if (world instanceof ErrorMessage)
            return response.send(world);
        const res: ResponseWorldInfo = {
            id: world.id,
            title: world.title,
            description: world.description,
            thumbnail: world.thumbnail?.href,
            tags: world.tags,
            server: world.server,
            capacity: world.capacity,
            owner_id: world.owner_id,
            external: world.external,
            fallback: world.fallback,
            assets: world.assets.map(e => ({
                id: e.id,
                version: e.version,
                empty: typeof request.query.empty !== 'undefined' ? true : e.empty,
                url: typeof request.query.empty !== 'undefined' ? "unknown" : (e.url?.href || "unknown"),
                hash: typeof request.query.empty !== 'undefined' ? "unknown" : e.hash,
                engine: typeof request.query.empty !== 'undefined' ? "unknown" : e.engine,
                size: typeof request.query.empty !== 'undefined' ? 0 : e.size,
                platform: typeof request.query.empty !== 'undefined' ? "unknown" : e.platform,
            }))
        }
        response.send({ data: res });
    }

    async deleteWorld(request: ARequest, response: AResponse) {
        const world = await this.manager.deleteInternalWorld(request.params.id, request.data?.user);
        response.send(world instanceof ErrorMessage ? world : { data: "DELETED" });
    }

    async makeWorldAsset(request: ARequest, response: AResponse) {
        const asset = await this.manager.createInternalWorldAsset(request.params.id, request.body, request.data?.user);
        if (asset instanceof ErrorMessage)
            return response.send(asset);
        const res: ResponseWorldAssetInfo = {
            id: asset.id,
            version: asset.version,
            empty: typeof request.query.empty !== 'undefined' ? true : asset.empty,
            url: typeof request.query.empty !== 'undefined' ? "unknown" : (asset.url?.href || "unknown"),
            hash: typeof request.query.empty !== 'undefined' ? "unknown" : asset.hash,
            engine: typeof request.query.empty !== 'undefined' ? "unknown" : asset.engine,
            size: typeof request.query.empty !== 'undefined' ? 0 : asset.size,
            platform: typeof request.query.empty !== 'undefined' ? "unknown" : asset.platform,
        }
        response.send({ data: res });
    }

    async getWorldAsset(request: ARequest, response: AResponse) {
        const world = await this.manager.getInternalWorldAsset(request.params.id, request.params.asset, request.data?.user);
        response.send(world instanceof ErrorMessage ? world : { data: world });
    }

    async uploadWorldAsset(request: ARequest, response: AResponse) {
        const world = await this.manager.uploadInternalWorldAsset(request.params.id, request.params.asset, request.body, request.data?.user);
        response.send(world instanceof ErrorMessage ? world : { data: world });
    }

    async deleteWorldAsset(request: ARequest, response: AResponse) {
        const world = await this.manager.deleteInternalWorldAsset(request.params.id, request.params.asset, request.data?.user);
        response.send(world instanceof ErrorMessage ? world : { data: "DELETED" });
    }

    async getExternalWorld(request: ARequest, response: AResponse) {
        const world = await this.manager.getExternalWorld(request.params.id, request.params.server, request.data?.user);
        response.send(world instanceof ErrorMessage ? world : { data: world });
    }

    async getExternalWorldAsset(request: ARequest, response: AResponse) {
        const world = await this.manager.getExternalWorldAsset(request.params.id, request.params.asset, request.params.server, request.data?.user);
        response.send(world instanceof ErrorMessage ? world : { data: world });
    }

}