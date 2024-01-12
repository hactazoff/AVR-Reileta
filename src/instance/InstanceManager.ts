import { randomBytes, randomFill } from "node:crypto";
import { Reileta } from "../Reileta";
import { ErrorCodes, GenerateId, getMyAdress } from "../utils/Constants";
import { InstanceInfos, InstanceInput, UserInfo, UserInstanceInfos, WorldInfos } from "../utils/Interfaces";
import { ErrorMessage, checkInstanceInput, checkUserInput } from "../utils/Security";
import { InstanceAPIWeb } from "./InstanceAPIWeb";
import { InstanceAPISocket } from "./InstanceAPISocket";
import { get } from "node:http";

export class InstanceManager {

    api_web: InstanceAPIWeb;
    api_socket: InstanceAPISocket;

    constructor(private readonly app: Reileta) {
        this.api_web = new InstanceAPIWeb(this.app, this);
        this.api_socket = new InstanceAPISocket(this.app, this);
    }

    /**
     * Get instance from id
     * @param id 
     * @param who 
     * @returns 
     */
    async getInstance(id: string, who?: UserInfo): Promise<InstanceInfos | ErrorMessage> {
        try {
            if (!who)
                return new ErrorMessage(ErrorCodes.UserNotLogged);
            if (!id || typeof id !== 'string')
                return new ErrorMessage(ErrorCodes.InstanceInvalidInput);

            const instance = await this.app.prisma.instance.findUnique({
                where: { id },
                include: { tags: true }
            });

            if (!instance)
                return new ErrorMessage(ErrorCodes.InstanceNotFound);

            const world = this.app.worlds.strIdToObject(instance.world);
            if (!world)
                return new ErrorMessage(ErrorCodes.WorldNotFound);
            let worldobj: WorldInfos | ErrorMessage;
            if (world.server && world.server !== getMyAdress())
                worldobj = await this.app.worlds.getExternalWorld(world.id, world.server, who);
            else worldobj = await this.app.worlds.getInternalWorld(world.id, who);
            if (worldobj instanceof ErrorMessage)
                return worldobj;

            const owner = this.app.users.strToObject(instance.owner);
            if (!owner)
                return new ErrorMessage(ErrorCodes.UserNotFound);
            let ownerobj: UserInfo | ErrorMessage;
            if (owner.server)
                ownerobj = await this.app.users.getExternalUser(owner.id, owner.server, who);
            else ownerobj = await this.app.users.getInternalUser(owner.id);
            if (ownerobj instanceof ErrorMessage)
                return ownerobj;

            let users: UserInstanceInfos[] = [];
            const sockets = this.app.io.sockets.adapter.rooms.get('instance:' + instance.id);
            if (sockets) {
                for (const id of sockets) {
                    const socket = this.app.io.sockets.sockets.get(id);
                    if (!socket)
                        continue;
                    const user = this.app.users.strToObject(socket.data.user_id);
                    if (!user)
                        continue;
                    let userobj: UserInfo | ErrorMessage;
                    if (user.server)
                        userobj = await this.app.users.getExternalUser(user.id, user.server, who);
                    else userobj = await this.app.users.getInternalUser(user.id);
                    if (userobj instanceof ErrorMessage)
                        continue;
                    users.push({
                        id: userobj.id,
                        username: userobj.username,
                        display: userobj.display,
                        connection_id: id,
                        is_moderator: false,
                        is_owner: userobj.id === ownerobj.id && userobj.server === ownerobj.server,
                        is_master: false,
                        is_bot: false,
                        external: userobj.external,
                        server: userobj.server,
                        tags: []
                    });
                }
            }

            return {
                id: instance.id,
                name: instance.name,
                capacity: instance.capacity,
                world: worldobj,
                owner: ownerobj,
                master: users.find(e => e.is_master) || null,
                server: getMyAdress(),
                created_at: instance.created_at,
                updated_at: instance.updated_at,
                tags: instance.tags.map(e => e.name),
                users: users,
                sockets: sockets ? Array.from(sockets) : [],
            };
        } catch (e) {
            console.warn(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }

    /**
     * Create an instance
     * @param who 
     * @returns 
     */
    async createInstance(input?: InstanceInput, who?: UserInfo): Promise<InstanceInfos | ErrorMessage> {
        try {
            if (!who)
                return new ErrorMessage(ErrorCodes.UserNotLogged);
            if (!input || !checkInstanceInput(input, who) || !input.world)
                return new ErrorMessage(ErrorCodes.InstanceInvalidInput);
            // get world from input
            const worldobj = this.app.worlds.strIdToObject(input.world);
            if (!worldobj)
                return new ErrorMessage(ErrorCodes.WorldNotFound);
            let world: WorldInfos | ErrorMessage;
            if (worldobj.server)
                world = await this.app.worlds.getExternalWorld(worldobj.id, worldobj.server, who);
            else world = await this.app.worlds.getInternalWorld(worldobj.id, who);
            if (world instanceof ErrorMessage)
                return world;
            var str_world = this.app.worlds.objectToStrId({
                id: world.id,
                version: input.version,
                server: world.server,
            });
            var str_owner = this.app.users.objectToStrId({
                id: who.id,
                server: who.server,
            });
            if (!str_owner)
                return new ErrorMessage(ErrorCodes.UserNotFound);
            if (!str_world)
                return new ErrorMessage(ErrorCodes.WorldNotFound);
            // create instance
            const instance = await this.app.prisma.instance.create({
                data: {
                    id: input.id || GenerateId.Instance(),
                    name: input.name || randomBytes(3).toString("hex"),
                    capacity: input.capacity || world.capacity,
                    world: str_world,
                    owner: str_owner,
                    tags: { create: input.tags ? input.tags.map(e => ({ name: e })) : [] },
                },
                include: { tags: true }
            });

            const sockets = this.app.io.sockets.adapter.rooms.get('instance:' + instance.id);

            return {
                id: instance.id,
                name: instance.name,
                capacity: instance.capacity,
                world: world,
                owner: who,
                master: null,
                server: getMyAdress(),
                created_at: instance.created_at,
                updated_at: instance.updated_at,
                tags: instance.tags.map(e => e.name),
                users: [],
                sockets: sockets ? Array.from(sockets) : [],
            };


        } catch (e) {
            console.warn(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }
}