import Player from "./Players";
import { Reileta } from "../Reileta";
import { Instance } from "../instance/Instance";
import { SocketType } from "../utils/Interfaces";
import User from "../users/User";

export class PlayerManager {

    get(id: string, who: User | "bypass") {
        return this.app.cache.get<Player>(id);
    }

    create(input: PlayerCreate, who: User | "bypass") {
        const player = new Player(this.app, input.instance, input.socket, input.user);
        this.app.cache.set<Player>(player.id, player);
        return player;
    }

    delete(id: string, who: User | "bypass") {
        return this.app.cache.delete(id);
    }

    constructor(private readonly app: Reileta) { }
}

export interface PlayerCreate {
    user: User;
    instance: Instance;
    socket: SocketType;
}