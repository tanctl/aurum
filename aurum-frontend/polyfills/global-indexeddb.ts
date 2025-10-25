import * as fakeIndexedDB from "fake-indexeddb";

if (typeof globalThis.indexedDB === "undefined") {
  Object.assign(globalThis, fakeIndexedDB);
}
