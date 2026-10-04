export declare const editorUrl: string;
export interface EditorFrameOptions { url?: string | URL; title?: string; width?: number; height?: number; }
/** Opaque sandbox; no host storage access, camera, microphone or fullscreen permissions. */
export declare function createEditorFrame(options?: EditorFrameOptions): HTMLIFrameElement;
