/**
 * ZWF 바이너리 인코더 — 명세 v0.1.
 * 런타임 `js/zwf-writer.mjs` 와 동일한 레이아웃을 TypeScript로 구현한다.
 */

const CHUNK_HEADER_SIZE = 16;
const FILE_HEADER_SIZE = 32;

export const CODEC = Object.freeze({ "RAW": 0, "DEFLATE": 1 });
export const CHUNK_FLAGS = Object.freeze({ "SKIPPABLE": 1, "HAS_CRC": 2 });
export const FILE_FLAGS = Object.freeze({ "SIGNED": 1, "STREAMABLE": 2, "ATLAS_PACKED": 4 });

const CRC_TABLE = (() =>
{
    const table = new Uint32Array(256);
    for (let idx = 0; idx < 256; ++idx) {
        let crc = idx;
        for (let bit = 0; bit < 8; ++bit) {
            crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
        }
        table[idx] = crc >>> 0;
    }
    return table;
})();

export const crc32 = (bytes: Uint8Array): number =>
{
    let crc = 0xffffffff;
    for (let idx = 0; idx < bytes.length; ++idx) {
        crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[idx]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
};

const alignUp = (value: number): number => Math.ceil(value / 4) * 4;

const fourCC = (id: string): Uint8Array =>
{
    const padded = id.padEnd(4, " ");
    return Uint8Array.from([
        padded.charCodeAt(0), padded.charCodeAt(1),
        padded.charCodeAt(2), padded.charCodeAt(3)
    ]);
};

export interface StageOptions {
    width: number;
    height: number;
    fps: number;
    bgRgba?: number;
    rootCharacterId?: number;
}

/** `STAG` 페이로드 — §5.2 */
export const encodeStage = ({
    width,
    height,
    fps,
    bgRgba = 0x000000ff,
    rootCharacterId = 0
}: StageOptions): Uint8Array =>
{
    const payload = new Uint8Array(24);
    const view = new DataView(payload.buffer);
    view.setUint32(0, width, true);
    view.setUint32(4, height, true);
    view.setFloat32(8, fps, true);
    view.setUint32(12, bgRgba, true);
    view.setUint32(16, rootCharacterId, true);
    return payload;
};

/** `#RRGGBB` / `#RRGGBBAA` → `0xRRGGBBAA` */
export const parseBgColor = (color: string): number =>
{
    const hex = color.replace("#", "");
    if (hex.length === 6) {
        return (parseInt(hex, 16) << 8) | 0xff;
    }
    if (hex.length === 8) {
        const rgb = parseInt(hex.slice(0, 6), 16);
        const alpha = parseInt(hex.slice(6, 8), 16);
        return (rgb << 8) | alpha;
    }
    return 0x000000ff;
};

export class ZwfWriter
{
    private readonly _flags: number;
    private readonly _parts: Uint8Array[] = [];
    private _length = 0;
    private _chunkCount = 0;

    constructor (flags: number = FILE_FLAGS.STREAMABLE)
    {
        this._flags = flags;
    }

    private _append (bytes: Uint8Array): void
    {
        this._parts.push(bytes);
        this._length += bytes.length;
    }

    pushRaw (id: string, payload: Uint8Array, chunkFlags = 0): this
    {
        const header = new Uint8Array(CHUNK_HEADER_SIZE);
        header.set(fourCC(id), 0);
        header[4] = CODEC.RAW;
        header[5] = chunkFlags;

        const view = new DataView(header.buffer);
        view.setUint32(8, payload.length, true);
        view.setUint32(12, payload.length, true);

        this._append(header);
        this._append(payload);

        if (chunkFlags & CHUNK_FLAGS.HAS_CRC) {
            const crc = new Uint8Array(4);
            new DataView(crc.buffer).setUint32(0, crc32(payload), true);
            this._append(crc);
        }

        const padding = alignUp(this._length) - this._length;
        if (padding > 0) {
            this._append(new Uint8Array(padding));
        }

        this._chunkCount += 1;
        return this;
    }

    finish (): Uint8Array
    {
        const fileSize = FILE_HEADER_SIZE + this._length;
        const header = new Uint8Array(FILE_HEADER_SIZE);
        header.set(fourCC("ZWF1"), 0);
        header[4] = 0;
        header[5] = 1;

        const view = new DataView(header.buffer);
        view.setUint16(6, this._flags, true);
        view.setUint32(8, FILE_HEADER_SIZE, true);
        view.setUint32(12, this._chunkCount, true);
        view.setBigUint64(16, BigInt(fileSize), true);
        view.setUint32(28, crc32(header.subarray(0, 28)), true);

        const out = new Uint8Array(fileSize);
        out.set(header, 0);

        let offset = FILE_HEADER_SIZE;
        for (const part of this._parts) {
            out.set(part, offset);
            offset += part.length;
        }
        return out;
    }
}

export const writeU32 = (value: number): Uint8Array =>
{
    const out = new Uint8Array(4);
    new DataView(out.buffer).setUint32(0, value >>> 0, true);
    return out;
};

export const writeI32 = (value: number): Uint8Array =>
{
    const out = new Uint8Array(4);
    new DataView(out.buffer).setInt32(0, value | 0, true);
    return out;
};

export const writeF32 = (value: number): Uint8Array =>
{
    const out = new Uint8Array(4);
    new DataView(out.buffer).setFloat32(0, value, true);
    return out;
};

export const concatBytes = (...parts: Uint8Array[]): Uint8Array =>
{
    const length = parts.reduce((sum, part) => sum + part.length, 0);
    const out = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) {
        out.set(part, offset);
        offset += part.length;
    }
    return out;
};
