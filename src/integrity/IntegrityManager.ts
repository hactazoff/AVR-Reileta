import { Reileta } from "../Reileta";
import { ErrorCodes, getIntegrityExpiration, getMyAdress } from "../utils/Constants";
import { IntegrityInfo, IntegrityInput, IntegrityServer, IntegrityServerInput, ResponseIntegrityServer, UserInfo } from "../utils/Interfaces";
import { ErrorMessage, checkIntegrityInput, checkIntegrityServerInput, checkIntegrityServerResponse, generateIntegrityToken } from "../utils/Security";
import { IntegrityAPIWeb } from "./IntegrityAPIWeb";

export class IntegrityManager {

    api_web: IntegrityAPIWeb;

    constructor(private readonly app: Reileta) {
        this.api_web = new IntegrityAPIWeb(this.app, this);
    }

    async createIntegrity(input?: IntegrityInput, who?: UserInfo): Promise<IntegrityInfo | ErrorMessage> {
        try {
            if (!who)
                return new ErrorMessage(ErrorCodes.UserNotLogged);
            if (!input || !checkIntegrityInput(input) || !input.server)
                return new ErrorMessage(ErrorCodes.IntegrityInvalidInput);
            const incomming = await this.fetchIntegrity(input.server, who);
            if (incomming instanceof ErrorMessage)
                return incomming;
            return {
                id: incomming.id,
                user: incomming.user,
                token: incomming.token,
                expires_at: incomming.expires_at,
                server: incomming.server
            }
        } catch (e) {
            console.warn(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }

    async fetchIntegrity(address: string, who: UserInfo): Promise<IntegrityServer | ErrorMessage> {
        try {
            const server = await this.app.server.getServer(address);
            if (!server)
                return new ErrorMessage(ErrorCodes.ServerNotFound);
            const response = await this.app.server.fetch<ResponseIntegrityServer>(server.gateways.http.host, '/api/integrity', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({
                    user: this.app.users.objectToStrId(who),
                })
            });
            if (response.error || !checkIntegrityServerResponse(response.data)
            ) return new ErrorMessage(ErrorCodes.BadDataFromServer);
            var u = this.app.users.strToObject(response.data.user);
            if (!u || !u.id || u.server != who.server)
                return new ErrorMessage(ErrorCodes.UserNotFound);
            return {
                id: response.data.id,
                user: who,
                token: response.data.token,
                expires_at: new Date(response.data.expires_at),
                server: server
            }
        } catch (e) {
            console.warn(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }

    async makeIntegrity(input?: IntegrityServerInput): Promise<IntegrityServer | ErrorMessage> {
        try {
            if (!input || !checkIntegrityServerInput(input))
                return new ErrorMessage(ErrorCodes.IntegrityInvalidInput);

            var u = this.app.users.strToObject(input.user);
            if (!u || !u.id)
                return new ErrorMessage(ErrorCodes.UserNotFound);

            // get user info
            let user: UserInfo | ErrorMessage;
            if (!u.server || u.server === getMyAdress())
                user = await this.app.users.getInternalUser(u.id);
            else user = await this.app.users.getExternalUser(u.id, u.server);
            if (user instanceof ErrorMessage)
                return user;

            // get server info
            const server = await this.app.server.getServer(user.server);
            if (!server)
                return new ErrorMessage(ErrorCodes.ServerNotFound);

            // fetch challenge
            const valid = await this.app.server.fetchChallenge(user.server);
            if (valid instanceof ErrorMessage)
                return valid;

            var uid = this.app.users.objectToStrId(user);
            if (!uid)
                return new ErrorMessage(ErrorCodes.InternalError);

            // get the current integrity if exsit
            let integrity = await this.app.prisma.integrity.findFirst({
                where: { user: uid, expire_at: { gt: new Date() } }
            });
            // if exsit, update expire date
            if (integrity)
                integrity = await this.app.prisma.integrity.update({
                    where: { id: integrity.id },
                    data: {
                        expire_at: new Date(Date.now() + getIntegrityExpiration()),
                        updated_at: new Date()
                    }
                });
            else integrity = await this.app.prisma.integrity.create({
                data: {
                    user: uid,
                    token: generateIntegrityToken(),
                    expire_at: new Date(Date.now() + getIntegrityExpiration())
                }
            });
            if (!integrity)
                return new ErrorMessage(ErrorCodes.InternalError);
            return {
                id: integrity.id,
                user: user,
                token: integrity.token,
                expires_at: integrity.expire_at,
                server: server
            }
        } catch (e) {
            console.warn(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }

    async getIntegrity(integrity: string): Promise<IntegrityInfo | ErrorMessage> {
        try {
            let i = await this.app.prisma.integrity.findFirst({
                where: { token: integrity, expire_at: { gt: new Date() } }
            });
            if (!i)
                return new ErrorMessage(ErrorCodes.IntegrityNotFound);
            var user = await this.app.users.getInternalUser(i.user);
            if (user instanceof ErrorMessage)
                return user;
            var server = await this.app.server.getServer(user.server);
            if (!server)
                return new ErrorMessage(ErrorCodes.ServerNotFound);
            return {
                id: i.id,
                user: user,
                token: i.token,
                expires_at: i.expire_at,
                server: server
            }
        } catch (e) {
            console.warn(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }
}