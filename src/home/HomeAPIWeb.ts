import { Reileta } from "../Reileta";
import { ARequest, AResponse, ResponseHomeInfo } from "../utils/Interfaces";
import { ErrorMessage } from "../utils/Security";
import { HomeManager } from "./HomeManager";

export class HomeAPIWeb {
    constructor(private readonly app: Reileta, private readonly manager: HomeManager) {
        // this.app.express.get('/api/users/@me/home', (q, s: any) => this.getMyHome(q, s));
        this.app.express.get('/api/users/:id/home', (q, s: any) => this.app.server.api_web.notImplemented(q, s));
    }

    async getMyHome(request: ARequest, response: AResponse) {
        const logged = await this.manager.getHome(request.data?.user?.id, request.data?.user);
        if (logged instanceof ErrorMessage)
            return response.send(logged);
        const res: ResponseHomeInfo = {
            id: logged.id,
            title: logged.title,
            description: logged.description,
            thumbnail: logged.thumbnail?.href,
            tags: logged.tags,
            server: logged.server,
            capacity: logged.capacity,
            owner_id: logged.owner_id,
            external: logged.external,
            fallback: logged.fallback,
            assets: logged.assets.map(e => ({
                id: e.id,
                version: e.version,
                empty: typeof request.params.empty !== 'undefined' ? true : e.empty,
                url: typeof request.params.empty !== 'undefined' ? "unknown" : (e.url?.href || "unknown"),
                hash: typeof request.params.empty !== 'undefined' ? "unknown" : e.hash,
                engine: typeof request.params.empty !== 'undefined' ? "unknown" : e.engine,
                size: typeof request.params.empty !== 'undefined' ? 0 : e.size,
                platform: typeof request.params.empty !== 'undefined' ? "unknown" : e.platform,
            }))
        }
        response.send({ data: res });
    }
}