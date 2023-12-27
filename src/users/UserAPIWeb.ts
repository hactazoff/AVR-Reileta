import { NextFunction } from "express";
import { Reileta } from "../Reileta";
import { ARequest, AResponse, ResponseUserInfo, ResponseUserMeInfo } from "../utils/Interfaces";
import { UserManager } from "./UserManager";
import { ErrorCodes } from "../utils/Constants";
import Express from "express";
import { ErrorMessage, checkUserInput } from "../utils/Security";

export class UserAPIWeb {
    constructor(private readonly app: Reileta, private readonly manager: UserManager) {
        // TODO: Users API
        this.app.express.get('/api/users', (q, s: any) => this.app.server.api_web.notImplemented(q, s));

        // TODO: User Me API
        this.app.express.get('/api/users/@me', (q, s: any) => this.getMe(q, s));
        this.app.express.post('/api/users/@me', Express.json(), (q, s: any) => this.postMe(q, s));

        // TODO: External User API
        this.app.express.get('/api/users/:id@:server', (q, s: any) => this.getExternalUser(q, s));
        this.app.express.post('/api/users/:id@:server', Express.json(), (q, s: any) => this.app.server.api_web.notImplemented(q, s));

        // TODO: User API
        this.app.express.get('/api/users/:id', (q, s: any) => this.getInternalUser(q, s));
        this.app.express.post('/api/users/:id', Express.json(), (q, s: any) => this.postInternalUser(q, s));
    }

    /**
     * Get a user from a server
     * @param request
     * @param response
     * @returns
     */
    async getExternalUser(request: ARequest, response: AResponse) {
        const user = await this.manager.getExternalUser(request.params.id, request.params.server, request.data?.user);
        if(user instanceof ErrorMessage)
            return response.send(user);
        console.log(user);
        const res: ResponseUserInfo = {
            id: user.id,
            username: user.username,
            display: user.display,
            thumbnail: user.thumbnail?.href,
            banner: user.banner?.href,
            tags: user.tags,
            external: user.external,
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
        const user = await this.manager.getInternalUser(request.params.id);
        if(user instanceof ErrorMessage)
            return response.send(user);
        const res: ResponseUserInfo = {
            id: user.id,
            username: user.username,
            display: user.display,
            thumbnail: user.thumbnail?.href,
            banner: user.banner?.href,
            tags: user.tags,
            external: user.external,
            server: user.server,
        }
        response.send({ data: res });
    }

    /**
     * Update a user
     * @param request
     * @param response
     * @returns
     */
    async postInternalUser(request: ARequest, response: AResponse) {
        const user = await this.manager.updateInternalUser(request.body, request.data?.user);
        if(user instanceof ErrorMessage)
            return response.send(user);
        const res: ResponseUserInfo = {
            id: user.id,
            username: user.username,
            display: user.display,
            thumbnail: user.thumbnail?.href,
            banner: user.banner?.href,
            tags: user.tags,
            external: user.external,
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
        console.log(request.data);
        if(!request.data?.user) 
        return response.send(new ErrorMessage(ErrorCodes.UserNotLogged));
        const user = await this.manager.getInternalUser(request.data?.user?.id);
        if(user instanceof ErrorMessage)
            return response.send(user);
        const res: ResponseUserMeInfo = {
            id: user.id,
            username: user.username,
            display: user.display,
            thumbnail: user.thumbnail?.href,
            banner: user.banner?.href,
            friends: [],
            status: "offline",
            tags: user.tags,
            external: user.external,
            server: user.server,
        }
        response.send({ data: res });
    }

    /**
     * Update the current user
     * @param request
     * @param response
     * @returns
     */
    async postMe(request: ARequest, response: AResponse) {
        const user = await this.manager.updateInternalUser(request.body, request.data?.user);
        if(user instanceof ErrorMessage)
            return response.send(user);
        const res: ResponseUserMeInfo = {
            id: user.id,
            username: user.username,
            display: user.display,
            thumbnail: user.thumbnail?.href,
            banner: user.banner?.href,
            friends: [],
            status: "offline",
            tags: user.tags,
            external: false,
            server: user.server,
        }
        response.send({ data: res });
    }

    /**
     * Middleware to get the user from the session
     * @param request
     * @param response
     * @param next
     * @returns
     */
    async use(request: ARequest, _: AResponse, next: NextFunction) {
        if (request.data && request.data.session) {
            const out = await this.manager.getInternalUser(request.data.session.user_id);
            request.data.user = out instanceof ErrorMessage ? undefined : out;
        }
        next();
    }
}