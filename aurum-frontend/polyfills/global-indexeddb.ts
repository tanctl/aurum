import {
  indexedDB as fakeIndexedDB,
  IDBCursor,
  IDBCursorWithValue,
  IDBDatabase,
  IDBFactory,
  IDBIndex,
  IDBKeyRange,
  IDBObjectStore,
  IDBOpenDBRequest,
  IDBRequest,
  IDBTransaction,
  IDBVersionChangeEvent,
} from "fake-indexeddb";

if (typeof globalThis.indexedDB === "undefined") {
  const define = (key: string, value: unknown) => {
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
      enumerable: false,
    });
  };

  define("indexedDB", fakeIndexedDB);
  define("IDBCursor", IDBCursor);
  define("IDBCursorWithValue", IDBCursorWithValue);
  define("IDBDatabase", IDBDatabase);
  define("IDBFactory", IDBFactory);
  define("IDBIndex", IDBIndex);
  define("IDBKeyRange", IDBKeyRange);
  define("IDBObjectStore", IDBObjectStore);
  define("IDBOpenDBRequest", IDBOpenDBRequest);
  define("IDBRequest", IDBRequest);
  define("IDBTransaction", IDBTransaction);
  define("IDBVersionChangeEvent", IDBVersionChangeEvent);

  const currentLocalStorage = (globalThis as any).localStorage;
  const needsLocalStorageShim =
    currentLocalStorage == null ||
    typeof currentLocalStorage.getItem !== "function" ||
    typeof currentLocalStorage.setItem !== "function";

  if (needsLocalStorageShim) {
    const store = new Map<string, string>();
    const shim = {
      get length() {
        return store.size;
      },
      key(index: number) {
        if (!Number.isFinite(index) || index < 0 || index >= store.size) {
          return null;
        }
        return Array.from(store.keys())[index] ?? null;
      },
      getItem(key: string) {
        const normalised = String(key);
        return store.has(normalised) ? store.get(normalised)! : null;
      },
      setItem(key: string, value: string) {
        store.set(String(key), String(value));
      },
      removeItem(key: string) {
        store.delete(String(key));
      },
      clear() {
        store.clear();
      },
    };

    define("localStorage", shim);
  }
}
