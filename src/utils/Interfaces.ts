import { Session, Tag, User } from "@prisma/client";
import e, { Request, Response } from "express";
import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export interface ARequest extends Request {
    data?: {
        token?: string
        session?: SessionInfo
    }
}

export interface AResponse extends Response {
    oldSend: (obj: any) => void
    send: (obj: any) => any
}

export interface ResponseBase<T> {
    request: string,
    data?: T
    time: number,
    error?: ErrorCode
    redirect?: {
        http: string
        ws: string,
        proxy: string
    }
}

export interface SessionInfo {
    id: string,
    user_id: string,
    user: UserInfo,
    token: string,
    created_at: Date
}

export interface ResponseServerInfo {
    id: string
    title: string
    description?: string,
    address: string,
    gateways: {
        http: string,
        ws: string,
        proxy: string
    }
    secure: boolean,
    version: string,
    ready_at: number,
    icon: string
}

export type ResponseStatus = "online" | "offline" | "busy" | "away";

export interface ResponseUserInfo {
    id: string,
    username: string,
    display: string,
    thumbnail?: string,
    banner?: string,
    tags: string[],
    server: string,
    external?: boolean
}
export interface ResponseUserMeInfo extends ResponseUserInfo {
    friends: string[],
    home?: string,
    status: string,
}

export interface ResponseRegister {
    id: string,
    token: string,
    created_at: number,
    user: ResponseUserMeInfo
}

export type ResponseLogin = ResponseRegister;

export interface UserInfo {
    id: string,
    username: string,
    display: string,
    password?: string,
    thumbnail?: URL,
    banner?: URL,
    tags: string[],
    home?: string,
    server: string,
    external: boolean
}

export interface ServerInfo {
    id: string,
    title?: string
    description?: string,
    address: string,
    gateways: {
        http: URL,
        ws: URL,
        proxy: URL
    },
    challenge?: string,
    secure: boolean,
    version: string,
    ready_at: Date,
    icon: URL,
    internal: boolean
}

export interface UserInput {
    id: string;
    username?: string;
    display?: string;
    tags?: string[];
    password?: string;
}

export interface ErrorCode {
    status?: number;
    message: string;
    code: number;
}

export interface SocketType extends Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any> {
    old_emit: (event: string, ...args: any[]) => boolean;
    data: {
        user_id?: string;
        session_id?: string;
        is_internal?: boolean;
        is_integrity?: boolean;
    }
}

export interface PingRequest {
    time: number;
}

export interface PingResponse {
    client: number;
    server: number;
}

export interface LoginInput {
    username: string;
    password: string;
}

export interface RegisterInput {
    username: string;
    password: string;
    display?: string;
}

export interface WorldAssetInfos {
    id?: string;
    version: string;
    engine?: string;
    platform?: string;
    empty?: boolean;
    is_external_url: boolean
    url?: URL;
    created_at: Date;
    updated_at: Date;
    hash?: string;
    size?: number;
}

export interface WorldInfos {
    id: string;
    title: string;
    description?: string;
    capacity: number;
    owner_id: string;
    server: string;
    created_at: Date;
    updated_at: Date;
    thumbnail?: URL;
    tags: string[];
    external: boolean;
    fallback: boolean;
    assets: WorldAssetInfos[];
}

export interface WorldInstanceInfos extends WorldInfos {
    recommanded_asset_version?: string;
}

export interface UserInstanceInfos extends UserInfo {
    connection_id: string;
    is_moderator: boolean;
    is_owner: boolean;
    is_master: boolean;
    is_bot: boolean;
}

export interface OwnerInstanceInfos extends UserInfo {}
export interface MasterInstanceInfos extends UserInfo {}

export interface InstanceInfos {
    id: string;
    name: string;
    world: WorldInstanceInfos;
    owner: OwnerInstanceInfos
    master: MasterInstanceInfos | null;
    capacity: number;
    server: string;
    created_at: Date;
    updated_at: Date;
    tags: string[];
    users: UserInstanceInfos[];
    sockets: string[];
}

export interface ResponseInstanceInfos {
    id: string;
    name: string;
    world: string
    owner: string
    master: string | null;
    capacity: number;
    server: string;
    tags: string[];
    users: any[];
    connected: number;
}

export interface InstanceInput {
    id?: string;
    name?: string;
    world?: string;
    capacity?: number;
    version?: string;
    tags?: string[];
}

export interface WorldInput {
    id: string;
    title?: string;
    description?: string;
    capacity?: number;
    tags?: string[];
}

export interface WorldSearchInput {
    id?: string;
    user_id?: string;
    take?: number;
    page?: number;
}

export interface WorldAssetInput {
    id?: string;
    version?: string;
    engine?: string;
    platform?: string;
}

export type HomeInfo = WorldInfos;

export interface ResponseWorldInfo {
    id: string;
    title: string;
    description?: string;
    capacity: number;
    owner_id: string;
    server: string;
    thumbnail?: string;
    tags: string[];
    external: boolean;
    fallback: boolean;
    assets: ResponseWorldAssetInfo[];
}

export type ResponseHomeInfo = ResponseWorldInfo;

export interface ResponseWorldAssetInfo {
    id?: string;
    version: string;
    engine?: string;
    platform?: string;
    url?: string;
    empty?: boolean;
    hash?: string;
    size?: number;
}

export interface ContentFileVerification {
    content_type: 'world' | 'avatar';
    platform: string,
    engine: string,
    engine_version: string,
    stats: {
        [key: string]: number
    }
}

export interface IntegrityInput {
    server?: string;
}

export interface IntegrityInfo {
    id: string;
    user: UserInfo;
    server: ServerInfo;
    expires_at: Date;
    token: string;
}

export interface ResponseIntegrityServer {
    id: string;
    user: string;
    token: string;
    expires_at: number;
}

export interface IntegrityServer {
    id: string;
    user: UserInfo;
    server: ServerInfo;
    token: string;
    expires_at: Date;
}

export interface IntegrityServerInput {
    user?: string;
}

export interface ResponseIntegrityInfo {
    server: string;
    user: string;
    token: string;
    expires_at: number;
}

export interface RequestSocket<T> {
    state: string | null;
    command: string;
    subgroup: string | null;
    data: T
}

export interface ResponseSocket<T> {
    state: string | null;
    command: string;
    subgroup: string | null;
    data: T
}

export interface FollowInfo {
    id: string;
    from: UserInfo;
    to: UserInfo;
}