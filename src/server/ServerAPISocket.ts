import { Reileta } from "../Reileta";
import { ServerManager } from "./ServerManager";
import { PingRequest, PingResponse, SocketType } from "../utils/Interfaces";

export class ServerAPISocket {
    constructor(private readonly app: Reileta, private readonly manager: ServerManager) {
        this.app.io.on('connection', (socket) => this.onConnection(socket));
    }

    /**
     * When a socket is connected
     * @param socket 
     */
    onConnection(socket: SocketType) {
        socket.on('ping', (obj, callback) => this.onPing(socket, obj, callback));
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