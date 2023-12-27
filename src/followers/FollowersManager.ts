import { User } from "@prisma/client";
import { Reileta } from "../Reileta";
import { request } from "undici";

export class FollowersManager {
    constructor(private readonly app: Reileta) { }

    async createFollower(user: User, sid: string) {
        var eu = this.app.users.parseSID(sid);
        if (!eu.server || !eu.id) return null;

        try {
            const res = await request(eu.server.origin + "/api/info");
            if (res.statusCode !== 200) return null;
            const data: any = await res.body.json();
            eu.server = new URL('http' + data.data.address);
        } catch (e) {
            return null;
        }

        try {
            const res = await request(eu.server.origin + "/api/user?search=" + eu.id);
            if (res.statusCode !== 200) return null;
            const data: any = await res.body.json();
            if (data.error) return null;
            eu.id = data.data.id;
        }catch(e) {
            return null;
        }

        console.log(eu);
    }
}