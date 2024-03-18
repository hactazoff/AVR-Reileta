import { Reileta } from "../Reileta";
import { HomeAPIWeb } from "./HomeAPIWeb";
import { ErrorCodes } from "../utils/Constants";
import { ErrorMessage } from "../utils/Security";
import User from "../users/User";
import World from "../worlds/World";

export class HomeManager {

    api_web: HomeAPIWeb;

    constructor(private readonly app: Reileta) {
        this.api_web = new HomeAPIWeb(this.app, this);
    }

    async getHome(user_id: string, who: User | "bypass"): Promise<World | ErrorMessage> {
        try {
            const user = await this.app.users.get({ id: user_id }, who);
            if (user instanceof ErrorMessage) return user;
            let world = await user.getHome(who);
            if (world instanceof ErrorMessage)
                world = await this.app.worlds.getFallbackWorld(who);
            if (world instanceof ErrorMessage) return world;
            return world;
        } catch (e) {
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }
}