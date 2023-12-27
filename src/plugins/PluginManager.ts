import { join } from "node:path";
import { Reileta } from "../Reileta";
import { cwd } from "node:process";

export class PluginManager {

    pluginPath = process.env.REILETA_PLUGIN_PATH || join(cwd(), 'plugins');

    constructor(private readonly app: Reileta) {}

    loadPlugins() {
    }

    getList() {
        return []
    }

    cache = new Map()
}