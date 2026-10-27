# ZUKU Editor

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/zukuapp/zukbox/main/.github/branding/zuku-logo-dark.png">
  <img src="https://raw.githubusercontent.com/zukuapp/zukbox/main/.github/branding/zuku-logo-light.png" width="320" alt="ZUKU">
</picture>

ZUKU - 내가 불러 일으키는 새로운 창작.

`@zuku/editor` packages the MIT Next2D/ZUKBOX browser animation editor
as static files, with an embedding helper. It is a local game authoring tool
for ZWF1 animations. For HTML5 ZIP (ZWF2) content, use `@zuku/zwf`.

## Usage

```js
import { editorUrl, createEditorFrame } from '@zuku/editor';
const frame = createEditorFrame();
document.querySelector('#editor').append(frame);
```

| Export | Target |
| --- | --- |
| `editorUrl` | `dist/index.html` |
| `./editor` | `dist/index.html` |
| `createEditorFrame()` | Sandboxed iframe that loads `editorUrl` |
| `createEditorFrame({url: '/editor/index.html'})` | Iframe that loads an explicit same-origin URL |

## Configuration

### Serving

1. Serve the complete package on your application's origin.
2. Configure your bundler to copy the complete `dist` tree.
3. Serve static assets with correct MIME types.
4. Serve static assets with `Access-Control-Allow-Origin: *` without credential
   support. The default frame has an opaque sandbox origin and requires this header.

Apply this header to public static editor assets only, never to account APIs.

### Frame isolation

The frame permits scripts and user project downloads. It adds no iframe
Permissions Policy grants. It does not grant `allow-same-origin`, popups or
top navigation. It requests credentialless navigation on supporting browsers.

The isolated frame uses session-only in-memory settings and IndexedDB.
Reloading clears that session. Download projects to retain them. The standalone
editor opened outside this helper uses the browser's normal local storage behavior.

### Content Security Policy

All Ace and language assets are bundled locally. The distributed CSP permits
local scripts, WebAssembly compilation and renderer workers. It blocks
external connections and forms.

## Building from source

Requirements:

- Node 22.18+
- Rust `wasm32-unknown-unknown` target
- `zukbox-runtime` 0.1.2 or later

Keep the repositories in this sibling layout:

```text
workspace/
  editor/  https://github.com/zukuapp/zukbox
  player/  https://github.com/zukuapp/zukbox-player
  runtime/ https://github.com/zukuapp/zukbox-runtime
```

1. In `player`, run `npm ci --ignore-scripts`.
2. In `runtime`, run `npm run build:wasm`.
3. In `editor`, run `npm ci --ignore-scripts`.
4. In `editor`, run `npm ci --prefix npm/editor --ignore-scripts`.
5. In `editor`, run `npm run build --prefix npm/editor`.

The build writes its output to `npm/editor/dist`.

## License

The package uses the original Next2D MIT license (`LICENSE`).
`THIRD_PARTY_NOTICES.md` contains the BSD-3-Clause Ace notice, the Apache-2.0
memory storage notice and the bundled editor dependency licenses.

## 한국어

이 패키지는 편집기 정적 파일과 임베드 도우미를 포함합니다.

1. `dist` 전체를 같은 출처에서 제공합니다.
2. 위 CORS 헤더는 정적 파일에만 적용합니다.

기본 프레임은 세션 메모리를 사용합니다. 다시 열면 세션이 지워지므로 프로젝트를 내려받아 보관합니다.
