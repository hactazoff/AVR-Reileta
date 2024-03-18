import { NextFunction } from "express";
import { Reileta } from "../Reileta";
import { ARequest, AResponse, ResponseLogin, ResponseRegister, ResponseUserMeInfo } from "../utils/Interfaces";
import { AuthManager } from "./AuthManager";
import { CookieValue, ErrorCodes } from "../utils/Constants";
import { ErrorMessage } from "../utils/Security";
import Express from "express";
import { log } from "console";

export class AuthAPIWeb {
    constructor(private readonly app: Reileta, private readonly manager: AuthManager) {
        this.app.express.post('/api/auth/login', Express.json(), (q, s: any) => this.getLogin(q, s));
        this.app.express.get('/api/auth/logout', (q, s: any) => this.getLogout(q, s));
        this.app.express.delete('/api/auth/logout', (q, s: any) => this.postDetele(q, s));
        this.app.express.post('/api/auth/register', Express.json(), (q, s: any) => this.getRegister(q, s));
    }

    async getLogin(request: ARequest, response: AResponse) {
        const logged = await this.manager.login(request.body);
        if (logged instanceof ErrorMessage)
            return response.send(logged);
        response.cookie(CookieValue, logged.token);
        const user = await logged.getUser("bypass");
        if (user instanceof ErrorMessage)
            return response.send(user);
        var res: ResponseLogin = {
            id: logged.id,
            token: logged.token,
            created_at: logged.created_at.getTime(),
            user: {
                id: user.id,
                username: user.username,
                display: user.display,
                thumbnail: user.thumbnail?.href,
                banner: user.banner?.href,
                friends: [],
                tags: user.tags,
                status: "offline",
                server: user.server,

            }
        }
        response.send({ data: res });
    }

    async getLogout(request: ARequest, response: AResponse) {
        if (!request.data?.session)
            return response.send(new ErrorMessage(ErrorCodes.UserNotLogged));
        const user = await request.data?.session.getUser("bypass");
        if (user instanceof ErrorMessage) return response.send(user);
        const logged = await this.manager.logout(request.data?.session.id, user);
        if (logged instanceof ErrorMessage)
            return response.send(logged);
        response.clearCookie(CookieValue);
        response.send({ data: "LOGOUT" });
    }

    async postDetele(request: ARequest, response: AResponse) {
        const user = await request.data?.session?.getUser("bypass");
        if (!user) return response.send(new ErrorMessage(ErrorCodes.UserNotLogged));
        if (user instanceof ErrorMessage) return response.send(user);
        const logged = await this.manager.delete(user);
        if (logged instanceof ErrorMessage)
            return response.send(logged);
        response.clearCookie(CookieValue);
        response.send({ data: "DELETED" });
    }

    async getRegister(request: ARequest, response: AResponse) {
        const logged = await this.manager.register(request.body);
        if (logged instanceof ErrorMessage)
            return response.send(logged);
        const user = await logged.getUser("bypass");
        if (user instanceof ErrorMessage)
            return response.send(user);
        response.cookie(CookieValue, logged.token);
        const res: ResponseRegister = {
            id: logged.id,
            token: logged.token,
            created_at: logged.created_at.getTime(),
            user: {
                id: user.id,
                username: user.username,
                display: user.display,
                thumbnail: user.thumbnail?.href,
                banner: user.banner?.href,
                friends: [],
                tags: user.tags,
                status: "offline",
                server: user.server,
            }
        }
        response.send({ data: res });
    }

    use(request: ARequest, response: AResponse, next: NextFunction) {
        let token = request.get('Authorization');
        if (token && token.startsWith("Bearer "))
            token = token.split(" ")[1];
        request.data = {
            token: (typeof request.query.authuser === "string" && request.query.authuser) || token || request.cookies[CookieValue],
            session: undefined
        };
        next();
    }
}