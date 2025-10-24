import { Buffer as NodeBuffer } from "buffer";

type NodeBufferType = typeof NodeBuffer;

type Uint32Compat = {
  writeUInt32BE?: (value: number, offset?: number) => number;
  readUInt32BE?: (offset?: number) => number;
  writeUint32BE?: (value: number, offset?: number) => number;
  readUint32BE?: (offset?: number) => number;
};

const bufferGlobal = globalThis as typeof globalThis & {
  Buffer: NodeBufferType;
};

if (typeof bufferGlobal.Buffer === "undefined") {
  bufferGlobal.Buffer = NodeBuffer;
}

function ensureUint32Methods(proto: Uint32Compat | undefined | null) {
  if (!proto) {
    return;
  }

  if (typeof proto.writeUInt32BE !== "function") {
    proto.writeUInt32BE = function writeUInt32BE(this: Uint8Array, value: number, offset = 0) {
      const view = new DataView(this.buffer, this.byteOffset, this.byteLength);
      view.setUint32(offset, value, false);
      return offset + 4;
    };
  }

  if (typeof proto.readUInt32BE !== "function") {
    proto.readUInt32BE = function readUInt32BE(this: Uint8Array, offset = 0) {
      const view = new DataView(this.buffer, this.byteOffset, this.byteLength);
      return view.getUint32(offset, false);
    };
  }

  if (typeof proto.writeUint32BE !== "function") {
    const canonical = proto.writeUInt32BE!;
    proto.writeUint32BE = function writeUint32BE(this: Uint8Array, value: number, offset?: number) {
      return canonical.call(this, value, offset);
    };
  }

  if (typeof proto.readUint32BE !== "function") {
    const canonical = proto.readUInt32BE!;
    proto.readUint32BE = function readUint32BE(this: Uint8Array, offset?: number) {
      return canonical.call(this, offset);
    };
  }
}

ensureUint32Methods(bufferGlobal.Buffer?.prototype);
ensureUint32Methods(NodeBuffer?.prototype);
ensureUint32Methods(Uint8Array.prototype as Uint32Compat);

console.debug("✅ Global Buffer polyfill loaded");
