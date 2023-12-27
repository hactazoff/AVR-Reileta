import { Reileta } from "../Reileta";
import { FollowersManager } from "./FollowersManager";

export class FollowersAPIWeb {
    constructor(private readonly app: Reileta, private readonly manager: FollowersManager) {
        app.express.get
    }
}