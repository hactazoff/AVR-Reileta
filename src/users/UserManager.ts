import { Reileta } from "../Reileta";
import { UserAPIWeb } from "./UserAPIWeb";
import { ErrorCodes, GenerateId, SafeLocalhostAdress } from "../utils/Constants";
import { ErrorMessage, hash } from "../utils/Security";
import User from "./User";
import { isOwnServerAddress } from "../server/ServerManager";

export class UserManager {

    api_web: UserAPIWeb;

    /**
     * Parse the user id and server address
     * @param str User IDS (id@server)
     */
    public parseString(str: string): { id: string, server: string } {
        const sp = str.split("@");
        return {
            id: sp[0],
            server: !sp[1] || isOwnServerAddress(sp[1]) ? SafeLocalhostAdress : sp[1]
        };
    }

    
    public stringify(obj: { id: string, server: string }, server: string): string {
        return `${obj.id}@${obj.server === SafeLocalhostAdress ? server : obj.server}`;
    }

    /**
     * Get an user
     * @param search user IDS (id@server)
     * @param who User who is searching
     * @param force force to fetch from database/network
     * @returns 
     */
    async get(search: UserGetSearch, who?: User | "bypass"): Promise<User | ErrorMessage> {
        try {
            if (!search.server || isOwnServerAddress(search.server))
                search.server = SafeLocalhostAdress;
            if (!search.force) {
                const cached = this.app.cache.get<User>(`${search.id}@${search.server}`);
                if (cached instanceof User) return cached;
            }
            if (search.server === SafeLocalhostAdress)
                return await this.import(search.id, who);
            return await this.fetch(search.id, search.server, who);
        } catch (e) {
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }

    async create(input: UserCreate, who?: User | "bypass") {
        const user = await (new User(this.app, this)).create(input);
        if (user instanceof ErrorMessage) return user;
        this.app.cache.set<User>(`${user.id}@${user.server}`, user);
        return user;
    }

    async delete(id: string, who: User | "bypass") {
        const user = await this.get({ id }, who);
        if (user instanceof ErrorMessage) return user;
        if (!await user.delete())
            return new ErrorMessage(ErrorCodes.InternalError);
        this.app.cache.delete(`${id}@${user.server}`);
        return true;
    }



    /**
     * Check if an user exists
     * @param id User id
     * @returns 
     */
    async has(id: string): Promise<boolean> {
        try {
            return (await this.app.prisma.user.count({ where: { id } })) > 0;
        } catch (e) {
            return false;
        }
    }

    /**
     * Import an user from the database
     */
    private async import(id: string, who?: User | "bypass"): Promise<User | ErrorMessage> {
        const i = await (new User(this.app, this)).import(id);
        if (i instanceof ErrorMessage) return i;
        this.app.cache.set<User>(`${i.id}@${i.server}`, i);
        return i;
    }

    /**
     * Fetch an user from a server
     */
    private async fetch(id: string, server: string, who?: User | "bypass"): Promise<User | ErrorMessage> {
        if (who && who !== "bypass" && !who.canFetch)
            return new ErrorMessage(ErrorCodes.UserDontHavePermission);
        const i = await (new User(this.app, this)).fetch(id, server);
        if (i instanceof ErrorMessage) return new ErrorMessage(ErrorCodes.InstanceNotFound);
        this.app.cache.set<User>(`${i.id}@${i.server}`, i);
        return i;
    }

    constructor(private readonly app: Reileta) {
        this.api_web = new UserAPIWeb(this.app, this);
        this.updateRootUser();
    }

    private async updateRootUser() {
        try {
            const user = await this.getRootUser();
            if (user instanceof ErrorMessage) return;
            this.app.cache.set<User>(`${user.id}@${user.server}`, user);
        } catch (e) {
            console.warn(e);
        }
    }

    public async getRootUser() {
        try {
            let user = await this.app.prisma.user.findFirst({
                where: {
                    OR: [
                        { username: getDefaultRootUsername() },
                        {
                            AND: [
                                { tags: { contains: "avr:admin" } },
                                { tags: { contains: "avr:root" } },
                                { tags: { contains: "avr:bot" } }
                            ]
                        }
                    ]
                }
            });
            if (!user) {
                console.warn("Root user not found, creating a new one...");
                user = await this.app.prisma.user.create({
                    data: {
                        id: GenerateId.User(),
                        display: "Root",
                        username: getDefaultRootUsername(),
                        password: getDefaultRootPassword(),
                        tags: ["avr:admin", "avr:root", "avr:bot"].join(",")
                    }
                });
                console.log("Root user created, id:", user.id, "username:", user.username);
            }
            return await this.import(user.id, "bypass");
        } catch (e) {
            console.warn(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }
}

export function getDefaultRootUsername() {
    return process.env.REILETA_DEFAULT_ROOT_USERNAME || "root";
}

export function getDefaultRootPassword() {
    let pass = process.env.REILETA_DEFAULT_ROOT_PASSWORD;
    return pass ? hash(pass) : null;
}

export interface UserGetSearch {
    id: string;
    server?: string;
    force?: boolean;
}

export interface UserCreate {
    id: string;
    username: string;
    password: string;
    thumbnail?: string;
    banner?: string;
    display?: string;
}