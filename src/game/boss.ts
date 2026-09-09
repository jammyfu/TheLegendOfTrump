import { moveAndSlide } from "./collision";
import type { Collider } from "./world";
export type BossMove = "sweep" | "slam" | "wave";
export class Boss {
  id = 100;
  x = 0;
  z = -0.5;
  yaw = 0;
  hp = 18;
  maxHp = 18;
  active = false;
  state: "chase" | "windup" | "recover" | "dead" = "chase";
  move: BossMove = "sweep";
  timer = 1;
  sequence = 0;
  flash = 0;
  stagger = 0;
  defeatTime = 0;
  wave = -1;
  waveX = 0;
  waveZ = 0;
  waveHit = false;
  get enraged() {
    return this.hp > 0 && this.hp <= this.maxHp / 2;
  }
  reset() {
    Object.assign(this, new Boss());
    this.active = true;
  }
  hit(finisher: boolean) {
    if (!this.active || this.hp <= 0) return false;
    this.hp = Math.max(0, this.hp - (finisher ? 2 : 1));
    this.flash = 0.13;
    // The boss can be staggered in recovery; anticipation retains armor so it
    // cannot be permanently stun-locked by repeating a combo.
    if (this.state !== "windup") this.stagger = finisher ? 0.36 : 0.12;
    if (!this.hp) {
      this.state = "dead";
      this.defeatTime = 1.2;
      this.wave = -1;
    }
    return true;
  }
  update(
    dt: number,
    player: { x: number; z: number },
    colliders: Collider[],
  ): BossMove | null {
    this.flash = Math.max(0, this.flash - dt);
    this.defeatTime = Math.max(0, this.defeatTime - dt);
    if (!this.active || this.hp <= 0) return null;
    if (this.wave >= 0) {
      this.wave += dt * 5;
      if (this.wave > 11) this.wave = -1;
    }
    if (this.stagger > 0) {
      this.stagger = Math.max(0, this.stagger - dt);
      return null;
    }
    this.timer = Math.max(0, this.timer - dt);
    if (this.state === "windup") {
      if (this.timer > 0) return null;
      this.state = "recover";
      this.timer = this.enraged ? 0.85 : 1.2;
      if (this.move === "wave") {
        this.wave = 0;
        this.waveX = this.x;
        this.waveZ = this.z;
        this.waveHit = false;
      }
      return this.move;
    }
    if (this.state === "recover") {
      if (!this.timer) {
        this.state = "chase";
        this.timer = 0.3;
      }
      return null;
    }
    const dx = player.x - this.x,
      dz = player.z - this.z,
      d = Math.hypot(dx, dz);
    if (d > 0.01) this.yaw = Math.atan2(dx, dz);
    if (!this.timer && (d < 3.5 || this.sequence % 3 === 2)) {
      this.move = (["sweep", "slam", "wave"] as const)[this.sequence++ % 3];
      this.state = "windup";
      this.timer = this.move === "wave" ? 1.25 : this.enraged ? 0.7 : 1;
    } else if (d > 2.1) {
      const speed = this.enraged ? 2.15 : 1.5;
      const moved = moveAndSlide(
        colliders.filter((c) => c.id !== "guard-100"),
        this.x,
        this.z,
        0,
        (dx / d) * speed * dt,
        (dz / d) * speed * dt,
        false,
        0.8,
      );
      this.x = moved.x;
      this.z = moved.z;
    }
    return null;
  }
}
