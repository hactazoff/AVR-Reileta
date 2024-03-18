import EventEmitter from "events";
import { ErrorCodes, GenerateId } from "../utils/Constants";
import { randomBytes } from "crypto";
import { Reileta } from "../Reileta";
import { SessionManager } from "./SessionManager";
import { ErrorMessage, generateSessionToken } from "../utils/Security";
import User from "../users/User";

export default class Session extends EventEmitter {

    public id: string = GenerateId.Session();
    private _user_id: string = "";
    private _token: string = generateSessionToken();
    public created_at: Date = new Date();
    public updated_at: Date = new Date();

    // GETTERS

    /**
     * Get the token of the session
     */
    get token() {
        return this._token;
    }

    constructor(private readonly app: Reileta, private readonly manager: SessionManager) {
        super();
    }

    // METHODS

    /**
     * Get the user
     */
    async getUser(who: User | "bypass") {
        if (!this._user_id) return new ErrorMessage(ErrorCodes.UserNotFound)
        const user = await this.app.users.get({ id: this._user_id }, who);
        if (user instanceof ErrorMessage) return user;
        this._user_id = user.id;
        return user;
    }

    /**
     * Import a session from a token
     * @param token Session token
     */
    async importFromToken(token: string) {
        try {
            const session = await this.app.prisma.session.findFirst({ where: { token: token } });
            if (!session)
                return new ErrorMessage(ErrorCodes.SessionNotFound);
            this.id = session.id;
            this._user_id = session.user_id;
            this._token = session.token;
            this.created_at = session.created_at;
            this.updated_at = session.updated_at;
            return this;
        } catch (e) {
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }

    /**
     * Import a session from an id
     * @param id Session id
     */
    async importFromId(id: string) {
        try {
            const session = await this.app.prisma.session.findFirst({ where: { id: id } });
            if (!session)
                return new ErrorMessage(ErrorCodes.SessionNotFound);
            this.id = session.id;
            this._user_id = session.user_id;
            this._token = session.token;
            this.created_at = session.created_at;
            this.updated_at = session.updated_at;
            return this;
        } catch (e) {
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }

    async generate(user: User): Promise<Session | ErrorMessage> {
        try {
            if (!user.internal)
                return new ErrorMessage(ErrorCodes.ObjectNotInternal);
            this.id = GenerateId.Session();
            this._user_id = user.id;
            this._token = generateSessionToken();

            if (!await this.save()) return new ErrorMessage(ErrorCodes.InternalError);
            return this;
        } catch {
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }

    async save(): Promise<Session | ErrorMessage> {
        try {
            const session = await this.app.prisma.session.upsert({
                where: { id: this.id },
                update: { token: this.token },
                create: {
                    id: this.id,
                    user_id: this._user_id,
                    token: this.token
                }
            });
            if (!session)
                return new ErrorMessage(ErrorCodes.InternalError);
            return this;
        } catch (e) {
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }

    async delete() {
        try {
            await this.app.prisma.session.delete({ where: { id: this.id } });
            return true;
        } catch (e) {
            return false
        }
    }
}