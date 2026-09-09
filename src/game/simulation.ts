import {
  LANDING,
  ENEMY_SPAWNS,
  ENEMY_RULES,
  COIN_POSITIONS,
  FIELD_CHESTS,
  type EnemyKind,
} from "./expedition";
import { Boss } from "./boss";
import { LOCK_CAMERA, followLockYaw, lockRangeTime } from "./lockCamera";
import { INTRO_DURATION } from "./intro";
import {
  loadCamera,
  saveCamera,
  sanitizeCamera,
  type CameraSettings,
} from "./camera";
import { ATTACKS, COMBO_GRACE, SPIN } from "./combat";
import {
  staticColliders,
  gateCollider,
  cratePositions,
  interactions,
  type Collider,
  type Interaction,
  type Zone,
} from "./world";
import {
  occupied,
  floorAt,
  moveAndSlide,
  lineClear,
  rayFraction,
} from "./collision";
export type { Zone };
export type Phase =
  | "title"
  | "intro"
  | "playing"
  | "paused"
  | "reading"
  | "dialogue"
  | "won"
  | "lost";
export interface Input {
  x: number;
  z: number;
  sprint: boolean;
  guard?: boolean;
}
export interface Gem {
  id: number;
  x: number;
  z: number;
  collected: boolean;
}
export interface Pot {
  id: number;
  x: number;
  z: number;
  broken: boolean;
}
export interface Guard {
  kind: EnemyKind;
  shotX?: number;
  shotZ?: number;
  id: number;
  x: number;
  z: number;
  originX: number;
  originZ: number;
  hp: number;
  windup: number;
  cooldown: number;
  yaw: number;
  stun: number;
  stunDuration: number;
  hitFlash: number;
  knockX: number;
  knockZ: number;
  defeatTime: number;
}
export const REQUIRED_GEMS = 8;
export const GEM_POSITIONS = [
  [-5, 12],
  [-8, 8],
  [-9, 3],
  [-7, -3],
  [-5, -9],
  [5, 12],
  [8, 8],
  [9, 3],
  [7, -3],
  [5, -9],
  [0, -10],
  [0, 17],
];
export const POT_POSITIONS = [
  [-12, 10],
  [12, 10],
  [-11, -7],
  [11, -7],
];
export type SoundEvent =
  | "arrow"
  | "gem"
  | "sword"
  | "charge"
  | "spin"
  | "hit"
  | "heavy"
  | "block"
  | "hurt"
  | "break"
  | "door"
  | "win";
export class Simulation {
  phase: Phase = "title";
  zone: Zone = "grounds";
  x = 0;
  z = LANDING.heroZ;
  y = 0;
  vy = 0;
  yaw = Math.PI;
  moving = false;
  grounded = true;
  jumpBuffer = 0;
  coyoteTime = 0;
  lockObscuredTime = 0;
  lockRangeElapsed = 0;
  mouseLookSuspended = false;
  private directionHeld = false;
  private lastInput: Input = { x: 0, z: 0, sprint: false };
  autoLockCooldown = 0;
  private autoLockScan = 0;
  hp = 3;
  gems = 0;
  coins = 0;
  potions = 0;
  coinDrops = COIN_POSITIONS.map(([x, z]) => ({
    x,
    z,
    value: 2,
    collected: false,
  }));
  stamina = 100;
  staminaDelay = 0;
  sprinting = false;
  guarding = false;
  dodgeTime = 0;
  dodgeX = 0;
  dodgeZ = 0;
  elapsed = 0;
  introTime = 0;
  attackTime = 0;
  cooldown = 0;
  invincible = 0;
  attackHeld = false;
  attackHoldTime = 0;
  chargeTime = 0;
  spinTime = 0;
  spinHitPending = false;
  hitPending = false;
  combo = 0;
  comboWindow = 0;
  comboQueued = false;
  hitStop = 0;
  impactTime = 0;
  impactStrength = 0;
  effects: {
    x: number;
    z: number;
    age: number;
    heavy: boolean;
    block: boolean;
  }[] = [];
  toast = "";
  toastTime = 0;
  reading = { title: "", text: "" };
  items: Gem[] = [];
  pots: Pot[] = [];
  guards: Guard[] = [];
  bowUnlocked = false;
  weapon: "sword" | "bow" = "sword";
  arrows = 0;
  bowDraw = 0;
  aiming = false;
  aimPoint = { x: 0, y: 1.5, z: -30 };
  projectiles: {
    owner?: number;
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    life: number;
    power: number;
  }[] = [];
  supplies: { x: number; z: number; collected: boolean }[] = [];
  minions: Guard[] = [];
  summonTime = 0;
  summonWaves = 0;
  summonCooldown = 0;
  get activeGuards() {
    return this.zone === "office" ? this.minions : this.guards;
  }
  get lockTarget() {
    return this.combatTargets.find(
      (g) => g.id === this.lockedTarget && g.hp > 0,
    );
  }
  boss = new Boss();
  get combatTargets(): (Guard | Boss)[] {
    return this.zone === "office"
      ? [...(this.boss.active ? [this.boss] : []), ...this.minions]
      : this.guards;
  }
  resetEncounter() {
    this.minions = [101, 102].map((id, i) => ({
      ...this.guards[0],
      id,
      hp: 0,
      x: i ? 7 : -7,
      z: -5,
      originX: i ? 7 : -7,
      originZ: -5,
      stun: 0,
      defeatTime: 0,
      windup: 0,
    }));
    this.summonTime = this.summonWaves = this.summonCooldown = 0;
    this.projectiles = [];
    this.supplies = [];
    if (this.bowUnlocked) this.arrows = Math.max(12, this.arrows);
  }
  usePotion() {
    if (this.phase !== "playing" || this.hp >= 3 || this.potions <= 0) return;
    this.potions--;
    this.hp = Math.min(3, this.hp + 2);
    this.events.push("gem");
    this.notify("使用回复药 · 恢复 2 颗爱心");
  }
  switchWeapon() {
    if (
      this.phase !== "playing" ||
      this.dodgeTime > 0 ||
      this.attackTime > 0 ||
      this.spinTime > 0
    )
      return;
    if (!this.bowUnlocked) {
      this.notify("东侧旅行宝箱藏有冒险弓与箭矢");
      return;
    }
    this.cancelCombo();
    this.guarding = this.aiming = false;
    this.weapon = this.weapon === "sword" ? "bow" : "sword";
    if (this.weapon === "sword")
      this.cameraPitch = Math.max(0.06, this.cameraPitch);
    this.notify(
      this.weapon === "bow"
        ? "冒险弓 · 按住左键拉弓，松开射击 · 右键精瞄"
        : "剑盾 · 左键攻击 / 右键格挡",
    );
  }
  cycleTarget() {
    if (this.phase !== "playing") return;
    const candidates = this.combatTargets.filter(
      (g) =>
        g.hp > 0 &&
        Math.hypot(g.x - this.x, g.z - this.z) < 22 &&
        this.visible(g.x, g.z, "guard-" + g.id),
    );
    const index = candidates.findIndex((g) => g.id === this.lockedTarget);
    this.lockedTarget = candidates[(index + 1) % candidates.length]?.id ?? null;
    this.lockObscuredTime = 0;
    this.lockRangeElapsed = 0;
  }
  private guardDefeated(g: Guard) {
    g.defeatTime = 0.65;
    if (this.zone === "grounds") {
      if (g.id < 2) this.gems++;
      this.coinDrops.push({
        x: g.x,
        z: g.z,
        value: ENEMY_RULES[g.kind].reward,
        collected: false,
      });
    }
    this.supplies.push({ x: g.x, z: g.z, collected: false });
    this.notify(
      this.zone === "office"
        ? "卫兵倒下 · 拾取补给恢复体力与 3 支箭"
        : "敌人倒下 · 拾取金币与箭矢补给",
    );
  }
  private bossDefeated() {
    this.summonTime = 0;
    for (const g of this.minions) {
      g.hp = 0;
      g.defeatTime = 0.65;
      g.windup = 0;
    }
    this.lockedTarget = null;
    this.notify("铁甲统领已击败 · 前往书桌签署宣言");
  }
  private shoot(draw: number) {
    if (
      this.phase !== "playing" ||
      this.cooldown > 0 ||
      this.dodgeTime > 0 ||
      this.arrows <= 0 ||
      this.stamina < 14
    )
      return;
    const power = Math.min(1, draw / 0.85),
      speed = 24 + power * 10;
    const from = { x: this.x, y: this.y + 1.65, z: this.z };
    const lock = this.lockTarget;
    const to = lock
      ? { x: lock.x, y: lock.id === 100 ? 2.35 : 1.35, z: lock.z }
      : this.aimPoint;
    const dx = to.x - from.x,
      dy = to.y - from.y,
      dz = to.z - from.z,
      d = Math.hypot(dx, dy, dz) || 1;
    this.projectiles.push({
      ...from,
      vx: (dx / d) * speed,
      vy: (dy / d) * speed + (lock ? (1.5 * d) / speed : 0),
      vz: (dz / d) * speed,
      life: 2.2,
      power,
    });
    this.arrows--;
    this.stamina -= 14;
    this.staminaDelay = 0.9;
    this.cooldown = 0.7;
    this.events.push("arrow");
  }
  private updateRanged(dt: number) {
    for (const a of this.projectiles) {
      const next = {
        x: a.x + a.vx * dt,
        y: a.y + a.vy * dt,
        z: a.z + a.vz * dt,
      };
      let first = 1.01,
        hit: Collider | undefined;
      const obstacles = this.colliders.filter(
        (c) => a.owner === undefined || c.id !== "guard-" + a.owner,
      );
      if (a.owner !== undefined)
        obstacles.push({
          id: "player-arrow-target",
          zone: this.zone,
          x: this.x,
          z: this.z,
          radius: 0.38,
          bottom: this.y,
          top: this.y + 2.2,
        });
      for (const c of obstacles) {
        const t = rayFraction(c, a, next, 0.04);
        if (t !== null && t < first) {
          first = t;
          hit = c;
        }
      }
      if (hit) {
        a.life = 0;
        const target = this.combatTargets.find(
          (g) => "guard-" + g.id === hit!.id && g.hp > 0,
        );
        if (hit.id === "player-arrow-target") {
          if (this.invincible === 0) {
            const facing =
              -a.vx * Math.sin(this.yaw) - a.vz * Math.cos(this.yaw) > 0;
            if (this.guarding && facing && this.stamina >= 15) {
              this.stamina -= 15;
              this.staminaDelay = 1;
              this.events.push("block");
              this.impact(this.x, this.z, false, true);
              this.notify("挡下箭矢 · -15 体力");
            } else {
              this.hp--;
              this.invincible = 1.1;
              this.cancelCombo();
              this.events.push("hurt");
              this.impact(this.x, this.z);
              this.notify("被箭矢击中 · 横移躲箭或举盾格挡");
              if (this.hp <= 0) {
                this.phase = "lost";
                this.moving = false;
              }
            }
          }
        } else if (target && a.owner === undefined) {
          if (target instanceof Boss) {
            target.hit(false);
            if (!target.hp) this.bossDefeated();
          } else {
            target.hp = Math.max(0, target.hp - 1);
            target.stun = target.stunDuration = a.power >= 0.95 ? 0.25 : 0.12;
            target.windup = 0;
            target.hitFlash = 0.14;
            target.cooldown = 0.9;
            target.knockX = a.vx * 0.045;
            target.knockZ = a.vz * 0.045;
            if (!target.hp) this.guardDefeated(target);
          }
          this.impact(target.x, target.z, a.power >= 0.95);
          this.events.push("hit");
        } else this.impact(a.x, a.z, false, true);
      }
      Object.assign(a, next);
      a.vy -= 3 * dt;
      a.life -= dt;
      if (a.y < 0) a.life = 0;
    }
    this.projectiles = this.projectiles.filter((a) => a.life > 0);
    if (this.zone === "grounds")
      for (const coin of this.coinDrops) {
        if (
          !coin.collected &&
          this.y < 1.8 &&
          Math.hypot(coin.x - this.x, coin.z - this.z) < 1.25
        ) {
          coin.collected = true;
          this.coins += coin.value;
          this.events.push("gem");
          this.notify(`拾取 ${coin.value} 金币`);
        }
      }
    for (const drop of this.supplies)
      if (
        !drop.collected &&
        Math.hypot(drop.x - this.x, drop.z - this.z) < 1.3 &&
        this.y < 1.8
      ) {
        drop.collected = true;
        this.arrows = Math.min(30, this.arrows + 3);
        this.stamina = Math.min(100, this.stamina + 20);
        this.events.push("gem");
        this.notify("补给 · +3 箭矢 · +20 体力");
      }
  }
  private updateSummons(dt: number) {
    if (!this.boss.active || this.boss.hp <= 0) return;
    this.summonCooldown = Math.max(0, this.summonCooldown - dt);
    if (this.summonTime > 0) {
      this.summonTime = Math.max(0, this.summonTime - dt);
      if (!this.summonTime) {
        for (const g of this.minions)
          if (g.hp <= 0)
            Object.assign(g, {
              x: g.originX,
              z: g.originZ,
              hp: 2,
              windup: 0,
              cooldown: 2,
              stun: 0,
              hitFlash: 0,
              knockX: 0,
              knockZ: 0,
              defeatTime: 0,
            });
        this.boss.state = "recover";
        this.boss.timer = 1.6;
        this.summonCooldown = 14;
        this.notify("卫兵入场 · 优先击破卫兵，再攻击统领！");
      }
    } else if (
      this.summonWaves < 2 &&
      !this.summonCooldown &&
      this.boss.hp <= (this.summonWaves === 0 ? 12 : 6) &&
      this.boss.state !== "windup" &&
      this.minions.every((g) => g.hp <= 0)
    ) {
      this.summonWaves++;
      this.summonTime = 2.4;
      this.boss.wave = -1;
      this.notify("统领正在召唤卫兵 · 蓝色光圈将在 2.4 秒后出现援军");
    }
  }
  crates: Pot[] = [];
  opened = new Set<string>();
  harvested = new Set<string>();
  gateOpen = false;
  restCooldown = 0;
  events: SoundEvent[] = [];
  version = 0;
  cameraYaw = 0;
  cameraSettings = loadCamera();
  cameraPitch = 0.3;
  cameraDistance = this.cameraSettings.distance;
  lockedTarget: number | null = null;
  constructor() {
    this.resetEntities();
  }
  resetEntities() {
    this.items = GEM_POSITIONS.map(([x, z], id) => ({
      id,
      x,
      z,
      collected: false,
    }));
    this.pots = POT_POSITIONS.map(([x, z], id) => ({
      id,
      x,
      z,
      broken: false,
    }));
    this.crates = cratePositions.map(([x, z], id) => ({
      id,
      x,
      z,
      broken: false,
    }));
    this.guards = ENEMY_SPAWNS.map((spawn, id) => ({
      kind: spawn.kind,
      id,
      x: spawn.x,
      z: spawn.z,
      originX: spawn.x,
      originZ: spawn.z,
      hp: ENEMY_RULES[spawn.kind].hp,
      windup: 0,
      cooldown: 1,
      yaw: 0,
      stun: 0,
      stunDuration: 0,
      hitFlash: 0,
      knockX: 0,
      knockZ: 0,
      defeatTime: 0,
    }));
  }
  start() {
    this.phase = "playing";
    this.boss = new Boss();
    this.zone = "grounds";
    this.x = 0;
    this.z = LANDING.heroZ;
    this.y = 0;
    this.vy = 0;
    this.yaw = Math.PI;
    this.moving = false;
    this.grounded = true;
    this.jumpBuffer = this.coyoteTime = this.lockObscuredTime = 0;
    this.lockRangeElapsed = 0;
    this.autoLockCooldown = this.autoLockScan = 0;
    this.directionHeld = this.mouseLookSuspended = false;
    this.lastInput = { x: 0, z: 0, sprint: false };
    this.hp = 3;
    this.gems = 0;
    this.coins = 0;
    this.potions = 0;
    this.coinDrops = COIN_POSITIONS.map(([x, z]) => ({
      x,
      z,
      value: 2,
      collected: false,
    }));
    this.stamina = 100;
    this.staminaDelay = 0;
    this.elapsed = 0;
    this.attackTime = 0;
    this.combo = 0;
    this.comboWindow = 0;
    this.comboQueued = false;
    this.hitStop = 0;
    this.impactTime = 0;
    this.impactStrength = 0;
    this.effects = [];
    this.cancelCharge();
    this.spinTime = 0;
    this.spinHitPending = false;
    this.cooldown = 0;
    this.invincible = 0;
    this.dodgeTime = 0;
    this.hitPending = false;
    this.guarding = false;
    this.sprinting = false;
    this.cameraYaw = 0;
    this.cameraPitch = 0.3;
    this.cameraDistance = this.cameraSettings.distance;
    this.lockedTarget = null;
    this.opened.clear();
    this.harvested.clear();
    this.gateOpen = false;
    this.restCooldown = 0;
    this.resetEntities();
    this.bowUnlocked = false;
    this.weapon = "sword";
    this.arrows = 0;
    this.aiming = false;
    this.resetEncounter();
    this.events = [];
    this.notify("南草坪降落区 · 领取右前方宝箱，向北探索白宫");
  }
  beginIntro() {
    this.start();
    this.phase = "intro";
    this.introTime = INTRO_DURATION;
    this.yaw = 0;
  }
  skipIntro() {
    if (this.phase === "intro") {
      this.phase = "playing";
      this.yaw = Math.PI;
      this.introTime = 0;
      this.version++;
    }
  }
  retry() {
    if (this.zone === "office" && this.boss.active) {
      this.boss.reset();
      this.resetEncounter();
      this.hp = 3;
      this.stamina = 100;
      this.x = 0;
      this.z = 6;
      this.y = 0;
      this.vy = 0;
      this.grounded = true;
      this.yaw = Math.PI;
      this.phase = "playing";
      this.invincible = 1;
      this.cancelCombo();
      this.cooldown = 0;
      this.lockedTarget = null;
      this.cameraYaw = 0;
      this.cameraPitch = 0.42;
      this.notify("再次挑战铁甲统领");
      return;
    }
    this.start();
  }
  returnToTitle() {
    this.start();
    this.phase = "title";
    this.toast = "";
    this.toastTime = 0;
  }
  notify(message: string) {
    this.toast = message;
    this.toastTime = 3.5;
    this.version++;
  }
  pause() {
    this.cancelCharge();
    if (this.phase === "playing") this.phase = "paused";
    else if (this.phase === "paused") this.phase = "playing";
    this.moving = false;
    this.guarding = false;
    this.version++;
  }
  look(dx: number, dy: number) {
    if (this.phase !== "playing") return;
    if (this.lockedTarget === null)
      this.cameraYaw -= dx * 0.004 * this.cameraSettings.sensitivity;
    this.cameraPitch = Math.max(
      this.weapon === "bow" ? -0.5 : 0.06,
      Math.min(
        1.05,
        this.cameraPitch +
          dy *
            0.003 *
            this.cameraSettings.sensitivity *
            (this.cameraSettings.invertY ? -1 : 1),
      ),
    );
    // Mouse motion adjusts pitch without accidentally dropping target lock.
  }
  setCamera(settings: Partial<CameraSettings>) {
    this.cameraSettings = sanitizeCamera({
      ...this.cameraSettings,
      ...settings,
    });
    this.cameraDistance = this.cameraSettings.distance;
    saveCamera(this.cameraSettings);
    this.version++;
  }
  zoom(delta: number) {
    if (this.phase !== "playing") return;
    this.setCamera({ distance: this.cameraDistance + delta * 0.007 });
  }

  /** Sticky acquisition: scan at 5 Hz; never steal a live lock. */
  acquireAutoTarget(force = false) {
    if (
      this.phase !== "playing" ||
      this.lockTarget ||
      (!force && this.autoLockCooldown > 0)
    )
      return;
    const range = this.weapon === "bow" ? 22 : this.zone === "office" ? 18 : 12;
    const candidates = this.combatTargets
      .filter((g) => g.hp > 0)
      .map((g) => {
        const dx = g.x - this.x,
          dz = g.z - this.z;
        const distance = Math.hypot(dx, dz);
        const facing =
          -(dx * Math.sin(this.cameraYaw) + dz * Math.cos(this.cameraYaw)) /
          Math.max(0.01, distance);
        return { g, distance, facing, score: distance * (1.3 - 0.3 * facing) };
      })
      .filter((c) => c.distance < range && (c.distance < 5 || c.facing > -0.25))
      .sort((a, b) => a.score - b.score);
    const target = candidates.find((c) =>
      this.visible(c.g.x, c.g.z, "guard-" + c.g.id),
    );
    if (target) {
      this.lockedTarget = target.g.id;
      this.lockRangeElapsed = this.lockObscuredTime = 0;
      this.autoLockCooldown = 0;
    }
  }

  toggleLock() {
    if (this.phase !== "playing") return;
    if (this.lockedTarget !== null) {
      this.lockedTarget = null;
      this.autoLockCooldown = 4;
      this.mouseLookSuspended = true;
      return;
    }
    this.autoLockCooldown = 0;
    const g = this.combatTargets
      .filter(
        (g) =>
          g.hp > 0 &&
          Math.hypot(g.x - this.x, g.z - this.z) < 22 &&
          this.visible(g.x, g.z, "guard-" + g.id),
      )
      .sort(
        (a, b) =>
          Math.hypot(a.x - this.x, a.z - this.z) -
          Math.hypot(b.x - this.x, b.z - this.z),
      )[0];
    this.lockedTarget = g?.id ?? null;
    this.lockObscuredTime = 0;
    this.lockRangeElapsed = 0;
    this.notify(g ? "已锁定目标 · Q 解除" : "附近没有可锁定的目标");
  }
  jump(input: Input = this.lastInput) {
    if (this.phase !== "playing") return;
    if (
      Math.hypot(input.x, input.z) > 0.1 &&
      (input.sprint || this.lockTarget)
    ) {
      this.dodge(input);
      return;
    }
    this.jumpBuffer = 0.16;
    this.tryJump();
  }
  private tryJump() {
    if (
      this.jumpBuffer <= 0 ||
      (!this.grounded && this.coyoteTime <= 0) ||
      this.dodgeTime > 0
    )
      return;
    this.jumpBuffer = this.coyoteTime = 0;
    this.cancelCharge();
    this.vy = 7.8;
    this.grounded = false;
    this.guarding = false;
  }
  dodge(input: Input = { x: 0, z: 0, sprint: false }) {
    if (
      this.phase !== "playing" ||
      !this.grounded ||
      this.stamina < 24 ||
      this.dodgeTime > 0
    )
      return;
    const length = Math.hypot(input.x, input.z);
    if (length > 0.1) {
      const c = Math.cos(this.cameraYaw),
        s = Math.sin(this.cameraYaw);
      this.dodgeX = (input.x * c + input.z * s) / length;
      this.dodgeZ = (input.z * c - input.x * s) / length;
    } else {
      this.dodgeX = Math.sin(this.yaw);
      this.dodgeZ = Math.cos(this.yaw);
    }
    this.stamina -= 24;
    this.staminaDelay = 1;
    this.cancelCombo();
    this.dodgeTime = 0.55;
    this.vy = 4.5;
    this.grounded = false;
    this.jumpBuffer = this.coyoteTime = 0;
    this.invincible = Math.max(this.invincible, 0.22);
    this.guarding = false;
  }
  get colliders(): Collider[] {
    const list = staticColliders.filter((c) => c.zone === this.zone);
    if (this.zone === "grounds") {
      if (!this.gateOpen) list.push(gateCollider);
      for (const p of this.pots)
        if (!p.broken)
          list.push({
            id: "pot-" + p.id,
            zone: this.zone,
            x: p.x,
            z: p.z,
            radius: 0.6,
            top: 1.32,
          });
      for (const p of this.crates)
        if (!p.broken)
          list.push({
            id: "crate-" + p.id,
            zone: this.zone,
            x: p.x,
            z: p.z,
            w: 1.4,
            d: 1.4,
            top: 1.4,
            walkable: true,
          });
      for (const g of this.guards)
        if (g.hp > 0)
          list.push({
            id: "guard-" + g.id,
            zone: this.zone,
            x: g.x,
            z: g.z,
            radius: 0.48,
            top: 2.5,
          });
    }
    if (this.zone === "office" && this.boss.active && this.boss.hp > 0)
      list.push({
        id: "guard-100",
        zone: "office",
        x: this.boss.x,
        z: this.boss.z,
        radius: 0.8,
        top: 4.3,
      });
    if (this.zone === "office")
      for (const g of this.minions)
        if (g.hp > 0)
          list.push({
            id: "guard-" + g.id,
            zone: this.zone,
            x: g.x,
            z: g.z,
            radius: 0.48,
            top: 2.5,
          });
    return list;
  }
  visible(x: number, z: number, ignore = "") {
    return lineClear(
      this.colliders,
      { x: this.x, y: this.y + 1.3, z: this.z },
      { x, y: 1.2, z },
      ignore,
    );
  }
  get interaction(): Interaction | undefined {
    if (!this.grounded || this.dodgeTime > 0) return;
    return interactions
      .filter(
        (i) =>
          i.zone === this.zone &&
          Math.hypot(i.x - this.x, i.z - this.z) <
            (i.kind === "fountain" ? 2.2 : 2.65) &&
          !(i.kind === "herb" && this.harvested.has(i.id)) &&
          !(i.kind === "chest" && this.opened.has(i.id)) &&
          this.visible(i.x, i.z, i.id),
      )
      .sort(
        (a, b) =>
          Math.hypot(a.x - this.x, a.z - this.z) -
          Math.hypot(b.x - this.x, b.z - this.z),
      )[0];
  }
  get prompt() {
    const i = this.interaction;
    if (!i) return "";
    if (i.kind === "door" && this.gems < 8) return "大门需要 8 枚翡翠";
    if (i.id === "chest-garden" && !this.gateOpen) return "宝箱被机关封印";
    if (i.kind === "lever" && this.gateOpen) return "花园机关已开启";
    return i.label;
  }
  interact() {
    if (this.phase === "reading") {
      this.phase = "playing";
      return;
    }
    if (this.phase === "dialogue") {
      this.phase = "won";
      this.events.push("win");
      return;
    }
    if (this.phase !== "playing") return;
    const i = this.interaction;
    if (!i) return;
    switch (i.kind) {
      case "field-sign":
        this.phase = "reading";
        this.moving = false;
        this.reading = {
          title: "南草坪远征",
          text: "你在白宫以南的降落区。先领取右侧宝箱中的弓和回复药，再沿金币指引向北。西侧巡逻营、东侧弓箭营和两翼重甲据点藏有金币与补给；北侧花园还有秘藏。弓箭手瞄准后射箭，可横移、盾挡或利用掩体；重甲卫兵挥锤很慢，绕后或用连招终结攻击。金币在蓝旗营地购买箭矢、回复药；H 或药瓶按钮使用回复药。大门仍需 8 枚翡翠。",
        };
        break;
      case "merchant": {
        const arrows = i.id === "merchant-arrows",
          price = arrows ? 8 : 12;
        if (this.coins < price) {
          this.notify(`金币不足 · 需要 ${price} 金币`);
          break;
        }
        if (arrows ? this.arrows >= 30 : this.potions >= 3) {
          this.notify("背包已满");
          break;
        }
        this.coins -= price;
        if (arrows) this.arrows = Math.min(30, this.arrows + 6);
        else this.potions++;
        this.events.push("gem");
        this.notify(arrows ? "购买箭矢 · +6 箭矢" : "购买回复药 · H 使用");
        break;
      }
      case "camp":
        if (
          this.guards.some(
            (g) =>
              g.hp > 0 &&
              Math.hypot(g.x - this.x, g.z - this.z) <
                (g.kind === "archer" ? 28 : 22),
          )
        ) {
          this.notify("附近有敌人，无法休整");
          break;
        }
        this.hp = 3;
        this.stamina = 100;
        this.notify("营地休整 · 生命与体力已恢复");
        break;
      case "door":
        if (this.gems < 8) {
          this.notify(`还需要 ${8 - this.gems} 枚翡翠`);
          return;
        }
        this.zone = "office";
        this.yaw = Math.PI;
        this.x = 0;
        this.z = 6;
        this.y = 0;
        this.vy = 0;
        this.cameraYaw = 0;
        this.cameraPitch = 0.42;
        this.cameraDistance = this.cameraSettings.distance;
        this.lockedTarget = null;
        this.events.push("door");
        if (this.boss.hp > 0) {
          this.boss.reset();
          this.resetEncounter();
          this.hp = 3;
          this.stamina = 100;
          this.notify(
            "铁甲统领 · 红色预警闪避，金色横扫可格挡，冲击波跳跃躲避",
          );
        } else this.notify("走近书桌，签署冒险宣言");
        break;
      case "exit":
        if (this.boss.active && this.boss.hp > 0) {
          this.notify("击败统领后大门才会打开");
          return;
        }
        this.projectiles = [];
        this.supplies = [];
        this.lockedTarget = null;
        this.zone = "grounds";
        this.x = 0;
        this.z = -10;
        this.y = 0;
        this.vy = 0;
        this.yaw = 0;
        this.cameraYaw = 0;
        this.cameraDistance = this.cameraSettings.distance;
        this.events.push("door");
        break;
      case "desk":
        if (this.boss.active && this.boss.hp > 0) {
          this.notify("先击败铁甲统领");
          return;
        }
        this.phase = "dialogue";
        this.x = 0;
        this.z = -11.25;
        this.y = 0;
        this.yaw = 0;
        this.moving = false;
        break;
      case "sign":
        this.phase = "reading";
        this.moving = false;
        this.reading = {
          title: "南草坪探险告示",
          text: "白宫入口需要 8 枚翡翠。东侧旅行宝箱藏着补给；喷泉西侧的机关可以开启花园门与秘藏宝箱。木箱可以跳上或击碎；陶罐也藏有翡翠。先锁定守卫，再用防御和闪避寻找出手机会。",
        };
        break;
      case "chest":
        if (FIELD_CHESTS.some((c) => c.id === i.id)) {
          if (
            i.id !== "chest-landing" &&
            this.guards.some(
              (g) =>
                g.hp > 0 && Math.hypot(g.originX - i.x, g.originZ - i.z) < 16,
            )
          ) {
            this.notify("先清除据点守卫，再开启宝箱");
            break;
          }
          this.opened.add(i.id);
          if (i.id === "chest-landing") {
            this.bowUnlocked = true;
            this.arrows = Math.min(30, this.arrows + 12);
            this.potions = Math.min(3, this.potions + 1);
            this.coins += 8;
            this.notify(
              "远征装备 · 冒险弓、12 支箭、回复药与 8 金币 · X 切换武器",
            );
          } else {
            this.coins += 20;
            this.arrows = Math.min(30, this.arrows + 6);
            this.potions = Math.min(3, this.potions + 1);
            this.notify("据点秘藏 · +20 金币、6 支箭与回复药");
          }
          this.events.push("gem");
          break;
        }
        if (i.id === "chest-garden" && !this.gateOpen) {
          this.notify("先找到喷泉西侧的机关");
          return;
        }
        this.opened.add(i.id);
        this.bowUnlocked = true;
        this.arrows = Math.min(
          30,
          this.arrows + (i.id === "chest-east" ? 16 : 12),
        );
        this.gems += i.id === "chest-garden" ? 5 : 3;
        this.events.push("gem");
        this.notify(
          i.id === "chest-garden"
            ? "花园秘藏 · +5 翡翠 · +12 箭矢 · X 切换弓箭"
            : "获得冒险弓、16 支箭与 3 翡翠 · X 切换武器",
        );
        break;
      case "lever":
        if (!this.gateOpen) {
          this.gateOpen = true;
          this.events.push("door");
          this.notify("机关启动 · 花园门与秘藏宝箱已解锁");
        }
        break;
      case "herb":
        this.harvested.add(i.id);
        this.hp = Math.min(3, this.hp + 1);
        this.stamina = Math.min(100, this.stamina + 35);
        this.events.push("gem");
        this.notify("回复草 · 恢复 1 颗爱心与体力");
        break;
      case "bench":
        if (this.restCooldown > 0) {
          this.notify("刚刚休息过，继续探索吧");
          return;
        }
        this.hp = Math.min(3, this.hp + 1);
        this.stamina = 100;
        this.restCooldown = 20;
        this.phase = "reading";
        this.moving = false;
        this.reading = {
          title: "草坪上的片刻休息",
          text: "你在长椅上休息了一会儿，恢复了 1 颗爱心和全部体力。远处传来了发条守卫的脚步声。",
        };
        break;
      case "fountain":
        this.stamina = 100;
        this.notify("清凉的水雾 · 体力已恢复");
        break;
    }
    this.version++;
  }
  pressAttack() {
    if (
      this.phase !== "playing" ||
      this.attackHeld ||
      this.spinTime > 0 ||
      this.dodgeTime > 0
    )
      return;
    this.acquireAutoTarget(true);
    if (this.weapon === "bow") {
      if (this.cooldown > 0 || this.stamina < 14) return;
      if (this.arrows <= 0) {
        this.notify("箭矢用尽 · X 切回剑盾，击败卫兵拾取补给");
        return;
      }
      this.bowDraw = 0;
      this.attackHeld = true;
      return;
    }
    this.attack();
    this.attackHeld = true;
    this.attackHoldTime = 0;
  }
  cancelCharge() {
    this.bowDraw = 0;
    this.attackHeld = false;
    this.attackHoldTime = 0;
    this.chargeTime = 0;
  }
  releaseAttack() {
    if (this.weapon === "bow") {
      const held = this.attackHeld,
        draw = this.bowDraw;
      this.cancelCharge();
      if (held) this.shoot(draw);
      return;
    }
    const charge = this.chargeTime;
    this.cancelCharge();
    if (
      this.phase !== "playing" ||
      charge < SPIN.minCharge ||
      !this.grounded ||
      this.stamina < SPIN.cost
    )
      return;
    this.cancelCombo();
    this.spinTime = SPIN.duration;
    this.cooldown = SPIN.duration + 0.18;
    this.spinHitPending = true;
    this.stamina -= SPIN.cost;
    this.staminaDelay = 1;
    this.guarding = false;
    this.events.push("spin");
  }
  attack() {
    if (this.weapon === "bow") return;
    if (
      this.phase !== "playing" ||
      this.dodgeTime > 0 ||
      this.spinTime > 0 ||
      this.chargeTime > 0
    )
      return;
    if (this.attackTime > 0) {
      // One buffered press, only after the initial anticipation. Holding a key
      // or spamming cannot skip a stage or stack several future attacks.
      if (
        this.combo < 2 &&
        ATTACKS[this.combo].duration - this.attackTime >= 0.035
      )
        this.comboQueued = true;
      return;
    }
    if (this.cooldown > 0) return;
    const stage = this.comboWindow > 0 && this.combo < 2 ? this.combo + 1 : 0;
    this.beginAttack(stage);
  }
  private beginAttack(stage: number) {
    const spec = ATTACKS[stage];
    this.comboQueued = false;
    if (this.stamina < spec.cost) return;
    const target = this.combatTargets
      .filter((g) => {
        const dx = g.x - this.x,
          dz = g.z - this.z,
          d = Math.hypot(dx, dz);
        return (
          g.hp > 0 &&
          d < 3.6 &&
          d > 0.1 &&
          (dx * Math.sin(this.yaw) + dz * Math.cos(this.yaw)) / d > 0.5 &&
          this.visible(g.x, g.z, "guard-" + g.id)
        );
      })
      .sort(
        (a, b) =>
          (a.id === this.lockedTarget
            ? -100
            : Math.hypot(a.x - this.x, a.z - this.z)) -
          (b.id === this.lockedTarget
            ? -100
            : Math.hypot(b.x - this.x, b.z - this.z)),
      )[0];
    if (
      target &&
      (this.lockedTarget === null || target.id === this.lockedTarget)
    ) {
      if (this.lockedTarget === null) {
        this.lockedTarget = target.id;
        this.lockRangeElapsed = 0;
      }
      const angle = Math.atan2(target.x - this.x, target.z - this.z) - this.yaw;
      this.yaw += Math.max(
        -0.35,
        Math.min(0.35, Math.atan2(Math.sin(angle), Math.cos(angle))),
      );
    }
    this.combo = stage;
    this.comboWindow = 0;
    this.stamina -= spec.cost;
    this.staminaDelay = 0.6;
    this.attackTime = spec.duration;
    this.cooldown = spec.duration;
    this.hitPending = true;
    this.guarding = false;
    this.events.push("sword");
    this.version++;
  }
  private cancelCombo() {
    this.cancelCharge();
    this.spinTime = 0;
    this.spinHitPending = false;
    this.attackTime = 0;
    this.hitPending = false;
    this.comboQueued = false;
    this.comboWindow = 0;
    this.hitStop = 0;
  }
  impact(x: number, z: number, heavy = false, block = false) {
    this.impactTime = 0.2;
    this.impactStrength = heavy ? 1 : block ? 0.5 : 0.65;
    if (block) this.hitStop = Math.max(this.hitStop, 0.045);
    this.effects.push({ x, z, age: 0, heavy, block });
    if (this.effects.length > 8) this.effects.shift();
  }
  strike(spin = false) {
    const heavy = spin || this.combo === 2;
    const reachable = (x: number, z: number, id: string) => {
      const dx = x - this.x,
        dz = z - this.z,
        d = Math.hypot(dx, dz);
      return (
        this.y < 1.5 &&
        d < (spin ? SPIN.radius : 2.7) &&
        (spin ||
          d < 0.65 ||
          (dx * Math.sin(this.yaw) + dz * Math.cos(this.yaw)) / d > 0.15) &&
        this.visible(x, z, id)
      );
    };
    if (this.zone === "office") {
      if (
        reachable(this.boss.x, this.boss.z, "guard-100") &&
        this.boss.hit(heavy)
      ) {
        this.impact(this.boss.x, this.boss.z, heavy);
        this.hitStop = heavy ? 0.115 : 0.065;
        this.events.push(heavy ? "heavy" : "hit");
        if (!this.boss.hp) {
          this.bossDefeated();
        }
        this.version++;
      }
    }
    if (this.zone === "grounds")
      for (const [list, prefix, reward] of [
        [this.pots, "pot-", 2],
        [this.crates, "crate-", 1],
      ] as const)
        for (const p of list)
          if (!p.broken && reachable(p.x, p.z, prefix + p.id)) {
            p.broken = true;
            this.impact(p.x, p.z);
            if (prefix === "crate-" && p.id >= 3) {
              this.coinDrops.push({
                x: p.x,
                z: p.z,
                value: 5,
                collected: false,
              });
              this.notify("补给木箱 · 掉落 5 金币");
            } else this.gems += reward;
            this.events.push("break");
            if (prefix !== "crate-" || p.id < 3)
              this.notify(
                `击碎${prefix === "pot-" ? "陶罐" : "木箱"} · +${reward} 翡翠`,
              );
          }
    for (const g of this.activeGuards)
      if (g.hp > 0 && reachable(g.x, g.z, "guard-" + g.id)) {
        g.hp = Math.max(0, g.hp - (spin ? 2 : 1));
        const spec = spin ? { stun: 1.1, push: 5 } : ATTACKS[this.combo];
        g.stun = g.stunDuration =
          spec.stun * (g.kind === "brute" && !heavy ? 0.4 : 1);
        g.hitFlash = 0.14;
        const distance = Math.hypot(g.x - this.x, g.z - this.z) || 1;
        g.knockX = ((g.x - this.x) / distance) * spec.push;
        g.knockZ = ((g.z - this.z) / distance) * spec.push;
        this.hitStop = heavy ? 0.115 : 0.065;
        this.impact(g.x, g.z, heavy);
        g.windup = 0;
        g.cooldown = 0.8;
        this.events.push(heavy ? "heavy" : "hit");
        if (g.hp === 0) {
          this.guardDefeated(g);
        }
      }
    this.version++;
  }
  blocked(x: number, z: number) {
    return occupied(this.colliders, x, z, this.y);
  }
  update(delta: number, input: Input) {
    const dt = Math.min(Math.max(delta, 0), 0.05);
    if (this.phase === "intro") {
      this.introTime -= dt;
      if (this.introTime <= 0) this.skipIntro();
      return;
    }
    if (this.phase !== "playing") return;
    this.impactTime = Math.max(0, this.impactTime - dt);
    for (const effect of this.effects) effect.age += dt;
    this.effects = this.effects.filter((e) => e.age < 0.36);
    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - dt);
      return;
    }
    this.updateRanged(dt);
    if (this.zone === "office") {
      this.updateSummons(dt);
      const move =
        this.summonTime > 0 ? null : this.boss.update(dt, this, this.colliders);
      const boss = this.boss;
      const dx = this.x - boss.x,
        dz = this.z - boss.z,
        d = Math.hypot(dx, dz);
      const facing = dx * Math.sin(boss.yaw) + dz * Math.cos(boss.yaw);
      const sight = this.visible(boss.x, boss.z, "guard-100");
      const attackHit =
        move === "sweep"
          ? d < 3.8 && facing > 0 && this.y < 2
          : move === "slam"
            ? d < 3.1 && this.y < 1.5
            : false;
      const waveDistance = Math.hypot(this.x - boss.waveX, this.z - boss.waveZ);
      const waveHit =
        boss.wave >= 0 &&
        !boss.waveHit &&
        Math.abs(waveDistance - boss.wave) < 0.6 &&
        this.y < 0.65;
      if ((attackHit || waveHit) && sight && this.invincible <= 0) {
        if (waveHit) boss.waveHit = true;
        const toward =
          (boss.x - this.x) * Math.sin(this.yaw) +
          (boss.z - this.z) * Math.cos(this.yaw);
        if (
          move === "sweep" &&
          input.guard &&
          this.weapon === "sword" &&
          this.attackTime <= 0 &&
          this.spinTime <= 0 &&
          this.dodgeTime <= 0 &&
          this.chargeTime <= 0 &&
          this.grounded &&
          toward > 0 &&
          this.stamina >= 22
        ) {
          this.stamina -= 22;
          this.staminaDelay = 1;
          this.events.push("block");
          this.impact(this.x, this.z, false, true);
          boss.stagger = 0.3;
          this.notify("格挡成功 · 统领露出破绽");
        } else {
          this.hp--;
          this.invincible = 1.15;
          this.cancelCombo();
          this.events.push("hurt");
          this.impact(this.x, this.z, true);
          this.notify(waveHit ? "跳跃越过冲击波！" : "留意预警，闪避重锤！");
          if (this.hp <= 0) {
            this.phase = "lost";
            this.moving = false;
            return;
          }
        }
        this.version++;
      }
    }
    this.coyoteTime = this.grounded ? 0.1 : Math.max(0, this.coyoteTime - dt);
    this.tryJump();
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    // Held defense can cancel a normal swing after its active hit, never before.
    if (
      this.weapon === "sword" &&
      input.guard &&
      this.attackTime > 0 &&
      !this.hitPending &&
      this.spinTime <= 0
    )
      this.cancelCombo();
    this.elapsed += dt;
    this.aiming =
      this.weapon === "bow" &&
      (!!input.guard || this.attackHeld) &&
      this.dodgeTime <= 0;
    if (this.aiming && this.lockedTarget === null)
      this.yaw = this.cameraYaw + Math.PI;
    if (this.weapon === "bow" && this.attackHeld) {
      this.bowDraw = Math.min(0.85, this.bowDraw + dt);
      this.staminaDelay = 0.3;
    }
    if (this.weapon === "sword" && this.attackHeld) {
      this.attackHoldTime += dt;
      if (input.guard || !this.grounded || this.stamina < SPIN.cost)
        this.cancelCharge();
      else if (
        this.attackHoldTime >= 0.3 &&
        this.attackTime <= 0 &&
        this.cooldown <= 0
      ) {
        const previous = this.chargeTime;
        this.chargeTime = Math.min(SPIN.maxCharge, this.chargeTime + dt);
        this.comboQueued = false;
        this.comboWindow = 0;
        this.staminaDelay = 0.4;
        if (previous < SPIN.minCharge && this.chargeTime >= SPIN.minCharge)
          this.events.push("charge");
      }
    }
    this.spinTime = Math.max(0, this.spinTime - dt);
    if (this.spinHitPending && SPIN.duration - this.spinTime >= SPIN.hit) {
      this.spinHitPending = false;
      this.strike(true);
    }
    const wasAttacking = this.attackTime > 0;
    this.attackTime = Math.max(0, this.attackTime - dt);
    this.comboWindow = Math.max(0, this.comboWindow - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.invincible = Math.max(0, this.invincible - dt);
    this.restCooldown = Math.max(0, this.restCooldown - dt);
    this.staminaDelay = Math.max(0, this.staminaDelay - dt);
    if (
      this.hitPending &&
      ATTACKS[this.combo].duration - this.attackTime >= ATTACKS[this.combo].hit
    ) {
      this.hitPending = false;
      this.strike();
    }
    if (
      this.comboQueued &&
      this.combo < 2 &&
      this.attackTime > 0 &&
      this.attackTime <= 0.1 &&
      this.stamina >= ATTACKS[this.combo + 1].cost
    ) {
      this.beginAttack(this.combo + 1);
    }
    if (wasAttacking && this.attackTime === 0) {
      this.comboWindow = this.combo < 2 ? COMBO_GRACE : 0;
      if (this.combo === 2) this.cooldown = 0.22;
      if (this.comboQueued && this.combo < 2) this.beginAttack(this.combo + 1);
      else this.comboQueued = false;
    }
    if (this.toastTime > 0) {
      this.toastTime -= dt;
      if (this.toastTime <= 0) this.toast = "";
    }
    this.autoLockCooldown = Math.max(0, this.autoLockCooldown - dt);
    this.autoLockScan -= dt;
    if (this.autoLockScan <= 0) {
      this.autoLockScan = 0.2;
      this.acquireAutoTarget();
    }
    let locked = this.combatTargets.find(
      (g) => g.id === this.lockedTarget && g.hp > 0,
    );
    if (!locked && this.lockedTarget !== null) {
      this.cycleTarget();
      locked = this.lockTarget;
    }
    if (locked) {
      const distance = Math.hypot(locked.x - this.x, locked.z - this.z);
      this.lockRangeElapsed = lockRangeTime(
        distance,
        this.lockRangeElapsed,
        dt,
      );
      if (this.lockRangeElapsed >= LOCK_CAMERA.grace) locked = undefined;
      else if (distance > 0.15) {
        this.yaw = Math.atan2(locked.x - this.x, locked.z - this.z);
        this.cameraYaw = followLockYaw(
          this.cameraYaw,
          this.yaw - Math.PI,
          distance,
          dt,
        );
      }
    }
    if (!locked) {
      this.lockedTarget = null;
      this.lockRangeElapsed = 0;
      this.lockObscuredTime = 0;
    }
    this.guarding =
      this.weapon === "sword" &&
      !!input.guard &&
      this.stamina > 0 &&
      this.grounded &&
      this.dodgeTime <= 0 &&
      this.attackTime <= 0 &&
      this.spinTime <= 0 &&
      this.chargeTime <= 0;
    this.lastInput = input;
    const directionPressed = Math.hypot(input.x, input.z) > 0.35;
    if (directionPressed && !this.directionHeld && this.lockTarget)
      this.dodge(input);
    this.directionHeld = directionPressed;
    const length = Math.hypot(input.x, input.z),
      dx = input.x / Math.max(1, length),
      dz = input.z / Math.max(1, length),
      c = Math.cos(this.cameraYaw),
      s = Math.sin(this.cameraYaw);
    let mx = dx * c + dz * s,
      mz = dz * c - dx * s;
    this.sprinting =
      input.sprint &&
      length > 0.1 &&
      !this.guarding &&
      !this.aiming &&
      this.chargeTime <= 0 &&
      this.spinTime <= 0 &&
      this.stamina > 0 &&
      this.dodgeTime <= 0;
    let speed = this.sprinting ? 7 : 4.2;
    if (this.guarding || this.chargeTime > 0 || this.aiming) speed = 2;
    if (this.spinTime > 0) speed = 0.8;
    if (this.attackTime > 0) speed *= 0.5;
    if (this.sprinting) {
      this.stamina = Math.max(0, this.stamina - 25 * dt);
      this.staminaDelay = 0.6;
    }
    if (this.dodgeTime > 0) {
      this.dodgeTime = Math.max(0, this.dodgeTime - dt);
      mx = this.dodgeX;
      mz = this.dodgeZ;
      speed = 8;
    }
    if (
      length > 0.1 &&
      !locked &&
      !this.aiming &&
      !this.guarding &&
      this.attackTime === 0 &&
      this.spinTime <= 0 &&
      this.chargeTime <= 0
    )
      this.yaw = Math.atan2(mx, mz);
    const colliders = this.colliders,
      oldX = this.x,
      oldZ = this.z;
    const attackElapsed = ATTACKS[this.combo].duration - this.attackTime;
    const lunge =
      this.grounded &&
      this.attackTime > 0 &&
      attackElapsed < ATTACKS[this.combo].hit + 0.06
        ? this.combo === 2
          ? 2.8
          : 2.1
        : 0;
    const next = moveAndSlide(
      colliders,
      this.x,
      this.z,
      this.y,
      (mx * speed + Math.sin(this.yaw) * lunge) * dt,
      (mz * speed + Math.cos(this.yaw) * lunge) * dt,
      this.grounded,
    );
    this.x = next.x;
    this.z = next.z;
    this.y = next.y;
    this.moving = Math.hypot(this.x - oldX, this.z - oldZ) > 0.0001;
    const previousY = this.y;
    this.vy -= 18 * dt;
    let candidate = this.y + this.vy * dt;
    const floor = floorAt(
      colliders,
      this.x,
      this.z,
      previousY + (this.grounded ? 0.26 : 0),
    );
    if (this.vy <= 0 && candidate <= floor) {
      candidate = floor;
      this.vy = 0;
      this.grounded = true;
    } else this.grounded = false;
    this.y = Math.max(0, candidate);
    this.tryJump();
    if (
      !this.sprinting &&
      !this.guarding &&
      this.dodgeTime <= 0 &&
      this.staminaDelay <= 0
    )
      this.stamina = Math.min(100, this.stamina + 24 * dt);
    if (this.zone === "grounds") {
      for (const gem of this.items)
        if (
          !gem.collected &&
          this.y < 1.8 &&
          Math.hypot(gem.x - this.x, gem.z - this.z) < 1.1
        ) {
          gem.collected = true;
          this.gems++;
          this.events.push("gem");
          if (this.gems === 8) this.notify("翡翠已集齐 · 前往白宫大门");
          this.version++;
        }
    }
    {
      for (const g of this.activeGuards) {
        g.defeatTime = Math.max(0, g.defeatTime - dt);
        g.hitFlash = Math.max(0, g.hitFlash - dt);
        if (g.stun > 0) {
          const obstacles = colliders.filter((c) => c.id !== "guard-" + g.id);
          const moved = moveAndSlide(
            obstacles,
            g.x,
            g.z,
            0,
            g.knockX * dt,
            g.knockZ * dt,
            false,
            0.48,
          );
          g.x = moved.x;
          g.z = moved.z;
          g.knockX *= Math.exp(-9 * dt);
          g.knockZ *= Math.exp(-9 * dt);
        }
        g.stun = Math.max(0, g.stun - dt);
        if (g.hp <= 0) continue;
        g.cooldown = Math.max(0, g.cooldown - dt);
        if (g.stun > 0) continue;
        const distance = Math.hypot(g.x - this.x, g.z - this.z);
        const rules = ENEMY_RULES[g.kind];
        if (g.windup > 0) {
          g.windup = Math.max(0, g.windup - dt);
          if (g.windup === 0) {
            g.cooldown =
              g.kind === "archer" ? 2.4 : g.kind === "brute" ? 2 : 1.4;
            if (g.kind === "archer") {
              if (distance < 28 && this.visible(g.x, g.z, "guard-" + g.id)) {
                const dx = (g.shotX ?? this.x) - g.x,
                  dz = (g.shotZ ?? this.z) - g.z,
                  d = Math.hypot(dx, dz) || 1,
                  speed = 16;
                this.projectiles.push({
                  owner: g.id,
                  x: g.x,
                  y: 1.65,
                  z: g.z,
                  vx: (dx / d) * speed,
                  vy: ((1.2 - 1.65) * speed) / d + (1.5 * d) / speed,
                  vz: (dz / d) * speed,
                  life: 2.4,
                  power: 0.5,
                });
                this.events.push("arrow");
              }
              continue;
            }
            const forward =
              (this.x - g.x) * Math.sin(g.yaw) +
              (this.z - g.z) * Math.cos(g.yaw);
            if (
              distance < 2.1 &&
              forward > 0 &&
              this.y < 1.3 &&
              this.invincible === 0 &&
              this.visible(g.x, g.z, "guard-" + g.id)
            ) {
              const face =
                (g.x - this.x) * Math.sin(this.yaw) +
                (g.z - this.z) * Math.cos(this.yaw);
              if (
                this.guarding &&
                face > 0 &&
                this.stamina >= (g.kind === "brute" ? 40 : 20)
              ) {
                this.stamina -= g.kind === "brute" ? 40 : 20;
                this.staminaDelay = 1;
                this.notify(
                  g.kind === "brute"
                    ? "挡下重锤 · -40 体力"
                    : "成功格挡 · -20 体力",
                );
                this.events.push("block");
                this.impact(this.x, this.z, false, true);
                g.stun = g.stunDuration = 0.25;
              } else {
                this.hp--;
                this.events.push("hurt");
                this.impact(this.x, this.z);
                this.cancelCombo();
                this.invincible = 1.1;
                this.notify("受到攻击！右键防御或 Ctrl 闪避");
                if (this.hp <= 0) {
                  this.phase = "lost";
                  this.moving = false;
                }
              }
              this.version++;
            }
          }
          continue;
        }
        const chasing =
          distance <
            (this.zone === "office" ? 30 : g.id < 2 ? 7 : rules.range) &&
          this.visible(g.x, g.z, "guard-" + g.id);
        if (
          g.kind === "archer" &&
          chasing &&
          distance >= 6 &&
          g.cooldown === 0
        ) {
          // A small global attack budget avoids overlapping volleys and melee dogpiles.
          if (
            this.activeGuards.filter((other) => other.windup > 0).length < 2
          ) {
            g.shotX = this.x;
            g.shotZ = this.z;
            g.yaw = Math.atan2(this.x - g.x, this.z - g.z);
            g.windup = rules.windup;
          }
          continue;
        }
        const retreat = g.kind === "archer" && chasing && distance < 8;
        const tx = retreat
            ? g.x + (g.x - this.x)
            : chasing
              ? this.x
              : g.originX +
                Math.sin(this.elapsed * 0.45 + g.id * Math.PI) * 1.1,
          tz = retreat
            ? g.z + (g.z - this.z)
            : chasing
              ? this.z
              : g.originZ +
                Math.cos(this.elapsed * 0.45 + g.id * Math.PI) * 2.2;
        const vx = tx - g.x,
          vz = tz - g.z,
          l = Math.hypot(vx, vz);
        if (l > 0.1) g.yaw = Math.atan2(vx, vz);
        if (
          g.kind !== "archer" &&
          chasing &&
          distance < 2.2 &&
          g.cooldown === 0
        ) {
          if (
            this.activeGuards.some((other) => other !== g && other.windup > 0)
          )
            continue;
          g.windup = this.zone === "office" ? 0.95 : rules.windup;
          continue;
        }
        if (
          l > 0.2 &&
          (g.kind !== "archer" || !chasing || distance < 8 || distance > 18) &&
          (!chasing || distance > 1.6 || retreat)
        ) {
          const obstacles = colliders.filter((c) => c.id !== "guard-" + g.id);
          obstacles.push({
            id: "player",
            zone: this.zone,
            x: this.x,
            z: this.z,
            radius: 0.38,
            top: 3,
          });
          const moved = moveAndSlide(
            obstacles,
            g.x,
            g.z,
            0,
            (vx / l) * dt * (chasing ? rules.speed : 1),
            (vz / l) * dt * (chasing ? rules.speed : 1),
            false,
          );
          g.x = moved.x;
          g.z = moved.z;
        }
      }
    }
  }
}
export const game = new Simulation();
