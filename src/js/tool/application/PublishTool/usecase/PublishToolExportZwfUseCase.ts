import { $getCurrentWorkSpace } from "@/core/application/CoreUtil";
import { execute as publishToolCreateToObjectUseCase } from "@/tool/application/PublishTool/usecase/PublishToolCreateToObjectUseCase";
import { execute as userSettingObjectGetService } from "@/user/application/Setting/service/UserSettingObjectGetService";
import { encodePublishObject } from "@/zwf/ZwfPublishEncoder";
import { execute as zwfPlaybackService } from "@/zwf/ZwfPlaybackService";
import { executeFromPublishObject as zwfRenderQueueFromPublish } from "@/zwf/ZwfRenderQueueBridge";

/**
 * @description 현재 WorkSpace 를 `.zwf` 로 다운로드한다.
 *              Export the current WorkSpace as a `.zwf` binary.
 */
export const execute = async (): Promise<void> =>
{
    const workSpace = $getCurrentWorkSpace();
    const publishObject = await publishToolCreateToObjectUseCase(workSpace.root);
    const bytes = encodePublishObject(publishObject, workSpace.name || "untitled");

    const blob = new Blob([bytes], { "type": "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const anchor = document.getElementById("save-anchor") as HTMLAnchorElement | null;
    const fileName = `${workSpace.name || "project"}.zwf`;

    if (anchor) {
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
    } else {
        const fallback = document.createElement("a");
        fallback.href = url;
        fallback.download = fileName;
        fallback.click();
    }

    setTimeout(() => URL.revokeObjectURL(url), 0);

    // 미리보기: Loader 재생 + render-queue 워커 전달
    await zwfPlaybackService(publishObject);
    await zwfRenderQueueFromPublish(publishObject);
};

/**
 * @description 사용자 설정의 publish type 에 따라 내보낸다. `zwf` 만 구현.
 */
export const executeBySetting = async (): Promise<void> =>
{
    const setting = userSettingObjectGetService();
    if (setting.type === "zwf") {
        await execute();
        return;
    }

    // 다른 포맷은 기존 upstream 경로 — v0 에서는 zwf 우선.
    await execute();
};
