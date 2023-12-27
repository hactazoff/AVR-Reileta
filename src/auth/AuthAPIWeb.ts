import { NextFunction } from "express";
import { Reileta } from "../Reileta";
import { ARequest, AResponse, ResponseLogin, ResponseRegister, ResponseUserMeInfo } from "../utils/Interfaces";
import { AuthManager } from "./AuthManager";
import { CookieValue } from "../utils/Constants";
import { ErrorMessage } from "../utils/Security";
import Express from "express";

export class AuthAPIWeb {
    constructor(private readonly app: Reileta, private readonly manager: AuthManager) {
        this.app.express.post('/api/auth/login', Express.json(), (q, s: any) => this.getLogin(q, s));
        this.app.express.get('/api/auth/logout', (q, s: any) => this.getLogout(q, s));
        this.app.express.delete('/api/auth/logout', (q, s: any) => this.postDetele(q, s));
        this.app.express.post('/api/auth/register', Express.json(), (q, s: any) => this.getRegister(q, s));
    }

    async getLogin(request: ARequest, response: AResponse) {
        const logged = await this.manager.login(request.body, request.data?.user);
        if (logged instanceof ErrorMessage)
            return response.send(logged);
        response.cookie(CookieValue, logged.session.token);
        var res: ResponseLogin = {
            id: logged.session.id,
            token: logged.session.token,
            created_at: logged.session.created_at.getTime(),
            user: {
                id: logged.user.id,
                username: logged.user.username,
                display: logged.user.display,
                thumbnail: logged.user.thumbnail?.href,
                banner: logged.user.banner?.href,
                friends: [],
                tags: logged.user.tags,
                status: "offline",
                server: logged.user.server,

            }
        }
        response.send({ data: res });
    }

    async getLogout(request: ARequest, response: AResponse) {
        const logged = await this.manager.logout(request.data?.session, request.data?.user);
        if (logged instanceof ErrorMessage)
            return response.send(logged);
        response.clearCookie(CookieValue);
        response.send({ data: "LOGOUT" });
    }

    async postDetele(request: ARequest, response: AResponse) {
        const logged = await this.manager.delete(request.data?.user);
        if (logged instanceof ErrorMessage)
            return response.send(logged);
        response.clearCookie(CookieValue);
        response.send({ data: "DELETED" });
    }

    async getRegister(request: ARequest, response: AResponse) {
        const logged = await this.manager.register(request.body, request.data?.user);
        if (logged instanceof ErrorMessage)
            return response.send(logged);
        response.cookie(CookieValue, logged.session.token);
        const res: ResponseRegister = {
            id: logged.session.id,
            token: logged.session.token,
            created_at: logged.session.created_at.getTime(),
            user: {
                id: logged.user.id,
                username: logged.user.username,
                display: logged.user.display,
                thumbnail: logged.user.thumbnail?.href,
                banner: logged.user.banner?.href,
                friends: [],
                tags: logged.user.tags,
                status: "offline",
                server: logged.user.server,
            }
        }
        response.send({ data: res });
    }

    use(request: ARequest, response: AResponse, next: NextFunction) {
        request.data = {
            token: (typeof request.query.authuser === "string" && request.query.authuser) || request.get('Authorization') || request.cookies[CookieValue],
            session: undefined,
            user: undefined
        };
        next();
    }
}