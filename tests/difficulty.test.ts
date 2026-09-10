import test from "node:test";
import assert from "node:assert/strict";
import { Simulation } from "../src/game/simulation";
import { difficultySpawns } from "../src/game/difficulty";
import { FIELD_CHESTS } from "../src/game/expedition";
import { Boss } from '../src/game/boss';
import { BOSS_BALANCE } from '../src/game/bossBalance';

test("normal equipment shrines each have exactly one ordinary sentinel", () => {
  const spawns = difficultySpawns("normal");
  for (const chest of FIELD_CHESTS.filter(c => ["chest-sword", "chest-shield"].includes(c.id))) {
    const guardians = spawns.filter(g => Math.hypot(g.x-chest.x,g.z-chest.z)<16);
    assert.equal(guardians.length, 1);
    assert.equal(guardians[0].kind, "sentinel");
    assert.equal(guardians[0].sizeMultiplier, undefined);
  }
});
test("hard adds enemies, including protected equipment captains", () => {
  const hard = difficultySpawns("hard");
  assert.ok(hard.length > difficultySpawns("normal").length);
  assert.equal(hard.filter(g => g.title?.includes("守护者")).length, 2);
});
test("victory unlocks hard only on the next adventure, retry keeps difficulty", () => {
  const game = new Simulation(); game.completedCampaign = false; game.start();
  assert.equal(game.difficulty, "normal");
  game.phase = "dialogue"; game.interact();
  assert.equal(game.phase, "won");
  assert.equal(game.difficulty, "normal");
  assert.equal(game.completedCampaign, true);
  game.start(); assert.equal(game.difficulty, "hard");
  assert.equal(game.guards.length, difficultySpawns("hard").length);
  game.retry(); assert.equal(game.difficulty, "hard");
});

test('boss difficulty health and retry never stack multipliers',()=>{
  for(const difficulty of ['normal','hard'] as const){
    const g=new Simulation();g.completedCampaign=true;g.selectedDifficulty=difficulty;g.start();
    assert.equal(g.boss.maxHp,difficulty==='hard'?36:18);
    g.gems=8;g.x=0;g.z=-10.7;g.interact();
    assert.equal(g.boss.active,true);
    for(let i=0;i<3;i++){
      g.boss.hp=1;g.phase='lost';g.retry();
      assert.equal(g.boss.hp,BOSS_BALANCE[difficulty].hp);
      assert.equal(g.boss.difficulty,difficulty);
      assert.equal(g.minions.length,BOSS_BALANCE[difficulty].minions);
    }
  }
});

test('normal adds a breathing window while hard retains the original attack cadence',()=>{
  for(const difficulty of ['normal','hard'] as const){
    const b=new Boss(difficulty);b.reset();b.state='recover';b.timer=.01;
    b.update(.02,{x:0,z:2},[]);
    assert.equal(b.state,'chase');assert.equal(b.timer,difficulty==='hard'?.3:1.65);
    for(let i=0;i<8;i++)b.update(.05,{x:0,z:2},[]);
    assert.equal(b.state,difficulty==='hard'?'windup':'chase');
    b.move='dart';assert.equal(b.recoveryDuration,.55);
  }
});

test('hard summons four soldiers in three finite health-relative waves; normal keeps two by two',()=>{
  for(const difficulty of ['normal','hard'] as const){
    const g=new Simulation();g.completedCampaign=true;g.selectedDifficulty=difficulty;g.start();
    g.zone='office';g.boss.reset();g.debug.invincible=true;
    const rules=BOSS_BALANCE[difficulty],idle={x:0,z:0,sprint:false};
    assert.equal(new Set(g.minions.map(m=>m.id)).size,rules.minions);
    for(let wave=0;wave<rules.summonThresholds.length;wave++){
      g.boss.hp=g.boss.maxHp*rules.summonThresholds[wave];
      g.boss.state='recover';g.boss.timer=5;g.summonCooldown=0;
      g.minions.forEach(m=>m.hp=0);
      g.update(.01,idle);
      assert.equal(g.summonWaves,wave+1);assert.equal(g.summonTime,1.2);
      for(let i=0;i<25;i++)g.update(.05,idle);
      assert.equal(g.minions.filter(m=>m.hp>0).length,rules.minions);
    }
    g.minions.forEach(m=>m.hp=0);g.boss.hp=1;g.summonCooldown=0;
    g.boss.state='recover';g.boss.timer=5;g.update(.05,idle);
    assert.equal(g.summonTime,0);assert.equal(g.summonWaves,rules.summonThresholds.length);
  }
});
