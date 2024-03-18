import { Reileta } from "../Reileta";
import { SessionAPIWeb } from "./SessionAPIWeb";
import { SessionInfo, UserInfo, UserInput } from "../utils/Interfaces";
import { ErrorMessage, generateSessionToken } from "../utils/Security";
import { ErrorCodes } from "../utils/Constants";
import User from "../users/User";
import Session from "./Session";

export class SessionManager {

    api_web: SessionAPIWeb;

    /**
     * Get a session
     * @param id Session id
     */
    async get(id: SessionGetSearch, who?: User | "bypass"): Promise<Session | ErrorMessage> {
        if (!id.token && !id.id)
            return new ErrorMessage(ErrorCodes.SessionInvalidInput);
        if (!id.force && id.id) {
            const cached = this.app.cache.get<Session>(id.id);
            if (cached instanceof Session) return cached;
        }
        if (id.token)
            return await (new Session(this.app, this)).importFromToken(id.token);
        else if (id.id)
            return await (new Session(this.app, this)).importFromId(id.id);
        return new ErrorMessage(ErrorCodes.InternalError);
    }

    async create(user: User, who?: User | "bypass"): Promise<Session | ErrorMessage> {
        const session = await (new Session(this.app, this)).generate(user);
        if (session instanceof ErrorMessage) return session;
        this.app.cache.set<Session>(session.id, session);
        return session;
    }

    async delete(id: string, who?: User | "bypass") {
        const session = await this.get({ id }, who);
        if (session instanceof ErrorMessage) return session;
        this.app.cache.delete(session.id);
        if (!await session.delete())
            return new ErrorMessage(ErrorCodes.InternalError);
        return true;
    }

    constructor(private readonly app: Reileta) {
        this.api_web = new SessionAPIWeb(this.app, this);
    }
}

export interface SessionGetSearch {
    token?: string;
    id?: string;
    force?: boolean;
}