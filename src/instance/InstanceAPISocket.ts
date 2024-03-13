import { Reileta } from "../Reileta";
import { ErrorCodes } from "../utils/Constants";
import { SocketType, UserInfo } from "../utils/Interfaces";
import { ErrorMessage, checkRequestSocket } from "../utils/Security";
import { InstanceManager, QuitType } from "./InstanceManager";

export class InstanceAPISocket {
    constructor(private readonly app: Reileta, private readonly manager: InstanceManager) {
        this.app.io.on('connection', (socket: any) => this.onConnection(socket));
    }

    /**
     * When a socket is connected
     * @param socket 
     */
    onConnection(socket: SocketType) {
        socket.on('local', (...args) => args.forEach(arg => this.onLocal(socket, arg)));
        socket.on('disconnecting', () => this.onDisconnect(socket));
    }

    /**
     * When a local event is received
     * @param socket 
     * @param obj 
     */
    onLocal(socket: SocketType, obj: any) {
        try {
            if (checkRequestSocket<any>(obj))
                switch (obj.command) {
                    case 'avr/instance:enter':
                        this.joinInstance(socket, obj.data.instance, obj.state);
                        break;
                    case 'avr/instance:quit':
                        socket.emit('avr/instance:quit', new ErrorMessage(ErrorCodes.NotImplemented), obj.state);
                        break;
                }
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * When a user join an instance
     * @param socket 
     * @param instance 
     */
    async joinInstance(socket: SocketType, instance: string, state?: string) {
        const user = this.app.users.strToObject(socket.data.user_id);
        if (!user)
            return socket.emit('avr/instance:enter', new ErrorMessage(ErrorCodes.UserNotFound), state);
        let userobj: UserInfo | ErrorMessage;
        if (user.server)
            userobj = await this.app.users.getExternalUser(user.id, user.server);
        else userobj = await this.app.users.getInternalUser(user.id);
        if (userobj instanceof ErrorMessage)
            return socket.emit('avr/instance:enter', userobj, state);
        const instanceobj = await this.manager.getInstance(instance, userobj);
        if (instanceobj instanceof ErrorMessage)
            return socket.emit('avr/instance:enter', instanceobj, state);
        console.log('Join instance :', userobj.id, 'join', instanceobj.id);
        socket.join('instance:' + instanceobj.id);
        socket.broadcast.to('instance:' + instanceobj.id).emit('local', {
            command: 'avr/instance:join',
            data: {
                socket: socket.id,
                user: this.app.users.objectToStrId(userobj)
            }
        });
        return socket.emit('avr/instance:enter', {
            socket: socket.id,
            user: this.app.users.objectToStrId(userobj),
        }, state);
    }

    async quitInstance(socket: SocketType, instance: string, state?: string, type: QuitType = QuitType.Closed) {
        const user = this.app.users.strToObject(socket.data.user_id);
        if (!user)
            return socket.emit('avr/instance:quit', new ErrorMessage(ErrorCodes.UserNotFound), state);
        let userobj: UserInfo | ErrorMessage;
        if (user.server)
            userobj = await this.app.users.getExternalUser(user.id, user.server);
        else userobj = await this.app.users.getInternalUser(user.id);
        if (userobj instanceof ErrorMessage)
            return socket.emit('avr/instance:quit', userobj, state);
        const instanceobj = await this.manager.getInstance(instance, userobj);
        if (instanceobj instanceof ErrorMessage)
            return socket.emit('avr/instance:quit', instanceobj, state);
        console.log('Quit instance :', userobj.id, 'quit', instanceobj.id);
        socket.leave('instance:' + instanceobj.id);
        socket.broadcast.to('instance:' + instanceobj.id).emit('local', {
            command: 'avr/instance:left',
            data: {
                socket: socket.id,
                type
            }
        });
        return socket.emit('avr/instance:quit', {
            socket: socket.id,
            message: 'You have left the instance',
            type
        }, state);
    }

    /**
     * When a socket is disconnecting
     * @param socket 
     */
    onDisconnect(socket: SocketType) {
        socket.rooms.forEach(room => {
            if (room.startsWith('instance:')) 
                this.quitInstance(socket, room.slice(9), undefined, QuitType.Disconnected);
        });
    }

}
