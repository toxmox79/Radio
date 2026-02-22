const DB_NAME = 'SolfeggioRadioDB';
const STORE_NAME = 'favorites';
const DB_VERSION = 1;

class FavoritesDB {
    constructor() {
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (e) => {
                console.error("DB Error", e);
                reject(e);
            };

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'url' });
                }
            };

            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
            };
        });
    }

    async addFavorite(station) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([STORE_NAME], 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.put(station);

            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(false);
        });
    }

    async removeFavorite(url) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([STORE_NAME], 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.delete(url);

            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(false);
        });
    }

    async getAllFavorites() {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([STORE_NAME], 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.getAll();

            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject([]);
        });
    }

    async isFavorite(url) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([STORE_NAME], 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(url);

            req.onsuccess = () => resolve(!!req.result);
            req.onerror = () => resolve(false);
        });
    }
}
