import { randomBytes, randomFill } from "node:crypto";
import { Reileta } from "../Reileta";
import { ErrorCodes, GenerateId } from "../utils/Constants";
import { InstanceInfos, InstanceInput, UserInfo, WorldInfos } from "../utils/Interfaces";
import { ErrorMessage, checkInstanceInput, checkUserInput } from "../utils/Security";
import { InstanceAPIWeb } from "./InstanceAPIWeb";

export class InstanceManager {

    api_web: InstanceAPIWeb;

    constructor(private readonly app: Reileta) {
        this.api_web = new InstanceAPIWeb(this.app, this);
    }

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

            return {
                id: instance.id,
                name: instance.name,
                capacity: instance.capacity,
                world: world,
                owner: who,
                master: null,
                server: world.server,
                created_at: instance.created_at,
                updated_at: instance.updated_at,
                tags: instance.tags.map(e => e.name),
                users: [],
            };


        } catch (e) {
            console.warn(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }
}