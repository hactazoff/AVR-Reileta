import { Reileta } from "../Reileta";
import { randomBytes } from "crypto";
import { SessionAPIWeb } from "./SessionAPIWeb";
import { Session } from "@prisma/client";
import { SessionInfo, UserInfo, UserInput } from "../utils/Interfaces";
import { ErrorMessage, checkUserTags, generateSessionToken } from "../utils/Security";
import { ErrorCodes, getMyAdress } from "../utils/Constants";

export class SessionManager {

    api_web: SessionAPIWeb;

    constructor(private readonly app: Reileta) {
        this.api_web = new SessionAPIWeb(this.app, this);
    }

    /**
     * Get a session
     * @param search Session id or token
     * @returns 
     */
    async getSession(search?: string): Promise<SessionInfo | ErrorMessage> {
        try {
            if (!search || typeof search !== "string")
                return new ErrorMessage(ErrorCodes.SessionInvalidInput);
            const session = await this.app.prisma.session.findFirst({
                where: { OR: [{ id: search }, { token: search }] }
            });
            if (!session)
                return new ErrorMessage(ErrorCodes.SessionNotFound);
            let user = await this.app.users.getInternalUser(session.user_id);
            if (user instanceof ErrorMessage)
                return user;
            return {
                id: session.id,
                token: session.token,
                created_at: session.created_at,
                user_id: session.user_id,
                user: user
            }
        } catch (e) {
            console.warn(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }

    /**
     * Create a session
     * @param user_id User id
     * @returns 
     */
    async createSession(user?: UserInput): Promise<SessionInfo | ErrorMessage> {
        try {
            if (!user)
                return new ErrorMessage(ErrorCodes.UserInvalidInput);
            let session = await this.app.prisma.session.create({
                data: { user_id: user.id, token: generateSessionToken() }
            });
            if (!session)
                return new ErrorMessage(ErrorCodes.InternalError);
            let user_info = await this.app.users.getInternalUser(user.id);
            if (user_info instanceof ErrorMessage)
                return user_info;
            return {
                id: session.id,
                token: session.token,
                created_at: session.created_at,
                user_id: session.user_id,
                user: user_info
            }
        } catch (e) {
            console.warn(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }

    /**
     * Delete a session
     * @param search Session id or token
     * @returns 
     */
    async deleteSession(search?: string, who?: UserInfo): Promise<ErrorMessage | null> {
        try {
            if (!search || typeof search !== "string")
                return new ErrorMessage(ErrorCodes.SessionInvalidInput);
            if (!who)
                return new ErrorMessage(ErrorCodes.UserInvalidInput);
            var i = await this.app.prisma.session.deleteMany({
                where: { OR: [{ id: search }, { token: search }] }
            });
            if (i.count === 0)
                return new ErrorMessage(ErrorCodes.SessionNotFound);
        } catch (e) {
            console.warn(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
        return null;
    }
}