import { Reileta } from "../Reileta";
import { ErrorCodes } from "../utils/Constants";
import { ARequest, AResponse, ResponseHomeInfo } from "../utils/Interfaces";
import { ErrorMessage } from "../utils/Security";
import { HomeManager } from "./HomeManager";

export class HomeAPIWeb {
    constructor(private readonly app: Reileta, private readonly manager: HomeManager) {
        this.app.express.get('/api/users/@me/home', (q, s: any) => this.getMyHome(q, s));
        // this.app.express.get('/api/users/:id/home', (q, s: any) => this.app.server.api_web.notImplemented(q, s));
    }

    async getMyHome(request: ARequest, response: AResponse) {
        const who = await request.data?.session?.getUser("bypass");
        if (!who) return response.send(new ErrorMessage(ErrorCodes.UserNotLogged));
        if (who instanceof ErrorMessage) return response.send(who);
        const home = await this.manager.getHome(who.id, who);
        if (home instanceof ErrorMessage) return response.send(home);
        const res: ResponseHomeInfo = {
            id: home.id,
            title: home.title,
            description: home.description,
            thumbnail: home.thumbnail?.href,
            tags: home.tags,
            server: home.server,
            capacity: home.capacity,
            owner_ids: this.app.users.stringify(this.app.users.parseString(home.ownerIds), home.server),
            external: !home.internal,
            fallback: home.isFallback,
            assets: home.assets.filter(e => !e.isEmpty || (typeof request.query.empty !== 'undefined' && e.isEmpty)).map(e => ({
                id: e.id,
                version: e.version,
                empty: e.isEmpty,
                url: e.url?.href,
                hash: e.hash,
                engine: e.engine,
                size: e.size || 0,
                platform: e.platform
            }))
        }
        response.send({ data: res });
    }
}