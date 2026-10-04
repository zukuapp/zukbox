import { indexedDB as memoryIndexedDB } from 'fake-indexeddb';
try { if (window.origin === "null") throw new Error("Opaque storage"); void window.localStorage; } catch {
    const values = new Map<string, string>();
    const store = {
        get length() { return values.size; },
        getItem(key: string) { return values.get(String(key)) ?? null; },
        setItem(key: string, value: string) { values.set(String(key), String(value)); },
        removeItem(key: string) { values.delete(String(key)); },
        clear() { values.clear(); },
        key(index: number) { return [...values.keys()][index] ?? null; }
    };
    Object.defineProperty(window, 'localStorage', { value: store });
}
try { if (window.origin === "null") throw new Error("Opaque storage"); void window.indexedDB; } catch {
    Object.defineProperty(window, 'indexedDB', { value: memoryIndexedDB });
}
await import('../../src/js/main.ts');
