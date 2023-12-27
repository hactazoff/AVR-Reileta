import { Reileta } from "../Reileta";
import { AuthAPIWeb } from "./AuthAPIWeb";
import { ErrorMessage, checkLoginInput, checkRegisterInput, checkUserTags, verify } from "../utils/Security";
import { LoginInput, RegisterInput, SessionInfo } from "../utils/Interfaces";
import { UserInfo } from "../utils/Interfaces";
import { ErrorCodes, GenerateId, getCanEditUser, getCanLogin, getCanRegister } from "../utils/Constants";

export class AuthManager {

    api_web: AuthAPIWeb;

    constructor(private readonly app: Reileta) {
        this.api_web = new AuthAPIWeb(this.app, this);
    }

    async login(input?: LoginInput, who?: UserInfo): Promise<{ user: UserInfo, session: SessionInfo } | ErrorMessage> {
        try {
            if (getCanLogin())
                return new ErrorMessage(ErrorCodes.ServiceDisabled);
            console.log(input, who);
            if (who)
                return new ErrorMessage(ErrorCodes.UserAlreadyConnected);
            if (!checkLoginInput(input))
                return new ErrorMessage(ErrorCodes.AuthInvalidInput);
            const user = await this.app.users.getInternalUser(input.username);
            if (user instanceof ErrorMessage) return user;
            if (!checkUserTags(user, ['avr:admin'])
                && !(checkUserTags(user, ['avr:login_user']))
            ) return new ErrorMessage(ErrorCodes.UserDontHavePermission);
            if (!user.password || !verify(input.password, user.password))
                return new ErrorMessage(ErrorCodes.AuthInvalidLogin);
            const session = await this.app.sessions.createSession(user);
            if (session instanceof ErrorMessage) return session;
            return { user, session };
        } catch (e) {
            console.warn(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }

    async register(input?: RegisterInput, who?: UserInfo): Promise<{ user: UserInfo, session: SessionInfo } | ErrorMessage> {
        try {
            if (getCanRegister())
                return new ErrorMessage(ErrorCodes.ServiceDisabled);
            if (who)
                return new ErrorMessage(ErrorCodes.UserAlreadyConnected);
            const root = await this.app.users.getInternalUser("root");
            if (root instanceof ErrorMessage)
                return new ErrorMessage(ErrorCodes.InternalError);
            who = root;
            if (!checkRegisterInput(input))
                return new ErrorMessage(ErrorCodes.AuthInvalidInput);
            const user = await this.app.users.getInternalUser(input.username);
            if (!(user instanceof ErrorMessage))
                return new ErrorMessage(ErrorCodes.AuthInvalidLogin);
            const u = await this.app.users.createInternalUser({
                id: GenerateId.User(),
                username: input.username,
                password: input.password,
                display: input.display,
            }, who);
            if (u instanceof ErrorMessage) return u;
            if (!checkUserTags(u, ['avr:admin'])
                && !(checkUserTags(u, ['avr:login_user']))
            ) return new ErrorMessage(ErrorCodes.UserDontHavePermission);
            const session = await this.app.sessions.createSession(u);
            if (session instanceof ErrorMessage) return session;
            return { user: u, session };
        } catch (e) {
            console.warn(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }

    async logout(session?: SessionInfo, who?: UserInfo): Promise<ErrorMessage | null> {
        try {
            if (getCanEditUser())
                return new ErrorMessage(ErrorCodes.ServiceDisabled);
            console.log(session, who);
            if (!who)
                return new ErrorMessage(ErrorCodes.UserNotLogged);
            return await this.app.sessions.deleteSession(session?.id, who);
        } catch (e) {
            console.warn(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }

    async delete(who?: UserInfo): Promise<ErrorMessage | null> {
        try {
            if (getCanEditUser())
                return new ErrorMessage(ErrorCodes.ServiceDisabled);
            if (!who)
                return new ErrorMessage(ErrorCodes.UserNotLogged);
            return await this.app.users.deleteInternalUser(who, who);
        } catch (e) {
            console.warn(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }
}