import EventEmitter from "events";
import { Reileta } from "../Reileta";
import { UserCreate, UserManager } from "./UserManager";
import { ErrorCodes, GenerateId, MatchTags } from "../utils/Constants";
import { MatchUserTagNames, ResponseUserInfo } from "../utils/Interfaces";
import { getPreferedAddress, isOwnServerAddress } from "../server/ServerManager";
import { ErrorMessage, hash, verify } from "../utils/Security";

export default class User extends EventEmitter {

    public id: string = GenerateId.User();
    public username: string = GenerateId.UserName();
    private _display?: string;
    private _password?: string;
    private _thumbnail?: string;
    private _banner?: string;
    private _home?: string;
    private _tags: MatchUserTagNames[] = [];
    public internal: boolean = true;
    public created_at: Date = new Date();
    public updated_at: Date = new Date();
    private _server?: string;

    // GETTERS

    /**
     * Get the tags of the user
     */
    get tags() {
        return MatchTags.User.optimise(this._tags || getDefaultUserTags());
    }

    /**
     * Get if the user is an administrator
     */
    get isAdministrator() {
        return this.internal && this.tags.includes("avr:admin");
    }

    /**
     * Get the thumbnail of the user
     */
    get thumbnail() {
        try {
            return new URL(this._thumbnail || "");
        } catch {
            return undefined;
        }
    }

    /**
     * Get the banner of the user
     */
    get banner() {
        try {
            return new URL(this._banner || "");
        } catch {
            return undefined;
        }
    }

    /**
     * Get the display name of the user
     */
    get display() {
        return this._display || this.username;
    }

    /**
     * Get the server address (IP or domain name)
     */
    get server() {
        return this.internal || !this._server || isOwnServerAddress(this._server) ? getPreferedAddress() : this._server;
    }

    constructor(private readonly app: Reileta, private readonly manager: UserManager) {
        super();
    }

    // METHODS

    /**
     * Get if the user can fetch data from the server
     */
    get canFetch() {
        return this.internal && (!this.tags.includes("avr:disabled") || this.isAdministrator);
    }

    /**
     * Get if the user can connect to the server
     */
    get canConnect() {
        return this.internal && (!this.tags.includes("avr:disabled") || this.isAdministrator);
    }

    /**
     * Get if the user can create a world
     */
    get canCreateWorld() {
        return this.internal && (this.tags.includes("avr:world_creator") || this.isAdministrator);
    }

    /**
     * Get if the user can create a world asset
     */
    get canCreateWorldAsset() {
        return this.canCreateWorld;
    }

    get canCreateInstance() {
        return this.internal && (this.tags.includes("avr:instance_creator") || this.isAdministrator);
    }

    /**
     * Verify the password is correct
     * @param password Password to verify
     */
    verifyPassword(password: string) {
        if (!this._password) return false;
        return verify(password, this._password);
    }

    async delete() {
        try {
            await this.app.prisma.user.delete({ where: { id: this.id } });
            return true;
        } catch (e) {
            return false;
        }
    }

    async getHome(who: User | "bypass") {
        if (!this._home) return new ErrorMessage(ErrorCodes.UserDontHaveHome);
        const home = await this.app.worlds.get(this.app.worlds.parseString(this._home), who);
        if (home instanceof ErrorMessage) return home;
        this._home = home.toString();
        return home;
    }


    /**
     * Import the user for database
     * @param user
     */
    async import(user_id: string): Promise<User | ErrorMessage> {
        const user = await this.app.prisma.user.findFirst({
            where: { OR: [{ id: user_id }, { username: user_id }] }
        });
        if (!user)
            return new ErrorMessage(ErrorCodes.UserNotFound);
        this.id = user.id;
        this.username = user.username;
        this._display = user.display || undefined;
        this._tags = user.tags?.split(',') || [];
        this._server = undefined;
        this._home = user.home_ids || undefined;
        this.internal = true;
        this.created_at = user.created_at;
        this.updated_at = user.updated_at;
        this._thumbnail = user.thumbnail || undefined;
        this._banner = user.banner || undefined;
        this._password = user.password || undefined;
        return this;
    }

    /**
     * Fetch the user from the database
     * @param id user id
     * @param server Server address
     */
    async fetch(id: string, server: string): Promise<User | ErrorMessage> {
        const response = await this.app.server.fetch<ResponseUserInfo>(server, '/api/users/' + id);
        if (response instanceof ErrorMessage)
            return response;
        const user = response.data;
        if (!user)
            return new ErrorMessage(ErrorCodes.UserNotFound);
        this.id = user.id;
        this.username = user.username;
        this._display = user.display || undefined;
        this._tags = user.tags || [];
        this._server = undefined;
        this.internal = true;
        this._home = undefined;
        this.created_at = new Date(0);
        this.updated_at = new Date(0);
        this._thumbnail = user.thumbnail || undefined;
        this._banner = user.banner || undefined;
        this._password = undefined;
        return this;
    }

    async create(input: UserCreate): Promise<User | ErrorMessage> {
        this.id = input.id;
        this.username = input.username;
        this._display = input.display || undefined;
        this._tags = [];
        this._server = undefined;
        this.internal = true;
        this._thumbnail = input.thumbnail || undefined;
        this._banner = input.banner || undefined;
        this._password = hash(input.password);
        if (!await this.save())
            return new ErrorMessage(ErrorCodes.InternalError);
        return this;
    }

    /**
     * Save the user to the database
     */
    async save() {
        if (!this.internal)
            return new ErrorMessage(ErrorCodes.ObjectNotInternal);
        try {
            await this.app.prisma.user.upsert({
                where: { id: this.id },
                create: {
                    id: this.id,
                    username: this.username,
                    display: this._display,
                    tags: this._tags.join(","),
                    home_ids: this._home,
                    thumbnail: this._thumbnail,
                    banner: this._banner,
                    password: this._password
                },
                update: {
                    display: this._display,
                    tags: this._tags.join(","),
                    home_ids: this._home,
                    thumbnail: this._thumbnail,
                    banner: this._banner,
                    password: this._password
                }
            });
            return true;
        } catch (e) {
            return false;
        }
    }


    /**
     * Convert the user to a string
     * @param absolute Force the display of the server address
     */
    toString(absolute = false) {
        return `${this.id}${absolute || !this.internal ? "@" + this.server : ""}`;
    }
}

export function getDefaultUserTags(): string[] {
    return (process.env.REILETA_DEFAULT_USER_TAGS || "user").split(",");
}