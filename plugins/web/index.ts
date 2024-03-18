import { join } from "node:path";
import { Reileta } from "../../src/Reileta";
import { Plugin, PluginVersion } from "../../src/plugins/Plugin";

export default class Web extends Plugin {

    meta = {
        id: `78a00bc4-caf9-4ee3-8eef-9a6e246e4929`,
        version: "0.0.1-alpha" as PluginVersion,
        description: "Web plugin"
    }

    constructor(app: Reileta, basedir: string) {
        super(app, basedir);
    }

    async init() {
        console.log("Web plugin loaded");

        this.app.express.get("/", (req, res) => {
            res.sendFile(join(this.basedir, "public", "index.html"));
        });
        // all paths, unless /api/
        this.app.express.get(/^(?!\/api\/).+$/, (req, res) => {
            res.sendFile(join(this.basedir, "public", "404.html"));
        });
    }
}