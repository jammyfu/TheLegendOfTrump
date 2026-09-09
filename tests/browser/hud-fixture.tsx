// Real HUD rendered without WebGL for deterministic layout regression tests.
import React from 'react';
import {createRoot} from 'react-dom/client';
import {Hud} from '../../src/components/Hud';
import {game} from '../../src/game/simulation';
import '../../src/styles.css';
import '../../src/components/GameMenus.css';
import.meta.glob('../../src/components/AdventureTheme.css', {eager:true});
import '../../src/components/RelicTypography.css';
game.phase='playing';game.toast='获得回复药';game.toastTime=60;
game.bowUnlocked=true;game.weapon='bow';
Object.defineProperty(game,'prompt',{get:()=> '打开宝箱'});
window.__game=game;
const root=createRoot(document.getElementById('root')!);
const render=()=>root.render(<div className="game"><Hud/></div>);
render();
window.addEventListener('hud-battle',()=>{game.zone='office';game.boss.active=true;game.boss.hp=game.boss.maxHp;game.chargeTime=.6;render();});
