import type { Difficulty } from './difficulty';

export const BOSS_BALANCE = {
  normal: { hp:18, attackPause:1.65, minions:2, summonThresholds:[2/3,1/3] },
  hard: { hp:36, attackPause:.3, minions:4, summonThresholds:[.75,.5,.25] },
} satisfies Record<Difficulty, {hp:number;attackPause:number;minions:number;summonThresholds:number[]}>;
