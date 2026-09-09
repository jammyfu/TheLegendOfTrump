# The Legend of Trump · A White House Adventure

[简体中文](README.md) · [繁體中文（香港）](README.zh-HK.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

A low-poly, third-person adventure built with **React 19, Three.js, React Three Fiber, TypeScript and Vite**. The characters, equipment and environments are independently rebuilt assets. This unofficial standalone project does not include the reference video or original game models.

![Title screen](artifacts/title-fairies-desktop.png)

## Run

Node.js 22.12+ and a modern WebGL 2 browser are required.

```bash
npm ci
npm run dev
npm run build
npm test
```

The terminal prints the local URL. Deploy `dist/` as a static site; no backend is required.

## Play

Collect eight gems, enter the White House, defeat the Iron Commander, then approach the desk to finish the chapter. Regular guards telegraph attacks; block from the front, roll away, or jump clear. The boss sweep, slam and shockwave are answered by blocking, rolling and jumping. It becomes faster and summons guards below half health.

Chests grant sword-and-shield gear, a bow and arrows. Desktop and touch play support a three-hit sword combo, charged spin, drawn shots, lock-on and stamina management. Pause and loss of focus freeze the simulation; progress lasts only for the current session.

![Equipment and movement](artifacts/adventure-equipment-back.png)
![Oval Office boss battle](artifacts/oval-boss-arena.png)

| Action | Controls |
| --- | --- |
| Move / look | WASD or arrows / mouse or middle-button drag |
| Jump / roll | Space / Shift + direction |
| Attack / guard or aim | Left click or J / right click or F |
| Lock on / switch weapon / interact | Q / X / E |
| Pause / reset camera | Esc / R |

On touch devices, use the left stick to move, swipe the right side to look, and use the on-screen buttons. The title and pause menus provide Simplified Chinese, English, Japanese and Korean, plus audio and camera settings.

## Project and verification

`src/game/` contains movement, collision, combat, AI, audio and quest state. `src/components/` contains the Three.js scene, characters, enemies, HUD and menus. Regenerable Blender assets live in `assets/blender/`.

```bash
npm test
npm run build
GAME_URL=http://127.0.0.1:4439 npm run test:e2e
```

Tests cover the core simulation, touch input, combat, boss encounter, collision and browser views. The latest project screenshots are in `artifacts/`.

## Music

The default soundtrack consists of bundled original generated tracks. Settings can also select local *The Legend of Zelda: Ocarina of Time* recordings. Track names and source links are listed in the [audio notes](public/audio/README.md).
