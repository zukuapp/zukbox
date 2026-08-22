import type { IBitmapPublishJson } from "@/interface/IBitmapPublishJson";
import type { IControllerPublishObject } from "@/interface/IControllerPublishObject";
import type { IMovieClipPublishJson } from "@/interface/IMovieClipPublishJson";
import type { IPlaceObjectMap } from "@/interface/IPlaceObjectMap";
import type { IPlaceObject } from "@/interface/IPlaceObject";
import type { IPublishObject } from "@/interface/IPublishObject";
import type { IShapePublishJson } from "@/interface/IShapePublishJson";
import type { IVideoPublishJson } from "@/interface/IVideoPublishJson";
import { blendModeToZwf, filterClassToZwf } from "./blendMode";
import {
    ZwfWriter,
    FILE_FLAGS,
    concatBytes,
    encodeStage,
    parseBgColor,
    writeF32,
    writeI32,
    writeU32
} from "./ZwfWriter";

const CHARACTER_KIND = Object.freeze({
    "MovieClip": 1,
    "Shape": 2,
    "Bitmap": 3,
    "Video": 4,
    "Text": 5
});

const SHAPE_FLAG_HAS_GRID = 1 << 0;
const SHAPE_FLAG_IN_BITMAP = 1 << 1;
const SHAPE_FLAG_HAS_BITMAP_ID = 1 << 2;

const VIDEO_FLAG_LOOP = 1 << 0;
const VIDEO_FLAG_AUTO_PLAY = 1 << 1;

const BITMAP_ENCODING = Object.freeze({
    "RAW_RGBA8": 0,
    "PNG": 1,
    "WEBP": 2,
    "AVIF": 3
});

const VIDEO_ENCODING = Object.freeze({
    "MP4": 0,
    "WEBM": 1,
    "OGG": 2
});

const PRESENT_MATRIX = 1 << 0;
const PRESENT_COLOR = 1 << 1;
const PRESENT_BLEND = 1 << 2;
const PRESENT_FILTERS = 1 << 3;
const PRESENT_LOOP = 1 << 4;

const kindFromExtends = (extendsName: string): number =>
{
    if (extendsName.includes("MovieClip")) {
        return CHARACTER_KIND.MovieClip;
    }
    if (extendsName.includes("Shape")) {
        return CHARACTER_KIND.Shape;
    }
    if (extendsName.includes("Bitmap")) {
        return CHARACTER_KIND.Bitmap;
    }
    if (extendsName.includes("Video")) {
        return CHARACTER_KIND.Video;
    }
    if (extendsName.includes("Text")) {
        return CHARACTER_KIND.Text;
    }
    return CHARACTER_KIND.MovieClip;
};

const maxDepth = (
    controller: IControllerPublishObject,
    placeMap: IPlaceObjectMap,
    totalFrame: number
): number =>
{
    let depth = 0;
    for (let frame = 0; frame < totalFrame; ++frame) {
        const controllerRow = controller[frame];
        const placeRow = placeMap[frame];
        if (controllerRow) {
            depth = Math.max(depth, controllerRow.length);
        }
        if (placeRow) {
            depth = Math.max(depth, placeRow.length);
        }
    }
    return depth;
};

const flattenFrameMajor = (
    table: IControllerPublishObject | IPlaceObjectMap,
    depthCount: number,
    totalFrame: number
): Int32Array =>
{
    const out = new Int32Array(depthCount * totalFrame);
    out.fill(-1);
    for (let frame = 0; frame < totalFrame; ++frame) {
        const row = table[frame];
        if (!row) {
            continue;
        }
        for (let depth = 0; depth < depthCount; ++depth) {
            const value = row[depth];
            out[depth * totalFrame + frame] = value == null ? -1 : value;
        }
    }
    return out;
};

const encodePlaceObject = (place: IPlaceObject): Uint8Array =>
{
    let present = 0;
    if (place.matrix?.length === 6) {
        present |= PRESENT_MATRIX;
    }
    if (place.colorTransform?.length === 8) {
        present |= PRESENT_COLOR;
    }
    if (place.blendMode && place.blendMode !== "normal") {
        present |= PRESENT_BLEND;
    }
    if (place.surfaceFilterList?.length) {
        present |= PRESENT_FILTERS;
    }
    if (place.loop) {
        present |= PRESENT_LOOP;
    }

    const parts: Uint8Array[] = [new Uint8Array([present, blendModeToZwf(place.blendMode ?? "normal")])];
    if (present & PRESENT_FILTERS) {
        const count = new Uint8Array(2);
        new DataView(count.buffer).setUint16(0, place.surfaceFilterList!.length, true);
        parts.push(count);
    }

    if (place.matrix?.length === 6) {
        for (const value of place.matrix) {
            parts.push(writeF32(value));
        }
    }
    if (place.colorTransform?.length === 8) {
        for (const value of place.colorTransform) {
            parts.push(writeF32(value));
        }
    }
    if (place.surfaceFilterList?.length) {
        for (const filter of place.surfaceFilterList) {
            parts.push(new Uint8Array([
                filterClassToZwf(filter.class),
                filter.params.length,
                0,
                0
            ]));
            for (const param of filter.params) {
                parts.push(writeF32(param));
            }
        }
    }
    if (place.loop) {
        parts.push(new Uint8Array([0, 0, 0, 0]));
        parts.push(writeU32(place.loop.start));
        parts.push(writeU32(Math.max(1, place.loop.end - place.loop.start + 1)));
    }
    return concatBytes(...parts);
};

const flattenRecodes = (recodes: unknown[]): number[] =>
{
    const out: number[] = [];
    for (const item of recodes) {
        if (typeof item === "number" && Number.isFinite(item)) {
            out.push(item);
        }
    }
    return out;
};

const toByteArray = (buffer: number[]): Uint8Array =>
{
    const out = new Uint8Array(buffer.length);
    for (let idx = 0; idx < buffer.length; ++idx) {
        out[idx] = buffer[idx] & 0xff;
    }
    return out;
};

const detectBitmapEncoding = (data: Uint8Array): number =>
{
    if (data.length >= 8
        && data[0] === 0x89
        && data[1] === 0x50
        && data[2] === 0x4e
        && data[3] === 0x47) {
        return BITMAP_ENCODING.PNG;
    }
    if (data.length >= 12
        && data[0] === 0x52
        && data[1] === 0x49
        && data[2] === 0x46
        && data[3] === 0x46
        && data[8] === 0x57
        && data[9] === 0x45
        && data[10] === 0x42
        && data[11] === 0x50) {
        return BITMAP_ENCODING.WEBP;
    }
    if (data.length >= 12
        && data[4] === 0x66
        && data[5] === 0x74
        && data[6] === 0x79
        && data[7] === 0x70
        && data[8] === 0x61
        && data[9] === 0x76
        && data[10] === 0x69
        && data[11] === 0x66) {
        return BITMAP_ENCODING.AVIF;
    }
    return BITMAP_ENCODING.RAW_RGBA8;
};

const detectVideoEncoding = (data: Uint8Array): number =>
{
    if (data.length >= 12
        && data[4] === 0x66
        && data[5] === 0x74
        && data[6] === 0x79
        && data[7] === 0x70) {
        return VIDEO_ENCODING.MP4;
    }
    if (data.length >= 4
        && data[0] === 0x1a
        && data[1] === 0x45
        && data[2] === 0xdf
        && data[3] === 0xa3) {
        return VIDEO_ENCODING.WEBM;
    }
    if (data.length >= 4
        && data[0] === 0x4f
        && data[1] === 0x67
        && data[2] === 0x67
        && data[3] === 0x53) {
        return VIDEO_ENCODING.OGG;
    }
    return VIDEO_ENCODING.MP4;
};

/** `IShapePublishJson` → SHAP 본문 바이트 */
export const encodeShapeBody = (shape: IShapePublishJson): Uint8Array =>
{
    let flags = 0;
    if (shape.inBitmap) {
        flags |= SHAPE_FLAG_IN_BITMAP;
    }
    if (shape.grid) {
        flags |= SHAPE_FLAG_HAS_GRID;
    }
    if (shape.bitmapId != null) {
        flags |= SHAPE_FLAG_HAS_BITMAP_ID;
    }

    const parts: Uint8Array[] = [
        writeF32(shape.bounds.xMin),
        writeF32(shape.bounds.xMax),
        writeF32(shape.bounds.yMin),
        writeF32(shape.bounds.yMax),
        new Uint8Array([flags, 0, 0, 0])
    ];

    if (shape.grid) {
        parts.push(
            writeF32(shape.grid.x),
            writeF32(shape.grid.y),
            writeF32(shape.grid.w),
            writeF32(shape.grid.h)
        );
    }
    if (shape.bitmapId != null) {
        parts.push(writeU32(shape.bitmapId));
    }

    const recodes = flattenRecodes(shape.recodes);
    parts.push(writeU32(recodes.length));
    for (const value of recodes) {
        parts.push(writeF32(value));
    }

    return concatBytes(...parts);
};

/** `IBitmapPublishJson` → BMAP 본문 바이트 */
export const encodeBitmapBody = (bitmap: IBitmapPublishJson): Uint8Array =>
{
    const data = toByteArray(bitmap.buffer);
    const parts: Uint8Array[] = [
        writeF32(bitmap.bounds.xMin),
        writeF32(bitmap.bounds.xMax),
        writeF32(bitmap.bounds.yMin),
        writeF32(bitmap.bounds.yMax),
        new Uint8Array([detectBitmapEncoding(data), 0, 0, 0]),
        writeU32(data.length)
    ];
    if (data.length) {
        parts.push(data);
    }
    return concatBytes(...parts);
};

/** `IVideoPublishJson` → VIDS 본문 바이트 */
export const encodeVideoBody = (video: IVideoPublishJson): Uint8Array =>
{
    const data = toByteArray(video.buffer);
    let flags = 0;
    if (video.loop) {
        flags |= VIDEO_FLAG_LOOP;
    }
    if (video.autoPlay) {
        flags |= VIDEO_FLAG_AUTO_PLAY;
    }

    return concatBytes(
        writeF32(video.bounds.xMin),
        writeF32(video.bounds.xMax),
        writeF32(video.bounds.yMin),
        writeF32(video.bounds.yMax),
        writeF32(video.volume),
        new Uint8Array([flags, detectVideoEncoding(data), 0, 0]),
        writeU32(data.length),
        data
    );
};

/** `IMovieClipPublishJson` → MCLP 본문 바이트 */
export const encodeMovieClipBody = (clip: IMovieClipPublishJson): Uint8Array =>
{
    const frameCount = clip.totalFrame + 1;
    const depthCount = maxDepth(clip.controller, clip.placeMap, frameCount);
    const controller = flattenFrameMajor(clip.controller, depthCount, frameCount);
    const placeMap = flattenFrameMajor(clip.placeMap, depthCount, frameCount);

    const parts: Uint8Array[] = [
        writeU32(frameCount),
        writeU32(clip.dictionary.length)
    ];

    for (const entry of clip.dictionary) {
        parts.push(
            writeU32(entry.characterId),
            writeU32(entry.startFrame),
            writeU32(entry.endFrame),
            writeI32(entry.clipDepth ?? -1)
        );
    }

    parts.push(writeU32(depthCount));
    parts.push(writeU32(clip.placeObjects.length));
    for (const place of clip.placeObjects) {
        parts.push(encodePlaceObject(place));
    }

    parts.push(writeU32(controller.length));
    for (const value of controller) {
        parts.push(writeI32(value));
    }
    parts.push(writeU32(placeMap.length));
    for (const value of placeMap) {
        parts.push(writeI32(value));
    }

    return concatBytes(...parts);
};

export interface CharacterIndexEntry {
    kind: number;
    exported: boolean;
    bodyOffset: number;
    bodySize: number;
}

/** `CHRS` 페이로드 */
export const encodeCharacters = (entries: CharacterIndexEntry[]): Uint8Array =>
{
    const parts: Uint8Array[] = [writeU32(entries.length)];
    for (const entry of entries) {
        parts.push(new Uint8Array([
            entry.kind,
            entry.exported ? 1 : 0,
            0,
            0
        ]));
        parts.push(writeU32(entry.bodyOffset));
        parts.push(writeU32(entry.bodySize));
    }
    return concatBytes(...parts);
};

/** `SYMB` 페이로드 */
export const encodeSymbols = (symbols: Array<[string, number]>): Uint8Array =>
{
    const parts: Uint8Array[] = [writeU32(symbols.length)];
    for (const [name, characterId] of symbols) {
        const nameBytes = new TextEncoder().encode(name);
        parts.push(writeU32(nameBytes.length));
        parts.push(nameBytes);
        const pad = (4 - ((4 + nameBytes.length) % 4)) % 4;
        if (pad) {
            parts.push(new Uint8Array(pad));
        }
        parts.push(writeU32(characterId));
    }
    return concatBytes(...parts);
};

/** `IPublishObject` → `.zwf` 바이트 */
export const encodePublishObject = (object: IPublishObject, title = "untitled"): Uint8Array =>
{
    const movieClipBodies: Uint8Array[] = [];
    const shapeBodies: Uint8Array[] = [];
    const bitmapBodies: Uint8Array[] = [];
    const videoBodies: Uint8Array[] = [];
    const characterEntries: CharacterIndexEntry[] = [];
    const exportedIds = new Set(object.symbols.map(([, id]) => id));

    const pushBody = (
        bodies: Uint8Array[],
        kind: number,
        body: Uint8Array,
        exported: boolean
    ): void =>
    {
        characterEntries.push({
            kind,
            exported,
            "bodyOffset": bodies.reduce((sum, part) => sum + part.length, 0),
            "bodySize": body.length
        });
        bodies.push(body);
    };

    for (let idx = 0; idx < object.characters.length; ++idx) {
        const character = object.characters[idx];
        if (!character) {
            characterEntries.push({
                "kind": CHARACTER_KIND.MovieClip,
                "exported": false,
                "bodyOffset": 0,
                "bodySize": 0
            });
            continue;
        }

        const kind = kindFromExtends(character.extends);
        const exported = exportedIds.has(idx);
        if (kind === CHARACTER_KIND.MovieClip) {
            pushBody(movieClipBodies, kind, encodeMovieClipBody(character as IMovieClipPublishJson), exported);
        } else if (kind === CHARACTER_KIND.Shape) {
            pushBody(shapeBodies, kind, encodeShapeBody(character as IShapePublishJson), exported);
        } else if (kind === CHARACTER_KIND.Bitmap) {
            pushBody(bitmapBodies, kind, encodeBitmapBody(character as IBitmapPublishJson), exported);
        } else if (kind === CHARACTER_KIND.Video) {
            pushBody(videoBodies, kind, encodeVideoBody(character as IVideoPublishJson), exported);
        } else {
            characterEntries.push({
                kind,
                exported,
                "bodyOffset": 0,
                "bodySize": 0
            });
        }
    }

    const mclpPayload = concatBytes(...movieClipBodies);
    const shapPayload = concatBytes(...shapeBodies);
    const bmapPayload = concatBytes(...bitmapBodies);
    const vidsPayload = concatBytes(...videoBodies);
    const meta = new TextEncoder().encode(JSON.stringify({
        "title": title,
        "tool": "zukbox/0.300.0",
        "locale": "ko-KR",
        "runtimeMin": "0.1.0"
    }));

    const writer = new ZwfWriter(FILE_FLAGS.STREAMABLE);
    writer.pushRaw("META", meta);
    writer.pushRaw("STAG", encodeStage({
        "width": object.stage.width,
        "height": object.stage.height,
        "fps": object.stage.fps,
        "bgRgba": parseBgColor(object.stage.bgColor),
        "rootCharacterId": 0
    }));

    if (object.symbols.length) {
        writer.pushRaw("SYMB", encodeSymbols(object.symbols));
    }

    writer.pushRaw("CHRS", encodeCharacters(characterEntries));
    if (shapPayload.length) {
        writer.pushRaw("SHAP", shapPayload);
    }
    if (bmapPayload.length) {
        writer.pushRaw("BMAP", bmapPayload);
    }
    writer.pushRaw("MCLP", mclpPayload);
    if (vidsPayload.length) {
        writer.pushRaw("VIDS", vidsPayload);
    }
    return writer.finish();
};
