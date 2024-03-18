import { Reileta } from "../Reileta";
import { ErrorCodes, SafeLocalhostAdress } from "../utils/Constants";
import { ErrorMessage } from "../utils/Security";
import { InstanceAPIWeb } from "./InstanceAPIWeb";
import { InstanceAPISocket } from "./InstanceAPISocket";
import { Instance } from "./Instance";
import User from "../users/User";
import { isOwnServerAddress } from "../server/ServerManager";

export class InstanceManager {

    api_web: InstanceAPIWeb;
    api_socket: InstanceAPISocket;

    constructor(private readonly app: Reileta) {
        this.api_web = new InstanceAPIWeb(this.app, this);
        this.api_socket = new InstanceAPISocket(this.app, this);
    }

    /**
     * Parse the instance id and server address
     * @param str Instance IDS (id@server)
     */
    public parseString(str: string): { id: string, server: string } {
        const sp = str.split("@");
        return {
            id: sp[0],
            server: !sp[1] || isOwnServerAddress(sp[1]) ? SafeLocalhostAdress : sp[1]
        };
    }

    /**
     * Get an instance
     * @param search instance IDS (id@server)
     * @param who User who is searching
     * @param force force to fetch from database/network
     * @returns 
     */
    async get(search: InstanceGetSearch, who?: User | "bypass"): Promise<Instance | ErrorMessage> {
        if (!search.server || isOwnServerAddress(search.server))
            search.server = SafeLocalhostAdress;
        if (!search.force) {
            const cached = this.app.cache.get<Instance>(`${search.id}@${search.server}`);
            if (cached instanceof Instance) return cached;
        }
        if (search.server === SafeLocalhostAdress)
            return await this.import(search.id, who);
        return await this.fetch(search.id, search.server, who);
    }

    /**
     * Import an instance from the database
     */
    private async import(id: string, who?: User | "bypass"): Promise<Instance | ErrorMessage> {
        const i = await (new Instance(this.app, this)).import(id);
        if (i instanceof ErrorMessage) return new ErrorMessage(ErrorCodes.InstanceNotFound);
        this.app.cache.set<Instance>(`${i.id}@${i.server}`, i);
        return i;
    }

    /**
     * Fetch an instance from a server
     */
    private async fetch(id: string, server: string, who?: User | "bypass"): Promise<Instance | ErrorMessage> {
        if (who && who !== "bypass" && !who.canFetch)
            return new ErrorMessage(ErrorCodes.UserDontHavePermission);
        const i = await (new Instance(this.app, this)).fetch(id, server);
        if (i instanceof ErrorMessage) return new ErrorMessage(ErrorCodes.InstanceNotFound);
        this.app.cache.set<Instance>(`${i.id}@${i.server}`, i);
        return i;
    }

    public async create(input: InstanceCreateInput, who?: User | "bypass"): Promise<Instance | ErrorMessage> {
        if (!who || who !== "bypass" && !who.canCreateInstance)
            return new ErrorMessage(ErrorCodes.UserDontHavePermission);
        if (!input.world_ids)
            return new ErrorMessage(ErrorCodes.InstanceInvalidInput);
        var pids = this.app.worlds.parseString(input.world_ids);
        const world = await this.app.worlds.get(pids, who);
        if (world instanceof ErrorMessage) return world;
        const i = await (new Instance(this.app, this)).create({
            id: input.id,
            name: input.name,
            world_ids: world.toString(undefined, pids.version),
            capacity: input.capacity,
            tags: input.tags,
            owner_ids: who.toString(),
        });
        if (i instanceof ErrorMessage) return i;
        this.app.cache.set<Instance>(`${i.id}@${i.server}`, i);
        return i;
    }

    async has(id: string): Promise<boolean> {
        return await this.app.prisma.instance.count({ where: { id } }) > 0;
    }





    // objectToStrId(obj?: { id: string, server?: string }) {
    //     if (!obj) return null;
    //     return `${obj.id}${obj.server ? "@" + obj.server : ""}`;
    // }

    // strToObject(str?: string): { id: string, server?: string } | null {
    //     if (!str) return null;
    //     const spl = str.split("@");
    //     return { id: spl[0], server: spl[1] };
    // }

    // /**
    //  * Get instance from id
    //  * @param id 
    //  * @param who 
    //  * @returns 
    //  */
    // async getInstance(id: string, who?: UserInfo): Promise<InstanceInfos | ErrorMessage> {
    //     try {
    //         if (!id || typeof id !== 'string')
    //             return new ErrorMessage(ErrorCodes.InstanceInvalidInput);
    //         const instance = await this.app.prisma.instance.findFirst({
    //             where: { OR: [{ id }, { name: id }] }
    //         });
    //         if (!instance)
    //             return new ErrorMessage(ErrorCodes.InstanceNotFound);
    //         const world = this.app.worlds.strIdToObject(instance.world);
    //         if (!world)
    //             return new ErrorMessage(ErrorCodes.WorldNotFound);
    //         let worldobj: WorldInfos | ErrorMessage;
    //         if (world.server && world.server !== getMyAdress())
    //             worldobj = await this.app.worlds.getExternalWorld(world.id, world.server, who);
    //         else worldobj = await this.app.worlds.getInternalWorld(world.id, who);
    //         if (worldobj instanceof ErrorMessage)
    //             return worldobj;
    //         const owner = this.app.users.strToObject(instance.owner);
    //         if (!owner)
    //             return new ErrorMessage(ErrorCodes.UserNotFound);
    //         let ownerobj: UserInfo | ErrorMessage;
    //         if (owner.server && owner.server !== getMyAdress())
    //             ownerobj = await this.app.users.getExternalUser(owner.id, owner.server, who);
    //         else ownerobj = await this.app.users.getInternalUser(owner.id);
    //         if (ownerobj instanceof ErrorMessage)
    //             return ownerobj;
    //         let users: UserInstanceInfos[] = [];
    //         const sockets = this.app.io.sockets.adapter.rooms.get('instance:' + instance.id);
    //         if (sockets) {
    //             for (const id of sockets) {
    //                 const socket = this.app.io.sockets.sockets.get(id);
    //                 if (!socket)
    //                     continue;
    //                 const user = this.app.users.strToObject(socket.data.user_id);
    //                 if (!user)
    //                     continue;
    //                 let userobj: UserInfo | ErrorMessage;
    //                 if (user.server && user.server !== getMyAdress())
    //                     userobj = await this.app.users.getExternalUser(user.id, user.server, who);
    //                 else userobj = await this.app.users.getInternalUser(user.id);
    //                 if (userobj instanceof ErrorMessage)
    //                     continue;
    //                 users.push({
    //                     id: userobj.id,
    //                     username: userobj.username,
    //                     display: userobj.display,
    //                     socket_id: id,
    //                     is_moderator: false,
    //                     is_owner: userobj.id === ownerobj.id && userobj.server === ownerobj.server,
    //                     is_master: false,
    //                     is_bot: false,
    //                     external: userobj.external,
    //                     server: userobj.server,
    //                     tags: []
    //                 });
    //             }
    //         }

    //         return {
    //             id: instance.id,
    //             name: instance.name,
    //             capacity: instance.capacity,
    //             world: worldobj,
    //             owner: ownerobj,
    //             master: users.find(e => e.is_master) || null,
    //             server: getPreferedAddress(),
    //             created_at: instance.created_at,
    //             updated_at: instance.updated_at,
    //             tags: instance.tags?.split(",") || [],
    //             users: users,
    //             sockets: sockets ? Array.from(sockets) : [],
    //         };
    //     } catch (e) {
    //         console.warn(e);
    //         return new ErrorMessage(ErrorCodes.InternalError);
    //     }
    // }

    // getRoleUser(user: UserInstanceInfos) {
    //     if (!user.external && user.tags.includes("avr:admin"))
    //         return "admin";
    //     if (user.is_master)
    //         return "master";
    //     if (user.is_owner)
    //         return "owner";
    //     if (user.is_moderator)
    //         return "moderator";
    //     if (user.is_bot)
    //         return "bot";
    //     return "user";
    // }

    // /**
    //  * Create an instance
    //  * @param who 
    //  * @returns 
    //  */
    // async createInstance(input?: InstanceInput, who?: UserInfo): Promise<InstanceInfos | ErrorMessage> {
    //     try {
    //         if (!who)
    //             return new ErrorMessage(ErrorCodes.UserNotLogged);
    //         if (!input || !checkInstanceInput(input, who) || !input.world || !input.tags)
    //             return new ErrorMessage(ErrorCodes.InstanceInvalidInput);
    //         for (const tag of input.tags)
    //             if (!(MatchTags.Instance as any)[tag])
    //                 return new ErrorMessage(ErrorCodes.TagNotFound);
    //         var changed = false;
    //         var groups = new Set<number>();
    //         for (const t of input.tags) {
    //             var tag = (MatchTags.Instance as any)[t] as { for_admin: boolean, overhide: string[], group: number };
    //             if (tag.group)
    //                 groups.add(tag.group);
    //         }
    //         for (const mtag of Object.keys(MatchTags.Instance)) {
    //             var tag = (MatchTags.Instance as any)[mtag] as { for_admin: boolean, overhide: string[], group: number };
    //             if (tag.group && !groups.has(tag.group))
    //                 input.tags.push(mtag);
    //         }
    //         do {
    //             changed = false;
    //             for (const t of input.tags) {
    //                 var ta = t as string;
    //                 var tags = (MatchTags.Instance as any)[t] as { for_admin: boolean, overhide: string[] };
    //                 if (tags && tags.for_admin && !who.tags.includes("avr:admin")) {
    //                     input.tags = input.tags.filter(e => e !== ta);
    //                     changed = true;
    //                 }
    //                 if (tags.overhide)
    //                     for (const overhide of tags.overhide)
    //                         if (input.tags.includes(overhide)) {
    //                             input.tags = input.tags.filter(e => e !== overhide);
    //                             changed = true;
    //                         }
    //             }
    //         } while (changed);
    //         const worldobj = this.app.worlds.strIdToObject(input.world);
    //         if (!worldobj)
    //             return new ErrorMessage(ErrorCodes.WorldNotFound);
    //         let world: WorldInfos | ErrorMessage;
    //         if (worldobj.server)
    //             world = await this.app.worlds.getExternalWorld(worldobj.id, worldobj.server, who);
    //         else world = await this.app.worlds.getInternalWorld(worldobj.id, who);
    //         if (world instanceof ErrorMessage)
    //             return world;
    //         var str_world = this.app.worlds.objectToStrId({
    //             id: world.id,
    //             version: input.version,
    //             server: world.server,
    //         });
    //         var str_owner = this.app.users.objectToStrId({
    //             id: who.id,
    //             server: who.server,
    //         });
    //         if (!str_owner)
    //             return new ErrorMessage(ErrorCodes.UserNotFound);
    //         if (!str_world)
    //             return new ErrorMessage(ErrorCodes.WorldNotFound);
    //         input.name ??= randomBytes(3).toString("hex");
    //         input.capacity ??= world.capacity;
    //         input.id ??= GenerateId.Instance();
    //         const instance = await this.app.prisma.instance.create({
    //             data: {
    //                 id: input.id,
    //                 name: input.name,
    //                 capacity: input.capacity,
    //                 world: str_world,
    //                 owner: str_owner,
    //                 tags: input.tags.join(","),
    //             },
    //         });
    //         const sockets = this.app.io.sockets.adapter.rooms.get('instance:' + instance.id);
    //         return {
    //             id: instance.id,
    //             name: instance.name,
    //             capacity: instance.capacity,
    //             world: world,
    //             owner: who,
    //             master: null,
    //             server: getMyAdress(),
    //             created_at: instance.created_at,
    //             updated_at: instance.updated_at,
    //             tags: instance.tags?.split(",") || [],
    //             users: [],
    //             sockets: sockets ? Array.from(sockets) : [],
    //         };
    //     } catch (e) {
    //         console.warn(e);
    //         return new ErrorMessage(ErrorCodes.InternalError);
    //     }
    // }

    // async deleteInstance(id: string, who?: UserInfo): Promise<boolean | ErrorMessage> {
    //     try {
    //         if (!id || typeof id !== 'string')
    //             return new ErrorMessage(ErrorCodes.InstanceInvalidInput);
    //         const instance = await this.app.prisma.instance.findUnique({ where: { id } });
    //         if (!instance)
    //             return new ErrorMessage(ErrorCodes.InstanceNotFound);
    //         if (instance.owner !== this.app.users.objectToStrId(who)
    //             && !who?.tags.includes("avr:admin"))
    //             return new ErrorMessage(ErrorCodes.UserDontHavePermission);
    //         await this.app.prisma.instance.delete({ where: { id } });
    //         return true;
    //     } catch (e) {
    //         console.warn(e);
    //         return new ErrorMessage(ErrorCodes.InternalError);
    //     }
    // }

    // async getInstances(who?: UserInfo): Promise<InstanceInfos[] | ErrorMessage> {
    //     try {
    //         const instances = await this.app.prisma.instance.findMany({});
    //         let result: InstanceInfos[] = [];
    //         for (const instance of instances) {
    //             const data = await this.getInstance(instance.id, who);
    //             if (data instanceof ErrorMessage)
    //                 continue;
    //             result.push(data);
    //         }
    //         return result;
    //     } catch (e) {
    //         console.warn(e);
    //         return new ErrorMessage(ErrorCodes.InternalError);
    //     }
    // }
}

export interface InstanceGetSearch {
    id: string;
    server?: string;
    force?: boolean;
}

export interface InstanceCreateInput {
    id?: string;
    name?: string;
    title?: string;
    description?: string;
    world_ids?: string;
    capacity?: number;
    tags?: string[];
}

export interface InstanceCreate extends InstanceCreateInput {
    world_ids: string;
    owner_ids: string;
}