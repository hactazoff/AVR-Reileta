import { UUID } from "crypto";
import { Reileta } from "../Reileta";

export type PluginID = `p_${UUID}`
export type PluginVersion = `${string}.${string}.${string}-${string}`
export interface PluginRequire {
    id: PluginID,
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

    meta?: PluginMeta;

    constructor(private readonly app: Reileta) {}
}