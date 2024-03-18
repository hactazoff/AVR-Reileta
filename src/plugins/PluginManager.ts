import { basename, dirname, join, relative } from "node:path";
import { Reileta } from "../Reileta";
import { cwd } from "node:process";
import { Plugin } from "./Plugin";
import { readdirSync, statSync } from "node:fs";

export class PluginManager {

    pluginPath = process.env.REILETA_PLUGIN_PATH || join(cwd(), 'plugins');

    constructor(private readonly app: Reileta) { }
    cache = new Map<string, Plugin>();
    pluginsfile = /.+\.(js|ts)$/;

    async loadPlugins() {
        console.log("Loading plugins");
        for (let filepath of readdirSync(this.pluginPath).map(f => join(this.pluginPath, f))) {
            if (statSync(filepath).isDirectory()) {
                const o = readdirSync(filepath).map(f => join(filepath, f)).filter(f => this.pluginsfile.test(f));
                if (o.length === 0) continue;
                filepath = o[0];
            }
            const plugin = require(filepath).default;
            if (plugin.prototype instanceof Plugin) {
                console.log(`Loading plugin ${relative(this.pluginPath, filepath)}`);
                const p = new plugin(this.app, dirname(filepath));
                this.cache.set(p.meta.id, p);
            }
        }

        let plugins = Array.from(this.cache.values());
        for (let plugin of plugins) {
            const deps = plugin.meta.require?.map(r => typeof r === "string" ? { id: r, version: null } : r) || [];
            for (let dep of deps)
                if (!this.cache.has(dep.id) || (dep.version && this.cache.get(dep.id)?.meta.version !== dep.version))
                    throw new Error(`Plugin ${plugin.meta.id} requires plugin ${dep.id}`);
        }

        plugins = plugins.sort((a, b) => {
            const deps = a.meta.require?.map(r => typeof r === "string" ? { id: r, version: null } : r);
            const index = deps?.findIndex(d => d.id === b.meta.id);
            return index === -1 ? 1 : -1;
        });

        console.log("Initializing plugins");
        for (let plugin of plugins) {
            console.log(`Initializing plugin ${plugin.meta.id}`);
            await plugin.init();
        }

    }
}