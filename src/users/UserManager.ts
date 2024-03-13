import { Reileta } from "../Reileta";
import { UserAPIWeb } from "./UserAPIWeb";
import { UserInfo, UserInput } from "../utils/Interfaces";
import { ErrorCodes, GenerateId, getCanEditUser, getMyAdress } from "../utils/Constants";
import { ErrorMessage, checkUserInput, checkUserResponse, checkUserTags, hash } from "../utils/Security";

export class UserManager {


    api_web: UserAPIWeb;

    constructor(private readonly app: Reileta) {
        this.api_web = new UserAPIWeb(this.app, this);
        this.checkCreateRootUser();
    }

    objectToStrId(obj?: { id: string, server?: string }) {
        if (!obj) return null;
        return `${obj.id}${obj.server ? "@" + obj.server : ""}`;
    }

    strToObject(str?: string): { id: string, server?: string } | null {
        if (!str) return null;
        const spl = str.split("@");
        return { id: spl[0], server: spl[1] };
    }

    async checkCreateRootUser() {
        try {
            let root = await this.app.prisma.user.findUnique({ where: { name: "root" } });
            if (!root) {
                root = await this.app.prisma.user.create({
                    data: {
                        id: GenerateId.User(),
                        name: "root",
                        display: "AVR Root User",
                        created_at: new Date(),
                        updated_at: new Date(),
                        tags: ["avr:admin", "avr:bot"].join(","),
                    }
                });
                let session = await this.app.sessions.createSession({ id: root.id });
                if (session instanceof ErrorMessage)
                    return console.error(session);
                console.log(`Root user created with id ${root.id} and session ${session.id}`);
            }
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * Get a user from a server
     * @param search User id or username
     * @returns 
     */
    async getInternalUser(search?: string): Promise<UserInfo | ErrorMessage> {
        try {
            if (typeof search !== "string")
                return new ErrorMessage(ErrorCodes.UserInvalidInput);
            var u = await this.app.prisma.user.findFirst({
                where: { OR: [{ id: search }, { name: search }] }
            });
            return u ? {
                id: u.id,
                username: u.name,
                display: u.display || u.name,
                password: u.password || undefined,
                thumbnail: u.thumbnail ? new URL(u.thumbnail, this.app.server.getInfo.gateways.http) : undefined,
                banner: u.banner ? new URL(u.banner, this.app.server.getInfo.gateways.http) : undefined,
                tags: u.tags?.split(",") || [],
                external: false,
                server: getMyAdress(),
            } : new ErrorMessage(ErrorCodes.UserNotFound);
        } catch (e) {
            console.warn(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }

    /**
     * Get a user from a server
     * @param search User id or username
     * @param address Server address
     * @param user User who request
     * @returns 
     */
    async getExternalUser(search?: string, address?: string, who?: UserInfo): Promise<UserInfo | ErrorMessage> {
        try {
            if (!who)
                return new ErrorMessage(ErrorCodes.UserNotLogged);
            if (!search || !address || typeof search !== "string" || typeof address !== "string")
                return new ErrorMessage(ErrorCodes.UserInvalidInput);
            if (address === getMyAdress())
                return await this.getInternalUser(search);
            if (!checkUserTags(who, ["avr:fetch_external"]) && !checkUserTags(who, ['avr:admin']))
                return new ErrorMessage(ErrorCodes.UserDontHavePermission);
            const server = await this.app.server.getServer(address);
            if (!server)
                return new ErrorMessage(ErrorCodes.ServerNotFound);
            const res = await this.app.server.fetch<any>(server.gateways.http.origin, '/api/users/' + search);
            if (res.error)
                console.warn(res.error);
            if (res.error || !checkUserResponse(res.data))
                return new ErrorMessage(ErrorCodes.UserNotFound);
            return {
                id: res.data.id,
                username: res.data.username,
                display: res.data.display,
                thumbnail: res.data.thumbnail ? new URL(res.data.thumbnail) : undefined,
                banner: res.data.banner ? new URL(res.data.banner) : undefined,
                tags: res.data.tags,
                external: true,
                server: server.gateways.http.host,
            }
        } catch (e) {
            console.warn(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }

    /**
     * Delete a user
     * @param user User to delete
     * @returns
     */
    async deleteInternalUser(input?: UserInput, who?: UserInfo): Promise<ErrorMessage | null> {
        try {
            if (!who)
                return new ErrorMessage(ErrorCodes.UserNotLogged);
            if (!checkUserInput(input))
                return new ErrorMessage(ErrorCodes.UserInvalidInput);
            if (!checkUserTags(who, ['avr:admin'])
                && !(input.id === who.id && (checkUserTags(who, ['avr:delete_self_user'])))
                && !checkUserTags(who, ['avr:delete_user'])
            ) return new ErrorMessage(ErrorCodes.UserDontHavePermission);
            await this.app.prisma.session.deleteMany({ where: { user_id: input.id } });
            await this.app.prisma.world.deleteMany({ where: { owner_id: input.id } });
            await this.app.prisma.user.deleteMany({ where: { id: input.id } })
        } catch (e) {
            console.warn(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
        return null;
    }

    /**
     * Make a user 
     * @param username Unique username
     * @returns 
     */
    async createInternalUser(input?: UserInput, who?: UserInfo): Promise<UserInfo | ErrorMessage> {
        try {
            if (!who)
                return new ErrorMessage(ErrorCodes.UserNotLogged);
            if (!checkUserInput(input) || !input.username)
                return new ErrorMessage(ErrorCodes.UserInvalidInput);
            if (!checkUserTags(who, ['avr:admin'])
                && !(getCanEditUser() && input.id === who.id && checkUserTags(who, ['avr:edit_user'])))
                return new ErrorMessage(ErrorCodes.UserDontHavePermission);
            let id = GenerateId.User();
            await this.app.prisma.user.create({
                data: {
                    id: id,
                    name: input.username,
                    display: input.display || input.username,
                    password: input.password ? hash(input.password) : undefined,
                    created_at: new Date(),
                    updated_at: new Date()
                }
            });
            return await this.getInternalUser(id);
        } catch (e) {
            console.warn(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }

    /**
     * Update a user
     * @param input User data
     * @param user User who request
     * @returns 
     */
    async updateInternalUser(input?: UserInput, who?: UserInfo): Promise<UserInfo | ErrorMessage> {
        try {
            if (!who)
                return new ErrorMessage(ErrorCodes.UserNotLogged);
            if (!checkUserInput(input))
                return new ErrorMessage(ErrorCodes.UserInvalidInput);
            if (!checkUserTags(who, ['avr:admin'])
                && !(getCanEditUser() && input.id === who.id && checkUserTags(who, ['avr:edit_user'])))
                return new ErrorMessage(ErrorCodes.UserDontHavePermission);
            await this.app.prisma.user.update({
                where: { id: input.id },
                data: {
                    name: input.username,
                    display: input.display,
                    password: input.password ? hash(input.password) : undefined,
                    updated_at: new Date()
                }
            });
            return await this.getInternalUser(input.id);
        } catch (e) {
            console.warn(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }
}