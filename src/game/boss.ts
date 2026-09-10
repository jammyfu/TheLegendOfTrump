import { DEATH } from "./enemyMotion";
import { moveAndSlide } from "./collision";
import type { Collider } from "./world";
import { BOSS_SLAM } from "./bossHammer";
import { BOSS_BALANCE } from './bossBalance';
import type { Difficulty } from './difficulty';
import { BOSS_BODY_RADIUS, bossPath, bossPathClear, type NavPoint } from './bossNavigation';
export type BossMove = "sweep" | "slam" | "wave" | "dart";
export class Boss {
  constructor(public difficulty:Difficulty='normal') {
    this.hp=this.maxHp=BOSS_BALANCE[difficulty].hp;
  }
  id = 100;
  x = 0;
  z = -1;
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
  aimX = 0;
  aimZ = 0;
  aimY = 1.2;
  previousPlayer: { x: number; z: number } | null = null;
  velocityX = 0;
  velocityZ = 0;
  pursuingSlam = false;
  pursuitTime = 0;
  boostTime = 0;
  boostCooldown = 0;
  private route:NavPoint[]=[];
  private routeTime=0;
  private routeTarget:NavPoint|null=null;
  private moveToward(dt:number,player:NavPoint,colliders:Collider[],speed:number){
    const solids=colliders.filter(c=>c.id!=='guard-100');
    const corrected=moveAndSlide(solids,this.x,this.z,0,0,0,false,BOSS_BODY_RADIUS);
    this.x=corrected.x;this.z=corrected.z;
    const obstacles=colliders.filter(c=>!c.id.startsWith('guard-')&&(c.bottom??0)<2.85);
    this.routeTime=Math.max(0,this.routeTime-dt);
    if(!this.routeTime){
      if(!this.route.length||!this.routeTarget||Math.hypot(player.x-this.routeTarget.x,player.z-this.routeTarget.z)>2){
        this.route=bossPath(obstacles,this,player);this.routeTarget={x:player.x,z:player.z};
      }
      this.routeTime=.6;
    }
    while(this.route.length&&Math.hypot(this.route[0].x-this.x,this.route[0].z-this.z)<.2)this.route.shift();
    const target=this.route[0];
    if(!target)return;
    const dx=target.x-this.x,dz=target.z-this.z,d=Math.hypot(dx,dz);
    const step=Math.min(speed*dt,d);
    const moved=moveAndSlide(solids,this.x,this.z,0,dx/d*step,dz/d*step,false,BOSS_BODY_RADIUS);
    if(Math.hypot(moved.x-this.x,moved.z-this.z)<step*.15){this.route=[];this.routeTime=Math.min(this.routeTime,.15);}
    this.x=moved.x;this.z=moved.z;
    this.yaw=Math.atan2(dx,dz);
  }
  get boostSpeed() {
    if (!this.boostTime || this.state !== 'chase' || this.stagger > 0) return 1;
    const elapsed = 1.45 - this.boostTime;
    return 1 + .85 * Math.min(1, Math.max(0, elapsed - .2) / .25, this.boostTime / .2);
  }
  get slamX() { return this.x + Math.sin(this.yaw) * BOSS_SLAM.forward + Math.cos(this.yaw) * BOSS_SLAM.side; }
  get slamZ() { return this.z + Math.cos(this.yaw) * BOSS_SLAM.forward - Math.sin(this.yaw) * BOSS_SLAM.side; }
  get recoveryDuration() {
    return this.move === "slam" ? this.enraged ? BOSS_SLAM.enragedRecover : BOSS_SLAM.recover
      : this.move === "dart" ? .55 : this.enraged ? .85 : 1.2;
  }
  get enraged() {
    return this.hp > 0 && this.hp <= this.maxHp / 2;
  }
  reset(difficulty:Difficulty=this.difficulty) {
    Object.assign(this, new Boss(difficulty));
    this.active = true;
  }
  hit(finisher: boolean, damage = finisher ? 2 : 1) {
    if (!this.active || this.hp <= 0) return false;
    this.hp = Math.max(0, this.hp - damage);
    this.flash = 0.13;
    // The boss can be staggered in recovery; anticipation retains armor so it
    // cannot be permanently stun-locked by repeating a combo.
    if (this.state !== "windup") this.stagger = finisher ? 0.22 : 0.07;
    if (!this.hp) {
      this.state = "dead";
      this.pursuingSlam = false;
      this.boostTime = 0;
      this.defeatTime = DEATH.boss;
      this.wave = -1;
    }
    return true;
  }
  update(
    dt: number,
    player: { x: number; z: number; y?: number },
    colliders: Collider[],
    random: () => number = Math.random,
  ): BossMove | null {
    if (this.previousPlayer && dt > 0) {
      this.velocityX = Math.max(-10, Math.min(10, (player.x-this.previousPlayer.x)/dt));
      this.velocityZ = Math.max(-10, Math.min(10, (player.z-this.previousPlayer.z)/dt));
    }
    this.previousPlayer = { x: player.x, z: player.z };
    this.flash = Math.max(0, this.flash - dt);
    this.defeatTime = Math.max(0, this.defeatTime - dt);
    if (!this.active || this.hp <= 0) return null;
    this.boostCooldown = Math.max(0, this.boostCooldown - dt);
    this.boostTime = this.state === 'chase' && !this.stagger ? Math.max(0, this.boostTime - dt) : 0;
    if (this.wave >= 0) {
      this.wave += dt * 7;
      if (this.wave > 36) this.wave = -1;
    }
    if (this.stagger > 0) {
      this.stagger = Math.max(0, this.stagger - dt);
      return null;
    }
    this.timer = Math.max(0, this.timer - dt);
    if (this.state === "windup") {
      if (this.move === "slam" && this.timer > BOSS_SLAM.commit)
        this.yaw = Math.atan2(player.x - this.x, player.z - this.z);
      // Track until the final readable dodge window, then commit the volley.
      if (this.move === "dart" && this.timer > 0.3) {
        const lead = Math.min(0.65, Math.hypot(player.x-this.x, player.z-this.z)/23);
        this.aimX = player.x + this.velocityX*lead;
        this.aimZ = player.z + this.velocityZ*lead;
        this.yaw = Math.atan2(this.aimX-this.x, this.aimZ-this.z);
      }
      if (this.timer > 0) return null;
      this.state = "recover";
      this.timer = this.recoveryDuration;
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
        this.timer = BOSS_BALANCE[this.difficulty].attackPause;
      }
      return null;
    }
    const dx = player.x - this.x,
      dz = player.z - this.z,
      d = Math.hypot(dx, dz);
    if (d > 0.01) this.yaw = Math.atan2(dx, dz);
    const clearPath=bossPathClear(colliders.filter(c=>!c.id.startsWith('guard-')) ,this,player);
    if (!this.timer && !this.pursuingSlam && d > 5 && this.sequence % 3 === 1) {
      this.pursuingSlam = true;
      this.pursuitTime = 3;
      this.move = "slam";
      // One roll per pursuit, never per frame. Even a failed roll has a cooldown.
      if (!this.boostCooldown) {
        this.boostCooldown = 6;
        if (random() < (this.enraged ? .6 : .4)) this.boostTime = 1.45;
      }
    }
    if (this.pursuingSlam) {
      this.pursuitTime = Math.max(0, this.pursuitTime - dt);
      if (d <= 4 && clearPath) {
        this.pursuingSlam = false;
        this.boostTime = 0;
        this.move = "slam";
        this.sequence++;
        this.state = "windup";
        this.timer = this.enraged ? BOSS_SLAM.enragedWindup : BOSS_SLAM.windup;
      } else if (!this.pursuitTime) {
        this.pursuingSlam = false;
        this.boostTime = 0;
        this.timer = .45;
        this.sequence++;
      } else {
        const speed = (this.enraged ? 7.5 : 6.2) * this.boostSpeed;
        this.moveToward(dt,player,colliders,speed);
      }
      return null;
    }
    if (!this.timer && d > 7 && clearPath) {
      this.move = this.sequence % 2 === 0 ? "dart" : "wave";
      this.aimX = player.x; this.aimZ = player.z; this.aimY = (player.y ?? 0) + 1.2;
      this.state = "windup";
      this.timer = this.move === "dart" ? 1.1 : 1.4;
      this.sequence++;
      return null;
    }
    if (!this.timer && clearPath && (d < 3.5 || this.sequence % 3 === 2)) {
      this.move = (["sweep", "slam", "wave"] as const)[this.sequence++ % 3];
      this.state = "windup";
      this.timer = this.move === "wave" ? 1.25 : this.move === "slam"
        ? this.enraged ? BOSS_SLAM.enragedWindup : BOSS_SLAM.windup : this.enraged ? .7 : 1;
    } else if (d > 2.1 || !clearPath) {
      const speed = this.enraged ? 4.6 : 3.5;
      this.moveToward(dt,player,colliders,speed);
    }
    return null;
  }
}
