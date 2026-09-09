import { game } from "../game/simulation";
import "./ExpeditionHud.css";
export function ExpeditionHud() {
  return (
    <div className="expedition-hud" aria-label="远征背包">
      <span className="field-coins" aria-label={`金币 ${game.coins}`}>
        <i aria-hidden="true">¤</i> {game.coins}
      </span>
      <button
        aria-label={`使用回复药，剩余 ${game.potions} 瓶`}
        disabled={game.potions === 0 || game.hp >= 3}
        onClick={() => game.usePotion()}
      >
        回复药 {game.potions}/3 <kbd>H</kbd>
      </button>
      {game.zone === "grounds" && game.z > 35 && (
        <span className="field-route">
          白宫 ↑ {Math.round(Math.hypot(game.x, game.z + 13) / 1.4)} m
        </span>
      )}
    </div>
  );
}
