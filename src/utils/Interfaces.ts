import { Session, Tag, User } from "@prisma/client";
import { Request, Response } from "express";
import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export interface ARequest extends Request {
    data?: {
        token?: string
        user?: UserInfo
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

export type SocketType = Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;

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