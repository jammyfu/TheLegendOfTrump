import { RUSH, SHIELD_REBOUND, rushHeading, rushPose } from "./rush";
import { DEATH, ENEMY_RECOVERY, steerEnemy } from "./enemyMotion";
import { campaignCompleted, saveCampaignCompletion, difficultySpawns, savedDifficulty, saveDifficulty, type Difficulty } from "./difficulty";
import {
  LANDING,
  ENEMY_RULES,
  enemyScale,
  COIN_POSITIONS,
  FIELD_CHESTS,
  type EnemyKind,
} from "./expedition";
import { Boss } from "./boss";
import { BOSS_SLAM } from "./bossHammer";
import { BOSS_VFX, hammerShake } from "./bossVfx";
import { BOSS_BALANCE } from './bossBalance';
import { LOCK_CAMERA, followLockYaw, lockRangeTime } from "./lockCamera";
import { INTRO_DURATION } from "./intro";
import {
  loadCamera,
  saveCamera,
  sanitizeCamera,
  type CameraSettings,
} from "./camera";
import { ATTACKS, COMBO_GRACE, SPIN } from "./combat";
import { AERIAL, type AerialAttack } from "./aerialCombat";
import { debugOptions } from "./debug";
import { HEAVY_PUNCH, HEAVY_PUNCH_STAGE, UNARMED } from "./unarmed";
import { PICKUP_DURATION, type PickupItem } from "./pickup";
import {
  staticColliders,
  gateCollider,
  cratePositions,
  interactions,
  OFFICE_SCALE,
  type Collider,
  type Interaction,
  type Zone,
} from "./world";
import {
  occupied,
  moveVertical,
  moveAndSlide,
  lineClear,
  rayFraction,
} from "./collision";
export type { Zone };
export type Phase =
  | "title"
  | "intro"
  | "playing"
  | "obtaining"
  | "paused"
  | "reading"
  | "dialogue"
  | "won"
  | "dying"
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
  sizeMultiplier?: number;
  title?: string;
  kind: EnemyKind;
  shotX?: number;
  shotZ?: number;
  id: number;
  x: number;
  z: number;
  alertUntil?: number;
  lastSeenX?: number;
  lastSeenZ?: number;
  originX: number;
  originZ: number;
  hp: number;
  windup: number;
  /** Visual/behavioral follow-through after the damage or projectile frame. */
  attackTime: number;
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
/** The stamina meter has five readable sections; a successful block costs one. */
export const GUARD_STAMINA_SECTION = 40;
export const GUARD_HOLD_DRAIN = 8;
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
  | "punchHit" | "kickHit" | "fistSwing" | "arrowHit" | "dart" | "chest" | "lever" | "equip" | "itemReveal"
  | "jump" | "land" | "step" | "heal"
  | "summon" | "defeat" | "enemySwing" | "enemyArrow"
  | "roll"
  | "bowDraw"
  | "arrow"
  | "gem"
  | "sword"
  | "charge"
  | "spin"
  | "hit"
  | "heavy"
  | "block"
  | "slam"
  | "bossDartCharge"
  | "bossDartFire"
  | "bossSlamCharge"
  | "bossSweepCharge"
  | "bossSweepStrike"
  | "bossWaveCharge"
  | "bossWaveRelease"
  | "bossDefeat"
  | "hurt"
  | "break"
  | "door"
  | "win";
export class Simulation {
  readonly debug = debugOptions;
  phase: Phase = "title";
  zone: Zone = "grounds";
  x = 0;
  z = LANDING.heroZ;
  y = 0;
  vy = 0;
  yaw = Math.PI;
  moving = false;
  private stepDistance = 0;
  grounded = true;
  jumpBuffer = 0;
  coyoteTime = 0;
  lockObscuredTime = 0;
  lockRangeElapsed = 0;
  deathTime = 0;
  fcUnlocked = false;
  completedCampaign = campaignCompleted();
  difficulty: Difficulty = this.completedCampaign ? "hard" : "normal";
  selectedDifficulty: Difficulty = this.completedCampaign ? savedDifficulty() ?? "hard" : "normal";
  selectDifficulty(value: Difficulty) {
    this.selectedDifficulty = value === "hard" && !this.completedCampaign ? "normal" : value;
    saveDifficulty(this.selectedDifficulty);
    this.version++;
  }
  mouseLookSuspended = false;
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
  readonly maxStamina = 200;
  stamina = this.maxStamina;
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
  get damageImmune() {
    return this.debug.invincible || this.invincible > 0;
  }
  attackHeld = false;
  attackHoldTime = 0;
  chargeTime = 0;
  spinTime = 0;
  spinHitPending = false;
  heavyPunch = false;
  hitPending = false;
  combo = 0;
  comboWindow = 0;
  comboQueued = false;
  attackConnected = false;
  airAttack: AerialAttack | null = null;
  airAttackUsed = false;
  get meleeSpec() {
    return this.airAttack
      ? AERIAL[this.airAttack]
      : this.heavyPunch
        ? HEAVY_PUNCH
        : this.weapon === "none"
          ? UNARMED[this.combo]
          : ATTACKS[this.combo];
  }
  rush: 'thrust' | 'shield' | 'punch' | null = null;
  rushTime = 0;
  rushRebounding = false;
  private rushHits = new Set<number>();
  private rushYaw = 0;
  private rushTarget: number | null = null;
  startRush(kind: 'thrust' | 'shield' | 'punch', input: Input = this.lastInput) {
    if (this.stunTime > 0) return false;
    if (this.phase !== 'playing' || this.stunTime > 0 || !this.grounded || this.rushTime > 0 ||
        this.attackTime > 0 || this.spinTime > 0 || this.dodgeTime > 0 || this.cooldown > 0 ||
        !input.sprint || Math.hypot(input.x, input.z) < 0.1 || this.weapon === 'bow' ||
        (kind === 'punch' ? this.weapon !== 'none' : kind === 'thrust' ? !this.swordUnlocked || this.weapon !== 'sword' : !this.canGuard)) return false;
    const { cost, staminaThreshold } = RUSH[kind];
    // Low stamina falls through to the ordinary attack/guard input path.
    if (this.stamina <= staminaThreshold || this.stamina < cost) return false;
    this.cancelCombo(); this.cancelCharge();
    this.rush = kind; this.rushTime = RUSH[kind].duration; this.rushHits.clear();
    const c = Math.cos(this.cameraYaw), sn = Math.sin(this.cameraYaw);
    const mx = input.x*c + input.z*sn, mz = input.z*c - input.x*sn;
    const locked = this.lockTarget;
    const heading = rushHeading(mx,mz,locked ? locked.x-this.x : 0,locked ? locked.z-this.z : 0);
    this.rushTarget = heading.assist && locked ? locked.id : null;
    this.rushYaw = heading.yaw;
    this.yaw = this.rushYaw;
    this.stamina -= cost; this.staminaDelay = 1; this.cooldown = RUSH[kind].duration+.41;
    this.events.push(kind === 'thrust' ? 'sword' : 'fistSwing');
    this.notify(kind === 'punch' ? '冲击拳' : kind === 'thrust' ? '冲击飞刺' : '冲击盾撞');
    return true;
  }
  private rushContact() {
    if (!this.rush || !rushPose(this.rush,this.rushTime,this.rushRebounding).active) return;
    const shield = this.rush === 'shield';
    const punch = this.rush === 'punch';
    for (const target of this.combatTargets) {
      if (target.hp <= 0 || this.rushHits.has(target.id)) continue;
      const dx = target.x-this.x, dz = target.z-this.z;
      const forward = dx*Math.sin(this.rushYaw)+dz*Math.cos(this.rushYaw);
      const side = Math.abs(dx*Math.cos(this.rushYaw)-dz*Math.sin(this.rushYaw));
      if (forward < -.2 || forward > (punch ? 1.9 : shield ? 2.1 : 3) || side > (shield ? 1.6 : .85) ||
          !lineClear(this.colliders.filter(c => !c.id.startsWith('guard-')),
            {x:this.x,y:this.y+1.3,z:this.z},{x:target.x,y:1.3,z:target.z},'guard-'+target.id)) continue;
      this.rushHits.add(target.id);
      const damage = punch ? .4 : shield ? .8 : this.swordUpgraded ? 2 : 1;
      if (target instanceof Boss) {
        if (!target.hit(true,damage)) continue;
        if (!target.hp) this.bossDefeated();
      } else {
        target.hp = Math.max(0,target.hp-damage);
        target.stun = target.stunDuration = (shield ? .7 : .35)*ENEMY_RULES[target.kind].stunScale;
        target.windup = target.attackTime = 0; target.cooldown = target.stun+.1;
        target.hitFlash = .18;
        target.knockX = Math.sin(this.rushYaw)*(shield ? 9 : 5);
        target.knockZ = Math.cos(this.rushYaw)*(shield ? 9 : 5);
        if (!target.hp) this.guardDefeated(target);
      }
      this.impact(target.x,target.z,true,shield,punch,'hero',this.rushYaw);
      this.impactStrength = shield ? 2.2 : 1.75;
      this.hitStop = Math.max(this.hitStop,shield ? .13 : .09);
      this.events.push(punch ? 'punchHit' : 'heavy');
      if (punch) {
        // Plant the fist on contact, then settle; never drag through the target.
        this.rushTime = RUSH.punch.duration-RUSH.punch.end;
        break;
      }
      if (shield) { this.reboundShield(); break; }
    }
  }
  private reboundShield() {
    if (this.rush !== 'shield' || this.rushRebounding) return;
    this.rushRebounding = true;
    this.rushTime = SHIELD_REBOUND.duration;
    this.rushTarget = null;
    this.cooldown = Math.max(this.cooldown, SHIELD_REBOUND.duration+.1);
  }
  hitStop = 0;
  impactTime = 0;
  impactStrength = 0;
  hurtFeedback = 0;
  stunTime = 0;
  private stunFromHammer() {
    this.cancelCombo();
    this.stunTime = BOSS_SLAM.stun;
    this.invincible = Math.max(this.invincible, BOSS_SLAM.stun + .35);
    this.rush = null; this.rushTime = 0;
    this.dodgeTime = this.jumpBuffer = 0;
    this.moving = this.sprinting = this.guarding = this.aiming = false;
    this.hitStop = .09;
    this.notify("重锤震晕！恢复后闪避红色落点");
  }
  effects: {
    x: number;
    z: number;
    age: number;
    heavy: boolean;
    block: boolean;
    body?: boolean;
    meteor?: boolean;
    source?: 'hero' | 'enemy' | 'boss';
    yaw?: number;
    /** Grounded boss impact: rendered as floor cracks and a brief shock flash. */
    ground?: boolean;
  }[] = [];
  /** Deterministic roulette prevents test flakes while retaining a readable
   * probability for armored defenders in play. */
  private defenseRoll = 0;
  toast = "";
  toastTime = 0;
  reading = { title: "", text: "" };
  items: Gem[] = [];
  pots: Pot[] = [];
  guards: Guard[] = [];
  swordUnlocked = false;
  shieldUnlocked = false;
  swordUpgraded = false;
  shieldUpgraded = false;
  equipmentSwitches = new Set<string>();
  /** Equipment chests are summoned by their matching shrine instead of being
   * present in the world before the player uses the mechanism. */
  equipmentChestDrops = new Map<string, number>();
  get shieldCostMultiplier() { return this.shieldUpgraded ? 1 : 1.5; }
  bowUnlocked = false;
  weapon: "none" | "sword" | "bow" = "none";
  get canGuard() {
    return this.shieldUnlocked && (this.weapon === "sword" || !this.swordUnlocked && this.weapon === "none");
  }
  /** Availability is shared by the touch HUD and its corresponding actions. */
  get canMobileAttack() {
    if (this.stunTime > 0) return false;
    if (this.attackHeld) return true;
    if (this.phase !== "playing" || this.dodgeTime > 0 || this.spinTime > 0) return false;
    if (this.weapon === "bow") return this.stamina >= 14 && this.arrows > 0;
    if (this.weapon === "none") return this.stamina >= 5;
    const nextStage = this.comboWindow > 0 && this.combo < 2 ? this.combo + 1 : 0;
    return this.stamina >= ATTACKS[nextStage].cost;
  }
  get canMobileGuard() {
    return this.stunTime <= 0 && this.phase === "playing" && (this.weapon === "bow" || (this.canGuard && this.stamina > 0));
  }
  get canMobileDodge() {
    return this.stunTime <= 0 && this.phase === "playing" && this.grounded && (this.dodgeTime > 0 || this.stamina >= 24);
  }
  get weaponLabel() {
    if (this.weapon === "none") return "空手";
    if (this.weapon === "sword" && !this.swordUpgraded)
      return !this.shieldUnlocked ? "木剑" : this.shieldUpgraded ? "木剑 · 盾牌" : "木剑 · 木盾";
    return this.weapon === "bow"
      ? "冒险弓"
      : this.swordUnlocked
        ? this.shieldUnlocked
          ? "剑盾"
          : "冒险剑"
        : this.shieldUnlocked
          ? "盾牌"
          : "空手";
  }
  arrows = 0;
  bowDraw = 0;
  aiming = false;
  aimOnTarget = false;
  aimCursor = { x: 0, y: 0 };
  aimPoint = { x: 0, y: 1.5, z: -30 };
  projectiles: {
    owner?: number;
    kind?: "dart";
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
    this.minions = Array.from({length:BOSS_BALANCE[this.difficulty].minions},(_,i) => ({
      ...this.guards[0],
      id:101+i,
      hp: 0,
      x: (i%2 ? 1 : -1)*(i<2?7:12),
      z: i<2?-5:2,
      originX: (i%2 ? 1 : -1)*(i<2?7:12),
      originZ: i<2?-5:2,
      stun: 0,
      defeatTime: 0,
      windup: 0,
      attackTime: 0,
    }));
    this.summonTime = this.summonWaves = this.summonCooldown = 0;
    this.projectiles = [];
    this.supplies = [];
    if (this.bowUnlocked) this.arrows = Math.max(12, this.arrows);
  }
  usePotion() {
    if (this.stunTime > 0) return;
    if (this.phase !== "playing" || this.hp >= 3 || this.potions <= 0) return;
    this.potions--;
    this.hp = Math.min(3, this.hp + 2);
    this.events.push("heal");
    this.notify("使用回复药 · 恢复 2 颗爱心");
  }
  switchWeapon() {
    if (this.stunTime > 0) return;
    if (this.rushTime > 0) return;
    if (
      this.phase !== "playing" ||
      this.dodgeTime > 0 ||
      this.attackTime > 0 ||
      this.spinTime > 0
    )
      return;
    this.cancelCombo();
    this.guarding = this.aiming = false;
    this.weapon = this.weapon === "sword" ? (this.bowUnlocked ? "bow" : "none")
      : this.weapon === "bow" ? "none" : this.swordUnlocked ? "sword" : "none";
    this.aimCursor = { x: 0, y: 0 };
    this.events.push("equip");
    if (this.weapon === "sword")
      this.cameraPitch = Math.max(0.06, this.cameraPitch);
    this.notify(
      this.weapon === "bow"
        ? "冒险弓 · 左右键按住拉弓，松开发射 · 右键放大精瞄 · Q 标记目标"
        : `${this.weaponLabel} · ${this.swordUnlocked ? "左键攻击" : "尚未取得剑"} / ${this.shieldUnlocked ? "右键格挡" : "尚未取得盾"}`,
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
    g.defeatTime = DEATH.enemy;
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
    this.projectiles = this.projectiles.filter(a => a.owner === undefined);
    for (const g of this.minions) {
      g.hp = 0;
      g.defeatTime = DEATH.enemy;
      g.windup = 0;
    }
    this.lockedTarget = null;
    this.events.push("bossDefeat");
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
    const to = this.aimPoint;
    this.yaw = Math.atan2(to.x - this.x, to.z - this.z);
    const dx = to.x - from.x,
      dy = to.y - from.y,
      dz = to.z - from.z,
      d = Math.hypot(dx, dy, dz) || 1;
    this.projectiles.push({
      ...from,
      vx: (dx / d) * speed,
      vy: (dy / d) * speed,
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
      // Player arrows have no range/target compensation. Integrate constant
      // gravity exactly so the trajectory is stable across mobile frame rates.
      const gravity = a.owner === undefined ? 9.8 : 3;
      const next = {
        x: a.x + a.vx * dt,
        y: a.y + a.vy * dt - 0.5 * gravity * dt * dt,
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
        const t = rayFraction(c, a, next, a.kind === "dart" ? 0.2 : 0.04);
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
          if (!this.damageImmune) {
            const facing =
              -a.vx * Math.sin(this.yaw) - a.vz * Math.cos(this.yaw) > 0;
            if (this.guarding && facing && this.spendGuardSection()) {
              this.events.push("block");
              this.impact(this.x, this.z, false, true);
              this.notify(`挡下箭矢 · -${GUARD_STAMINA_SECTION} 体力`);
            } else if (this.guarding && facing) {
              if (this.guardBreak("enemy", Math.atan2(-a.vx, -a.vz))) return;
            } else {
              this.hp--;
              this.invincible = 1.1;
              this.cancelCombo();
              this.events.push("hurt");
              this.impact(this.x, this.z);
              this.hurtFeedback = 0.8;
              this.impactStrength = 0.9;
              this.notify("被箭矢击中 · 横移躲箭或举盾格挡");
              if (this.hp <= 0) {
                this.beginDefeat();
                return;
              }
            }
          }
        } else if (target && a.owner === undefined) {
          if (target instanceof Boss) {
            // Armor resists ranged chip damage; committed recovery is the
            // opening for a full charged shot. Arrows cannot stun-lock chase.
            const stagger = target.stagger;
            target.hit(false, (0.35 + a.power * 0.35) * (target.state === "recover" ? 1.5 : 1));
            target.stagger = stagger;
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
          this.events.push("arrowHit");
        } else this.impact(a.x, a.z, false, true);
      }
      Object.assign(a, next);
      a.vy -= gravity * dt;
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
        this.stamina = Math.min(this.maxStamina, this.stamina + 20);
        this.events.push("gem");
        this.notify("补给 · +3 箭矢 · +20 体力");
      }
  }
  private updateSummons(dt: number) {
    if (!this.boss.active || this.boss.hp <= 0) return;
    const thresholds=BOSS_BALANCE[this.difficulty].summonThresholds;
    this.summonCooldown = Math.max(0, this.summonCooldown - dt);
    if (this.summonTime > 0) {
      this.summonTime = Math.max(0, this.summonTime - dt);
      if (!this.summonTime) {
        for (const g of this.minions)
          if (g.hp <= 0)
            Object.assign(g, {
              x: g.originX,
              z: g.originZ,
              hp: ENEMY_RULES.archer.hp,
              windup: 0,
              attackTime: 0,
              cooldown: 0.8,
              stun: 0,
              hitFlash: 0,
              knockX: 0,
              knockZ: 0,
              defeatTime: 0,
            });
        this.boss.state = "recover";
        this.boss.timer = 0.55;
        this.summonCooldown = 14;
        this.notify("卫兵入场 · 优先击破卫兵，再攻击统领！");
      }
    } else if (
      this.summonWaves < thresholds.length &&
      !this.summonCooldown &&
      this.boss.hp <= this.boss.maxHp*thresholds[this.summonWaves] &&
      this.boss.state !== "windup" &&
      this.minions.every((g) => g.hp <= 0)
    ) {
      this.summonWaves++;
      this.summonTime = 1.2;
      this.events.push("summon");
      this.boss.wave = -1;
      this.notify("统领正在召唤卫兵 · 蓝色光圈将在 1.2 秒后出现援军");
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
    this.guards = difficultySpawns(this.difficulty).map((spawn, id) => ({
      kind: spawn.kind,
      sizeMultiplier: spawn.sizeMultiplier,
      title: spawn.title,
      id,
      x: spawn.x,
      z: spawn.z,
      originX: spawn.x,
      originZ: spawn.z,
      hp: Math.round(ENEMY_RULES[spawn.kind].hp * (spawn.sizeMultiplier ?? 1)),
      windup: 0,
      attackTime: 0,
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
  pickupTime = 0;
  pickupItem: PickupItem = 'sword';
  beginPickup(item: PickupItem) {
    this.pickupItem = item;
    this.pickupTime = PICKUP_DURATION;
    this.phase = 'obtaining';
    this.cancelCombo();
    this.cancelCharge();
    this.attackHeld = this.aiming = this.guarding = this.moving = this.sprinting = false;
    this.dodgeTime = this.spinTime = this.hitStop = 0;
    this.events.push('itemReveal');
    this.version++;
  }
  finishPickup() {
    this.pickupTime = 0;
    if (this.phase === 'obtaining') this.phase = 'playing';
    this.version++;
  }
  private equipBestMelee() {
    this.cancelCombo();
    this.weapon = this.swordUnlocked ? "sword" : "none";
    this.guarding = this.aiming = false;
  }
  start() {
    this.rush = null; this.rushTime = 0; this.rushRebounding = false;
    this.rushHits.clear(); this.rushTarget = null;
    this.aimCursor = { x: 0, y: 0 };
    this.difficulty = this.completedCampaign ? this.selectedDifficulty : "normal";
    this.pickupTime = 0;
    this.phase = "playing";
    this.boss = new Boss(this.difficulty);
    this.fcUnlocked = false;
    this.deathTime = 0;
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
    this.mouseLookSuspended = false;
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
    this.stamina = this.maxStamina;
    this.staminaDelay = 0;
    this.elapsed = 0;
    this.attackTime = 0;
    this.combo = 0;
    this.comboWindow = 0;
    this.comboQueued = false;
    this.attackConnected = false;
    this.airAttack = null;
    this.airAttackUsed = false;
    this.hitStop = 0;
    this.impactTime = 0;
    this.impactStrength = 0;
    this.hurtFeedback = 0;
    this.stunTime = 0;
    this.effects = [];
    this.defenseRoll = 0;
    this.cancelCharge();
    this.spinTime = 0;
    this.spinHitPending = false;
    this.heavyPunch = false;
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
    this.swordUnlocked = this.shieldUnlocked = false;
    this.swordUpgraded = this.shieldUpgraded = false;
    this.equipmentSwitches.clear();
    this.equipmentChestDrops.clear();
    this.bowUnlocked = false;
    this.weapon = "none";
    this.arrows = 0;
    this.aiming = false;
    this.resetEncounter();
    this.events = [];
    this.notify("空手出发 · 前方左侧宝箱取木剑、右侧宝箱取木盾");
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
    this.stunTime = 0;
    this.deathTime = 0;
    if (this.zone === "office" && this.boss.active) {
      this.boss.reset(this.difficulty);
      this.resetEncounter();
      this.hp = 3;
      this.stamina = this.maxStamina;
      this.x = 0;
      this.z = 6 * OFFICE_SCALE;
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
  /** Start a deterministic test setup from URL debug switches. */
  launchDebug() {
    if (!this.debug.enabled) return false;
    this.start();
    if (this.debug.equipment) {
      this.swordUnlocked = this.shieldUnlocked = this.bowUnlocked = true;
      this.swordUpgraded = this.shieldUpgraded = true;
      this.weapon = "sword";
      this.arrows = 30;
      this.potions = 3;
    }
    if (this.debug.noGuards) {
      for (const guard of this.guards) guard.hp = 0;
    }
    if (this.debug.boss) {
      this.zone = "office";
      this.x = 0;
      this.z = 6 * OFFICE_SCALE;
      this.y = this.vy = 0;
      this.yaw = Math.PI;
      this.cameraYaw = 0;
      this.cameraPitch = 0.42;
      this.cameraDistance = this.cameraSettings.distance;
      this.boss.reset(this.difficulty);
      if (this.debug.bossHp) this.boss.maxHp = this.boss.hp = this.debug.bossHp;
      this.resetEncounter();
      if (this.debug.noMinions) {
        for (const minion of this.minions) minion.hp = 0;
      }
      this.lockedTarget = this.boss.id;
    }
    const labels = [
      this.debug.boss ? "Boss 战" : "探索地图",
      this.debug.invincible ? "无敌" : null,
      this.debug.equipment ? "全装备" : null,
      this.debug.noMinions ? "无卫兵" : null,
    ].filter(Boolean);
    this.notify(`调试模式 · ${labels.join(" · ")}`);
    return true;
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
    if (this.phase === "playing" || this.phase === "obtaining") this.phase = "paused";
    else if (this.phase === "paused") this.phase = this.pickupTime > 0 ? "obtaining" : "playing";
    this.moving = false;
    this.guarding = false;
    this.version++;
  }
  look(dx: number, dy: number, orbit = false, panOverflow = true) {
    if (this.phase !== "playing") return;
    if (this.weapon === "bow" && !orbit) {
      // The red arrow reticle lives in a compact central aiming zone. Reaching
      // an edge pans the view instead, so ordinary mouse movement never loses
      // the correspondence between the reticle and the shot direction.
      const gain = this.cameraSettings.sensitivity * (this.aiming ? 0.24 : 1);
      const nextX = this.aimCursor.x + dx * 0.0015 * gain;
      const nextY = this.aimCursor.y - dy * 0.0015 * gain;
      this.aimCursor.x = Math.max(-0.32, Math.min(0.32, nextX));
      this.aimCursor.y = Math.max(-0.24, Math.min(0.24, nextY));
      // Continuing a swipe at the screen edge turns the view on touch devices.
      // Precision mode stays fixed so fine adjustments cannot rotate the room.
      if (!this.aiming && panOverflow) {
        this.cameraYaw -= (nextX - this.aimCursor.x) * 1.4;
        this.cameraPitch = Math.max(-0.5, Math.min(1.05,
          this.cameraPitch - (nextY - this.aimCursor.y)));
      }
      return;
    }
    if (this.lockedTarget === null || this.weapon === "bow")
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
    if (this.stunTime > 0) return;
    if (this.rushTime > 0) return;
    if (this.weapon === "bow" && (input.guard || this.aiming)) return;
    if (this.phase !== "playing") return;
    if (Math.hypot(input.x, input.z) > 0.1 && input.sprint) {
      this.dodge(input);
      return;
    }
    this.jumpBuffer = 0.16;
    this.tryJump();
  }
  private tryJump() {
    if (this.stunTime > 0) return;
    if (
      this.jumpBuffer <= 0 ||
      (!this.grounded && this.coyoteTime <= 0) ||
      this.dodgeTime > 0
    )
      return;
    this.jumpBuffer = this.coyoteTime = 0;
    this.cancelCharge();
    this.vy = 7.8;
    this.events.push("jump");
    this.grounded = false;
    this.guarding = false;
  }
  dodge(input: Input = this.lastInput, mobileDirect = false) {
    if (this.stunTime > 0) return;
    if (this.rushTime > 0) return;
    if (this.weapon === "bow" && (input.guard || this.aiming)) return;
    if (!mobileDirect && (!input.sprint || Math.hypot(input.x, input.z) <= 0.1)) {
      this.jump({ ...input, sprint: false });
      return;
    }
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
      // The dedicated mobile roll button is useful without a thumb on the
      // stick. Give it an evasive direction; joystick input always wins.
      const angle = mobileDirect
        ? this.yaw + (Math.random() - 0.5) * Math.PI * 1.5
        : this.yaw;
      this.dodgeX = Math.sin(angle);
      this.dodgeZ = Math.cos(angle);
    }
    this.stamina -= 24;
    this.staminaDelay = 1;
    this.cancelCombo();
    this.dodgeTime = 0.55;
    this.events.push("roll");
    this.vy = 4.5;
    this.grounded = false;
    this.jumpBuffer = this.coyoteTime = 0;
    this.invincible = Math.max(this.invincible, 0.22);
    this.guarding = false;
  }
  get enemyAttackBudget() {
    if (this.difficulty === "hard") return 3;
    return this.zone === "grounds" && Math.abs(this.x) < 25 && Math.abs(this.z) < 22 ? 3 : 2;
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
            radius: 0.48 * enemyScale(g),
            top: 2.5 * enemyScale(g),
          });
    }
    if (this.zone === "office" && this.boss.active && this.boss.hp > 0)
      list.push({
        id: "guard-100",
        zone: "office",
        x: this.boss.x,
        z: this.boss.z,
        radius: 0.8 * OFFICE_SCALE,
        top: 4.3 * OFFICE_SCALE,
      });
    if (this.zone === "office")
      for (const g of this.minions)
        if (g.hp > 0)
          list.push({
            id: "guard-" + g.id,
            zone: this.zone,
            x: g.x,
            z: g.z,
            radius: 0.48 * enemyScale(g),
            top: 2.5 * enemyScale(g),
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
          !(
            (i.id === "chest-sword" || i.id === "chest-shield") &&
            (!this.equipmentChestDrops.has(i.id) ||
              this.elapsed - (this.equipmentChestDrops.get(i.id) ?? 0) < 0.8)
          ) &&
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
    if (i.id === "lever" && this.gateOpen) return "花园机关已开启";
    if ((i.id === "chest-sword" || i.id === "chest-shield") &&
      !this.equipmentSwitches.has(i.id.replace("chest-", "lever-"))) return "宝箱被机关封印";
    return i.label;
  }
  interact() {
    if (this.stunTime > 0) return;
    if (this.phase === 'obtaining') {
      if (this.pickupTime < PICKUP_DURATION - .35) this.finishPickup();
      return;
    }
    if (this.phase === "reading") {
      this.phase = "playing";
      return;
    }
    if (this.phase === "dialogue") {
      this.phase = "won";
      this.completedCampaign = true;
      this.selectDifficulty("hard");
      saveCampaignCompletion();
      this.fcUnlocked = true;
      this.events.push("win");
      return;
    }
    const i = this.interaction;
    // The final signing scene keeps the interaction prompt visible. Allow its
    // exit through instead of trapping the player in the office's "won" phase.
    if (this.phase !== "playing" && !(this.phase === "won" && i?.kind === "exit")) return;
    if (!i) return;
    switch (i.kind) {
      case "field-sign":
        this.phase = "reading";
        this.moving = false;
        this.reading = {
          title: "南草坪远征",
          text: "你在白宫以南的降落区。先领取前方左侧宝箱中的剑、右侧宝箱中的盾，再领取回复药，沿金币指引向北；冒险弓在白宫门口右侧宝箱中取得。西侧巡逻营、东侧弓箭营和两翼重甲据点藏有金币与补给；北侧花园还有秘藏。弓箭手瞄准后射箭，可横移、盾挡或利用掩体；重甲卫兵挥锤很慢，绕后或用连招终结攻击。金币在蓝旗营地购买箭矢、回复药；H 或药瓶按钮使用回复药。大门仍需 8 枚翡翠。",
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
        this.stamina = this.maxStamina;
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
        this.z = 6 * OFFICE_SCALE;
        this.y = 0;
        this.vy = 0;
        this.cameraYaw = 0;
        this.cameraPitch = 0.42;
        this.cameraDistance = this.cameraSettings.distance;
        this.lockedTarget = null;
        this.events.push("door");
        if (this.boss.hp > 0) {
          this.boss.reset(this.difficulty);
          this.resetEncounter();
          this.hp = 3;
          this.stamina = this.maxStamina;
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
        // Exit the signing camera state before changing scenery, so the office
        // cannot remain on screen for a rendered frame after the lawn loads.
        this.phase = "playing";
        this.x = 0;
        this.z = -10;
        this.y = 0;
        this.vy = 0;
        this.yaw = 0;
        this.cameraYaw = 0;
        this.cameraPitch = 0.3;
        this.cameraDistance = this.cameraSettings.distance;
        this.version++;
        this.events.push("door");
        break;
      case "desk":
        if (this.boss.active && this.boss.hp > 0) {
          this.notify("先击败铁甲统领");
          return;
        }
        this.phase = "dialogue";
        this.x = 0;
        this.z = -11.25 * OFFICE_SCALE;
        this.y = 0;
        this.yaw = 0;
        this.moving = false;
        break;
      case "sign":
        this.phase = "reading";
        this.moving = false;
        this.reading = {
          title: "南草坪探险告示",
          text: "白宫入口需要 8 枚翡翠。白宫门口右侧宝箱藏着冒险弓；喷泉西侧的机关可以开启花园门与秘藏宝箱。木箱可以跳上或击碎；陶罐也藏有翡翠。先锁定守卫，再用防御和闪避寻找出手机会。",
        };
        break;
      case "chest":
        if (i.id === "chest-wood-sword" || i.id === "chest-wood-shield") {
          this.opened.add(i.id);
          if (i.id === "chest-wood-sword") {
            this.swordUnlocked = true;
            this.cancelCombo();
            this.weapon = "sword";
            this.aiming = false;
          } else this.shieldUnlocked = true;
          this.equipBestMelee();
          this.events.push("chest");
          this.beginPickup(i.id === "chest-wood-sword" ? "wood-sword" : "wood-shield");
          break;
        }
        if (i.id === "chest-sword" || i.id === "chest-shield") {
          if (!this.equipmentSwitches.has(i.id.replace("chest-", "lever-"))) {
            this.notify("宝箱被机关封印");
            break;
          }
          if (this.guards.some(g => g.hp > 0 && Math.hypot(g.originX-i.x,g.originZ-i.z)<16)) {
            this.notify("先清除据点守卫，再开启宝箱");
            break;
          }
          this.opened.add(i.id);
          if (i.id === "chest-sword") {
            this.swordUnlocked = true;
            this.swordUpgraded = true;
            this.cancelCombo();
            this.weapon = "sword";
            this.aiming = false;
            this.notify("获得冒险剑 · 左键三连斩，长按蓄力旋转攻击");
          } else {
            this.shieldUnlocked = true;
            this.shieldUpgraded = true;
            this.notify("获得盾牌 · 右键格挡，收起时背在身后");
          }
          this.events.push("chest");
          this.beginPickup(i.id === 'chest-sword' ? 'sword' : 'shield');
          this.equipBestMelee();
          break;
        }
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
            this.arrows = Math.min(30, this.arrows + 12);
            this.potions = Math.min(3, this.potions + 1);
            this.coins += 8;
            this.notify(
              "降落区补给 · 12 支备用箭、回复药与 8 金币 · 冒险弓在白宫门口",
            );
          } else {
            this.coins += 20;
            this.arrows = Math.min(30, this.arrows + 6);
            this.potions = Math.min(3, this.potions + 1);
            this.notify("据点秘藏 · +20 金币、6 支箭与回复药");
          }
          this.events.push("chest");
          break;
        }
        if (i.id === "chest-garden" && !this.gateOpen) {
          this.notify("先找到喷泉西侧的机关");
          return;
        }
        this.opened.add(i.id);
        if (i.id === "chest-east") this.bowUnlocked = true;
        this.arrows = Math.min(
          30,
          this.arrows + (i.id === "chest-east" ? 16 : 12),
        );
        this.gems += i.id === "chest-garden" ? 5 : 3;
        this.events.push("chest");
        this.beginPickup(i.id === 'chest-east' ? 'bow' : 'treasure');
        this.notify(
          i.id === "chest-garden"
            ? "花园秘藏 · +5 翡翠 · +12 备用箭矢"
            : "获得冒险弓、16 支箭与 3 翡翠 · X 切换武器",
        );
        break;
      case "lever":
        if (i.id === "lever-sword" || i.id === "lever-shield") {
          this.equipmentSwitches.add(i.id);
          const chestId = i.id.replace("lever-", "chest-");
          if (!this.equipmentChestDrops.has(chestId))
            this.equipmentChestDrops.set(chestId, this.elapsed);
          this.events.push("lever");
          this.notify("机关启动 · 宝箱正从空中投放，击败看护守卫后领取装备");
          break;
        }
        if (!this.gateOpen) {
          this.gateOpen = true;
          this.events.push("lever");
          this.notify("机关启动 · 花园门与秘藏宝箱已解锁");
        }
        break;
      case "herb":
        this.harvested.add(i.id);
        this.hp = Math.min(3, this.hp + 1);
        this.stamina = Math.min(this.maxStamina, this.stamina + 35);
        this.events.push("heal");
        this.notify("回复草 · 恢复 1 颗爱心与体力");
        break;
      case "bench":
        if (this.restCooldown > 0) {
          this.notify("刚刚休息过，继续探索吧");
          return;
        }
        this.hp = Math.min(3, this.hp + 1);
        this.stamina = this.maxStamina;
        this.restCooldown = 20;
        this.events.push("heal");
        this.phase = "reading";
        this.moving = false;
        this.reading = {
          title: "草坪上的片刻休息",
          text: "你在长椅上休息了一会儿，恢复了 1 颗爱心和全部体力。远处传来了发条守卫的脚步声。",
        };
        break;
      case "fountain":
        this.stamina = this.maxStamina;
        this.events.push("heal");
        this.notify("清凉的水雾 · 体力已恢复");
        break;
    }
    this.version++;
  }
  pressAttack() {
    if (this.stunTime > 0) return;
    if (this.rushTime > 0 || this.startRush(this.weapon === 'none' ? 'punch' : 'thrust')) return;
    if (
      this.phase !== "playing" ||
      this.spinTime > 0 ||
      this.dodgeTime > 0
    )
      return;
    // A missed pointer-up on a touch browser must not lock the wooden sword
    // out forever. A fresh press takes ownership of the attack state.
    if (this.attackHeld) this.cancelCharge();
    if (this.weapon !== "bow") this.acquireAutoTarget(true);
    if (this.weapon === "bow") {
      if (this.cooldown > 0 || this.stamina < 14) return;
      if (this.arrows <= 0) {
        this.notify("箭矢用尽 · X 切回剑盾，击败卫兵拾取补给");
        return;
      }
      this.attackHeld = true;
      this.bowDraw = 0;
      this.events.push("bowDraw");
      return;
    }
    const nextSwordStage =
      this.comboWindow > 0 && this.combo < 2 ? this.combo + 1 : 0;
    if (this.weapon === "sword" && this.stamina < ATTACKS[nextSwordStage].cost) {
      this.notify("体力不足 · 稍候恢复后再挥剑");
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
      const draw = this.bowDraw;
      const held = this.attackHeld;
      this.cancelCharge();
      if (held) this.shoot(draw);
      return;
    }
    const charge = this.chargeTime;
    const held = this.attackHeld;
    this.cancelCharge();
    if (
      this.phase === "playing" &&
      this.weapon === "none" &&
      held &&
      charge >= HEAVY_PUNCH.charge &&
      this.grounded
    ) {
      this.cancelCombo();
      this.heavyPunch = true;
      this.combo = HEAVY_PUNCH_STAGE;
      this.comboWindow = 0;
      this.attackConnected = false;
      this.comboQueued = false;
      this.attackTime = HEAVY_PUNCH.duration;
      this.cooldown = HEAVY_PUNCH.duration + 0.16;
      this.hitPending = true;
      this.guarding = false;
      this.version++;
      return;
    }
    if (
      this.phase !== "playing" ||
      !this.swordUnlocked ||
      this.weapon !== "sword" ||
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
    if (this.stunTime > 0) return;
    if (this.rushTime > 0) return;
    if (this.weapon === "bow" || (this.weapon === "sword" && !this.swordUnlocked)) return;
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
        this.meleeSpec.duration - this.attackTime >= 0.035
      )
        this.comboQueued = true;
      return;
    }
    if (this.cooldown > 0) return;
    const stage = this.comboWindow > 0 && this.combo < 2 ? this.combo + 1 : 0;
    this.beginAttack(stage);
  }
  private beginAttack(stage: number) {
    if (!this.grounded && this.airAttackUsed) return;
    this.heavyPunch = false;
    const aerial = !this.grounded ? this.weapon === "none" ? "flyingKick" : "jumpSlash" : null;
    const spec = aerial ? AERIAL[aerial] : this.weapon === "none" ? UNARMED[stage] : ATTACKS[stage];
    const cost = aerial ? AERIAL[aerial].cost : this.weapon === "none" ? 5 : ATTACKS[stage].cost;
    this.attackConnected = false;
    this.comboQueued = false;
    if (this.stamina < cost) return;
    this.airAttack = aerial;
    if (aerial) this.airAttackUsed = true;
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
    this.stamina -= cost;
    this.staminaDelay = 0.6;
    this.attackTime = spec.duration;
    this.cooldown = spec.duration;
    this.hitPending = true;
    this.guarding = false;
    this.version++;
  }
  private cancelCombo() {
    this.rush = null; this.rushTime = 0;
    this.rushRebounding = false;
    this.airAttack = null;
    this.cancelCharge();
    this.spinTime = 0;
    this.spinHitPending = false;
    if (this.heavyPunch) this.combo = 0;
    this.heavyPunch = false;
    this.attackTime = 0;
    this.hitPending = false;
    this.comboQueued = false;
    this.attackConnected = false;
    this.comboWindow = 0;
    this.hitStop = 0;
  }
  impact(x: number, z: number, heavy = false, block = false, body = false, source: 'hero' | 'enemy' | 'boss' = 'hero', yaw = this.yaw) {
    this.impactTime = 0.2;
    this.impactStrength = heavy ? 1 : block ? 0.5 : 0.65;
    if (block) this.hitStop = Math.max(this.hitStop, 0.045);
    const meteor = source === 'hero' && !block && (!!this.rush || this.combo > 0 || this.heavyPunch);
    this.effects.push({ x, z, age: 0, heavy, block, body, source, yaw, meteor });
    if (this.effects.length > 8) this.effects.shift();
  }
  /** A block only succeeds when a whole segment remains available. */
  private spendGuardSection() {
    if (this.stamina < GUARD_STAMINA_SECTION) return false;
    this.stamina = Math.max(0, this.stamina - GUARD_STAMINA_SECTION);
    this.staminaDelay = 1;
    return true;
  }
  /** A guard with less than one section left becomes a small, visible health loss. */
  private guardBreak(source: 'enemy' | 'boss', yaw: number, heavy = false) {
    this.stamina = 0;
    this.guarding = false;
    this.hp = Math.max(0, this.hp - 0.5);
    this.invincible = 1.1;
    this.cancelCombo();
    this.events.push("hurt");
    this.impact(this.x, this.z, heavy, false, false, source, yaw);
    this.hurtFeedback = heavy ? 1.4 : 0.9;
    this.impactStrength = heavy ? 1.65 : 0.95;
    this.notify("格挡失衡 · 体力不足，损失半颗爱心");
    if (this.hp <= 0) {
      this.beginDefeat();
      return true;
    }
    return false;
  }
  private nextDefenseRoll(salt: number) {
    this.defenseRoll++;
    const value = Math.sin(this.defenseRoll * 12.9898 + salt * 78.233) * 43758.5453;
    return value - Math.floor(value);
  }
  private canDeflect(g: Guard) {
    const rules = ENEMY_RULES[g.kind];
    if (
      rules.defenseChance <= 0 ||
      g.stun > 0 ||
      g.windup > 0 ||
      g.attackTime > 0 ||
      g.cooldown > 0
    ) return false;
    // Only a defender facing the player may catch the attack. Back attacks,
    // committed wind-ups and finishers remain reliable openings.
    const facing = (this.x - g.x) * Math.sin(g.yaw) + (this.z - g.z) * Math.cos(g.yaw);
    if (facing <= 0.1) return false;
    const captainBonus = (g.sizeMultiplier ?? 1) >= 1.5 ? 0.12 : 0;
    const chance = Math.min(
      0.45,
      (rules.defenseChance + captainBonus) *
        (this.difficulty === "hard" ? 1.2 : 1),
    );
    return this.nextDefenseRoll(g.id) < chance;
  }
  private canBossDeflect(heavy: boolean) {
    if (
      heavy ||
      this.difficulty !== "hard" ||
      this.boss.state !== "chase" ||
      this.boss.stagger > 0
    ) return false;
    return this.nextDefenseRoll(100) < 0.24;
  }
  strike(spin = false) {
    if (this.weapon === "bow" || (this.weapon === "sword" && !this.swordUnlocked)) return;
    const unarmed = this.weapon === "none";
    if (spin && unarmed) return;
    const air = this.airAttack ? AERIAL[this.airAttack] : null;
    const heavyPunch = unarmed && this.heavyPunch;
    const fist = air ?? (heavyPunch ? HEAVY_PUNCH : UNARMED[this.combo]);
    const damage = (air ? air.damage : unarmed ? fist.damage : spin ? 2 : 1)
      * (!unarmed && !this.swordUpgraded ? 0.5 : 1);
    const heavy = heavyPunch || (!unarmed && (!!air || spin || this.combo === 2));
    const contact = (x: number,z: number) => {
      this.attackConnected = true;
      // Contact on the target's near surface, not deep inside its torso.
      const d=Math.max(.001,Math.hypot(x-this.x,z-this.z));
      this.impact(x-(x-this.x)/d*.35,z-(z-this.z)/d*.35,heavy || (unarmed && this.combo===2),false,unarmed);
      this.hitStop=Math.max(this.hitStop,unarmed ? fist.stop : heavy ? .115 : .065);
      if(unarmed) this.impactStrength=fist.impact;
      else {
        this.impactStrength *= this.swordUpgraded ? 1.25 : 0.8;
        if (!this.swordUpgraded) this.hitStop *= 0.8;
      }
    };
    const reachable = (x: number, z: number, id: string) => {
      const dx = x - this.x,
        dz = z - this.z,
        d = Math.hypot(dx, dz);
      return (
        this.y < (air ? (id === "guard-100" ? 4.3 : 2.5 * enemyScale(this.activeGuards.find(g => "guard-" + g.id === id) ?? { kind: "sentinel" })) + 0.3 : 1.5) &&
        d < (air ? air.range : unarmed ? fist.range : spin ? SPIN.radius : 2.7) &&
        (spin ||
          d < 0.65 ||
          (dx * Math.sin(this.yaw) + dz * Math.cos(this.yaw)) / d > (unarmed ? .45 : .15)) &&
        lineClear(this.colliders.filter(c => !c.id.startsWith("guard-")),
          {x:this.x,y:this.y+1.3,z:this.z}, {x,y:1.2,z}, id)
      );
    };
    if (this.zone === "office") {
      if (reachable(this.boss.x, this.boss.z, "guard-100")) {
        const deflected = this.canBossDeflect(heavy);
        const connected = deflected || this.boss.hit(
          heavy,
          air || unarmed || !this.swordUpgraded ? damage : undefined,
        );
        if (connected) {
          contact(this.boss.x, this.boss.z);
          this.events.push(deflected ? "block" : unarmed ? (this.airAttack === "flyingKick" || this.combo===2 ? "kickHit" : heavyPunch ? "heavy" : "punchHit") : heavy ? "heavy" : "hit");
          if (deflected) {
            this.impact(this.boss.x, this.boss.z, false, true, false, "boss", this.boss.yaw);
            this.boss.flash = 0.08;
          }
          if (!this.boss.hp) {
            this.bossDefeated();
          }
          this.version++;
        }
      }
    }
    if (this.zone === "grounds" && !unarmed)
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
        if (this.canDeflect(g)) {
          g.hitFlash = 0.08;
          g.stun = g.stunDuration = 0.06;
          g.cooldown = 0.42;
          this.impact(g.x, g.z, false, true, false, "enemy", g.yaw);
          this.events.push("block");
          continue;
        }
        g.hp = Math.max(0, g.hp - damage);
        const spec = air ?? (unarmed ? fist : spin ? { stun: .48, push: 5 } : ATTACKS[this.combo]);
        const captainScale = (g.sizeMultiplier ?? 1) >= 1.5 ? 0.8 : 1;
        g.stun = g.stunDuration =
          spec.stun * ENEMY_RULES[g.kind].stunScale * captainScale;
        g.hitFlash = 0.14;
        const distance = Math.hypot(g.x - this.x, g.z - this.z) || 1;
        g.knockX = ((g.x - this.x) / distance) * spec.push;
        g.knockZ = ((g.z - this.z) / distance) * spec.push;
        contact(g.x, g.z);
        g.windup = 0;
        g.attackTime = 0;
        // Recovery runs alongside the brief stagger, not an extra long lockout.
        g.cooldown = Math.max(.22, g.stun + .08);
        this.events.push(unarmed ? (this.airAttack === "flyingKick" || this.combo===2 ? "kickHit" : heavyPunch ? "heavy" : "punchHit") : heavy ? "heavy" : "hit");
        if (g.hp === 0) {
          this.guardDefeated(g);
        }
      }
    this.version++;
  }
  beginDefeat() {
    this.stunTime = 0;
    if (this.phase !== "playing") return;
    this.phase = "dying";
    this.events.push("defeat");
    this.hp = 0;
    this.deathTime = DEATH.player;
    this.cancelCombo();
    this.dodgeTime = this.jumpBuffer = this.coyoteTime = 0;
    this.moving = this.sprinting = this.guarding = this.aiming = false;
    this.lockedTarget = null;
    this.projectiles = [];
    for (const g of this.activeGuards) {
      g.windup = 0;
      g.attackTime = 0;
      g.hitFlash = g.stun = 0;
      g.cooldown = Math.max(1, g.cooldown);
    }
    if (this.boss.hp > 0) {
      this.boss.state = "recover";
      this.boss.wave = -1;
    }
    this.invincible = 0;
  }
  blocked(x: number, z: number) {
    return occupied(this.colliders, x, z, this.y);
  }
  update(delta: number, input: Input) {
    const dt = Math.min(Math.max(delta, 0), 0.05);
    if (this.phase === 'obtaining') {
      this.pickupTime = Math.max(0, this.pickupTime - dt);
      if (this.pickupTime === 0) this.finishPickup();
      return;
    }
    if (this.phase === "intro") {
      this.introTime -= dt;
      if (this.introTime <= 0) this.skipIntro();
      return;
    }
    if (this.phase === "dying") {
      this.impactTime = Math.max(0, this.impactTime - dt);
      for (const effect of this.effects) effect.age += dt;
      this.effects = this.effects.filter((effect) => effect.age < 0.36);
      this.deathTime = Math.max(0, this.deathTime - dt);
      this.vy -= 18 * dt;
      const fall = moveVertical(
        this.colliders,
        this.x,
        this.z,
        this.y,
        this.y + this.vy * dt,
      );
      this.y = fall.y;
      if (fall.grounded || fall.hitCeiling) this.vy = 0;
      for (const g of this.activeGuards)
        g.defeatTime = Math.max(0, g.defeatTime - dt);
      if (this.deathTime === 0) this.phase = "lost";
      return;
    }
    if (this.phase !== "playing") return;
    this.impactTime = Math.max(0, this.impactTime - dt);
    for (const effect of this.effects) effect.age += dt;
    this.effects = this.effects.filter((e) => e.age < (e.ground ? BOSS_VFX.duration : 0.36));
    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - dt);
      return;
    }
    this.stunTime = Math.max(0, this.stunTime - dt);
    if (this.stunTime > 0) input = { x: 0, z: 0, sprint: false, guard: false };
    if (input.guard && !this.lastInput.guard) this.startRush('shield', input);
    this.rushTime = Math.max(0, this.rushTime-dt);
    if (this.rushTime === 0) { this.rush = null; this.rushRebounding = false; }
    this.updateRanged(dt);
    if (this.phase !== "playing") return;
    if (this.zone === "office") {
      this.updateSummons(dt);
      const previousBossState = this.boss.state;
      const previousWave = this.boss.wave;
      const move =
        this.summonTime > 0 ? null : this.boss.update(dt * (this.difficulty === "hard" ? 1.25 : 1.1), this, this.colliders);
      const boss = this.boss;
      // Each attack announces itself exactly once on entering wind-up. The
      // audible tell gives the player the same warning window as the VFX.
      if (boss.state === "windup" && previousBossState !== "windup") {
        this.events.push(
          boss.move === "dart" ? "bossDartCharge"
            : boss.move === "slam" ? "bossSlamCharge"
              : boss.move === "wave" ? "bossWaveCharge"
                : "bossSweepCharge",
        );
      }
      if (move === "dart") {
        const dx = boss.aimX - boss.x, dz = boss.aimZ - boss.z;
        const distance = Math.max(0.1, Math.hypot(dx, dz));
        const yaw = Math.atan2(dx, dz), speed = 23;
        for (const spread of (boss.enraged ? [-0.24, -0.12, 0, 0.12, 0.24] : [-0.16, 0, 0.16])) {
          if (this.projectiles.length >= 32) break;
          this.projectiles.push({kind:"dart", owner:100, x:boss.x, y:2.1, z:boss.z,
            vx:Math.sin(yaw+spread)*speed, vz:Math.cos(yaw+spread)*speed,
            vy:(boss.aimY-2.1)*speed/distance + 1.5*distance/speed,
            life:2.5,power:1});
        }
        this.events.push("bossDartFire");
        this.notify("飞镖齐射 · 横向翻滚或举盾格挡");
      }
      if (move === "sweep") this.events.push("bossSweepStrike");
      if (move === "wave") this.events.push("bossWaveRelease");
      if (move === "slam") {
        // This is the exact hammer contact frame, separate from player damage:
        // the floor burst still reads when the player evades the hitbox.
        this.effects.push({
          x: boss.slamX,
          z: boss.slamZ,
          age: 0,
          heavy: true,
          block: false,
          source: "boss",
          yaw: boss.yaw,
          ground: true,
        });
        if (this.effects.length > 8) this.effects.shift();
        this.events.push("slam");
        this.impactTime = .2;
        this.impactStrength = hammerShake(Math.hypot(this.x - boss.slamX, this.z - boss.slamZ));
      }
      const dx = this.x - boss.x,
        dz = this.z - boss.z,
        d = Math.hypot(dx, dz);
      const facing = dx * Math.sin(boss.yaw) + dz * Math.cos(boss.yaw);
      const sight = this.visible(boss.x, boss.z, "guard-100");
      const attackHit =
        move === "sweep"
          ? d < 3.8 && facing > 0 && this.y < 2
          : move === "slam"
            ? Math.hypot(this.x - boss.slamX, this.z - boss.slamZ) < BOSS_SLAM.radius && this.y < 1.5
            : false;
      const waveDistance = Math.hypot(this.x - boss.waveX, this.z - boss.waveZ);
      const waveHit =
        boss.wave >= 0 &&
        !boss.waveHit &&
        waveDistance >= Math.min(previousWave<0?0:previousWave,boss.wave)-.6 &&
        waveDistance <= boss.wave+.6 &&
        this.y < 0.95;
      // The ground wave passes furniture visually; it is not a line-of-sight projectile.
      if (((attackHit && sight) || waveHit) && !this.damageImmune) {
        if (waveHit) boss.waveHit = true;
        const toward =
          (boss.x - this.x) * Math.sin(this.yaw) +
          (boss.z - this.z) * Math.cos(this.yaw);
        const canBlockSweep =
          !waveHit && move === "sweep" &&
          input.guard &&
          this.canGuard &&
          this.attackTime <= 0 &&
          this.spinTime <= 0 &&
          this.dodgeTime <= 0 &&
          this.chargeTime <= 0 &&
          this.grounded &&
          toward > 0;
        if (canBlockSweep && this.spendGuardSection()) {
          this.events.push("block");
          this.impact(this.x, this.z, false, true);
          boss.stagger = 0.18;
          this.notify("格挡成功 · 统领露出破绽");
        } else if (canBlockSweep) {
          if (this.guardBreak("boss", boss.yaw, true)) return;
        } else {
          this.hp--;
          this.invincible = 1.15;
          this.cancelCombo();
          this.events.push("hurt");
          this.impact(this.x, this.z, true, false, false, 'boss', boss.yaw);
          this.hurtFeedback = 1.7;
          this.impactStrength = waveHit ? 1.65 : move === 'slam' ? 3.1 : 2;
          this.notify(waveHit ? "跳跃越过冲击波！" : "留意预警，闪避重锤！");
          if (this.hp <= 0) {
            this.beginDefeat();
            return;
          }
          if (move === "slam" && attackHit) this.stunFromHammer();
        }
        this.version++;
      }
    }
    // A slam may have stunned the hero in this very update. Keep enemies and
    // gravity ticking, but discard actions and locomotion until recovery.
    if (this.stunTime > 0) input = { x: 0, z: 0, sprint: false, guard: false };
    this.coyoteTime = this.grounded ? 0.1 : Math.max(0, this.coyoteTime - dt);
    this.tryJump();
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    // Held defense can cancel a normal swing after its active hit, never before.
    if (
      this.canGuard &&
      input.guard &&
      this.attackTime > 0 &&
      !this.hitPending &&
      this.spinTime <= 0
    )
      this.cancelCombo();
    this.elapsed += dt;
    this.aiming =
      this.weapon === "bow" &&
      !!input.guard &&
      this.dodgeTime <= 0;
    if (this.aiming)
      this.yaw = Math.atan2(this.aimPoint.x - this.x, this.aimPoint.z - this.z);
    if (this.weapon === "bow") {
      this.bowDraw = this.attackHeld ? Math.min(0.85, this.bowDraw + dt) : 0;
      if (this.attackHeld) this.yaw = Math.atan2(this.aimPoint.x - this.x, this.aimPoint.z - this.z);
    }
    if ((this.weapon === "sword" || this.weapon === "none") && this.attackHeld) {
      this.attackHoldTime += dt;
      const swordCharge = this.weapon === "sword";
      const fullCharge = swordCharge ? SPIN.maxCharge : HEAVY_PUNCH.charge;
      if (
        input.guard ||
        !this.grounded ||
        (swordCharge ? this.stamina < SPIN.cost : this.stamina <= 0)
      )
        this.cancelCharge();
      else if (
        this.attackHoldTime >= 0.3 &&
        this.attackTime <= 0 &&
        this.cooldown <= 0
      ) {
        const previous = this.chargeTime;
        this.chargeTime = Math.min(fullCharge, this.chargeTime + dt);
        this.comboQueued = false;
        this.comboWindow = 0;
        this.staminaDelay = 0.4;
        if (previous < fullCharge && this.chargeTime >= fullCharge)
          this.events.push("charge");
        if (!swordCharge && this.chargeTime >= HEAVY_PUNCH.charge) {
          this.stamina = Math.max(0, this.stamina - HEAVY_PUNCH.fullChargeDrain * dt);
          this.staminaDelay = 0.4;
        }
      }
    }
    this.spinTime = Math.max(0, this.spinTime - dt);
    if (this.spinHitPending && SPIN.duration - this.spinTime >= SPIN.hit) {
      this.spinHitPending = false;
      this.strike(true);
    }
    const wasAttacking = this.attackTime > 0;
    const previousAttackTime = this.attackTime;
    this.attackTime = Math.max(0, this.attackTime - dt);
    const swingAt = this.meleeSpec.duration - Math.max(0, this.meleeSpec.hit - 0.08);
    if (this.weapon === "sword" && previousAttackTime > swingAt && this.attackTime <= swingAt)
      this.events.push("sword");
    const fistAt=this.meleeSpec.duration-Math.max(0,this.meleeSpec.hit-.055);
    if(this.weapon==="none" && previousAttackTime>fistAt && this.attackTime<=fistAt)
      this.events.push("fistSwing");
    this.comboWindow = Math.max(0, this.comboWindow - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.invincible = Math.max(0, this.invincible - dt);
    this.restCooldown = Math.max(0, this.restCooldown - dt);
    this.staminaDelay = Math.max(0, this.staminaDelay - dt);
    if (
      this.hitPending &&
      this.meleeSpec.duration - this.attackTime >= this.meleeSpec.hit
    ) {
      this.hitPending = false;
      this.strike();
      if(this.weapon==="none" && this.hitStop>0) this.attackTime=this.meleeSpec.duration-this.meleeSpec.hit;
    }
    if (
      !this.airAttack && this.comboQueued &&
      this.combo < 2 &&
      this.attackTime > 0 &&
      this.attackTime <= (this.weapon === "none" ? (this.attackConnected ? UNARMED[this.combo].chain : 0) : .1) &&
      this.hitStop <= 0 &&
      this.stamina >= (this.weapon === "none" ? 5 : ATTACKS[this.combo + 1].cost)
    ) {
      this.beginAttack(this.combo + 1);
    }
    if (wasAttacking && this.attackTime === 0) {
      const aerial = this.airAttack !== null;
      const heavyPunch = this.heavyPunch;
      this.airAttack = null;
      // The special fourth stage is not an index into the three normal attacks.
      // Restore it atomically with the flag, before movement/render reads meleeSpec.
      if (heavyPunch) this.combo = 0;
      this.heavyPunch = false;
      if (aerial || heavyPunch) this.comboQueued = false;
      this.comboWindow = !aerial && !heavyPunch && this.combo < 2 ? COMBO_GRACE : 0;
      if (this.combo === 2) this.cooldown = this.weapon === "none" ? .12 : .22;
      if (heavyPunch) this.cooldown = Math.max(this.cooldown, .18);
      if (this.comboQueued && !heavyPunch && this.combo < 2) this.beginAttack(this.combo + 1);
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
      else if (distance > 0.15 && this.weapon !== "bow" && !this.rush) {
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
      this.canGuard &&
      !!input.guard &&
      this.stamina > 0 &&
      this.grounded &&
      this.dodgeTime <= 0 &&
      this.attackTime <= 0 &&
      this.spinTime <= 0 &&
      this.chargeTime <= 0;
    if (this.rush === "shield") this.guarding = true;
    if (this.guarding && this.rush !== "shield") {
      this.stamina = Math.max(0, this.stamina - GUARD_HOLD_DRAIN * dt);
      this.staminaDelay = Math.max(this.staminaDelay, 0.25);
      if (this.stamina <= 0) {
        this.guarding = false;
        this.notify("体力耗尽 · 无法继续防御");
      }
    }
    this.lastInput = input;
    const length = Math.hypot(input.x, input.z),
      dx = input.x / Math.max(1, length),
      dz = input.z / Math.max(1, length),
      c = Math.cos(this.cameraYaw),
      s = Math.sin(this.cameraYaw);
    let mx = dx * c + dz * s,
      mz = dz * c - dx * s;
    this.sprinting =
      !this.rush && input.sprint &&
      length > 0.1 &&
      !this.guarding &&
      !this.aiming &&
      this.chargeTime <= 0 &&
      this.spinTime <= 0 &&
      this.stamina > 0 &&
      this.dodgeTime <= 0;
    let speed = this.sprinting ? 9.5 : 5.6;
    if (this.aiming) speed = 0;
    else if (this.guarding) speed = 2;
    else if (this.chargeTime > 0) speed = 2.8;
    if (this.spinTime > 0) speed = 1.6;
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
      !this.rush && length > 0.1 &&
      !locked &&
      !this.aiming &&
      !this.guarding &&
      this.attackTime === 0 &&
      this.spinTime <= 0 &&
      this.chargeTime <= 0
    )
      this.yaw = Math.atan2(mx, mz);
    if (this.rush) {
      const pose = rushPose(this.rush,this.rushTime,this.rushRebounding);
      const target = this.combatTargets.find(g => g.id === this.rushTarget && g.hp > 0);
      // Follow the chosen lock during anticipation, then only modestly correct
      // the charge. Never turn back through a target already reached.
      if (!this.rushRebounding && target && !this.rushHits.has(target.id) && Math.hypot(target.x-this.x,target.z-this.z)>1.4) {
        const desired = Math.atan2(target.x-this.x,target.z-this.z);
        const deltaYaw = Math.atan2(Math.sin(desired-this.rushYaw),Math.cos(desired-this.rushYaw));
        const turn = (pose.elapsed < RUSH[this.rush].launch ? 14 : 3)*dt;
        if (Math.abs(deltaYaw)<Math.PI*.6) this.rushYaw += Math.max(-turn,Math.min(turn,deltaYaw));
      }
      this.yaw = this.rushYaw;
      mx = Math.sin(this.rushYaw); mz = Math.cos(this.rushYaw);
      speed = pose.speed;
    }
    const colliders = this.colliders,
      oldX = this.x,
      oldZ = this.z;
    const attackElapsed = this.meleeSpec.duration - this.attackTime;
    const lunge =
      this.airAttack && this.attackTime > 0 ? (this.airAttack === "flyingKick" ? 3.8 : 1.2) : this.grounded &&
      this.attackTime > 0 &&
      attackElapsed < this.meleeSpec.hit + 0.06
        ? this.weapon === "none"
          ? (attackElapsed >= this.meleeSpec.hit-.065 ? (this.heavyPunch ? 3.6 : this.combo===2 ? 2.8 : 2.4) : 0)
          : this.combo === 2
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
    this.rushContact();
    // A blocked charge is also an impact, but backward motion still goes through
    // the normal collision sweep so a nearby rear wall cannot be tunneled through.
    const advance = (this.x-oldX)*mx+(this.z-oldZ)*mz;
    if (this.rush === 'shield' && !this.rushRebounding && speed > 0 &&
        advance < speed*dt*.7) {
      this.impact(this.x+mx*.8,this.z+mz*.8,true,true,false,'hero',this.rushYaw);
      this.impactStrength = 1.4;
      this.hitStop = Math.max(this.hitStop,.08);
      this.events.push('block');
      this.reboundShield();
    }
    this.moving = Math.hypot(this.x - oldX, this.z - oldZ) > 0.0001;
    this.vy -= 18 * dt;
    const vertical = moveVertical(
      colliders,
      this.x,
      this.z,
      this.y,
      this.y + this.vy * dt,
    );
    this.y = vertical.y;
    if (!this.grounded && vertical.grounded && this.vy < -2) this.events.push("land");
    if (!this.grounded && vertical.grounded && this.airAttack === "jumpSlash") this.impact(this.x, this.z, true);
    this.grounded = vertical.grounded;
    if (this.grounded) this.airAttackUsed = false;
    if (this.grounded && this.moving && this.dodgeTime <= 0 && this.attackTime <= 0 && this.spinTime <= 0) {
      this.stepDistance += Math.hypot(this.x - oldX, this.z - oldZ);
      if (this.stepDistance >= (this.sprinting ? 2.8 : 1.9)) {
        this.stepDistance = 0;
        this.events.push("step");
      }
    } else this.stepDistance = 0;
    if (vertical.grounded || vertical.hitCeiling) this.vy = 0;
    this.tryJump();
    if (
      !this.sprinting &&
      !this.guarding &&
      this.dodgeTime <= 0 &&
      this.staminaDelay <= 0
    )
      this.stamina = Math.min(this.maxStamina, this.stamina + 24 * dt);
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
            0.48 * enemyScale(g),
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
        g.attackTime = Math.max(0, g.attackTime - dt);
        if (g.attackTime > 0) continue;
        const distance = Math.hypot(g.x - this.x, g.z - this.z);
        const rules = ENEMY_RULES[g.kind];
        if (g.windup > 0) {
          g.windup = Math.max(0, g.windup - dt);
          if (g.windup === 0) {
            g.attackTime = ENEMY_RECOVERY[g.kind];
            g.cooldown =
              (g.kind === "archer" ? 1.7 : g.kind === "brute" ? 1.55 : 0.95)
              * (this.difficulty === "hard" ? .7 : .9);
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
                this.events.push("enemyArrow");
              }
              continue;
            }
            if (distance < 12 && this.visible(g.x, g.z, "guard-" + g.id))
              this.events.push("enemySwing");
            const forward =
              (this.x - g.x) * Math.sin(g.yaw) +
              (this.z - g.z) * Math.cos(g.yaw);
            if (
              distance < 2.1 * enemyScale(g) &&
              forward > 0 &&
              this.y < 1.3 &&
              !this.damageImmune &&
              this.visible(g.x, g.z, "guard-" + g.id)
            ) {
              const face =
                (g.x - this.x) * Math.sin(this.yaw) +
                (g.z - this.z) * Math.cos(this.yaw);
              const canBlock = this.guarding && face > 0;
              if (canBlock && this.spendGuardSection()) {
                this.notify(
                  g.kind === "brute"
                    ? `挡下重锤 · -${GUARD_STAMINA_SECTION} 体力`
                    : `成功格挡 · -${GUARD_STAMINA_SECTION} 体力`,
                );
                this.events.push("block");
                this.impact(this.x, this.z, false, true);
                g.stun = g.stunDuration = 0.25;
              } else if (canBlock) {
                if (this.guardBreak("enemy", g.yaw, g.kind === "brute")) return;
              } else {
                this.hp--;
                this.events.push("hurt");
                this.impact(this.x, this.z, g.kind === 'brute', false, false, 'enemy', g.yaw);
                this.cancelCombo();
                this.hurtFeedback = g.kind === "brute" ? 1.4 : 1;
                this.impactStrength = g.kind === "brute" ? 1.65 : 1.1;
                this.invincible = 1.1;
                this.notify("受到攻击！右键防御或 Shift + 方向 + Space 翻滚");
                if (this.hp <= 0) {
                  this.beginDefeat();
                  return;
                }
              }
              this.version++;
            }
          }
          continue;
        }
        const sight =
          distance < rules.range * (this.difficulty === "hard" ? 1.3 : 1) && this.visible(g.x, g.z, "guard-" + g.id);
        if (sight) {
          g.alertUntil = this.elapsed + (this.difficulty === "hard" ? 7 : 4);
          g.lastSeenX = this.x;
          g.lastSeenZ = this.z;
          if (this.difficulty === "hard") {
            for (const ally of this.activeGuards) {
              if (ally.hp <= 0 || Math.hypot(ally.x-g.x,ally.z-g.z)>14) continue;
              ally.alertUntil = this.elapsed + 7;
              ally.lastSeenX = this.x;
              ally.lastSeenZ = this.z;
            }
          }
        }
        const chasing =
          sight ||
          ((g.alertUntil ?? 0) > this.elapsed && distance < rules.range + (this.difficulty === "hard" ? 18 : 8));
        if (g.kind === "archer" && sight && distance >= 6 && g.cooldown === 0) {
          // A small global attack budget avoids overlapping volleys and melee dogpiles.
          if (
            this.activeGuards.filter((other) => other.windup > 0).length < this.enemyAttackBudget
          ) {
            g.shotX = this.x + ((this.x - oldX) / Math.max(dt, 0.001)) * (this.difficulty === "hard" ? 0.4 : 0.2);
            g.shotZ = this.z + ((this.z - oldZ) / Math.max(dt, 0.001)) * (this.difficulty === "hard" ? 0.4 : 0.2);
            g.yaw = Math.atan2(this.x - g.x, this.z - g.z);
            g.windup = rules.windup;
            g.attackTime = 0;
          }
          continue;
        }
        const retreat = g.kind === "archer" && sight && distance < 10;
        const flank =
          sight && g.kind !== "archer" && distance > 3
            ? (g.id % 2 ? 1 : -1) * (this.difficulty === "hard" ? 3.2 : 1.8)
            : 0;
        const tx = retreat
            ? g.x + (g.x - this.x)
            : chasing
              ? (g.lastSeenX ?? this.x) +
                (flank * (this.z - g.z)) / Math.max(distance, 0.01)
              : g.originX +
                Math.sin(this.elapsed * 0.45 + g.id * Math.PI) * 1.1,
          tz = retreat
            ? g.z + (g.z - this.z)
            : chasing
              ? (g.lastSeenZ ?? this.z) -
                (flank * (this.x - g.x)) / Math.max(distance, 0.01)
              : g.originZ +
                Math.cos(this.elapsed * 0.45 + g.id * Math.PI) * 2.2;
        const vx = tx - g.x,
          vz = tz - g.z,
          l = Math.hypot(vx, vz);
        if (l > 0.1) g.yaw = Math.atan2(vx, vz);
        if (
          g.kind !== "archer" &&
          chasing &&
          sight &&
          distance < 2.1 * enemyScale(g) &&
          g.cooldown === 0
        ) {
          if (
            this.activeGuards.filter((other) => other !== g && other.windup > 0)
              .length >= this.enemyAttackBudget
          )
            continue;
          g.windup =
            rules.windup +
            (this.activeGuards.some((other) => other.windup > 0) ? 0.2 : 0);
          g.attackTime = 0;
          continue;
        }
        if (
          l > 0.2 &&
          (g.kind !== "archer" ||
            !chasing ||
            !sight ||
            distance < 10 ||
            distance > 17) &&
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
          const moved = steerEnemy(
            obstacles,
            g.x,
            g.z,
            (vx / l) * dt * (chasing ? rules.speed : 1.4) * (this.difficulty === "hard" ? 1.5 : 1.2),
            (vz / l) * dt * (chasing ? rules.speed : 1.4) * (this.difficulty === "hard" ? 1.5 : 1.2),
            0.48 * enemyScale(g),
            g.id % 2 ? 1 : -1,
          );
          g.x = moved.x;
          g.z = moved.z;
        }
      }
    }
  }
}
export const game = new Simulation();
