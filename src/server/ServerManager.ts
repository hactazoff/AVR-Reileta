import { Reileta } from "../Reileta";
import { ResponseBase, ResponseServerInfo, ServerInfo, UserInfo } from "../utils/Interfaces";
import { ServerAPIWeb } from "./ServerAPIWeb";
import { ServerAPISocket } from "./ServerAPISocket";
import { ErrorCodes, GenerateId, getDescription, getIcon, getMyAdress, getName, isSecure } from "../utils/Constants";
import { ErrorMessage, checkBaseResponse, checkServerResponse, checkUserTags } from "../utils/Security";
import { get } from "http";
export class ServerManager {

    api_web: ServerAPIWeb;
    api_socket: ServerAPISocket;

    constructor(private readonly app: Reileta) {
        this.api_web = new ServerAPIWeb(this.app, this);
        this.api_socket = new ServerAPISocket(this.app, this);
    }


    /**
     * Cache of the servers discovered
     */
    cacheServers = new Map<string, ServerInfo>();
    links = new Map<string, string>();

    /**
     * Find a server in the cache
     * @param address address of the server
     * @returns 
     */
    findCacheServer(address: string): ServerInfo | null {
        if (this.cacheServers.has(address))
            return this.cacheServers.get(address) || null;
        if (this.links.has(address))
            return this.cacheServers.get(this.links.get(address) || "") || null;
        for (const value of this.cacheServers.values())
            if (value.address === address)
                return value;
        return null;
    }


    /**
     * Get the server info
     */
    get getInfo(): ServerInfo {
        return {
            id: this.app.id,
            title: getName(),
            description: getDescription(),
            address: getMyAdress(),
            secure: isSecure(),
            gateways: {
                http: new URL(`http${isSecure() ? 's' : ''}://` + getMyAdress()),
                ws: new URL(`http${isSecure() ? 's' : ''}://` + getMyAdress()),
                proxy: new URL(`http${isSecure() ? 's' : ''}://` + getMyAdress())
            },
            version: this.app.version,
            ready_at: this.app.ready_at,
            icon: getIcon(),
            internal: true
        }
    }

    /**
     * Get the server info parsed for the client
     */
    get getParsedInfo(): ResponseServerInfo {
        const infos = this.getInfo;
        return {
            id: this.app.id,
            title: infos.title || infos.id,
            description: infos.description,
            address: infos.address,
            gateways: {
                http: infos.gateways.http.origin,
                ws: infos.gateways.ws.origin,
                proxy: infos.gateways.proxy.origin
            },
            secure: infos.secure,
            version: this.app.version,
            ready_at: this.app.ready_at.getTime(),
            icon: infos.icon.href
        }
    }

    /**
     * Set the server info
     * @param data data to update
     */
    setInfo(data: any) {
        var service_enabled = data.service_enabled === true;

        // here to update 
    }

    /**
     * Get a server info
     * @param server address of the server
     * @returns 
     */
    async getServer(server: string): Promise<ServerInfo | null> {
        try {
            server = new URL(server).host;
        } catch {
            try {
                server = new URL("h://" + server).host;
            } catch {
                return null;
            }
        }

        // If the server is in the cache, return the cached server info
        let cached: ServerInfo | null = this.findCacheServer(server);

        if (cached && cached.address === getMyAdress())
            return this.getInfo;

        if (cached)
            return cached;

        let found: ResponseServerInfo | null = null;

        for (const secure of ['s', ''])
            try {
                const url = new URL(`http${secure}://${server}/api/server`);
                const res = await fetch(url.href, { method: "GET" });
                if (!res.ok)
                    continue;
                const body = (await res.json() as any);
                if (!body || !body.data || body.error || !checkServerResponse(body.data))
                    continue;
                found = body.data;
                break;
            } catch { }

        if (!found)
            return null;

        cached = {
            id: found.id,
            title: found.title,
            description: found.description,
            address: found.address,
            gateways: {
                http: new URL(found.gateways.http),
                ws: new URL(found.gateways.ws),
                proxy: new URL(found.gateways.proxy)
            },
            secure: found.secure,
            version: found.version,
            ready_at: new Date(found.ready_at),
            icon: new URL(found.icon),
            internal: false
        }


        let dbserver = await this.app.prisma.server.findFirst({
            where: { address: cached.address }
        });

        if (dbserver)
            dbserver = await this.app.prisma.server.update({
                where: { id: dbserver.id },
                data: { address: cached.address, secure: cached.secure }
            });
        else
            dbserver = await this.app.prisma.server.create({
                data: {
                    id: GenerateId.Server(),
                    address: cached.address,
                    secure: cached.secure
                }
            });

        cached.id = dbserver.id;

        this.links.set(cached.address, cached.id);
        this.links.set(cached.gateways.http.host, cached.id);
        this.links.set(cached.gateways.ws.host, cached.id);
        this.links.set(server, cached.id);

        cached.challenge = dbserver.challenge || undefined;
        this.cacheServers.set(dbserver.id, cached);
        return cached;
    }


    async getExternalServer(address?: string, who?: UserInfo): Promise<ServerInfo | ErrorMessage> {
        try {
            if (!who)
                return new ErrorMessage(ErrorCodes.UserNotLogged);
            if (!address || typeof address !== "string")
                return new ErrorMessage(ErrorCodes.ServerInvalidInput);
            if (address === getMyAdress() || (!checkUserTags(who, ["avr:fetch_external"]) && !checkUserTags(who, ['avr:admin'])))
                return new ErrorMessage(ErrorCodes.UserDontHavePermission);
            const server = await this.app.server.getServer(address);
            if (!server)
                return new ErrorMessage(ErrorCodes.ServerNotFound);
            return server;
        } catch (e) {
            console.warn(e);
            return new ErrorMessage(ErrorCodes.InternalError);
        }
    }

    /**
     * Fetch a server and return the response
     * @param server address of the server
     * @param path path to fetch
     * @param options options of the request
     * @param retry if the request is a retry (don't use)
     * @returns 
     */
    async fetch<T>(address: string, path: string, options: any = {}, retry = false): Promise<ResponseBase<T>> {
        let cached = this.findCacheServer(address);
        if (!cached)
            cached = await this.getServer(address);
        if (!cached)
            return {
                request: path,
                time: Date.now(),
                error: ErrorCodes.ServerNotFound
            };

        try {
            const url = new URL(path, cached.gateways.http);
            const res = await fetch(url.toString(), {
                method: options.method || "GET",
                headers: {
                    'user-agent': `AVR/${this.app.version}(Server; ${getMyAdress()})`,
                    'authorization': cached.challenge || 'undefined',
                    ...(options.headers || {}),
                },
                body: options.body || undefined
            });

            let body = await res.json();

            if (!body)
                return {
                    request: path,
                    time: Date.now(),
                    error: ErrorCodes.BadDataFromServer
                };

            if (body.redirect)
                try {
                    new URL(body.redirect.http);
                    new URL(body.redirect.ws);

                    cached.gateways.http = body.redirect.http;
                    cached.gateways.ws = body.redirect.ws;

                    this.cacheServers.set(cached.id, cached);
                } catch (e) {
                    return {
                        request: path,
                        time: Date.now(),
                        error: ErrorCodes.BadRedirectionFromServer
                    };
                }

            if (body.error) {
                if (!retry && body.error.code === ErrorCodes.RetryWithNewGateway.code)
                    return this.fetch(address, path, options, true);

                return {
                    request: path,
                    time: body.time || Date.now(),
                    error: body.error,
                    data: undefined
                }
            }

            if (!body.data)
                return {
                    request: path,
                    time: body.time || Date.now(),
                    error: ErrorCodes.NoDataFromServer,
                    data: undefined
                }

            body = {
                request: path,
                time: body.time || Date.now(),
                error: undefined,
                data: body.data
            }
            if (!checkBaseResponse(body))
                return {
                    request: path,
                    time: Date.now(),
                    error: ErrorCodes.BadStructureFromServer,
                    data: undefined
                }

            return body as ResponseBase<T>;
        } catch {
            return {
                request: path,
                time: Date.now(),
                error: ErrorCodes.NoResponseFromServer,
                data: undefined
            }
        }
    }

    async fetchChallenge(address: string): Promise<ErrorMessage | null> {
        return null;
    }
}