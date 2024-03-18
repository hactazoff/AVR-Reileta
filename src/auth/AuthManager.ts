import { Reileta } from "../Reileta";
import { AuthAPIWeb } from "./AuthAPIWeb";
import { ErrorMessage, checkLoginInput, checkRegisterInput, checkUserTags, verify } from "../utils/Security";
import { LoginInput, RegisterInput, SessionInfo } from "../utils/Interfaces";
import { UserInfo } from "../utils/Interfaces";
import { ErrorCodes, GenerateId, getCanEditUser, getCanLogin, getCanRegister } from "../utils/Constants";
import { AuthAPISocket } from "./AuthAPISocket";
import User from "../users/User";
import Session from "../sessions/Session";

export class AuthManager {

    api_web: AuthAPIWeb;
    api_socket: AuthAPISocket;

    constructor(private readonly app: Reileta) {
        this.api_web = new AuthAPIWeb(this.app, this);
        this.api_socket = new AuthAPISocket(this.app, this);
    }

    async login(input?: LoginInput, who?: User): Promise<Session | ErrorMessage> {
        try {
            if (who)
                return new ErrorMessage(ErrorCodes.UserAlreadyConnected);
            if (!checkLoginInput(input))
                return new ErrorMessage(ErrorCodes.AuthInvalidInput);
            const user = await this.app.users.get({ id: input.username }, "bypass");
            if (user instanceof ErrorMessage) return user;
            if (!user.canConnect)
                return new ErrorMessage(ErrorCodes.UserDontHavePermission);
            if (!user.verifyPassword(input.password))
                return new ErrorMessage(ErrorCodes.AuthInvalidLogin);
            return await this.app.sessions.create(user, "bypass");
        } catch (e) {
            console.warn(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }

    async register(input?: RegisterInput, who?: User): Promise<Session | ErrorMessage> {
        try {
            if (who)
                return new ErrorMessage(ErrorCodes.UserAlreadyConnected);
            if (!checkRegisterInput(input))
                return new ErrorMessage(ErrorCodes.AuthInvalidInput);
            const alreadyCreated = await this.app.users.has(input.username);
            if (alreadyCreated) return new ErrorMessage(ErrorCodes.AuthInvalidLogin);
            const user = await this.app.users.create({
                id: GenerateId.User(),
                username: input.username,
                password: input.password,
                display: input.display,
            }, "bypass");
            if (user instanceof ErrorMessage) return user;
            if (!user.canConnect)
                return new ErrorMessage(ErrorCodes.UserDontHavePermission);
            const session = await this.app.sessions.create(user, user);
            if (session instanceof ErrorMessage) return session;
            return session;
        } catch (e) {
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }

    async logout(session_id: string, who: User): Promise<ErrorMessage | true> {
        return await this.app.sessions.delete(session_id, who);
    }

    async delete(who: User): Promise<ErrorMessage | true> {
        return await this.app.users.delete(who.id, who);
    }
}