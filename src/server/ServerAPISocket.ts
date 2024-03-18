import { Reileta } from "../Reileta";
import { ServerManager } from "./ServerManager";
import { PingRequest, PingResponse, SocketType } from "../utils/Interfaces";
import { ErrorMessage } from "../utils/Security";

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
        socket.on('local', obj => {
            try {
                if (typeof obj != "object" || !obj.command) return;
                switch (obj.command) {
                    case 'avr/ping':
                        socket.emit('avr/ping', {
                            i: obj.data.i,
                            o: Date.now()
                        } as PingResponse, obj.state);
                        break;
                }
            } catch (e) { }
        });
    }

    /**
     * When a socket is connecting
     * @param socket 
     * @param next 
     */
    onPreConnection(socket: SocketType, next: (err?: any) => void) {
        socket.old_emit = socket.emit;
        var ip = socket.handshake.headers['cf-connecting-ip'] || socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
        socket.data = { ip: typeof ip === 'string' ? ip : ip[0], players: [] };
        console.log(`${new Date().toISOString()} | ${process.env.HIDE_IP == 'true' ? '<hidden>' : socket.data.ip} > Socket ${socket.id} connected.`);
        socket.on('local', (args) => {
            if (!this.no_print.includes(args.command))
                console.log(`${new Date().toISOString()} | ${process.env.HIDE_IP == 'true' ? '<hidden>' : socket.data.ip} > Socket ${socket.id} : received event ${args.command}.`);
        });
        socket.emit = (command, data, state, room) => {
            if (!this.no_print.includes(command))
                console.log(`${new Date().toISOString()} | ${process.env.HIDE_IP == 'true' ? '<hidden>' : socket.data.ip} > Socket ${socket.id} : emitted event ${command}.`);
            return socket.old_emit(room || 'local', {
                command: command,
                data: data instanceof ErrorMessage ? undefined : data,
                error: data instanceof ErrorMessage ? data : undefined,
                state: state
            });
        }

        socket.on('disconnect', () => {
            console.log(`${new Date().toISOString()} | ${process.env.HIDE_IP == 'true' ? '<hidden>' : socket.data.ip} > Socket ${socket.id} disconnected.`);
        });
        next();
    }

    public no_print: string[] = ['avr/ping', 'avr/transform'];
}