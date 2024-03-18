import { UUID } from "crypto";
import { Reileta } from "../Reileta";

export type PluginID = UUID | string;
export type PluginVersion = `${number}.${number}.${number}-${string}` | `${number}.${number}.${number}` | `${number}.${number}-${string}` | `${number}.${number}` | `${number}-${string}` | number;
export interface PluginRequire {
    id: PluginID,
    callname?: string,
    version: PluginVersion | PluginVersion[],
    required?: boolean
}

export interface PluginMeta {
    id: PluginID,
    version: PluginVersion,
    author?: string,
    require?: (PluginID | PluginRequire)[],
    description: string
}

export class Plugin {

    meta: PluginMeta = {} as PluginMeta;

    constructor(protected readonly app: Reileta, protected readonly basedir: string) { }

    async init() { }
}