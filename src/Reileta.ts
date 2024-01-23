import EventEmitter from "events";
import { PrismaClient } from '@prisma/client';
import Express from "express";
import SocketIO from "socket.io";
import HTTP from 'http';
import cookieParser from 'cookie-parser';
import { PluginManager } from "./plugins/PluginManager";
import { ServerManager } from "./server/ServerManager";
import { UserManager } from "./users/UserManager";
import { SessionManager } from "./sessions/SessionManager";
import { AuthManager } from "./auth/AuthManager";
import { cwd } from "process";
import { join } from "path";
import { WorldManager } from "./worlds/WorldManager";
import mutler from "multer";
import { readdirSync, statSync, unlinkSync } from "node:fs";
import { getMyAdress, getName, getPort, getTmpFileExpiration, isSecure } from "./utils/Constants";
import { HomeManager } from "./home/HomeManager";
import { InstanceManager } from "./instance/InstanceManager";
import { IntegrityManager } from "./integrity/IntegrityManager";
import { FollowManager } from "./followers/FollowManager";

export class Reileta extends EventEmitter {

    version = "4.0.0";
    compatible_versions = [];

    http: HTTP.Server;
    prisma: PrismaClient;
    plugins: PluginManager;
    express: Express.Application;
    io: SocketIO.Server;
    server: ServerManager;
    users: UserManager;
    sessions: SessionManager;
    auth: AuthManager;
    id: string;
    public_path = join(cwd(), "public");
    worlds: WorldManager;
    upload: mutler.Multer;
    ready_at: Date = new Date(0);
    home: HomeManager;
    instances: InstanceManager;
    integrity: IntegrityManager;
    follows: FollowManager;

    constructor() {
        super();

        if (typeof process.env.REILETA_ID !== "string")
            throw new Error("REILETA_ID is not defined.");
        this.id = process.env.REILETA_ID;

        // Initialise l'application
        console.debug("Initialise l'application");
        this.express = Express();
        this.express.use((q, s: any, n) => this.server.api_web.useBefore(q, s, n));
        this.http = HTTP.createServer(this.express);
        this.io = new SocketIO.Server(this.http, {
            transports: ['websocket'],
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
                credentials: isSecure(),
            }
        });
        // Ajoute les middleware
        console.debug("Ajout des middleware");
        this.server = new ServerManager(this);
        this.upload = mutler({
            storage: mutler.diskStorage({
                destination: join(cwd(), "tmp"),
                filename: (req, file, cb) => {
                    for (const file of readdirSync(join(cwd(), "tmp")))
                        if (Date.now() - statSync(join(cwd(), "tmp", file)).mtimeMs > getTmpFileExpiration())
                            unlinkSync(join(cwd(), "tmp", file));
                    return cb(null, Date.now() + '-' + file.originalname);
                }
            })
        });
        this.express.use(cookieParser());
        this.express.use(Express.static(this.public_path));

        // Reférencement des Managers
        this.express.use((q, s: any, n) => this.auth.api_web.use(q, s, n));
        this.express.use((q, s: any, n) => this.sessions.api_web.use(q, s, n));

        // Initialise les managers
        this.prisma = new PrismaClient();
        this.auth = new AuthManager(this);
        this.sessions = new SessionManager(this);
        this.users = new UserManager(this);
        this.plugins = new PluginManager(this);
        this.worlds = new WorldManager(this);
        this.home = new HomeManager(this);
        this.instances = new InstanceManager(this);
        this.integrity = new IntegrityManager(this);
        this.follows = new FollowManager(this); 


        // Reférence le gestionnaire de plugins
        console.debug("Reférence le gestionnaire de plugins");
        this.plugins.loadPlugins();

        this.express.use((q, s: any, n) => this.server.api_web.useAfter(q, s, n));

        // show all routes
        this.express._router.stack.forEach(function (r: any) {
            if (r.route && r.route.path) {
                for (const method in r.route.methods)
                    console.log(method.toUpperCase()+'\t', r.route.path);
            }
        })

        this.http.listen(getPort(), () => {
            console.log(`Service "${getName()}" started at ${getMyAdress()}.`);
            this.ready_at = new Date();
        });
    }


    serviceEnabled(): boolean {
        return Boolean(process.env.REILETA_ENABLE || true)
    }
}