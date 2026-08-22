import type { MovieClip as DisplayMovieClip } from "@next2d/display";
import type { IPublishObject } from "@/interface/IPublishObject";
import { Loader, stage } from "@next2d/display";
import { $getRoot } from "@/global/GlobalUtil";

let $previewClip: DisplayMovieClip | null = null;

/**
 * @description 퍼블리시 JSON 을 Next2D Loader 로 재생한다 (에디터 미리보기).
 *              `.zwf` 왕복 검증 전 단계로, 동일 IPublishObject 로 즉시 재생한다.
 */
export const execute = async (object: IPublishObject): Promise<void> =>
{
    if ($previewClip) {
        $previewClip.stop();
        $previewClip.parent?.removeChild($previewClip);
        $previewClip = null;
    }

    const loader = new Loader();
    await loader.loadJSON(object as never);

    const movieClip = loader.content as DisplayMovieClip;
    const root = $getRoot();
    root.addChild(movieClip);

    stage.stageWidth = object.stage.width;
    stage.stageHeight = object.stage.height;
    stage.frameRate = object.stage.fps;
    stage.backgroundColor = parseInt(object.stage.bgColor.replace("#", "").slice(0, 6), 16);

    movieClip.play();
    $previewClip = movieClip;
};
