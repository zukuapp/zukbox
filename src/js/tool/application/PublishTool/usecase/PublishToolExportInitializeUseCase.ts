import { execute as publishToolExportZwfUseCase } from "./PublishToolExportZwfUseCase";

/**
 * @description `.zwf` 내보내기 버튼·단축키 이벤트를 등록한다.
 */
export const execute = (): void =>
{
    const exportButton = document.getElementById("tools-export");
    if (exportButton) {
        exportButton.addEventListener("click", () =>
        {
            void publishToolExportZwfUseCase();
        });
    }
};
