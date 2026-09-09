# The Legend of Trump · A White House Adventure

[简体中文](README.md) · [繁體中文（香港）](README.zh-HK.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

A playable low-poly adventure built with **React 19, Three.js, React Three Fiber, TypeScript and Vite**.

The supplied reference video inspired the blond, suited hero, third-person camera, White House grounds and office, hearts, gems and minimap. The layered title screen uses a sword-and-shield emblem, gold lettering and a textured background. Characters and equipment are rebuilt with Blender MCP and exported as GLB assets. This is an unofficial, standalone adventure chapter; the full reference video and original game models are not bundled. Music includes Suno-generated tracks and an optional Ocarina of Time soundtrack preset; see [audio sources](public/audio/README.md).

![Title screen](artifacts/title-desktop.png)

## Run locally

Use Node.js **22.12+** (or 24/26) and a modern browser supporting WebGL 2.

```bash
npm ci
# The configured local workspace uses its port manager:
npm run dev
# On another machine, specify an available port:
PORT=5173 npm run dev
```

The terminal prints the actual URL. The original development workspace uses the `worktree-frontend` port pool; its initial preview was `http://127.0.0.1:4439/`. The startup script does not replace an existing listening process.

```bash
npm run build
PORT=5173 npm run preview
```

Deploy `dist/` as a static site, including under a subdirectory. No backend is needed. System fonts are used when Google Fonts is unavailable.

## Settings and languages

Open **Settings** from the title screen or pause menu. Choose **简体中文 / English / 日本語 / 한국어**, toggle master audio, adjust music and sound-effect volumes independently, select Suno or Ocarina of Time music, and configure the camera. Preferences are saved in this browser; they do not save adventure progress. Both soundtrack presets play local files in `public/audio/`.

## Adventure

1. Collect **8 gems** around the South Lawn, fountain and breakable pots.
2. A pot gives 2 gems; crates can also be broken. Clockwork guards telegraph their attacks. Face them to block, or roll away. Sword hits interrupt ordinary guards, stagger them and push them back.
3. Interact with the White House entrance after collecting the gems.
4. The eastern supply chest grants a bow and 16 arrows; the garden chest provides another 12. Press X to switch weapons. Hold attack to draw the bow, release to fire and hold right click to aim.
5. Defeat the indoor **Iron Commander**. Block golden sweeps, evade red hammer slams and jump over expanding shockwaves. The boss speeds up below half health and summons guards at its 12/6-health thresholds: 2.4 seconds of warning, at most two guards per wave and at least 14 seconds between waves. Shockwaves also threaten distant players.
6. After victory, approach the desk and sign the adventure declaration.

You have three hearts. Indoor retries restore health at the boss-room entrance and retain gems. Pausing freezes simulation; losing window focus pauses automatically. This is a single-chapter, session-based game without progress autosave.

| Action | Controls |
| --- | --- |
| Camera-relative movement | WASD / arrow keys |
| Look / zoom | Left click also captures the mouse; wheel zooms; middle-button drag is the fallback |
| Jump / sprint | Space / hold Shift |
| Attack / charge | Left mouse button / J; hold to charge |
| Guard / bow aim | Hold right mouse button / F |
| Roll / lock on | Ctrl or K / Q |
| Switch weapon / target | X / Tab |
| Interact | E / on-screen interaction prompt |
| Reset camera / pause | R / Esc; pause releases the mouse |

Sword and shield rest on the hero's back when unused. The sword moves to the right hand for attacks and the shield to the left hand for guarding. Sprinting, combat, rolls and blocked impacts consume stamina; ordinary jumping is free. Stamina recovers after expenditure stops.

Repeated attack presses chain **downward slash → left-to-right slash → right-to-left slash**. Each stage costs 8/9/12 stamina. One next attack can be buffered after about 0.035 seconds; the first two stages have a 0.34-second follow-up window. The finisher has extra recovery. Low stamina prevents attacks; rolling cancels the combo. Shoulder, elbow, wrist, waist and knee animations drive each strike. Contact triggers brief hit-stop, sword trails, sparks, impact audio, enemy recoil and camera feedback. Knockback respects obstacles.

Hold attack to strike once and then charge. After 1.2 seconds, a gold ring and sound indicate a ready spin attack. Release for a 360-degree strike costing 26 stamina with a 3.8-meter radius. Walls still block hits. Early release, damage, rolling, jumping, pausing or canceled touch input cancels charging.

Arrows cost one arrow and 10 stamina per shot. Full draw takes 0.85 seconds; shots are at least 0.48 seconds apart. Normal/full-draw damage is 1/2; the boss takes the full-draw bonus only during recovery or summoning. Swept projectile collision checks walls and furniture. Defeated guards drop three arrows and stamina; indoor retries restore at least 12 arrows. The sword remains available when arrows run out.

Target markers follow enemy chests and display health. Q toggles lock; Tab or the top button changes targets. Mouse movement does not accidentally unlock the target, and distance changes have a grace period. Nearby aiming fades the hero to keep the target visible.

On phones, use the left stick to move and push it fully to sprint; swipe the right side to look. The compact action cluster provides attack, guard, jump and roll, with weapon/target controls elsewhere in the HUD. Bow mode replaces guarding with aiming. Multiple simultaneous touches are supported; releasing or canceling a held control clears it.

Camera settings include distance 5–14, field of view 55–80°, sensitivity 0.4–2×, vertical inversion and impact feedback. Settings persist and can be reset. Portrait mode widens the field of view. The camera contracts near walls and recovers smoothly, tries to rise over low furniture and fades the hero when necessary. The design draws on [Epic's camera and spring-arm documentation](https://dev.epicgames.com/documentation/en-us/unreal-engine/camera-components?application_version=4.27).

Chests, levers, herbs, signs, benches and breakable crates provide interactions. Chests and herbs reward only once. Buildings, trees, fountains, flowerbeds, furniture, props and enemies have collision; jumping onto platforms, falling from edges, wall sliding and line-of-sight checks are supported.

![Equipment on the hero's back](artifacts/adventure-equipment-back.png)
![Mobile controls](artifacts/adventure-mobile.png)
![South Lawn](artifacts/grounds-desktop.png)

## Project structure

| Path | Purpose |
| --- | --- |
| `src/game/simulation.ts` | Movement, collision, combat, collecting and quest state |
| `src/game/combat.ts` | Shared attack timing and joint-pose interpolation |
| `src/game/input.ts` | Keyboard, mouse capture, stick and focus handling |
| `src/game/world.ts`, `collision.ts` | Interactions, colliders, sliding, landing and occlusion |
| `src/game/audio.ts`, `music.ts` | Synthesized effects and soundtrack playback |
| `src/game/i18n.ts`, `translations.json` | Language selection and translations |
| `src/components/SettingsPanel.tsx` | Language, audio and camera settings |
| `src/components/RangedCombat.tsx` | Target markers, arrows, summon warnings and pickups |
| `src/components/InteractiveProps.tsx` | Interactive prop models and animation |
| `src/components/Character.tsx` | GLB character loading and joint animation |
| `src/components/Scene.tsx`, `World.tsx` | Scene, camera, environment and simulation stepping |
| `src/components/Hud.tsx`, `src/App.tsx` | HUD, touch controls, menus and chapter flow |

High-frequency state lives in the simulation instance. DOM updates are throttled; characters and cameras synchronize through `useFrame`. Large frame intervals are subdivided. Development builds expose `window.__game`, `window.__scene` and `window.__camera` for testing; production builds do not.

## Verification

```bash
npm test
npm run build
# Start the development server in another terminal first:
GAME_URL=http://127.0.0.1:4439 npm run test:e2e
```

Tests cover movement, swept collision, landing, camera avoidance, directional hits, occlusion, rewards, guarding, rolls, stamina, combos, boss combat and retries. Browser scenarios cover equipment poses, mouse capture, touch controls and chapter completion. Some scenarios use development hooks to position the player before exercising real input; a full lawn route is also tested without teleporting.

Screenshots are in `artifacts/`. Playwright defaults to local Chrome. Alternatively, run `npx playwright install chromium` and set `BROWSER_CHANNEL=chromium`. Mobile checks include a 390 × 844 viewport, simultaneous touches, canceled controls and overflow.

## Blender assets

- `assets/blender/build_trump.py` / `trump-n64.blend`: faceted hero with blond hair, suit, red tie, flag pin and named joint pivots; exported to `public/models/trump-n64.glb`.
- `build_adventure_props.py` / `adventure-props.blend`: sword, shield, chests, lever, crates and herbs; exports use `hero-*.glb` and `adventure-*.glb`.
- `build_bow.py` / `adventure-bow.blend`: recurve bow, quiver and arrows.
- `build_enemies_arena.py` / `enemies-arena.blend`: animated guards, commander and furnished indoor arena.
- `build_arrival_helicopter.py` / `arrival-helicopter.blend`: helicopter with sliding door, boarding steps, landing gear and animated rotors.
- `public/title-screen.jpg`: reference title frame extracted from the supplied video. Layered title assets and provenance are in `public/title/`.

Set `TRUMP_PROJECT_DIR` to the absolute project path in Blender before running the modeling scripts. They use separate scenes to preserve existing work. Run `npm run assets:optimize` for glTF Transform deduplication, welding and cleanup.

![Blender hero preview](artifacts/trump-model.png)
![Sword combo and recoil](artifacts/combo-2.png)
![Helicopter arrival](artifacts/helicopter-arrival.png)

The skippable helicopter opening synchronizes the door, steps, hero exit and camera sequence. Engine and rotor effects fade with approach and departure. The stylized helicopter references [this public US Air Force Marine One photograph](https://www.jba.af.mil/News/Photos/igphoto/2000075518/).

## Iron Commander and Oval Office

The [enemy and arena concept](assets/concepts/enemies-and-oval-arena.png) guides the Blender-built guards, commander and room: walnut flooring, ivory panels, tall windows, burgundy curtains, gold-trimmed carpet and furniture. The enlarged room keeps a clear central combat area; bookcases, sofas, columns and the desk have colliders. The boss resists interruption during windup but exposes recovery windows. Ground warnings, a health bar, target locking and retries support the encounter.

![Oval Office boss battle](artifacts/oval-boss-arena.png)

The reference video did not specify the complete combat or collection rules. Gem requirements, rewards, guards and victory conditions are additions that make the chapter playable. Screenshots may reflect earlier development revisions.
