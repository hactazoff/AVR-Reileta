import { Reileta } from "../Reileta";
import { ErrorCodes } from "../utils/Constants";
import { RequestSocket, ResponseSocket, SocketType } from "../utils/Interfaces";
import { ErrorMessage, checkRequestSocket } from "../utils/Security";
import { AuthManager } from "./AuthManager";

export class AuthAPISocket {
    constructor(private readonly app: Reileta, private readonly manager: AuthManager) {
        this.app.io.on('connection', (socket: any) => this.onConnection(socket));
    }

    onConnection(socket: SocketType) {
        socket.on('local', (...objs) => {
            for (const obj of objs) {
                if (checkRequestSocket(obj) && obj.command === 'authenticate' && obj.subgroup === "avr")
                    this.onAuthenticate(socket, obj);
            }
        });
    }

    onAuthenticate(socket: SocketType, obj: RequestSocket<any>) {
        var token = obj.data.token || null;
        var integrity = obj.data.integrity || null;
        if (!(typeof token === 'string' && integrity === null) && !(typeof integrity === 'string' && token === null))
            return socket.emit('local', {
                state: obj.state,
                command: obj.command,
                subgroup: obj.subgroup,
                data: { success: false },
                error: ErrorCodes.AuthInvalidInput
            } as ResponseSocket<any>);
        if (token)
            return this.onAuthenticateWithToken(socket, token, obj);
        else if (integrity)
            return this.onAuthenticateWithIntegrity(socket, integrity, obj);
        else return socket.emit('local', {
            state: obj.state,
            command: obj.command,
            subgroup: obj.subgroup,
            data: { success: false },
            error: new ErrorMessage(ErrorCodes.InternalError)
        } as ResponseSocket<any>);

    }

    async onAuthenticateWithToken(socket: SocketType, token: string, obj: RequestSocket<any>) {
        let session = await this.app.sessions.getSession(token);
        if (session instanceof ErrorMessage) return socket.emit('local', {
            state: obj.state,
            command: obj.command,
            subgroup: obj.subgroup,
            data: { success: false },
            error: session
        } as ResponseSocket<any>);
        socket.join('avr:user:' + session.user.id);
        if (session.user.tags.includes('avr:admin'))
            socket.join('avr:admin');
        socket.data.user_id = session.user_id;
        socket.data.session_id = session.id;
        socket.data.is_internal = true;
        socket.data.is_integrity = false;
        socket.emit('local', {
            state: obj.state,
            command: obj.command,
            subgroup: obj.subgroup,
            data: { success: true },
            error: undefined
        } as ResponseSocket<any>);
    }

    async onAuthenticateWithIntegrity(socket: SocketType, integrity: string, obj: RequestSocket<any>) {
        let session = await this.app.integrity.getIntegrity(integrity);
        if (session instanceof ErrorMessage) return socket.emit('local', {
            state: obj.state,
            command: obj.command,
            subgroup: obj.subgroup,
            data: undefined,
            error: session
        } as ResponseSocket<any>);
        var u = this.app.users.objectToStrId(session.user);
        if (!u) return socket.emit('local', {
            state: obj.state,
            command: obj.command,
            subgroup: obj.subgroup,
            data: undefined,
            error: new ErrorMessage(ErrorCodes.InternalError)
        } as ResponseSocket<any>);
        socket.join('avr:user:' + u);
        socket.data.user_id = u;
        socket.data.session_id = session.id;
        socket.data.is_internal = false;
        socket.data.is_integrity = true;
        socket.emit('local', {
            state: obj.state,
            command: obj.command,
            subgroup: obj.subgroup,
            data: { success: true },
            error: undefined
        } as ResponseSocket<any>);
    }
}