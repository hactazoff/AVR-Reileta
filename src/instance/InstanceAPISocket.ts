import { Reileta } from "../Reileta";
import { ErrorCodes } from "../utils/Constants";
import { SocketType, UserInfo } from "../utils/Interfaces";
import { ErrorMessage } from "../utils/Security";
import { InstanceManager } from "./InstanceManager";

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
    }

    /**
     * When a local event is received
     * @param socket 
     * @param obj 
     */
    onLocal(socket: SocketType, obj: any) {
        if (obj.subgroup !== 'avr')
            return;
        switch (obj.command) {
            case 'instance:join':
                this.joinInstance(socket, obj.data.instance, obj.state);
                break;
        }
    }

    /**
     * When a user join an instance
     * @param socket 
     * @param instance 
     */
    async joinInstance(socket: SocketType, instance: string, state: string) {
        console.log(`User ${socket.data.user_id} is joining instance ${instance}.`);
        const user = this.app.users.strToObject(socket.data.user_id);
        if (!user)
            return socket.emit('local', {
                state: state,
                command: 'instance:join',
                subgroup: 'avr',
                data: { success: false },
                error: new ErrorMessage(ErrorCodes.UserNotFound)
            });
        let userobj: UserInfo | ErrorMessage;
        if (user.server)
            userobj = await this.app.users.getExternalUser(user.id, user.server);
        else userobj = await this.app.users.getInternalUser(user.id);
        if (userobj instanceof ErrorMessage)
            return socket.emit('local', {
                state: state,
                command: 'instance:join',
                subgroup: 'avr',
                data: { success: false },
                error: userobj
            });
        const instanceobj = await this.manager.getInstance(instance, userobj);
        if (instanceobj instanceof ErrorMessage)
            return socket.emit('local', {
                state: state,
                command: 'instance:join',
                subgroup: 'avr',
                data: { success: false },
                error: instanceobj
            });
        console.dir(instanceobj, { depth: Infinity });
        socket.join('instance:' + instanceobj.id);
        return socket.emit('local', {
            state: state,
            command: 'instance:join',
            subgroup: 'avr',
            data: { success: true },
            error: undefined
        });
    }
}