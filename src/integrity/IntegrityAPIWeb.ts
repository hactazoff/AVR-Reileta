import { Reileta } from "../Reileta";
import { ARequest, AResponse, ResponseIntegrityInfo, ResponseIntegrityServer } from "../utils/Interfaces";
import { ErrorMessage } from "../utils/Security";
import { IntegrityManager } from "./IntegrityManager";
import Express from "express";

export class IntegrityAPIWeb {
    constructor(private readonly app: Reileta, private readonly manager: IntegrityManager) {

        // server's requests to integrity of own users (for servers)
        this.app.express.put('/api/integrity', Express.json(), (req, res: any) => this.onPut(req, res));

        // user requests to integrity on other servers (for users)
        this.app.express.post('/api/integrity', Express.json(), (req, res: any) => this.onPost(req, res));
    }

    async onPost(request: ARequest, response: AResponse) {
        const integrity = await this.manager.createIntegrity(request.body, request.data?.session?.user);
        if (integrity instanceof ErrorMessage)
            return response.send({ error: integrity });
        var data: ResponseIntegrityInfo = {
            server: integrity.server.address,
            user: integrity.user.id,
            token: integrity.token,
            expires_at: integrity.expires_at.getTime(),
        };
        response.send({ data });
    }

    async onPut(request: ARequest, response: AResponse) {
        const integrity = await this.manager.makeIntegrity(request.body);
        if (integrity instanceof ErrorMessage)
            return response.send({ error: integrity });
        var data: ResponseIntegrityServer = {
            id: integrity.id,
            user: this.app.users.objectToStrId(integrity.user) || integrity.user.id,
            token: integrity.token,
            expires_at: integrity.expires_at.getTime(),
        };
        response.send({ data });
    }
}