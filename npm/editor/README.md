# ZUKU Editor

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/zukuapp/zukbox/main/.github/branding/zuku-logo-dark.png">
  <img src="https://raw.githubusercontent.com/zukuapp/zukbox/main/.github/branding/zuku-logo-light.png" width="320" alt="ZUKU">
</picture>

ZUKU - 내가 불러 일으키는 새로운 창작.

`@zuku/editor` packages the maintained MIT Next2D/ZUKBOX browser animation
editor as static files, with an embedding helper. It is a local game authoring
tool. Account services, billing, cloud sharing and signed content verification
are not supplied by this package. The upstream source package names are retained.

```js
import { editorUrl, createEditorFrame } from '@zuku/editor';
const frame = createEditorFrame();
document.querySelector('#editor').append(frame);
```

Serve the complete package on your application's origin. `editorUrl` points to
`dist/index.html`; `./editor` also resolves the HTML file. Serve static assets
with correct MIME types and `Access-Control-Allow-Origin: *` (without credential
support), because the default frame has an opaque sandbox origin. This header
is for public static editor assets, never account APIs. Bundlers must copy the
complete `dist` tree. An explicit same-origin URL is supported with
`createEditorFrame({url: '/editor/index.html'})`.

The frame permits scripts and user project downloads. It adds no iframe
Permissions Policy grants and does not grant `allow-same-origin`, popups or
top navigation. Credentialless navigation is requested on supporting browsers.
The isolated frame uses session-only in-memory settings and IndexedDB: reloading
clears that session. Download projects to retain them. Opening the standalone
editor outside this helper uses the browser's normal local storage behavior.
The helper does not expose the parent account state or run agent commands.

All Ace and language assets are bundled locally. The distributed CSP permits
local scripts, WebAssembly compilation and renderer workers, while blocking
external connections and forms. This is the ZWF1 animation authoring/runtime
integration; HTML5 ZIP ZWF2 belongs to `@zuku/zwf`.

Build from the repository with Node 22.18+ and Rust's `wasm32-unknown-unknown`
target. Keep the maintained repositories in this sibling layout:

```text
workspace/
  editor/  https://github.com/zukuapp/zukbox
  player/  https://github.com/zukuapp/zukbox-player
  runtime/ https://github.com/zukuapp/zukbox-runtime
```

Install the player's dependencies with `npm ci --ignore-scripts`. Build the
runtime's WASM with `npm run build:wasm` in `runtime` (0.1.2 or later). In `editor`, run
`npm ci --ignore-scripts`, `npm ci --prefix npm/editor --ignore-scripts`, then
`npm run build --prefix npm/editor`. This uses the original Next2D TypeScript
entry and inline workers directly; it does not require emitted player JavaScript
or replace the original global initialization with the npm player carrier.
Output is `npm/editor/dist`; existing `docs` is
preserved. The included BSD-3-Clause Ace and Apache-2.0 memory storage notices
and bundled editor dependency licenses are in `THIRD_PARTY_NOTICES.md`; the original Next2D MIT license is unchanged.

한국어: 실제 편집기와 임베드 도우미를 포함합니다. `dist` 전체를 같은 출처에
제공하고 정적 파일에만 위 CORS 헤더를 적용하세요. 기본 프레임은 계정 저장소에
접근하지 않으며 세션 메모리를 사용합니다. 다시 열기 전에 프로젝트를 내려받아
보관하세요. 클라우드·결제 기능의 제공 또는 준비 완료를 뜻하지 않습니다.
