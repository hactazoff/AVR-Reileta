import { Reileta } from "../Reileta";
import { ServerManager } from "./ServerManager";
import { PingRequest, PingResponse, SocketType } from "../utils/Interfaces";

export class ServerAPISocket {
    constructor(private readonly app: Reileta, private readonly manager: ServerManager) {
        // event preconnection
        this.app.io.use((socket: any, next) => this.onPreConnection(socket, next));
        this.app.io.on('connection', (socket: any) => this.onConnection(socket));
    }

    /**
     * When a socket is connected
     * @param socket 
     */
    onConnection(socket: SocketType) {
        socket.on('ping', (obj, callback) => this.onPing(socket, obj, callback));
    }

    /**
     * When a socket is connecting
     * @param socket 
     * @param next 
     */
    onPreConnection(socket: SocketType, next: (err?: any) => void) {
        socket.old_emit = socket.emit;
        socket.data = {};
        socket.onAny((event, ...args) => {
            if (event !== 'ping' && args.every(ar => ar.command !== 'transform')) {
                console.log(`Socket ${socket.id} received event ${event}.`);
                console.dir(args, { depth: Infinity });
            }
        });
        socket.emit = (event, ...args) => {
            if (event !== 'ping' && args.every(ar => ar.command !== 'transform')) {
                console.log(`Socket ${socket.id} emitted event ${event}.`);
                console.dir(args, { depth: Infinity });
            }
            return socket.old_emit(event, ...args);
        }
        next();
    }

    /**
     * When a ping is received
     * @param socket 
     * @param obj 
     * @param callback 
     */
    onPing(socket: SocketType, obj: PingRequest, callback: (obj: PingResponse) => void) {
        socket.emit('ping', {
            client: obj.time,
            server: Date.now()
        });
    }
}