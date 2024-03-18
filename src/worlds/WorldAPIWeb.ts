import { Reileta } from "../Reileta";
import { WorldManager } from "./WorldManager";
import { ErrorMessage } from "../utils/Security";
import { ARequest, AResponse, ResponseWorldAssetInfo, ResponseWorldInfo } from "../utils/Interfaces";
import Express from "express";
import { ErrorCodes } from "../utils/Constants";

export class WorldAPIWeb {
    constructor(private readonly app: Reileta, private readonly manager: WorldManager) {
        // TODO: Worlds API
        // this.app.express.get('/api/worlds', (q, s: any) => this.app.server.api_web.notImplemented(q, s));
        this.app.express.put('/api/worlds', Express.json(), (q, s: any) => this.createInternalWorld(q, s));
        // this.app.express.post('/api/worlds@:server', Express.json(), (q, s: any) => this.createExternalWorld(q, s));

        // TODO: External World Assets API
        // this.app.express.get('/api/worlds/:id@:server/assets/:asset', (q, s: any) => this.getExternalWorldAsset(q, s));
        // this.app.express.post('/api/worlds/:id@:server/assets/:asset', Express.json(), (q, s: any) => this.app.server.api_web.notImplemented(q, s));
        // this.app.express.delete('/api/worlds/:id@:server/assets/:asset', (q, s: any) => this.app.server.api_web.notImplemented(q, s));
        // this.app.express.get('/api/worlds/:id@:server/assets', (q, s: any) => this.app.server.api_web.notImplemented(q, s));
        // this.app.express.post('/api/worlds/:id@:server/assets', Express.json(), (q, s: any) => this.app.server.api_web.notImplemented(q, s));

        // TODO: World Assets API
        // this.app.express.get('/api/worlds/:id/assets/:asset/file', (q, s: any) => this.getWorldAssetFile(q, s));
        this.app.express.post('/api/worlds/:id/assets/:asset/file', this.app.upload.single('file'), (q, s: any) => this.uploadWorldAssetFile(q, s));
        this.app.express.get('/api/worlds/:id/assets/:asset', (q, s: any) => this.getInternalWorldAsset(q, s));
        this.app.express.post('/api/worlds/:id/assets/:asset', Express.json(), (q, s: any) => this.updateInternalWorldAsset(q, s));
        // this.app.express.delete('/api/worlds/:id/assets/:asset', (q, s: any) => this.deleteWorldAsset(q, s));
        // this.app.express.get('/api/worlds/:id/assets', (q, s: any) => this.app.server.api_web.notImplemented(q, s));
        this.app.express.put('/api/worlds/:id/assets', Express.json(), (q, s: any) => this.createInternalWorldAsset(q, s));

        // TODO: External World API
        this.app.express.get('/api/worlds/:id@:server', (q, s: any) => this.getExternalWorld(q, s));
        // this.app.express.post('/api/worlds/:id@:server', Express.json(), (q, s: any) => this.app.server.api_web.notImplemented(q, s));
        // this.app.express.delete('/api/worlds/:id@:server', (q, s: any) => this.app.server.api_web.notImplemented(q, s));

        // TODO: World API
        this.app.express.get('/api/worlds/:id', (q, s: any) => this.getInternalWorld(q, s));
        // this.app.express.post('/api/worlds/:id', Express.json(), (q, s: any) => this.uploadWorld(q, s));
        // this.app.express.delete('/api/worlds/:id', (q, s: any) => this.deleteWorld(q, s));
    }

    async getInternalWorld(request: ARequest, response: AResponse) {
        const who = await request.data?.session?.getUser("bypass");
        if (who instanceof ErrorMessage) return response.send(who);

        const world = await this.manager.get({ id: request.params.id }, who);
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
            owner_ids: this.app.users.stringify(this.app.users.parseString(world.ownerIds), world.server),
            external: !world.internal,
            fallback: world.isFallback,
            assets: world.assets.filter(e => !e.isEmpty || (typeof request.query.empty !== 'undefined' && e.isEmpty)).map(e => ({
                id: e.id,
                version: e.version,
                empty: e.isEmpty || undefined,
                url: e.url?.href,
                hash: e.hash,
                engine: e.engine,
                size: e.size || undefined,
                platform: e.platform
            }))
        }
        response.send({ data: res });
    }

    async getExternalWorld(request: ARequest, response: AResponse) {
        const who = await request.data?.session?.getUser("bypass");
        if (who instanceof ErrorMessage) return response.send(who);

        const world = await this.manager.get({
            id: request.params.id,
            server: request.params.server
        }, who);
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
            owner_ids: this.app.users.stringify(this.app.users.parseString(world.ownerIds), world.server),
            external: !world.internal,
            fallback: world.isFallback,
            assets: world.assets.filter(e => !e.isEmpty || (typeof request.query.empty !== 'undefined' && e.isEmpty)).map(e => ({
                id: e.id,
                version: e.version,
                empty: e.isEmpty || undefined,
                url: e.url?.href,
                hash: e.hash,
                engine: e.engine,
                size: e.size || undefined,
                platform: e.platform
            }))
        }
        response.send({ data: res });
    }

    async createInternalWorld(request: ARequest, response: AResponse) {
        const who = await request.data?.session?.getUser("bypass");
        if (who instanceof ErrorMessage) return response.send(who);
        const world = await this.manager.create(request.body, who);
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
            owner_ids: this.app.users.stringify(this.app.users.parseString(world.ownerIds), world.server),
            external: !world.internal,
            fallback: world.isFallback,
            assets: world.assets.filter(e => !e.isEmpty || (typeof request.query.empty !== 'undefined' && e.isEmpty)).map(e => ({
                id: e.id,
                version: e.version,
                empty: e.isEmpty || undefined,
                url: e.url?.href,
                hash: e.hash,
                engine: e.engine,
                size: e.size || undefined,
                platform: e.platform
            }))
        }
        response.send({ data: res });
    }

    async createInternalWorldAsset(request: ARequest, response: AResponse) {
        const who = await request.data?.session?.getUser("bypass");
        if (who instanceof ErrorMessage) return response.send(who);
        const asset = await this.manager.createAsset(request.params.id, request.body, who);
        if (asset instanceof ErrorMessage)
            return response.send(asset);
        const res: ResponseWorldAssetInfo = {
            id: asset.id,
            version: asset.version,
            empty: asset.isEmpty || undefined,
            url: asset.url?.href,
            hash: asset.hash,
            engine: asset.engine,
            size: asset.size || undefined,
            platform: asset.platform
        }
        response.send({ data: res });
    }

    async getInternalWorldAsset(request: ARequest, response: AResponse) {
        const who = await request.data?.session?.getUser("bypass");
        if (who instanceof ErrorMessage) return response.send(who);
        const asset = await this.manager.getAsset({
            id: request.params.id
        }, request.params.asset, who);
        if (asset instanceof ErrorMessage)
            return response.send(asset);
        const res: ResponseWorldAssetInfo = {
            id: asset.id,
            version: asset.version,
            empty: asset.isEmpty || undefined,
            url: asset.url?.href,
            hash: asset.hash,
            engine: asset.engine,
            size: asset.size || undefined,
            platform: asset.platform
        }
        response.send({ data: res });
    }

    async updateInternalWorldAsset(request: ARequest, response: AResponse) {
        const who = await request.data?.session?.getUser("bypass");
        if (who instanceof ErrorMessage) return response.send(who);
        request.body.id = request.params.asset;
        const asset = await this.manager.updateAsset({
            id: request.params.id
        }, request.body, who);
        if(asset instanceof ErrorMessage)
            return response.send(asset);
        const res: ResponseWorldAssetInfo = {
            id: asset.id,
            version: asset.version,
            empty: asset.isEmpty || undefined,
            url: asset.url?.href,
            hash: asset.hash,
            engine: asset.engine,
            size: asset.size || undefined,
            platform: asset.platform
        }
        response.send({ data: res });
    }

    async uploadWorldAssetFile(request: ARequest, response: AResponse) {
        const who = await request.data?.session?.getUser("bypass");
        if (who instanceof ErrorMessage) return response.send(who);
        if(!request.file) return response.send(new ErrorMessage(ErrorCodes.FileNotUploaded));
        const asset = await this.manager.getAsset({ id: request.params.id }, request.params.asset, who);
        if (asset instanceof ErrorMessage) return response.send(asset);
        const uploaded = await asset.setFile(request.file, who);
        if (uploaded instanceof ErrorMessage) return response.send(uploaded);
        response.send({ data: "UPLOADED" });
    }



    // async getWorldAssetFile(request: ARequest, response: AResponse) {
    //     const world = await this.manager.getInternalWorldAssetFile(request.params.id, request.params.asset, request.data?.session?.user);
    //     if (world instanceof ErrorMessage)
    //         return response.send(world);
    //     if (world.is_url)
    //         return response.redirect(world.path);
    //     response.sendFile(world.path);
    // }

    // async uploadWorldAssetFile(request: ARequest, response: AResponse) {
    //     const world = await this.manager.uploadInternalWorldAssetFile(request.params.id, request.params.asset, request.file, request.data?.session?.user);
    //     if (world instanceof ErrorMessage)
    //         return response.send(world);
    //     response.send({ data: "UPLOADED" });
    // }

    // async makeWorld(request: ARequest, response: AResponse) {
    //     const world = await this.manager.createInternalWorld(request.body, request.data?.session?.user);
    //     if (world instanceof ErrorMessage)
    //         return response.send(world);
    //     const res: ResponseWorldInfo = {
    //         id: world.id,
    //         title: world.title,
    //         description: world.description,
    //         thumbnail: world.thumbnail?.href,
    //         tags: world.tags,
    //         server: world.server,
    //         capacity: world.capacity,
    //         owner_id: world.owner_id,
    //         external: world.external,
    //         fallback: world.fallback,
    //         assets: world.assets.map(e => ({
    //             id: e.id,
    //             version: e.version,
    //             empty: typeof request.query.empty !== 'undefined' ? true : e.empty,
    //             url: typeof request.query.empty !== 'undefined' ? "unknown" : (e.url?.href || "unknown"),
    //             hash: typeof request.query.empty !== 'undefined' ? "unknown" : e.hash,
    //             engine: typeof request.query.empty !== 'undefined' ? "unknown" : e.engine,
    //             size: typeof request.query.empty !== 'undefined' ? 0 : e.size,
    //             platform: typeof request.query.empty !== 'undefined' ? "unknown" : e.platform,
    //         }))
    //     }
    //     response.send({ data: res });
    // }

    // async uploadWorld(request: ARequest, response: AResponse) {
    //     const world = await this.manager.uploadInternalWorld(request.params.id, request.body, request.data?.session?.user);
    //     if (world instanceof ErrorMessage)
    //         return response.send(world);
    //     const res: ResponseWorldInfo = {
    //         id: world.id,
    //         title: world.title,
    //         description: world.description,
    //         thumbnail: world.thumbnail?.href,
    //         tags: world.tags,
    //         server: world.server,
    //         capacity: world.capacity,
    //         owner_id: world.owner_id,
    //         external: world.external,
    //         fallback: world.fallback,
    //         assets: world.assets.map(e => ({
    //             id: e.id,
    //             version: e.version,
    //             empty: typeof request.query.empty !== 'undefined' ? true : e.empty,
    //             url: typeof request.query.empty !== 'undefined' ? "unknown" : (e.url?.href || "unknown"),
    //             hash: typeof request.query.empty !== 'undefined' ? "unknown" : e.hash,
    //             engine: typeof request.query.empty !== 'undefined' ? "unknown" : e.engine,
    //             size: typeof request.query.empty !== 'undefined' ? 0 : e.size,
    //             platform: typeof request.query.empty !== 'undefined' ? "unknown" : e.platform,
    //         }))
    //     }
    //     response.send({ data: res });
    // }

    // async deleteWorld(request: ARequest, response: AResponse) {
    //     const world = await this.manager.deleteInternalWorld(request.params.id, request.data?.session?.user);
    //     response.send(world instanceof ErrorMessage ? world : { data: "DELETED" });
    // }

    // async makeWorldAsset(request: ARequest, response: AResponse) {
    //     const asset = await this.manager.createInternalWorldAsset(request.params.id, request.body, request.data?.session?.user);
    //     if (asset instanceof ErrorMessage)
    //         return response.send(asset);
    //     const res: ResponseWorldAssetInfo = {
    //         id: asset.id,
    //         version: asset.version,
    //         empty: typeof request.query.empty !== 'undefined' ? true : asset.empty,
    //         url: typeof request.query.empty !== 'undefined' ? "unknown" : (asset.url?.href || "unknown"),
    //         hash: typeof request.query.empty !== 'undefined' ? "unknown" : asset.hash,
    //         engine: typeof request.query.empty !== 'undefined' ? "unknown" : asset.engine,
    //         size: typeof request.query.empty !== 'undefined' ? 0 : asset.size,
    //         platform: typeof request.query.empty !== 'undefined' ? "unknown" : asset.platform,
    //     }
    //     response.send({ data: res });
    // }

    // async getInternalWorldAsset(request: ARequest, response: AResponse) {
    //     const world = await this.manager.getInternalWorldAsset(request.params.id, request.params.asset, request.data?.session?.user);
    //     if (world instanceof ErrorMessage)
    //         return response.send(world);
    //     const res: ResponseWorldAssetInfo = {
    //         id: world.id,
    //         version: world.version,
    //         empty: typeof request.query.empty !== 'undefined' ? true : world.empty,
    //         url: typeof request.query.empty !== 'undefined' ? "unknown" : (world.url?.href || "unknown"),
    //         hash: typeof request.query.empty !== 'undefined' ? "unknown" : world.hash,
    //         engine: typeof request.query.empty !== 'undefined' ? "unknown" : world.engine,
    //         size: typeof request.query.empty !== 'undefined' ? 0 : world.size,
    //         platform: typeof request.query.empty !== 'undefined' ? "unknown" : world.platform,
    //     }
    //     response.send({ data: res });
    // }

    // async uploadWorldAsset(request: ARequest, response: AResponse) {
    //     const world = await this.manager.uploadInternalWorldAsset(request.params.id, request.params.asset, request.body, request.data?.session?.user);
    //     response.send(world instanceof ErrorMessage ? world : { data: world });
    // }

    // async deleteWorldAsset(request: ARequest, response: AResponse) {
    //     const world = await this.manager.deleteInternalWorldAsset(request.params.id, request.params.asset, request.data?.session?.user);
    //     response.send(world instanceof ErrorMessage ? world : { data: "DELETED" });
    // }

    // async getExternalWorld(request: ARequest, response: AResponse) {
    //     const world = await this.manager.getExternalWorld(request.params.id, request.params.server, request.data?.session?.user);
    //     response.send(world instanceof ErrorMessage ? world : { data: world });
    // }

    // async getExternalWorldAsset(request: ARequest, response: AResponse) {
    //     const world = await this.manager.getExternalWorldAsset(request.params.id, request.params.asset, request.params.server, request.data?.session?.user);
    //     response.send(world instanceof ErrorMessage ? world : { data: world });
    // }

}