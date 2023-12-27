import { HomeInfo, UserInfo, WorldInfos } from "../utils/Interfaces";
import { Reileta } from "../Reileta";
import { HomeAPIWeb } from "./HomeAPIWeb";
import { ErrorCodes, getMyAdress } from "../utils/Constants";
import { ErrorMessage, checkUserTags } from "../utils/Security";

export class HomeManager {

    api_web: HomeAPIWeb;

    constructor(private readonly app: Reileta) {
        this.api_web = new HomeAPIWeb(this.app, this);
    }

    async getHome(id?: string, who?: UserInfo): Promise<WorldInfos | ErrorMessage> {
        try {
            if (!id)
                return new ErrorMessage(ErrorCodes.UserInvalidInput);
            if (!who)
                return new ErrorMessage(ErrorCodes.UserInvalidInput);
            if (!checkUserTags(who, ['avr:admin'])
                && !(checkUserTags(who, ['avr:get_home_user']))
                && id !== who.id
            ) return new ErrorMessage(ErrorCodes.UserDontHavePermission);
            const user = await this.app.users.getInternalUser(id);
            if (user instanceof ErrorMessage) return user;
            const obj = this.app.worlds.strIdToObject(user.home);
            let world: WorldInfos | ErrorMessage = new ErrorMessage(ErrorCodes.WorldNotFound);
            if (obj?.server && obj.server !== getMyAdress())
                world = await this.app.worlds.getExternalWorld(obj.server, obj.id);
            else world = await this.app.worlds.getInternalWorld(obj?.id);
            if (world instanceof ErrorMessage)
                world = await this.app.worlds.getFallbackWorld();
            return world;
        } catch (e) {
            console.warn(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }
}