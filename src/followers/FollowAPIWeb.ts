import { Request } from "express-serve-static-core";
import { ParsedQs } from "qs";
import { Reileta } from "../Reileta";
import { ARequest, AResponse } from "../utils/Interfaces";
import { ErrorMessage } from "../utils/Security";
import { FollowManager } from "./FollowManager";

export class FollowAPIWeb {
    constructor(private readonly app: Reileta, private readonly manager: FollowManager) {
        // TODO: External Follow API
        app.express.get('/api/users/:id@:server/follows', (q, s: any) => this.app.server.api_web.notImplemented(q, s));
        app.express.get('/api/users/:id@:server/followers', (q, s: any) => this.app.server.api_web.notImplemented(q, s));

        // TODO: Internal Follow API
        app.express.get('/api/users/@me/followers', (q, s: any) => this.getMyFollowers(q, s));
        app.express.get('/api/users/:id/followers', (q, s: any) => this.app.server.api_web.notImplemented(q, s));

        app.express.put('/api/users/@me/follows/:toid', (q, s: any) => this.makeFollowByMe(q, s));
        app.express.put('/api/users/:id/follows/:toid', (q, s: any) => this.app.server.api_web.notImplemented(q, s));

        app.express.delete('/api/users/@me/follows/:toid', (q, s: any) => this.app.server.api_web.notImplemented(q, s));
        app.express.delete('/api/users/:id/follows/:toid', (q, s: any) => this.app.server.api_web.notImplemented(q, s));

        app.express.get('/api/users/@me/follows', (q, s: any) => this.getMyFollows(q, s));
        app.express.get('/api/users/:id/follows', (q, s: any) => this.app.server.api_web.notImplemented(q, s));
    }

    async getMyFollowers(request: ARequest, response: AResponse) {
        const followers = await this.manager.getFollowers(request.data?.session?.user?.id, request.data?.session?.user);
        if (followers instanceof ErrorMessage)
            return response.send(followers);
        response.send({ data: followers });
    }

    async getMyFollows(request: ARequest, response: AResponse) {
        const follows = await this.manager.getFollowings(request.data?.session?.user?.id, request.data?.session?.user);
        if (follows instanceof ErrorMessage)
            return response.send(follows);
        response.send({ data: follows });
    }

    async makeFollowByMe(request: ARequest, response: AResponse) {
        const follow = await this.manager.createFollowing(
            request.data?.session?.user.id,
            request.params.toid,
            request.data?.session?.user
        );
        if (follow instanceof ErrorMessage)
            return response.send({ error: follow });
        response.send({ data: follow });
    }
}