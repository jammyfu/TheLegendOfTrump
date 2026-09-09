import { ATTACKS, SPIN } from "../game/combat";
import { useRef, useState } from "react";
import { game } from "../game/simulation";
import {
  clearInput,
  joystick,
  held,
  getInput,
  requestMouseLook,
} from "../game/input";
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
            <rect x="67" y="45" width="26" height="14" fill="#b09463" />
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
          transform={`translate(${80 + game.x * (office ? 4.24 : 2.6)} ${office ? 85 + game.z * 4.24 : 88 + game.z * 2.8}) rotate(${(-game.yaw * 180) / Math.PI + 180})`}
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
  const [mapOpen, setMapOpen] = useState(
    () => !matchMedia("(pointer:coarse)").matches,
  );
  return (
    <>
      <div className="vital-hud">
        <div className="hearts" aria-label={`生命值 ${game.hp} / 3`}>
          {[1, 2, 3].map((n) => (
            <Heart key={n} empty={n > game.hp} />
          ))}
        </div>
        <div className="stamina">
          <meter min="0" max="100" value={game.stamina} aria-label="体力" />
          <span>
            {game.guarding
              ? "防御中"
              : game.sprinting
                ? "冲刺"
                : game.dodgeTime > 0
                  ? "翻滚"
                  : "体力"}{" "}
            {Math.ceil(game.stamina)}
          </span>
        </div>
      </div>
      {(game.chargeTime > 0 || game.spinTime > 0) && (
        <div
          className={`combo-status ${game.zone === "office" ? "boss-combo" : ""}`}
          aria-label="蓄力旋转斩"
        >
          <strong>
            {game.spinTime > 0
              ? "旋风斩！"
              : game.chargeTime >= SPIN.minCharge
                ? "松开攻击 · 释放旋转斩"
                : "蓄力中…"}
          </strong>
          <meter
            aria-label="蓄力进度"
            min={0}
            max={SPIN.maxCharge}
            value={game.chargeTime}
            style={{ width: 180, height: 12, justifySelf: "center" }}
          />
          <span>长按左键 / J / 攻击 · 消耗 26 体力</span>
        </div>
      )}
      {(game.attackTime > 0 || game.comboWindow > 0) &&
        game.chargeTime <= 0 &&
        game.spinTime <= 0 && (
          <div
            className={`combo-status ${game.zone === "office" ? "boss-combo" : ""}`}
            aria-label="连招状态"
          >
            <strong>
              {game.combo + 1} / 3 · {ATTACKS[game.combo].name}
            </strong>
            <span>
              {game.combo === 2
                ? "终结技"
                : game.comboQueued
                  ? "已衔接下一式"
                  : "再按攻击衔接"}
            </span>
          </div>
        )}
      {game.zone === "office" && game.boss.active && game.boss.hp > 0 && (
        <div className="boss-hud" aria-label="Boss 战">
          <span>
            铁甲统领 {game.boss.enraged ? "· 过载阶段" : "· 椭圆厅守护者"}
          </span>
          <meter
            aria-label="Boss 生命值"
            min={0}
            max={game.boss.maxHp}
            value={game.boss.hp}
          />
          <small>
            {game.boss.state === "windup"
              ? game.boss.move === "sweep"
                ? "金色横扫 · 举盾格挡"
                : game.boss.move === "slam"
                  ? "重锤下砸 · 闪避离开红圈"
                  : "冲击波 · 跳跃躲避"
              : game.boss.state === "recover"
                ? "收招破绽 · 进攻！"
                : "Q 锁定 · 留意地面预警"}
          </small>
        </div>
      )}
      <div className="gem-count" aria-label={`翡翠 ${game.gems} 枚`}>
        <GemIcon />
        <strong>{String(game.gems).padStart(2, "0")}</strong>
      </div>
      <div className="adventure-menu">
        <button aria-label="锁定目标" aria-pressed={game.lockedTarget !== null} onClick={() => game.toggleLock()}>◎ 锁定</button>
        <button className="mouse-look" onClick={requestMouseLook}>
          ⌖ {document.pointerLockElement ? "鼠标已锁定" : "启用鼠标视角"}
        </button>
        <button aria-label="切换地图" onClick={() => setMapOpen(!mapOpen)}>
          地图
        </button>
        <button
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
        <p>
          {game.zone === "office"
            ? game.boss.hp > 0
              ? "击败铁甲统领，解锁书桌"
              : "走近书桌，签署冒险宣言"
            : game.gems >= 8
              ? "大门已开启 · 进入白宫"
              : "探索南草坪，收集 8 枚翡翠"}
        </p>
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
      {game.lockedTarget !== null && (
        <div className="lock-label">◆ 目标锁定 · Q 解除</div>
      )}
      <div className="adventure-controls">
        <span>WASD 移动</span>
        <span>鼠标 视角</span>
        <span>左键 / J 攻击 · 长按蓄力</span>
        <span>右键 / F 防御</span>
        <span>Space 跳跃</span>
        <span>Shift 冲刺</span>
        <span>Ctrl / K 翻滚</span>
        <span>E 互动 · Q 锁定</span>
      </div>
      <TouchControls />
    </>
  );
}
function TouchControls() {
  const pad = useRef<HTMLDivElement>(null);
  const look = useRef({ x: 0, y: 0 });
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const update = (e: React.PointerEvent) => {
    const rect = pad.current!.getBoundingClientRect();
    let x = e.clientX - rect.left - rect.width / 2,
      y = e.clientY - rect.top - rect.height / 2;
    const l = Math.hypot(x, y);
    if (l > 38) {
      x = (x / l) * 38;
      y = (y / l) * 38;
    }
    held.sprint = l > 42;
    joystick.x = l < 6 ? 0 : x / 38;
    joystick.z = l < 6 ? 0 : y / 38;
    setKnob({ x, y });
  };
  const reset = () => {
    held.sprint = false;
    joystick.x = 0;
    joystick.z = 0;
    setKnob({ x: 0, y: 0 });
  };
  return (
    <>
      <div
        className="look-pad"
        aria-label="滑动转动视角"
        onPointerDown={(e) => {
          if (e.pointerType === "mouse") return;
          e.currentTarget.setPointerCapture(e.pointerId);
          look.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            game.look(e.clientX - look.current.x, e.clientY - look.current.y);
            look.current = { x: e.clientX, y: e.clientY };
          }
        }}
      >
        <span>滑动视角</span>
      </div>
      <div className="adventure-touch">
        <div
          className="joystick"
          ref={pad}
          aria-label="移动摇杆"
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
        <div className="adventure-buttons">
          <button
            className="attack-button"
            aria-label="挥剑"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              game.pressAttack();
            }}
            onPointerUp={() => game.releaseAttack()}
            onPointerCancel={() => game.cancelCharge()}
            onLostPointerCapture={() => game.cancelCharge()}
          >
            ⚔<small>攻击·蓄力</small>
          </button>
          <HoldButton action="guard" label="防御" />
          <button
            className="jump-button"
            aria-label="跳跃"
            onPointerDown={() => game.jump()}
          >
            ↑<small>跳跃</small>
          </button>
          <button
            className="dodge-button"
            aria-label="翻滚"
            onPointerDown={() => game.dodge(getInput())}
          >
            ↝<small>翻滚</small>
          </button>


        </div>
      </div>
    </>
  );
}
function HoldButton({
  action,
  label,
}: {
  action: "guard" | "sprint";
  label: string;
}) {
  const reset = () => {
    held[action] = false;
  };
  return (
    <button
      className={action + "-button"}
      aria-label={label}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        held[action] = true;
      }}
      onPointerUp={reset}
      onPointerCancel={reset}
      onLostPointerCapture={reset}
    >
      {action === "guard" ? "◈" : "»"}
      <small>{label}</small>
    </button>
  );
}
