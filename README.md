# ZUKBOX Editor

ZUKBOX는 타임라인에서 이미지, 텍스트, 오디오, 비디오를 조합하는 웹 저작 도구입니다. 이 저장소는 [Next2D의 에디터](https://github.com/Next2D/tool.next2d.app)를 ZUKU 용도로 확장한 포크입니다. 원본 저작권과 [MIT 라이선스](LICENSE)를 유지합니다.

<a href="https://zukuapp.github.io/docs/"><img src="https://raw.githubusercontent.com/zukuapp/.github/main/profile/assets/developer-hero.png" alt="Trecillo × ZUKU 개발자 문서" width="760"></a>

**문서 입구:** [ZUKU 개발자 문서](https://zukuapp.github.io/docs/) · [조직 저장소 지도](https://github.com/zukuapp/.github/blob/main/docs/repository-map.md)

## 저장소의 역할

| 경로·설정 | 역할 |
| --- | --- |
| `src/js/`, `src/css/` | 에디터 동작과 화면 스타일 |
| `public/language/` | 에디터가 `/language` 경로에서 읽는 번역 JSON |
| `public/runtime/` | 브라우저에 제공하는 런타임 자산 |
| `docs/` | Vite 빌드 출력과 기존 정적 자산. `docs/CNAME`은 원본 Next2D 도메인을 가리킵니다. |
| `package.json` | 로컬 개발과 빌드 명령. 패키지 이름은 `@zukbox/editor`이며 `private: true`입니다. |

렌더링 모듈은 형제 디렉터리 `../player`의 `@next2d/*` 패키지를 참조합니다. Vite 설정은 `../runtime`의 로더도 참조합니다. 이 경로는 설치 명령 전에 맞춰야 합니다.

## 로컬 개발

CI와 같은 Node.js 24 환경을 권장합니다. 세 저장소를 아래 디렉터리 이름으로 나란히 받습니다.

```bash
mkdir zuku-editor-workspace
cd zuku-editor-workspace
git clone https://github.com/zukuapp/zukbox-player.git player
git clone https://github.com/zukuapp/zukbox-runtime.git runtime
git clone https://github.com/zukuapp/zukbox.git zukbox
cd player && npm install
cd ../zukbox && npm install
npm run start
```

에디터의 실제 스크립트는 `start`, `build`, `test`, `lint`입니다. 일회성 검사에는 다음 명령을 사용합니다.

```bash
npm test -- --run
npm run lint
npm run build
```

`build`는 `docs/` 출력물을 갱신할 수 있으므로 변경 내용을 확인한 뒤 필요한 파일만 커밋합니다. `@zukbox/editor`는 이 저장소에서 공개 npm 패키지로 배포되지 않습니다.

## 함께 보는 저장소

- [zukbox-player](https://github.com/zukuapp/zukbox-player): `../player`에 배치하는 Next2D 플레이어 포크
- [zukbox-runtime](https://github.com/zukuapp/zukbox-runtime): `../runtime`에 배치하는 ZWF 런타임
- [zukbox-lang](https://github.com/zukuapp/zukbox-lang): 별도 언어 리소스 저장소. 에디터에 포함된 `public/language/`와의 변경 사항은 별도로 확인해야 합니다.
- [ZUKU 개발자 문서](https://zukuapp.github.io/docs/): 플랫폼 개요와 저장소별 개발 경로

기여 방법은 [조직 공통 가이드](https://github.com/zukuapp/.github/blob/main/CONTRIBUTING.md), 취약점 신고 방법은 [보안 정책](SECURITY.md)을 확인해 주세요.
