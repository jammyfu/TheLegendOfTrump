import {
  staticColliders,
  gateCollider,
  cratePositions,
  interactions,
  type Collider,
  type Interaction,
  type Zone,
} from "./world";
import { occupied, floorAt, moveAndSlide, lineClear } from "./collision";
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
export type SoundEvent = "gem" | "sword" | "hit" | "break" | "door" | "win";
export class Simulation {
  phase: Phase = "title";
  zone: Zone = "grounds";
  x = 0;
  z = 15;
  y = 0;
  vy = 0;
  yaw = Math.PI;
  moving = false;
  grounded = true;
  hp = 3;
  gems = 0;
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
  hitPending = false;
  combo = 0;
  toast = "";
  toastTime = 0;
  reading = { title: "", text: "" };
  items: Gem[] = [];
  pots: Pot[] = [];
  guards: Guard[] = [];
  crates: Pot[] = [];
  opened = new Set<string>();
  harvested = new Set<string>();
  gateOpen = false;
  restCooldown = 0;
  events: SoundEvent[] = [];
  version = 0;
  cameraYaw = 0;
  cameraPitch = 0.24;
  cameraDistance = 8;
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
    this.guards = [-1, 1].map((s, id) => ({
      id,
      x: s * 8,
      z: 0,
      originX: s * 8,
      originZ: 0,
      hp: 3,
      windup: 0,
      cooldown: 1,
      yaw: 0,
      stun: 0,
    }));
  }
  start() {
    this.phase = "playing";
    this.zone = "grounds";
    this.x = 0;
    this.z = 15;
    this.y = 0;
    this.vy = 0;
    this.yaw = Math.PI;
    this.moving = false;
    this.grounded = true;
    this.hp = 3;
    this.gems = 0;
    this.stamina = 100;
    this.staminaDelay = 0;
    this.elapsed = 0;
    this.attackTime = 0;
    this.cooldown = 0;
    this.invincible = 0;
    this.dodgeTime = 0;
    this.hitPending = false;
    this.guarding = false;
    this.sprinting = false;
    this.cameraYaw = 0;
    this.cameraPitch = 0.24;
    this.cameraDistance = 8;
    this.lockedTarget = null;
    this.opened.clear();
    this.harvested.clear();
    this.gateOpen = false;
    this.restCooldown = 0;
    this.resetEntities();
    this.events = [];
    this.notify("寻找翡翠与宝箱 · E 互动 · Space 跳跃");
  }
  beginIntro() {
    this.start();
    this.phase = "intro";
    this.introTime = 2.8;
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
    if (this.phase === "playing") this.phase = "paused";
    else if (this.phase === "paused") this.phase = "playing";
    this.moving = false;
    this.guarding = false;
    this.version++;
  }
  look(dx: number, dy: number) {
    if (this.phase !== "playing") return;
    this.cameraYaw -= dx * 0.004;
    this.cameraPitch = Math.max(
      -0.22,
      Math.min(1.05, this.cameraPitch + dy * 0.003),
    );
    if (Math.abs(dx) > 2) this.lockedTarget = null;
  }
  zoom(delta: number) {
    this.cameraDistance = Math.max(
      3.5,
      Math.min(12, this.cameraDistance + delta * 0.007),
    );
  }
  toggleLock() {
    if (this.phase !== "playing" || this.zone !== "grounds") return;
    if (this.lockedTarget !== null) {
      this.lockedTarget = null;
      return;
    }
    const g = this.guards
      .filter(
        (g) =>
          g.hp > 0 &&
          Math.hypot(g.x - this.x, g.z - this.z) < 12 &&
          this.visible(g.x, g.z, "guard-" + g.id),
      )
      .sort(
        (a, b) =>
          Math.hypot(a.x - this.x, a.z - this.z) -
          Math.hypot(b.x - this.x, b.z - this.z),
      )[0];
    this.lockedTarget = g?.id ?? null;
    this.notify(g ? "已锁定守卫 · Q 解除" : "附近没有可锁定的目标");
  }
  jump() {
    if (
      this.phase !== "playing" ||
      !this.grounded ||
      this.stamina < 14 ||
      this.dodgeTime > 0
    )
      return;
    this.stamina -= 14;
    this.staminaDelay = 0.8;
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
    this.dodgeTime = 0.38;
    this.invincible = Math.max(this.invincible, 0.28);
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
      list.push(
        {
          id: "west-boundary",
          zone: this.zone,
          x: -26,
          z: 0,
          w: 0.4,
          d: 60,
          top: 20,
        },
        {
          id: "east-boundary",
          zone: this.zone,
          x: 26,
          z: 0,
          w: 0.4,
          d: 60,
          top: 20,
        },
        {
          id: "south-boundary",
          zone: this.zone,
          x: 0,
          z: 24,
          w: 54,
          d: 0.4,
          top: 20,
        },
        {
          id: "north-boundary",
          zone: this.zone,
          x: 0,
          z: -24,
          w: 54,
          d: 0.4,
          top: 20,
        },
      );
    }
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
      case "door":
        if (this.gems < 8) {
          this.notify(`还需要 ${8 - this.gems} 枚翡翠`);
          return;
        }
        this.zone = "office";
        this.x = 0;
        this.z = 6;
        this.y = 0;
        this.vy = 0;
        this.cameraYaw = 0;
        this.cameraPitch = 0.35;
        this.cameraDistance = 6;
        this.lockedTarget = null;
        this.events.push("door");
        this.notify("走近书桌，签署冒险宣言");
        break;
      case "exit":
        this.zone = "grounds";
        this.x = 0;
        this.z = -10;
        this.y = 0;
        this.vy = 0;
        this.yaw = 0;
        this.cameraYaw = 0;
        this.cameraDistance = 8;
        this.events.push("door");
        break;
      case "desk":
        this.phase = "dialogue";
        this.x = 0;
        this.z = -6;
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
        if (i.id === "chest-garden" && !this.gateOpen) {
          this.notify("先找到喷泉西侧的机关");
          return;
        }
        this.opened.add(i.id);
        this.gems += i.id === "chest-garden" ? 5 : 3;
        this.events.push("gem");
        this.notify(
          i.id === "chest-garden" ? "花园秘藏 · +5 翡翠" : "旅行补给 · +3 翡翠",
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
  attack() {
    if (
      this.phase !== "playing" ||
      this.cooldown > 0 ||
      this.stamina < 8 ||
      this.dodgeTime > 0
    )
      return;
    this.stamina -= 8;
    this.staminaDelay = 0.6;
    this.attackTime = 0.38;
    this.cooldown = 0.43;
    this.hitPending = true;
    this.combo = (this.combo + 1) % 3;
    this.guarding = false;
    this.events.push("sword");
  }
  strike() {
    if (this.zone !== "grounds") return;
    const reachable = (x: number, z: number, id: string) => {
      const dx = x - this.x,
        dz = z - this.z,
        d = Math.hypot(dx, dz);
      return (
        this.y < 1.5 &&
        d < 2.7 &&
        (d < 0.65 ||
          (dx * Math.sin(this.yaw) + dz * Math.cos(this.yaw)) / d > 0.15) &&
        this.visible(x, z, id)
      );
    };
    for (const [list, prefix, reward] of [
      [this.pots, "pot-", 2],
      [this.crates, "crate-", 1],
    ] as const)
      for (const p of list)
        if (!p.broken && reachable(p.x, p.z, prefix + p.id)) {
          p.broken = true;
          this.gems += reward;
          this.events.push("break");
          this.notify(
            `击碎${prefix === "pot-" ? "陶罐" : "木箱"} · +${reward} 翡翠`,
          );
        }
    for (const g of this.guards)
      if (g.hp > 0 && reachable(g.x, g.z, "guard-" + g.id)) {
        g.hp--;
        g.stun = 0.45;
        g.windup = 0;
        g.cooldown = 0.8;
        this.events.push("hit");
        if (g.hp === 0) {
          this.gems++;
          if (this.lockedTarget === g.id) this.lockedTarget = null;
          this.notify("守卫已解除 · +1 翡翠");
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
    this.elapsed += dt;
    this.attackTime = Math.max(0, this.attackTime - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.invincible = Math.max(0, this.invincible - dt);
    this.restCooldown = Math.max(0, this.restCooldown - dt);
    this.staminaDelay = Math.max(0, this.staminaDelay - dt);
    if (this.hitPending && this.attackTime < 0.25) {
      this.hitPending = false;
      this.strike();
    }
    if (this.toastTime > 0) {
      this.toastTime -= dt;
      if (this.toastTime <= 0) this.toast = "";
    }
    const locked = this.guards.find(
      (g) => g.id === this.lockedTarget && g.hp > 0,
    );
    if (locked && Math.hypot(locked.x - this.x, locked.z - this.z) < 15) {
      this.yaw = Math.atan2(locked.x - this.x, locked.z - this.z);
      this.cameraYaw = Math.atan2(this.x - locked.x, this.z - locked.z);
    } else this.lockedTarget = null;
    this.guarding =
      !!input.guard &&
      this.stamina > 0 &&
      this.grounded &&
      this.dodgeTime <= 0 &&
      this.attackTime <= 0;
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
      this.stamina > 0 &&
      this.dodgeTime <= 0;
    let speed = this.sprinting ? 7 : 4.2;
    if (this.guarding) speed = 2;
    if (this.attackTime > 0) speed *= 0.5;
    if (this.sprinting) {
      this.stamina = Math.max(0, this.stamina - 25 * dt);
      this.staminaDelay = 0.6;
    }
    if (this.dodgeTime > 0) {
      this.dodgeTime = Math.max(0, this.dodgeTime - dt);
      mx = this.dodgeX;
      mz = this.dodgeZ;
      speed = 10;
    }
    if (length > 0.1 && !locked && !this.guarding)
      this.yaw = Math.atan2(mx, mz);
    const colliders = this.colliders,
      oldX = this.x,
      oldZ = this.z;
    const next = moveAndSlide(
      colliders,
      this.x,
      this.z,
      this.y,
      mx * speed * dt,
      mz * speed * dt,
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
      for (const g of this.guards) {
        if (g.hp <= 0) continue;
        g.cooldown = Math.max(0, g.cooldown - dt);
        g.stun = Math.max(0, g.stun - dt);
        if (g.stun > 0) continue;
        const distance = Math.hypot(g.x - this.x, g.z - this.z);
        if (g.windup > 0) {
          g.windup = Math.max(0, g.windup - dt);
          if (g.windup === 0) {
            g.cooldown = 1.4;
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
              if (this.guarding && face > 0 && this.stamina >= 20) {
                this.stamina -= 20;
                this.staminaDelay = 1;
                this.notify("成功格挡 · -20 体力");
              } else {
                this.hp--;
                this.invincible = 1.1;
                this.notify("受到攻击！右键防御或 Ctrl 闪避");
                if (this.hp <= 0) {
                  this.phase = "lost";
                  this.moving = false;
                }
              }
              this.events.push("hit");
              this.version++;
            }
          }
          continue;
        }
        const chasing = distance < 7 && this.visible(g.x, g.z, "guard-" + g.id);
        const tx = chasing
            ? this.x
            : g.originX + Math.sin(this.elapsed * 0.45 + g.id * Math.PI) * 1.1,
          tz = chasing
            ? this.z
            : g.originZ + Math.cos(this.elapsed * 0.45 + g.id * Math.PI) * 2.2;
        const vx = tx - g.x,
          vz = tz - g.z,
          l = Math.hypot(vx, vz);
        if (l > 0.1) g.yaw = Math.atan2(vx, vz);
        if (chasing && distance < 2.2 && g.cooldown === 0) {
          g.windup = 0.7;
          continue;
        }
        if (l > 0.2 && (!chasing || distance > 1.6)) {
          const obstacles = colliders.filter((c) => c.id !== "guard-" + g.id);
          obstacles.push({
            id: "player",
            zone: "grounds",
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
            (vx / l) * dt * (chasing ? 2 : 1),
            (vz / l) * dt * (chasing ? 2 : 1),
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
