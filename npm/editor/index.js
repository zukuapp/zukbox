/** Self-host this directory; browser hosts must serve the complete dist tree. */
export const editorUrl = new URL('./dist/index.html', import.meta.url).href;
export function createEditorFrame(options = {}) {
    if (typeof document === 'undefined') throw new Error('Editor frames require a browser document');
    const url = new URL(options.url ?? editorUrl, document.baseURI);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== location.origin || url.username || url.password) {
        throw new Error('Editor assets must be hosted on the same origin');
    }
    const frame = document.createElement('iframe');
    frame.src = url.href;
    frame.title = options.title ?? 'ZUKU Editor';
    frame.setAttribute('sandbox', 'allow-scripts allow-downloads');
    frame.setAttribute('allow', '');
    frame.setAttribute('credentialless', '');
    frame.referrerPolicy = 'no-referrer';
    frame.style.border = '0';
    for (const [key, fallback] of [['width', 1280], ['height', 800]]) {
        const value = options[key] ?? fallback;
        if (!Number.isInteger(value) || value < 240 || value > 8192) throw new RangeError('Invalid editor frame size');
        frame[key] = String(value);
    }
    return frame;
}
