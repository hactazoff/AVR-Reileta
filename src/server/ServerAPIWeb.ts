import Express, { NextFunction } from "express";
import { Reileta } from "../Reileta";
import { ARequest, AResponse } from "../utils/Interfaces";
import { ServerManager } from "./ServerManager";
import { ErrorCodes } from "../utils/Constants";
import { ErrorMessage } from "../utils/Security";

export class ServerAPIWeb {
    constructor(private readonly app: Reileta, private readonly manager: ServerManager) {
        this.app.express.get('/api/server@:server', (q, s: any) => this.getExternalInfo(q, s));
        
        // TODO: Server API
        this.app.express.get('/api/server', (q, s: any) => this.getInfo(s));
        this.app.express.post('/api/server', Express.json(), (q, s: any) => this.notImplemented(q, s));

        this.app.express.get('/api/time', (q, s: any) => this.getTime(s));
    }

    async getExternalInfo(request: ARequest, response: AResponse) {
        const server = await this.manager.getExternalServer(request.params.server, request.data?.user);
    }

    /**
     * Get the server info
     * @param response 
     */
    getInfo(response: AResponse) {
        response.send({ data: this.manager.getParsedInfo });
    }

    /**
     * Get the server time
     * @param response 
     */
    getTime(response: AResponse) {
        response.send({ data: Date.now() });
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
        console.log(ip, '>', request.method.toUpperCase(), request.url);
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
            if(obj instanceof ErrorMessage)
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