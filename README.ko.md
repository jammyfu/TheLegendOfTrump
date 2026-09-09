# The Legend of Trump · 백악관 모험

[简体中文](README.md) · [繁體中文（香港）](README.zh-HK.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

**React 19, Three.js, React Three Fiber, TypeScript, Vite**로 만든 로우폴리 3인칭 어드벤처입니다. 캐릭터, 장비, 환경은 독립적으로 다시 만든 에셋입니다. 비공식 독립 작품이며, 참고 영상이나 원작 모델은 포함하지 않습니다.

![타이틀 화면](artifacts/title-fairies-desktop.png)

## 실행

Node.js 22.12+ 및 WebGL 2를 지원하는 최신 브라우저가 필요합니다.

```bash
npm ci
npm run dev
npm run build
npm test
```

터미널에 로컬 주소가 표시됩니다. `dist/`는 백엔드 없이 정적 사이트로 배포할 수 있습니다.

## 플레이

보석 8개를 모아 백악관에 들어가 철갑 통령을 쓰러뜨린 뒤 책상으로 다가가면 챕터가 끝납니다. 일반 경비병은 공격 전에 예고를 보냅니다. 정면 방어, 구르기, 점프로 대응하세요. Boss의 휩쓸기, 내려찍기, 충격파에는 각각 방어, 구르기, 점프가 유효합니다. 체력이 절반 이하가 되면 빨라지고 경비병도 소환합니다.

상자에서 검과 방패, 활, 화살을 얻습니다. 3단 콤보, 차지 회전 베기, 차지 사격, 록온, 스태미나 관리를 데스크톱과 터치 조작으로 이용할 수 있습니다. 일시정지 또는 포커스 상실 시 시뮬레이션이 멈추며, 진행도는 현재 세션에만 유지됩니다.

![장비와 이동](artifacts/adventure-equipment-back.png)
![집무실 Boss 전투](artifacts/oval-boss-arena.png)

| 동작 | 조작 |
| --- | --- |
| 이동 / 시점 | WASD 또는 방향키 / 마우스 또는 가운데 버튼 드래그 |
| 점프 / 구르기 | Space / Shift + 방향 |
| 공격 / 방어 또는 조준 | 왼쪽 클릭 또는 J / 오른쪽 클릭 또는 F |
| 록온 / 무기 전환 / 상호작용 | Q / X / E |
| 일시정지 / 카메라 초기화 | Esc / R |

터치 기기에서는 왼쪽 스틱으로 이동하고 오른쪽을 쓸어 시점을 바꾸며 화면 버튼으로 행동합니다. 타이틀과 일시정지 메뉴에서 简体中文, English, 日本語, 한국어, 음량과 카메라를 설정할 수 있습니다.

## 구성 및 검증

`src/game/`에는 이동, 충돌, 전투, AI, 오디오, 퀘스트 상태가 있고, `src/components/`에는 Three.js 장면, 캐릭터, 적, HUD, 메뉴가 있습니다. 다시 생성할 수 있는 Blender 에셋은 `assets/blender/`에 있습니다.

```bash
npm test
npm run build
GAME_URL=http://127.0.0.1:4439 npm run test:e2e
```

테스트는 핵심 시뮬레이션, 터치 입력, 전투, Boss, 충돌, 브라우저 화면을 다룹니다. 최신 프로젝트 스크린샷은 `artifacts/`에 있습니다.

## 음악

기본 음악은 프로젝트에 포함된 오리지널 생성 곡입니다. 설정에서 로컬 《젤다의 전설: 시간의 오카리나》 녹음도 선택할 수 있습니다. 곡명과 출처 링크는 [오디오 메모](public/audio/README.md)에서 확인할 수 있습니다.
