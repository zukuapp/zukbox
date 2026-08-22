import { renderQueue } from "@next2d/render-queue";
import { $rendererWorker } from "@next2d-core-internal/RendererWorker";
import type { IPublishObject } from "@/interface/IPublishObject";
import { Loader, stage } from "@next2d/display";

/**
 * @description Next2D Player 가 생성한 render-queue 를 워커에 전달한다.
 *              ZWF 네이티브 큐(v0)와 Loader 경로를 모두 지원한다.
 */
export const postRenderQueue = (): void =>
{
    if (!renderQueue.offset) {
        return;
    }

    $rendererWorker.postMessage({
        "command": "render",
        "buffer": renderQueue.buffer,
        "length": renderQueue.offset,
        "imageBitmaps": null
    }, [renderQueue.buffer.buffer]);
};

/**
 * @description IPublishObject → DisplayObject 트리 → render-queue (기존 Player 파이프라인).
 */
export const executeFromPublishObject = async (object: IPublishObject): Promise<void> =>
{
    const loader = new Loader();
    await loader.loadJSON(object as never);

    const content = loader.content;
    renderQueue.offset = 0;

    stage.stageWidth = object.stage.width;
    stage.stageHeight = object.stage.height;
    stage.frameRate = object.stage.fps;
    stage.backgroundColor = parseInt(object.stage.bgColor.replace("#", "").slice(0, 6), 16);

    const matrix = new Float32Array([1, 0, 0, 1, 0, 0]);
    const color = new Float32Array([1, 1, 1, 1, 0, 0, 0, 0]);
    const imageBitmaps: ImageBitmap[] = [];

    content.$generateRenderQueue(
        content,
        imageBitmaps,
        matrix,
        color
    );

    $rendererWorker.postMessage({
        "command": "render",
        "buffer": renderQueue.buffer,
        "length": renderQueue.offset,
        "imageBitmaps": imageBitmaps.length ? imageBitmaps : null
    }, [renderQueue.buffer.buffer, ...imageBitmaps]);
};
