<!-- BEGIN ZUKU OFFICIAL BRAND -->
<!-- markdownlint-disable MD033 MD041 -->
<p align="center">
  <a href="https://docs.zuzunza.com/">
    <picture>
      <source media="(prefers-color-scheme: dark)"
        srcset=".github/branding/zuku-logo-dark.png">
      <img src=".github/branding/zuku-logo-light.png"
        alt="ZUKU" width="320">
    </picture>
  </a>
</p>
<p align="center">ZUKU - 내가 불러 일으키는 새로운 창작.</p>
<!-- markdownlint-enable MD033 MD041 -->
<!-- END ZUKU OFFICIAL BRAND -->

# ZUKBOX Editor

![version](https://img.shields.io/badge/version-v27.26102701-informational)

ZUKBOX는 타임라인에서 이미지, 텍스트, 오디오, 비디오를 조합하는 웹 저작 도구입니다. 이 저장소는 [Next2D의 에디터](https://github.com/Next2D/tool.next2d.app)를 ZUKU 용도로 확장한 포크입니다. 원본 저작권과 [MIT 라이선스](LICENSE)를 유지합니다.

문서: [ZUKU 개발자 문서](https://zukuapp.github.io/docs/) · [조직 저장소 지도](https://github.com/zukuapp/.github/blob/main/docs/repository-map.md)

## 저장소의 역할

| 경로·설정 | 역할 |
| --- | --- |
| `src/js/`, `src/css/` | 에디터 동작과 화면 스타일 |
| `public/language/` | 에디터가 `/language` 경로에서 읽는 번역 JSON |
| `public/runtime/` | 브라우저에 제공하는 런타임 자산 |
| `docs/` | Vite 빌드 출력과 기존 정적 자산. `docs/CNAME`은 원본 Next2D 도메인을 가리킵니다. |
| `package.json` | 로컬 개발과 빌드 명령. 패키지 이름은 `@zukbox/editor`이며 `private: true`입니다. |

## 요구 사항

- Node.js: CI는 24를 사용합니다.
- 형제 디렉터리 `../player`: 렌더링 모듈 `@next2d/*` 패키지를 제공합니다.
- 형제 디렉터리 `../runtime`: Vite 설정이 이 경로의 ZWF 로더를 참조합니다.
- 언어 리소스 검사: Python 3, Node.js 24 이상

두 형제 디렉터리는 의존성 설치 전에 준비합니다.

## 설치

1. 작업 디렉터리를 만들고 세 저장소를 아래 디렉터리 이름으로 나란히 받습니다.
2. `player`와 `zukbox`에서 의존성을 설치합니다.

```bash
mkdir zuku-editor-workspace
cd zuku-editor-workspace
git clone https://github.com/zukuapp/zukbox-player.git player
git clone https://github.com/zukuapp/zukbox-runtime.git runtime
git clone https://github.com/zukuapp/zukbox.git zukbox
cd player && npm install
cd ../zukbox && npm install
```

## 사용법

개발 서버를 실행합니다.

```bash
npm run start
```

| 스크립트 | 동작 |
| --- | --- |
| `start` | Vite 개발 서버를 실행합니다. |
| `build` | `docs/`에 빌드 출력을 씁니다. |
| `test` | Vitest 단위 테스트를 실행합니다. |
| `lint` | `src/js/**/*.ts`에 ESLint를 실행합니다. |

일회성 검사 명령은 다음과 같습니다.

```bash
npm test -- --run
npm run lint
npm run build
```

`npm run build`는 `docs/`의 출력물을 덮어씁니다. 변경 내용을 확인한 뒤 필요한 파일만 커밋합니다. `@zukbox/editor`는 공개 npm 패키지로 배포하지 않습니다. 브라우저 임베드용 패키지 `@zuku/editor`는 [`npm/editor/`](npm/editor/README.md)에 있습니다.

## 언어 리소스 검증 / Language resource checks

`public/language/`의 20개 파일은 [ZUKBOX 언어 저장소](https://github.com/zukuapp/zukbox-lang)의 커밋과 SHA256 해시를 사용합니다. 이 커밋과 해시는 `.github/language-source.json`에 기록되어 있습니다. 각 언어는 390개 고유 키를 제공합니다. 각 언어는 원문 키와 번호가 있는 자리표시자를 보존합니다.

언어 파일 갱신 절차는 다음과 같습니다.

1. 언어 저장소의 검사기로 언어 파일을 검사합니다.
2. 두 저장소의 리소스와 해시 기록을 함께 갱신합니다.
3. 아래 명령으로 이 저장소에서 검사합니다. 이 검사는 사이트를 배포하지 않습니다.

```bash
python3 scripts/check_languages.py --source ../zukbox-lang
ZUKBOX_EDITOR=. ZUKBOX_LOCALES=public/language node --experimental-strip-types --test ../zukbox-lang/tests/runtime-interpolation.mjs
```

The checks require Python 3 and Node.js 24 or later. They verify the pinned
language commit, all 20 file hashes, unique keys, numbered placeholders, and
static UI lookup keys. The regression test executes this editor's actual
`LanguageUtil.ts` and needs no editor dependency installation. Unobserved
dynamic keys remain available. CI runs the same checks against the pinned source.

## 함께 보는 저장소

- [zukbox-player](https://github.com/zukuapp/zukbox-player): `../player`에 배치하는 Next2D 플레이어 포크
- [zukbox-runtime](https://github.com/zukuapp/zukbox-runtime): `../runtime`에 배치하는 ZWF 런타임
- [zukbox-lang](https://github.com/zukuapp/zukbox-lang): 별도 언어 리소스 저장소. 이 저장소의 `public/language/`에는 [언어 리소스 검증](#언어-리소스-검증--language-resource-checks) 절차로 반영합니다.
- [ZUKU 개발자 문서](https://zukuapp.github.io/docs/): 플랫폼 개요와 저장소별 개발 경로

기여 방법은 [조직 공통 가이드](https://github.com/zukuapp/.github/blob/main/CONTRIBUTING.md)를 따릅니다. 취약점 신고 방법은 [보안 정책](SECURITY.md)에 있습니다.

## 변경 이력

변경 이력은 [CHANGELOG.md](CHANGELOG.md)에 기록합니다.
