import { Reileta } from "../Reileta";
import Cache from "./Cache";

export default class CacheManager {

    duration: number = 60; // seconds
    cache: Map<string, Cache<any>> = new Map();

    constructor(private readonly app: Reileta) { }

    get<T>(key: string): Cache<T> | null {
        const cache: Cache<T> | undefined = this.cache.get(key);
        if (!cache)
            return null;
        if (cache.isExpired) {
            this.cache.delete(key);
            return null;
        } else return cache;
    }

    set<T>(key: string, value: any, duration?: number | Date): Cache<T> {
        const cache = new Cache<T>(this.app, this, key, value);
        if (duration)
            cache.setExpiration(duration);
        cache.setValue(value);
        this.cache.set(key, cache);
        return cache;
    }

    delete(key: string) {
        this.cache.delete(key);
    }
}