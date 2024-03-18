import Express, { NextFunction } from "express";
import { Reileta } from "../Reileta";
import { ARequest, AResponse, ResponseServerInfo, ServerInfo } from "../utils/Interfaces";
import { ServerManager } from "./ServerManager";
import { ErrorCodes } from "../utils/Constants";
import { ErrorMessage } from "../utils/Security";

export class ServerAPIWeb {
    constructor(private readonly app: Reileta, private readonly manager: ServerManager) {
        this.app.express.get('/api/server@:server', (q, s: any) => this.getExternalInfo(q, s));
        this.app.express.get('/api/teapot', (q, s: any) => this.getTeapot(q, s));

        // TODO: Server API
        this.app.express.get('/api/server', (q, s: any) => this.getInfo(s));
        // this.app.express.post('/api/server', Express.json(), (q, s: any) => this.notImplemented(q, s));
        this.app.express.get('/api/time', (q, s: any) => this.getTime(s));
        this.app.express.use('/.well-known/avr', (q, s: any) => this.wellKnownAVR(q, s));
    }

    /**
     * Well known AVR
     * @param request 
     * @param response 
     */
    wellKnownAVR(request: ARequest, response: AResponse) {
        response.sendStatus(200);
    }

    async getExternalInfo(request: ARequest, response: AResponse) {
        if (!request.params.server)
            return response.send(new ErrorMessage(ErrorCodes.ServerInvalidInput));
        const user = await request.data?.session?.getUser("bypass");
        if (!user) return response.send(new ErrorMessage(ErrorCodes.UserNotLogged));
        if (user instanceof ErrorMessage) return response.send(user);
        const server = await this.manager.getExInfos(request.params.server, user);
        if (server instanceof ErrorMessage) return response.send(server);
        const serverInfo: ResponseServerInfo = {
            id: server.id,
            title: server.title,
            description: server.description,
            address: server.address,
            gateways: {
                http: server.gateways.http.origin,
                ws: server.gateways.ws.origin
            },
            secure: server.secure,
            version: server.version,
            ready_at: server.ready_at.getTime(),
            icon: server.icon.href
        }
        response.send({ data: serverInfo });
    }

    /**
     * Get the server info
     * @param response 
     */
    getInfo(response: AResponse) {
        const infos = this.manager.getInfos();
        response.send({
            data: {
                id: this.app.id,
                title: infos.title || infos.id,
                description: infos.description,
                address: infos.address,
                gateways: {
                    http: infos.gateways.http.origin,
                    ws: infos.gateways.ws.origin
                },
                secure: infos.secure,
                version: this.app.version,
                ready_at: this.app.ready_at.getTime(),
                icon: infos.icon.href
            }
        });
    }

    /**
     * Get the server time
     * @param response 
     */
    getTime(response: AResponse) {
        response.send({ data: Date.now() });
    }

    /**
     * Get the teapot
     * @param request 
     * @param response 
     */
    getTeapot(request: ARequest, response: AResponse) {
        response.send(new ErrorMessage(ErrorCodes.Teapot));
    }

    /**
     * Middleware for the parsing of the requests
     * @param request 
     * @param response 
     * @param next 
     * @returns 
     */
    useBefore(request: ARequest, response: AResponse, next: NextFunction) {
        let ip = request.headers['cf-connecting-ip'] || request.headers['x-forwarded-for'] || request.connection.remoteAddress;
        console.log(new Date().toISOString(), '|', process.env.HIDE_IP == 'true' ? '<hidden>' : ip, '>', request.method.toUpperCase(), request.url);
        response.oldSend = response.send;
        response.send = (obj: any) => this.responseSender(request, response, next, obj);
        if (!this.app.serviceEnabled())
            return response.send({ error: ErrorCodes.ServiceDisabled });
        response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        response.setHeader('Pragma', 'no-cache');
        response.setHeader('Expires', '0');
        next();
    }

    /**
     * Middleware if the request is not found
     * @param request 
     * @param response 
     * @param next 
     * @returns 
     */
    useAfter(request: ARequest, response: AResponse, next: NextFunction) {
        response.send({ error: ErrorCodes.RequestNotFound });
    }

    /**
     * Middleware if the request is not implemented
     * @param request 
     * @param response 
     * @param next 
     * @returns 
     */
    notImplemented(request: ARequest, response: AResponse) {
        response.send({ error: ErrorCodes.RequestNotImplemented });
    }

    /**
     * Middleware send parsing response
     * @param request 
     * @param response 
     * @param next 
     * @returns 
     */
    private responseSender(request: ARequest, response: AResponse, next: NextFunction, obj: any) {
        if (typeof obj === 'object') {
            if (obj instanceof ErrorMessage)
                obj = { error: obj };
            if (obj.error) {
                if (typeof obj.error.status !== 'number')
                    obj.error.status = 400;
                response.status(obj.error.status);
            }
            obj.time = Date.now();
            obj.request = request.url;
        }
        response.oldSend(obj);
    }
}