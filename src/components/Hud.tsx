import { useRef, useState } from "react";
import { game } from "../game/simulation";
import { clearInput, joystick } from "../game/input";
import { Heart, GemIcon } from "./Icons";
export function Minimap() {
  const office = game.zone === "office";
  return (
    <div className="minimap">
      <div className="map-heading">
        <span>{office ? "OVAL OFFICE" : "SOUTH LAWN"}</span>
        <span>N ↑</span>
      </div>
      <svg viewBox="0 0 160 170" aria-label="小地图">
        <rect
          x="10"
          y="12"
          width="140"
          height="148"
          rx="45"
          fill="#294d45"
          stroke="#718a6b"
        />
        {office ? (
          <>
            <rect x="59" y="29" width="42" height="14" fill="#b09463" />
            <circle cx="80" cy="86" r="32" fill="#344e5e" />
          </>
        ) : (
          <>
            <path d="M24 16h112v22H24Z" fill="#bfc2a5" />
            <path d="M70 34h20v114H70Z" fill="#7f947c" />
            <path d="M22 87h116" stroke="#7f947c" strokeWidth="15" />
            <circle
              cx="80"
              cy="91"
              r="17"
              fill="#6d9a97"
              stroke="#b7b89a"
              strokeWidth="3"
            />
            {game.items
              .filter((g) => !g.collected)
              .map((g) => (
                <circle
                  key={g.id}
                  cx={80 + g.x * 2.6}
                  cy={88 + g.z * 2.8}
                  r="2.4"
                  fill="#b8e8a0"
                />
              ))}
            <path d="m80 31 4 6-4 6-4-6Z" fill="#e6c57e" />
          </>
        )}
        <g
          transform={`translate(${80 + game.x * (office ? 7 : 2.6)} ${office ? 85 + game.z * 7 : 88 + game.z * 2.8}) rotate(${(-game.yaw * 180) / Math.PI + 180})`}
        >
          <circle r="6" fill="#e9d298" opacity=".2" />
          <path
            d="m0-6 4 9-4-2-4 2Z"
            fill="#f4d98c"
            stroke="#fff0be"
            strokeWidth=".5"
          />
        </g>
      </svg>
      <span className="map-caption">
        {office ? "椭圆形办公室" : "白宫 · 南草坪"}
      </span>
    </div>
  );
}
export function Hud() {
  const [mapOpen, setMapOpen] = useState(true);
  return (
    <>
      <div className="vital-hud">
        <div className="hearts" aria-label={`生命值 ${game.hp} / 3`}>
          {[1, 2, 3].map((n) => (
            <Heart key={n} empty={n > game.hp} />
          ))}
        </div>
      </div>
      <div className="gem-count" aria-label={`翡翠 ${game.gems} 枚`}>
        <GemIcon />
        <strong>{String(game.gems).padStart(2, "0")}</strong>
        <span>/ 08</span>
      </div>
      <div className="retro-actions">
        <button
          className="retro-action sword-action"
          onClick={() => game.attack()}
          aria-label="剑击"
        >
          ⚔
        </button>
        <button
          className="retro-action use-action"
          onClick={() => game.interact()}
          aria-label="动作"
        >
          A
        </button>
        <div className="c-buttons">
          <button
            onClick={() => (game.cameraYaw -= Math.PI / 4)}
            aria-label="左转镜头"
          >
            ◀
          </button>
          <button onClick={() => (game.cameraYaw = 0)} aria-label="重置镜头">
            ▲
          </button>
          <button
            onClick={() => (game.cameraYaw += Math.PI / 4)}
            aria-label="右转镜头"
          >
            ▶
          </button>
        </div>
      </div>
      <div className="hud-top-right">
        <button
          className="small-button"
          aria-label="切换地图"
          onClick={() => setMapOpen(!mapOpen)}
        >
          ⌖
        </button>
        <button
          className="small-button"
          aria-label="暂停游戏"
          onClick={() => {
            game.pause();
            clearInput();
          }}
        >
          Ⅱ
        </button>
      </div>
      <div className="quest">
        <span className="quest-diamond">◇</span>
        <div>
          <span className="eyebrow">CHAPTER 01 · 初入白宫</span>
          <p>
            {game.zone === "office"
              ? "走近书桌，签署冒险宣言"
              : game.gems >= 8
                ? "大门已开启 · 进入白宫"
                : "探索南草坪，收集 8 枚翡翠"}
          </p>
        </div>
      </div>
      {mapOpen && <Minimap />}
      {game.toast && (
        <div className="toast" role="status">
          {game.toast}
        </div>
      )}
      {game.prompt && (
        <button className="interact-prompt" onClick={() => game.interact()}>
          <kbd>E</kbd>
          {game.prompt}
          <span>↵</span>
        </button>
      )}
      <div className="desktop-controls">
        <span>
          <kbd>W A S D</kbd> 移动
        </span>
        <span>
          <kbd>SPACE</kbd> 挥剑
        </span>
        <span>
          <kbd>E</kbd> 交互
        </span>
        <span>
          <kbd>SHIFT</kbd> 奔跑
        </span>
        <span className="extra-control">拖拽视角 · R 复位</span>
      </div>
      <TouchControls />
    </>
  );
}
function TouchControls() {
  const pad = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const update = (e: React.PointerEvent) => {
    const rect = pad.current!.getBoundingClientRect();
    let x = e.clientX - rect.left - rect.width / 2,
      y = e.clientY - rect.top - rect.height / 2;
    const l = Math.hypot(x, y);
    if (l > 36) {
      x = (x / l) * 36;
      y = (y / l) * 36;
    }
    joystick.x = x / 36;
    joystick.z = y / 36;
    setKnob({ x, y });
  };
  const reset = () => {
    joystick.x = 0;
    joystick.z = 0;
    setKnob({ x: 0, y: 0 });
  };
  return (
    <div className="touch-controls">
      <div
        className="joystick"
        ref={pad}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          update(e);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) update(e);
        }}
        onPointerUp={reset}
        onPointerCancel={reset}
        onLostPointerCapture={reset}
      >
        <span style={{ transform: `translate(${knob.x}px,${knob.y}px)` }}>
          ✦
        </span>
      </div>
      <div className="touch-actions">
        <button aria-label="交互" onPointerDown={() => game.interact()}>
          E
        </button>
        <button aria-label="挥剑" onPointerDown={() => game.attack()}>
          ⚔
        </button>
      </div>
    </div>
  );
}
