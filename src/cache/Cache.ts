import EventEmitter from "events";
import { Reileta } from "../Reileta";
import CacheManager from "./CacheManager";

export default class Cache<T> extends EventEmitter {

    id: string;
    value: T;
    created_at: Date = new Date();
    updated_at: Date = new Date();
    _expiration?: number;

    // GETTERS

    /**
     * Get the expiration date of the cache
     */
    get expiration(): Date {
        const time = (this._expiration || this.manager.duration) * 1000;
        return new Date(this.updated_at.getTime() + time);
    }

    /**
     * Check if the cache is expired
     */
    get isExpired() {
        return this.expiration.getTime() < new Date().getTime();
    }

    constructor(private readonly app: Reileta, private readonly manager: CacheManager, id: string, value: T) {
        super();
        this.id = id;
        this.value = value;
    }

    /**
     * Set the expiration of the cache
     * @param duration The duration of the cache in seconds or a expiration date
     */
    setExpiration(duration: number | Date) {
        if (duration instanceof Date) {
            this._expiration = (duration.getTime() - this.updated_at.getTime()) / 1000;
        } else this._expiration = duration;
        return this;
    }

    /**
     * Set the value of the cache
     * @param value The value to set
     */
    setValue(value: any) {
        this.value = value;
        this.updated_at = new Date();
        return this;
    }
}