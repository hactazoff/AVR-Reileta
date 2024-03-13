import { Reileta } from "../Reileta";
import { ErrorCodes } from "../utils/Constants";
import { RequestSocket, ResponseSocket, ResponseUserInfo, ResponseUserMeInfo, SocketType } from "../utils/Interfaces";
import { ErrorMessage, checkRequestSocket } from "../utils/Security";
import { AuthManager } from "./AuthManager";

export class AuthAPISocket {
    constructor(private readonly app: Reileta, private readonly manager: AuthManager) {
        this.app.io.on('connection', (socket: any) => this.onConnection(socket));
    }

    onConnection(socket: SocketType) {
        socket.on('local', (obj) => {
            if (checkRequestSocket(obj) && obj.command === 'avr/authenticate')
                this.onAuthenticate(socket, obj);
        });
    }

    onAuthenticate(socket: SocketType, obj: RequestSocket<any>) {
        var token = obj.data.token || null;
        var integrity = obj.data.integrity || null;
        if (!(typeof token === 'string' && integrity === null) && !(typeof integrity === 'string' && token === null))
            return socket.emit('avr/authenticate', new ErrorMessage(ErrorCodes.AuthInvalidInput), obj.state);
        if (token)
            return this.onAuthenticateWithToken(socket, token, obj);
        else if (integrity)
            return this.onAuthenticateWithIntegrity(socket, integrity, obj);
        return socket.emit('avr/authenticate', new ErrorMessage(ErrorCodes.InternalError), obj.state);
    }

    async onAuthenticateWithToken(socket: SocketType, token: string, obj: RequestSocket<any>) {
        let session = await this.app.sessions.getSession(token);
        if (session instanceof ErrorMessage) return socket.emit('avr/authenticate', session, obj.state);
        socket.join('avr:user:' + session.user.id);
        if (session.user.tags.includes('avr:admin'))
            socket.join('avr:admin');
        socket.data.user_id = session.user_id;
        socket.data.session_id = session.id;
        socket.data.is_internal = true;
        socket.data.is_integrity = false;
        socket.emit('avr/authenticate', {
            internal: true,
            user: {
                id: session.user.id,
                username: session.user.username,
                display: session.user.display,
                server: session.user.server
            } as ResponseUserMeInfo
        }, obj.state);
        console.log('User', session.user.id, 'connected with token');
    }

    async onAuthenticateWithIntegrity(socket: SocketType, integrity: string, obj: RequestSocket<any>) {
        let session = await this.app.integrity.getIntegrity(integrity);
        if (session instanceof ErrorMessage) return socket.emit('avr/authenticate', session, obj.state);
        var u = this.app.users.objectToStrId(session.user);
        if (!u) return socket.emit('avr/authenticate', new ErrorMessage(ErrorCodes.InternalError), obj.state);
        socket.join('avr:user:' + u);
        socket.data.user_id = u;
        socket.data.session_id = session.id;
        socket.data.is_internal = false;
        socket.data.is_integrity = true;
        socket.emit('avr/authenticate', {
            internal: false,
            user: {
                id: session.user.id,
                username: session.user.username,
                display: session.user.display,
                server: session.user.server
            } as ResponseUserInfo
        }, obj.state);
        console.log('User', session.user.id, 'connected with integrity');
    }
}