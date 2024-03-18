import { Reileta } from "../Reileta";
import { SessionManager } from "./SessionManager";
import { ARequest, AResponse } from "../utils/Interfaces";
import { NextFunction } from "express";
import { ErrorMessage } from "../utils/Security";

export class SessionAPIWeb {
    constructor(private readonly app: Reileta, private readonly manager: SessionManager) { }

    /**
     * Middleware to authenticate the user
     * @param request 
     * @param response 
     * @param next 
     */
    async use(request: ARequest, response: AResponse, next: NextFunction) {
        if (request.data && request.data.token) {
            const out = await this.manager.get({ token: request.data.token }, "bypass");
            request.data.session = out instanceof ErrorMessage ? undefined : out;
        }
        next();
    }
}