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
        let session = await this.app.sessions.get({ token }, "bypass");
        if (session instanceof ErrorMessage) return socket.emit('avr/authenticate', session, obj.state);
        const user = await session.getUser("bypass");
        if (user instanceof ErrorMessage) return socket.emit('avr/authenticate', user, obj.state);
        socket.join('avr:user:' + user.id);
        if (user.tags.includes('avr:admin'))
            socket.join('avr:admin');
        socket.data.user_ids = user.toString();
        socket.data.session_id = session.id;
        socket.data.is_internal = true;
        socket.data.is_integrity = false;
        socket.emit('avr/authenticate', {
            internal: true,
            user: {
                id: user.id,
                username: user.username,
                display: user.display,
                server: user.server,
                thumbnail: user.thumbnail?.href,
                banner: user.banner?.href,
                tags: user.tags,
                external: !user.internal,
            } as ResponseUserMeInfo
        }, obj.state);
        console.log('User', user.id, 'connected with token');
    }

    async onAuthenticateWithIntegrity(socket: SocketType, integrity: string, obj: RequestSocket<any>) {
        return socket.emit('avr/authenticate', new ErrorMessage(ErrorCodes.NotImplemented), obj.state);
    }
}