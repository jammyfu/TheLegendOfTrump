import { ExpeditionHud } from "./ExpeditionHud";
import "./CompactHud.css";
import { ENEMY_RULES, CAMPS, FIELD_CHESTS } from "../game/expedition";
import { t } from "../game/i18n";
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
import { Heart, GemIcon, GameIcon } from "./Icons";
export function Minimap() {
  const office = game.zone === "office";
  const wide =
    !office && (Math.abs(game.x) > 25 || game.z > 24 || game.z < -24);
  return (
    <div className="minimap">
      <div className="map-heading">
        <span>{office ? "OVAL OFFICE" : "SOUTH LAWN"}</span>
        <span className="map-north">
          N <GameIcon name="compass" />
        </span>
      </div>
      <svg viewBox="0 0 160 170" aria-label={t("小地图")}>
        <rect
          x="10"
          y="12"
          width="140"
          height="148"
          rx="6"
          fill="var(--ui-map-ground)"
          stroke="var(--ui-gold-dim)"
        />
        {office ? (
          <>
            <rect
              x="67"
              y="45"
              width="26"
              height="14"
              fill="var(--ui-gold-dim)"
            />
            <circle cx="80" cy="86" r="32" fill="var(--ui-navy)" />
          </>
        ) : wide ? (
          <>
            <rect
              x="31"
              y="20"
              width="98"
              height="138"
              rx="8"
              fill="none"
              stroke="var(--ui-gold-dim, #b09463)"
            />
            <ellipse
              cx="80"
              cy="108"
              rx="41"
              ry="38"
              fill="none"
              stroke="var(--ui-map-path, #7f947c)"
              strokeWidth="3"
            />
            <rect
              x="67"
              y="61"
              width="26"
              height="13"
              fill="var(--ui-ivory, #e7dfc6)"
            />
            <path
              d="M40 70h27m26 0h27"
              stroke="var(--ui-ivory, #e7dfc6)"
              strokeWidth="3"
            />
            <path d="m80 76 3 5-3 5-3-5Z" fill="#e6c57e" />
            {CAMPS.map((c) => (
              <rect
                key={c.id}
                x={78 + c.x * 0.35}
                y={74 + c.z * 0.35}
                width="4"
                height="4"
                fill={c.safe ? "#89dff5" : "#dd9970"}
              />
            ))}
            {FIELD_CHESTS.filter((c) => !game.opened.has(c.id)).map((c) => (
              <circle
                key={c.id}
                cx={80 + c.x * 0.35}
                cy={76 + c.z * 0.35}
                r="1.5"
                fill="#f7d56c"
              />
            ))}
            <circle cx="80" cy="139" r="3" fill="none" stroke="#83cfdf" />
          </>
        ) : (
          <>
            <path d="M24 16h112v22H24Z" fill="var(--ui-ivory)" />
            <path d="M70 34h20v114H70Z" fill="var(--ui-map-path)" />
            <path d="M22 87h116" stroke="var(--ui-map-path)" strokeWidth="15" />
            <circle
              cx="80"
              cy="91"
              r="17"
              fill="var(--ui-navy)"
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
          transform={`translate(${80 + game.x * (office ? 3.3 : wide ? 0.35 : 2.6)} ${office ? 85 + game.z * 3.3 : wide ? 76 + game.z * 0.35 : 88 + game.z * 2.8}) rotate(${(-game.yaw * 180) / Math.PI + 180})`}
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
        {office ? t("椭圆形办公室") : t("白宫 · 南草坪")}
      </span>
    </div>
  );
}
export function Hud() {
  const [mapOpen, setMapOpen] = useState(false);
  return (
    <div className="hud-layout">
      <ExpeditionHud />
      <div
        id="lock-reticle"
        className="target-reticle"
        hidden
        aria-label="锁定准星"
      >
        <GameIcon name="lock" />
        <span>
          {game.lockTarget?.id === 100
            ? "铁甲统领"
            : ENEMY_RULES[
                game.activeGuards.find((g) => g.id === game.lockedTarget)
                  ?.kind ?? "sentinel"
              ].name}{" "}
          · {game.lockTarget?.hp ?? 0}
        </span>
      </div>
      {game.weapon === "bow" && !game.lockTarget && (
        <div className="bow-crosshair" aria-label="弓箭准星">
          <GameIcon name="lock" />
        </div>
      )}
      <div
        className={`weapon-hud ${game.bowUnlocked ? "has-bow" : "no-bow"} ${game.weapon === "bow" ? "using-bow" : ""}`}
      >
        <button aria-label="切换武器" onClick={() => game.switchWeapon()}>
          <GameIcon
            name={
              game.weapon === "bow"
                ? "bow"
                : game.swordUnlocked
                  ? "sword"
                  : game.shieldUnlocked
                    ? "shield"
                    : "book"
            }
          />
          <span>{game.weaponLabel}</span> <kbd>X</kbd>
        </button>
        <span className="ammunition">
          <GameIcon name={game.bowUnlocked ? "quiver" : "book"} />
          {game.bowUnlocked
            ? `箭矢 ${game.arrows} / 30`
            : "白宫门口右侧宝箱 · 获取弓箭"}
        </span>
        {game.weapon === "bow" && (
          <>
            <meter
              aria-label="拉弓力度"
              min={0}
              max={0.85}
              value={game.bowDraw}
            />
            <small>
              {game.bowDraw >= 0.85
                ? "满弓 · 松开射击"
                : "按住攻击拉弓 · 松开射击"}
            </small>
          </>
        )}
      </div>
      <div className="vital-hud">
        <div className="hearts" aria-label={t(`生命值 ${game.hp} / 3`)}>
          {[1, 2, 3].map((n) => (
            <Heart key={n} empty={n > game.hp} />
          ))}
        </div>
        <div className="stamina">
          <meter
            min="0"
            max={game.maxStamina}
            value={game.stamina}
            aria-label={t("体力")}
          />
          <span>
            {game.guarding
              ? t("防御中")
              : game.sprinting
                ? t("冲刺")
                : game.dodgeTime > 0
                  ? t("翻滚")
                  : t("体力")}{" "}
            {Math.ceil(game.stamina)}
          </span>
        </div>
      </div>
      {(game.chargeTime > 0 || game.spinTime > 0) && (
        <div
          className={`combo-status ${game.zone === "office" ? "boss-combo" : ""}`}
          aria-label={t("蓄力旋转斩")}
        >
          <strong>
            {game.spinTime > 0
              ? t("旋风斩！")
              : game.chargeTime >= SPIN.minCharge
                ? t("松开攻击 · 释放旋转斩")
                : t("蓄力中…")}
          </strong>
          <meter
            aria-label={t("蓄力进度")}
            min={0}
            max={SPIN.maxCharge}
            value={game.chargeTime}
            style={{ width: 180, height: 12, justifySelf: "center" }}
          />
          <span>{t("长按左键 / J / 攻击 · 消耗 26 体力")}</span>
        </div>
      )}
      {(game.attackTime > 0 || game.comboWindow > 0) &&
        game.chargeTime <= 0 &&
        game.spinTime <= 0 && (
          <div
            className={`combo-status ${game.zone === "office" ? "boss-combo" : ""}`}
            aria-label={t("连招状态")}
          >
            <strong>
              {game.combo + 1} / 3 · {t(ATTACKS[game.combo].name)}
            </strong>
            <span>
              {game.combo === 2
                ? t("终结技")
                : game.comboQueued
                  ? t("已衔接下一式")
                  : t("再按攻击衔接")}
            </span>
          </div>
        )}
      {game.zone === "office" && game.boss.active && game.boss.hp > 0 && (
        <div className="boss-hud" aria-label={t("Boss 战")}>
          <span>
            {t("铁甲统领")}
            {game.boss.enraged ? t("· 过载阶段") : t("· 椭圆厅守护者")}
          </span>
          <meter
            aria-label={t("Boss 生命值")}
            min={0}
            max={game.boss.maxHp}
            value={game.boss.hp}
          />
          <small>
            {game.summonTime > 0
              ? `召唤援军 · ${game.summonTime.toFixed(1)} 秒 · 可趁机攻击`
              : game.boss.state === "windup"
                ? game.boss.move === "sweep"
                  ? t("金色横扫 · 举盾格挡")
                  : game.boss.move === "slam"
                    ? t("重锤下砸 · 闪避离开红圈")
                    : game.boss.move === "dart" ? "飞镖预警 · 横移或举盾" : t("冲击波 · 跳跃躲避")
                : game.boss.state === "recover"
                  ? t("收招破绽 · 进攻！")
                  : t("Q 锁定 · 留意地面预警")}
          </small>
        </div>
      )}
      <div className="gem-count" aria-label={t(`翡翠 ${game.gems} 枚`)}>
        <GemIcon />
        <strong>{String(game.gems).padStart(2, "0")}</strong>
      </div>
      <div className="adventure-menu">
        <button
          aria-label={t("锁定目标")}
          data-tooltip={`${t("锁定目标")} · Q`}
          aria-pressed={game.lockedTarget !== null}
          onClick={() => game.toggleLock()}
        >
          <GameIcon name="lock" />
          <span className="menu-action-label">
            {t("◎ 锁定").replace("◎", "").trim()}
          </span>
        </button>
        {game.lockedTarget !== null && (
          <button
            aria-label="切换目标"
            data-tooltip="切换目标 · Tab"
            onClick={() => game.cycleTarget()}
          >
            <GameIcon name="switch" />
            <span className="menu-action-label">换目标</span>
          </button>
        )}
        <button
          className="mouse-look"
          data-tooltip={t("按住中键转动视角")}
          aria-label={t("按住中键转动视角")}
          aria-pressed={!!document.pointerLockElement}
          onClick={requestMouseLook}
        >
          <GameIcon name="camera" />
          <span className="menu-action-label">{t("按住中键转动视角")}</span>
        </button>
        <button
          aria-label={t("切换地图")}
          data-tooltip={t("切换地图")}
          aria-pressed={mapOpen}
          onClick={() => setMapOpen(!mapOpen)}
        >
          <GameIcon name="map" />
          <span className="menu-action-label">{t("地图")}</span>
        </button>
        <button
          aria-label={t("暂停游戏")}
          data-tooltip={`${t("暂停游戏")} · Esc`}
          onClick={() => {
            game.pause();
            clearInput();
          }}
        >
          <GameIcon name="pause" />
        </button>
      </div>
      <details className="hud-disclosure quest-disclosure">
        <summary aria-label="查看任务" title="查看任务"><GameIcon name="compass" /></summary>
      <div className="quest">
        <GameIcon name="compass" />
        <p>
          {game.zone === "office"
            ? game.boss.hp > 0
              ? t("击败铁甲统领，解锁书桌")
              : t("走近书桌，签署冒险宣言")
            : !game.swordUnlocked || !game.shieldUnlocked
              ? !game.swordUnlocked
                ? "降落区左侧宝箱 · 取得冒险剑"
                : "降落区右侧宝箱 · 取得盾牌"
              : game.gems >= 8
                ? t("大门已开启 · 进入白宫")
                : t("探索南草坪，收集 8 枚翡翠")}
        </p>
      </div>
      {!game.bowUnlocked && <p>白宫门口右侧宝箱 · 获取弓箭</p>}
      </details>
      {mapOpen && <Minimap />}
      {game.toast && (
        <div className="toast" role="status">
          <GameIcon name="spark" />
          <span>{t(game.toast)}</span>
        </div>
      )}
      {game.prompt && (
        <button className="interact-prompt" onClick={() => game.interact()}>
          <kbd>E</kbd>
          {t(game.prompt)}
          <GameIcon name="arrow" />
        </button>
      )}
      {game.lockedTarget !== null && (
        <div className="lock-label">{t("◆ 目标锁定 · Tab 切换 · Q 解除")}</div>
      )}
      <details className="hud-disclosure controls-disclosure">
        <summary aria-label="查看操作帮助" title="查看操作帮助">?</summary>
      <div className="adventure-controls">
        <span>{t("WASD 移动")}</span>
        <span>{t("中键按住 视角")}</span>
        <span>{t("左键 / J 攻击 · 长按蓄力 · X 切换武器")}</span>
        <span>{t("右键 / F 防御 / 精瞄")}</span>
        <span>{t("Space 跳跃")}</span>
        <span>{t("Shift 冲刺")}</span>
        <span>{t("Shift + 方向 翻滚")}</span>
        <span>{t("E 互动 · Q 锁定")}</span>
      </div>
      </details>
      <TouchControls />
    </div>
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
        aria-label={t("滑动转动视角")}
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
        <span>{t("滑动视角")}</span>
      </div>
      <div className="adventure-touch">
        <div
          className="joystick"
          ref={pad}
          aria-label={t("移动摇杆")}
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
            <GameIcon name="compass" />
          </span>
        </div>
        <div className="adventure-buttons">
          <button
            className="attack-button"
            disabled={game.weapon === "none"}
            aria-label={game.weapon === "bow" ? "射箭" : t("挥剑")}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              game.pressAttack();
            }}
            onPointerUp={() => game.releaseAttack()}
            onPointerCancel={() => game.cancelCharge()}
            onLostPointerCapture={() => game.cancelCharge()}
          >
            <GameIcon name={game.weapon === "bow" ? "bow" : "sword"} />
            <small>
              {game.weapon === "none"
                ? "尚无武器"
                : game.weapon === "bow"
                  ? "拉弓·射箭"
                  : t("攻击·蓄力")}
            </small>
          </button>
          <HoldButton
            action="guard"
            label={
              game.weapon === "bow"
                ? "精瞄"
                : game.shieldUnlocked
                  ? t("防御")
                  : "尚无盾牌"
            }
          />
          <button
            className="jump-button"
            aria-label={t("跳跃")}
            onPointerDown={() => game.jump()}
          >
            <GameIcon name="jump" />
            <small>{t("跳跃")}</small>
          </button>
          <button
            className="dodge-button"
            aria-label={t("翻滚")}
            onPointerDown={() => game.dodge(getInput())}
          >
            <GameIcon name="roll" />
            <small>{t("翻滚")}</small>
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
      disabled={
        action === "guard" && game.weapon !== "bow" && !game.shieldUnlocked
      }
      aria-label={label}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        held[action] = true;
      }}
      onPointerUp={reset}
      onPointerCancel={reset}
      onLostPointerCapture={reset}
    >
      <GameIcon
        name={
          action === "guard"
            ? game.weapon === "bow"
              ? "lock"
              : "shield"
            : "arrow"
        }
      />
      <small>{label}</small>
    </button>
  );
}
