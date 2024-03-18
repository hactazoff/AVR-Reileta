import { Reileta } from "../Reileta";
import { ARequest, AResponse, ResponseUserInfo, ResponseUserMeInfo } from "../utils/Interfaces";
import { UserManager } from "./UserManager";
import { ErrorCodes } from "../utils/Constants";
import Express from "express";
import { ErrorMessage } from "../utils/Security";

export class UserAPIWeb {
    constructor(private readonly app: Reileta, private readonly manager: UserManager) {
        // this.app.express.get('/api/users', (q, s: any) => this.app.server.api_web.notImplemented(q, s));
        this.app.express.get('/api/users/@me', (q, s: any) => this.getMe(q, s));
        this.app.express.get('/api/users/@root', (q, s: any) => this.getRoot(q, s));
        // this.app.express.post('/api/users/@me', Express.json(), (q, s: any) => this.app.server.api_web.notImplemented(q, s));
        this.app.express.get('/api/users/:id@:server', (q, s: any) => this.getExternalUser(q, s));
        // this.app.express.post('/api/users/:id@:server', Express.json(), (q, s: any) => this.app.server.api_web.notImplemented(q, s));
        this.app.express.get('/api/users/:id', (q, s: any) => this.getInternalUser(q, s));
        // this.app.express.post('/api/users/:id', Express.json(), (q, s: any) => this.app.server.api_web.notImplemented(q, s));
    }

    /**
     * Get a user from a server
     * @param request
     * @param response
     * @returns
     */
    async getExternalUser(request: ARequest, response: AResponse) {
        const who = await request.data?.session?.getUser("bypass");
        if (!who) return response.send(new ErrorMessage(ErrorCodes.UserNotLogged));
        if (who instanceof ErrorMessage) return response.send(who);
        const user = await this.manager.get({
            id: request.params.id,
            server: request.params.server,
        }, who);
        if (user instanceof ErrorMessage)
            return response.send(user);
        const res: ResponseUserInfo = {
            id: user.id,
            username: user.username,
            display: user.display,
            thumbnail: user.thumbnail?.href,
            banner: user.banner?.href,
            tags: user.tags,
            external: !user.internal,
            server: user.server,
        }
        response.send({ data: res });
    }

    /**
     * Get a user
     * @param request
     * @param response
     * @returns
     */
    async getInternalUser(request: ARequest, response: AResponse) {
        const user = await this.manager.get({ id: request.params.id });
        if (user instanceof ErrorMessage)
            return response.send(user);
        const res: ResponseUserInfo = {
            id: user.id,
            username: user.username,
            display: user.display,
            thumbnail: user.thumbnail?.href,
            banner: user.banner?.href,
            tags: user.tags,
            external: !user.internal,
            server: user.server,
        }
        response.send({ data: res });
    }

    /**
     * Get the current user
     * @param request
     * @param response
     * @returns
     */
    async getMe(request: ARequest, response: AResponse) {
        const user = await request.data?.session?.getUser("bypass");
        if (!user) return response.send(new ErrorMessage(ErrorCodes.UserNotLogged));
        if (user instanceof ErrorMessage) return response.send(user);
        const home = await user.getHome(user);
        const res: ResponseUserMeInfo = {
            id: user.id,
            username: user.username,
            display: user.display,
            thumbnail: user.thumbnail?.href,
            banner: user.banner?.href,
            home: home instanceof ErrorMessage ? undefined : home?.toString(),
            friends: [],
            status: "offline",
            tags: user.tags,
            external: !user.internal,
            server: user.server,
        }
        response.send({ data: res });
    }

    /**
     * Get the root user
     * @param request
     * @param response
     * @returns
     */
    async getRoot(request: ARequest, response: AResponse) {
        const user = await this.manager.getRootUser();
        if (user instanceof ErrorMessage)
            return response.send(user);
        const res: ResponseUserInfo = {
            id: user.id,
            username: user.username,
            display: user.display,
            thumbnail: user.thumbnail?.href,
            banner: user.banner?.href,
            tags: user.tags,
            external: !user.internal,
            server: user.server,
        }
        response.send({ data: res });
    }
}