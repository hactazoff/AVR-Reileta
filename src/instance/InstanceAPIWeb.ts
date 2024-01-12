import { Request } from "express-serve-static-core";
import { ParsedQs } from "qs";
import { Reileta } from "../Reileta";
import { InstanceManager } from "./InstanceManager";
import { ARequest, AResponse, ResponseInstanceInfos } from "../utils/Interfaces";
import { ErrorMessage } from "../utils/Security";
import Express from "express";

export class InstanceAPIWeb {
    constructor(private readonly app: Reileta, private readonly manager: InstanceManager) {
        // TODO: External Instance API
        this.app.express.delete('/api/instances/:id@:server', (q, s: any) => this.app.server.api_web.notImplemented(q, s));
        this.app.express.post('/api/instances/:id@:server', (q, s: any) => this.app.server.api_web.notImplemented(q, s));
        this.app.express.get('/api/instances/:id@:server', (q, s: any) => this.app.server.api_web.notImplemented(q, s));
        this.app.express.post('/api/instances/:id@:server', (q, s: any) => this.app.server.api_web.notImplemented(q, s));
        this.app.express.get('/api/instances@:server', (q, s: any) => this.app.server.api_web.notImplemented(q, s));

        // TODO: Instance API
        this.app.express.delete('/api/instances/:id', (q, s: any) => this.app.server.api_web.notImplemented(q, s));
        this.app.express.post('/api/instances/:id', (q, s: any) => this.app.server.api_web.notImplemented(q, s));
        this.app.express.get('/api/instances/:id', (q, s: any) => this.getInstance(q, s));
        this.app.express.put('/api/instances', Express.json(), (q, s: any) => this.createInstance(q, s));
        this.app.express.get('/api/instances', (q, s: any) => this.app.server.api_web.notImplemented(q, s));
    }

    async createInstance(req: ARequest, res: AResponse) {
        var instance = await this.manager.createInstance(req.body, req.data?.user);
        if (instance instanceof ErrorMessage)
            return res.send({ error: instance });
        var data: ResponseInstanceInfos = {
            id: instance.id,
            name: instance.name,
            capacity: instance.capacity,
            world: this.app.worlds.objectToStrId(instance.world) as string,
            owner: this.app.users.objectToStrId(instance.owner) as string,
            master: null,
            server: instance.server,
            tags: instance.tags,
            connected: instance.sockets.length,
            users: []
        }
        res.send({ data });
    }

    async getInstance(req: ARequest, res: AResponse) {
        var instance = await this.manager.getInstance(req.params.id, req.data?.user);
        if (instance instanceof ErrorMessage)
            return res.send({ error: instance });
        var data: ResponseInstanceInfos = {
            id: instance.id,
            name: instance.name,
            capacity: instance.capacity,
            world: this.app.worlds.objectToStrId(instance.world) as string,
            owner: this.app.users.objectToStrId(instance.owner) as string,
            master: instance.master ? this.app.users.objectToStrId(instance.master) : null,
            server: instance.server,
            tags: instance.tags,
            users: instance.users.map(u => this.app.users.objectToStrId(u) as string),
            connected: instance.sockets.length
        }
        res.send({ data });
    }
}