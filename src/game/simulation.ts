export type Phase =
  "title" | "intro" | "playing" | "paused" | "dialogue" | "won" | "lost";
export type Zone = "grounds" | "office";
export interface Input {
  x: number;
  z: number;
  sprint: boolean;
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
  yaw = Math.PI;
  moving = false;
  hp = 3;
  gems = 0;
  elapsed = 0;
  introTime = 0;
  attackTime = 0;
  cooldown = 0;
  invincible = 0;
  toast = "";
  toastTime = 0;
  items: Gem[] = [];
  pots: Pot[] = [];
  guards: Guard[] = [];
  events: SoundEvent[] = [];
  version = 0;
  cameraYaw = 0;
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
    this.guards = [-1, 1].map((s, id) => ({
      id,
      x: s * 12,
      z: 0,
      originX: s * 12,
      originZ: 0,
      hp: 2,
    }));
  }
  start() {
    this.phase = "playing";
    this.zone = "grounds";
    this.x = 0;
    this.z = 15;
    this.yaw = Math.PI;
    this.hp = 3;
    this.gems = 0;
    this.elapsed = 0;
    this.attackTime = 0;
    this.cooldown = 0;
    this.invincible = 0;
    this.cameraYaw = 0;
    this.resetEntities();
    this.events = [];
    this.notify("收集 8 枚翡翠，开启白宫大门");
    this.version++;
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
    this.version++;
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
    this.version++;
  }
  get prompt() {
    if (this.zone === "grounds" && Math.hypot(this.x, this.z + 13) < 3)
      return this.gems >= REQUIRED_GEMS ? "进入白宫" : "大门需要 8 枚翡翠";
    if (this.zone === "office" && Math.hypot(this.x, this.z + 3) < 3)
      return "签署冒险宣言";
    if (this.zone === "office" && this.z > 6) return "返回南草坪";
    return "";
  }
  interact() {
    if (this.phase === "dialogue") {
      this.phase = "won";
      this.events.push("win");
      this.version++;
      return;
    }
    if (this.phase !== "playing" || !this.prompt) return;
    if (this.zone === "grounds") {
      if (this.gems < REQUIRED_GEMS) {
        this.notify(`还需要 ${REQUIRED_GEMS - this.gems} 枚翡翠`);
        return;
      }
      this.zone = "office";
      this.x = 0;
      this.z = 6;
      this.cameraYaw = 0;
      this.events.push("door");
      this.notify("椭圆形办公室 · 走近书桌，完成你的第一份任务");
    } else if (this.z > 6) {
      this.zone = "grounds";
      this.x = 0;
      this.z = -10;
      this.yaw = 0;
      this.events.push("door");
    } else {
      this.phase = "dialogue";
      this.x = 0;
      this.z = -6;
      this.yaw = 0;
      this.moving = false;
    }
    this.version++;
  }
  attack() {
    if (this.phase !== "playing" || this.cooldown > 0) return;
    this.attackTime = 0.32;
    this.cooldown = 0.45;
    this.events.push("sword");
    if (this.zone !== "grounds") return;
    const reachable = (x: number, z: number) => {
      const dx = x - this.x,
        dz = z - this.z;
      const distance = Math.hypot(dx, dz);
      return (
        distance < 2.7 &&
        (distance < 0.7 ||
          (dx * Math.sin(this.yaw) + dz * Math.cos(this.yaw)) / distance >
            -0.15)
      );
    };
    for (const pot of this.pots)
      if (!pot.broken && reachable(pot.x, pot.z)) {
        pot.broken = true;
        this.gems += 2;
        this.events.push("break");
        this.notify("+2 翡翠 · 陶罐已击碎");
      }
    for (const guard of this.guards)
      if (guard.hp > 0 && reachable(guard.x, guard.z)) {
        guard.hp--;
        this.events.push("hit");
        if (guard.hp === 0) {
          this.gems++;
          this.notify("守卫已解除 · +1 翡翠");
        }
      }
    this.version++;
  }
  blocked(x: number, z: number) {
    if (this.zone === "office")
      return (
        Math.abs(x) > 7.4 ||
        z > 8 ||
        z < -6.5 ||
        (Math.abs(x) < 3.1 && z < -3.6)
      );
    if (Math.abs(x) > 20 || z > 21 || z < -13.5) return true;
    if (Math.hypot(x, z - 1) < 3.9) return true;
    if (this.pots.some((p) => !p.broken && Math.hypot(x - p.x, z - p.z) < 1))
      return true;
    return false;
  }
  update(delta: number, input: Input) {
    if (this.phase === "intro") {
      this.introTime -= Math.min(delta, 0.05);
      if (this.introTime <= 0) this.skipIntro();
      return;
    }
    if (this.phase !== "playing") return;
    const dt = Math.min(Math.max(delta, 0), 0.05);
    this.elapsed += dt;
    this.attackTime = Math.max(0, this.attackTime - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.invincible = Math.max(0, this.invincible - dt);
    if (this.toastTime > 0) {
      this.toastTime -= dt;
      if (this.toastTime <= 0) {
        this.toast = "";
        this.version++;
      }
    }
    const length = Math.hypot(input.x, input.z);
    this.moving = length > 0.05;
    if (this.moving) {
      const dx = input.x / Math.max(1, length),
        dz = input.z / Math.max(1, length);
      const c = Math.cos(this.cameraYaw),
        s = Math.sin(this.cameraYaw);
      const mx = dx * c + dz * s,
        mz = dz * c - dx * s;
      this.yaw = Math.atan2(mx, mz);
      const speed = input.sprint ? 7 : 4.5;
      const nx = this.x + mx * dt * speed,
        nz = this.z + mz * dt * speed;
      if (!this.blocked(nx, this.z)) this.x = nx;
      if (!this.blocked(this.x, nz)) this.z = nz;
    }
    if (this.zone === "grounds") {
      for (const gem of this.items)
        if (
          !gem.collected &&
          Math.hypot(gem.x - this.x, gem.z - this.z) < 1.25
        ) {
          gem.collected = true;
          this.gems++;
          this.events.push("gem");
          if (this.gems === REQUIRED_GEMS)
            this.notify("大门已开启！前往白宫入口");
          this.version++;
        }
      for (const guard of this.guards)
        if (guard.hp > 0) {
          guard.x =
            guard.originX +
            Math.sin(this.elapsed * 0.55 + guard.id * Math.PI) * 2;
          guard.z =
            guard.originZ +
            Math.cos(this.elapsed * 0.55 + guard.id * Math.PI) * 3;
          if (
            this.invincible === 0 &&
            Math.hypot(guard.x - this.x, guard.z - this.z) < 1.15
          ) {
            this.hp--;
            this.invincible = 2;
            this.events.push("hit");
            this.notify("小心巡逻守卫！挥剑可以解除它们");
            if (this.hp <= 0) {
              this.phase = "lost";
              this.moving = false;
            }
            this.version++;
          }
        }
    }
  }
}
export const game = new Simulation();
