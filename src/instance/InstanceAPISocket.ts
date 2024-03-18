import { on } from "events";
import { Reileta } from "../Reileta";
import Player from "../players/Players";
import { ErrorCodes, MatchID } from "../utils/Constants";
import { ModerationType, QuitType, SocketType, UserInfo } from "../utils/Interfaces";
import { ErrorMessage, checkRequestSocket } from "../utils/Security";
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
        socket.on('local', args => this.onLocal(socket, args));
        socket.onAny((event: string, arg: any) => {
            if (event.match(MatchID.Instance))
                this.onInstance(socket, event, arg);
        });
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
                    case 'avr/enter':
                        this.onEnterInstance(socket, obj);
                        break;
                    case 'avr/quit':
                        this.onQuitInstance(socket, obj);
                        break;
                }
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * When a socket enters an instance
     * @param socket 
     * @param obj 
     */
    async onEnterInstance(socket: SocketType, obj: any) {
        if (!socket.data.user_ids) return socket.emit('avr/enter', new ErrorMessage(ErrorCodes.UserNotLogged), obj.state);
        const user = await this.app.users.get(this.app.users.parseString(socket.data.user_ids), "bypass");
        if (user instanceof ErrorMessage) return socket.emit('avr/enter', user, obj.state);
        const instance = await this.manager.get({ id: obj.data.instance }, user);
        if (instance instanceof ErrorMessage) return socket.emit('avr/enter', instance, obj.state);

        // Check if the user is allowed to enter the instance
        const out = instance.canEnter(user);
        if (out instanceof ErrorMessage)
            return socket.emit('avr/enter', out, obj.state);

        // Join the instance
        var player = this.app.players.create({ user, instance, socket }, "bypass");

        // Emit the event
        socket.broadcast.to('instance:' + instance.id).emit(instance.id, {
            "command": "avr/join",
            "data": {
                "player": player.id,
                "user": user.toString(true),
                "display": player.display,
            }
        });

        socket.data.players.push(player.id);
        socket.join('instance:' + instance.id);
        console.log('Player', player.id, 'entered the instance', instance.id);

        // Emit the response
        socket.emit('avr/enter', {
            "instance": instance.toString(true),
            "player": player.id,
            "user": user.toString(true),
            "display": player.display,
        }, obj.state);
    }

    /**
     * When a socket quits an instance
     * @param socket 
     * @param obj 
     */
    async onQuitInstance(socket: SocketType, obj: any) {
        if (!socket.data.user_ids) return socket.emit('avr/quit', new ErrorMessage(ErrorCodes.UserNotLogged), obj.state);
        const user = await this.app.users.get(this.app.users.parseString(socket.data.user_ids), "bypass");
        if (user instanceof ErrorMessage) return socket.emit('avr/quit', user, obj.state);
        const instance = await this.manager.get({ id: obj.data.instance }, user);
        if (instance instanceof ErrorMessage) return socket.emit('avr/quit', instance, obj.state);

        const player = instance.players.find(p => socket.data.players.includes(p.id));
        if (!player) return socket.emit('avr/quit', new ErrorMessage(ErrorCodes.PlayerNotFound), obj.state);

        // Emit the event
        socket.broadcast.to('instance:' + instance.id).emit(instance.id, {
            "command": "avr/left",
            "data": {
                "player": player.id,
                "type": QuitType.Closed
            }
        });

        // Remove the player
        this.app.players.delete(player.id, user);
        socket.leave('instance:' + instance.id);
        console.log('Player', player.id, 'left the instance', instance.id);
        // Emit the response
        socket.emit('avr/quit', {
            "instance": instance.toString(true),
            "player": player.id,
            "type": QuitType.Closed
        }, obj.state);
    }

    /**
     * When a socket disconnects
     * @param socket 
     */
    async onDisconnect(socket: SocketType) {
        for (const player_id of socket.data.players) {
            const player = this.app.players.get(player_id, "bypass")?.value;
            const instance = await player?.instance;
            if (!player || !instance || instance instanceof ErrorMessage) continue;
            console.log('Player', player.id, 'disconnected from the instance', instance.id);
            socket.broadcast.to('instance:' + instance.id).emit(instance.id, {
                "command": "avr/left",
                "data": { "player": player.id, "type": QuitType.Disconnected }
            });
        }
    }

    /**
     * When a socket is connected
     * @param socket 
     * @param event 
     * @param obj 
     */
    onInstance(socket: SocketType, instance: string, obj: any) {
        switch (obj.command) {
            case 'avr/transform':
                this.onTransform(socket, instance, obj);
                break;
        }
    }

    precision = 10000;
    runtransform = false;

    /**
     * When a socket transforms an instance
     * @param socket 
     * @param instance 
     * @param obj 
     */
    async onTransform(socket: SocketType, instance_id: string, obj: any) {
        if (!socket.data.user_ids || this.runtransform) return;
        const instance = await this.manager.get({ id: instance_id }, "bypass");
        if (instance instanceof ErrorMessage) return;
        const player = instance.players.find(p => socket.data.players.includes(p.id));
        if (!player) return;
        let onplayer = null;
        var path = obj.data.path;
        if (path.startsWith('p:')) {
            const player_id = path.split('/')[0].substr(2);
            path = path.split('/').slice(1).join('/');
            if (player_id === '@me' || player_id === player.id)
                onplayer = player;
            else {
                onplayer = instance.players.find(p => p.id === player_id);
            }
        }
        if (!onplayer) return;
        let lasttransform = player.transforms['/' + path] || { at: 0 };
        if (obj.data.at < lasttransform.at) return;
        lasttransform.at = 0;
        const hashlasttransform = JSON.stringify(lasttransform);
        player.transforms['/' + path] = {
            position: {
                x: ~~(obj.data.p.x * this.precision) / this.precision,
                y: ~~(obj.data.p.y * this.precision) / this.precision,
                z: ~~(obj.data.p.z * this.precision) / this.precision,
            },
            rotation: {
                x: ~~(obj.data.r.x * this.precision) / this.precision,
                y: ~~(obj.data.r.y * this.precision) / this.precision,
                z: ~~(obj.data.r.z * this.precision) / this.precision,
                w: ~~(obj.data.r.w * this.precision) / this.precision,
            },
            scale: {
                x: ~~(obj.data.s.x * this.precision) / this.precision,
                y: ~~(obj.data.s.y * this.precision) / this.precision,
                z: ~~(obj.data.s.z * this.precision) / this.precision,
            },
            velocity: obj.data.v ? {
                x: ~~(obj.data.v.x * this.precision) / this.precision,
                y: ~~(obj.data.v.y * this.precision) / this.precision,
                z: ~~(obj.data.v.z * this.precision) / this.precision,
            } : { x: 0, y: 0, z: 0 },
            angular_velocity: obj.data.a ? {
                x: ~~(obj.data.a.x * this.precision) / this.precision,
                y: ~~(obj.data.a.y * this.precision) / this.precision,
                z: ~~(obj.data.a.z * this.precision) / this.precision,
            } : { x: 0, y: 0, z: 0},
            at: 0
        }
        if (hashlasttransform === JSON.stringify(player.transforms['/' + path])) return;
        player.transforms['/' + path].at = obj.data.at;
        socket.broadcast.to('instance:' + instance.id).emit(instance.id, {
            "command": "avr/transform",
            "data": {
                "player": player.id,
                "path": 'p:' + onplayer.id + '/' + path,
                "p": player.transforms['/' + path].position,
                "r": player.transforms['/' + path].rotation,
                "s": player.transforms['/' + path].scale,
                "v": player.transforms['/' + path].velocity,
                "a": player.transforms['/' + path].angular_velocity,
            }
        });
    }
}
