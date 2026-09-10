import { GameIcon } from "./Icons";
import { game } from "../game/simulation";
import { getAudioSettings } from "../game/audioSettings";
import { updateAudioSettings } from "../game/audio";
import {
  getLanguagePreference,
  languages,
  setLanguage,
  t,
  type LanguagePreference,
} from "../game/i18n";
import { CameraSettings } from "./CameraSettings";
import { MusicSettings } from "./MusicSettings";
export function SettingsPanel() {
  const audio = getAudioSettings();
  return (
    <div className="settings-panel">
      <label className="setting-row">
        {t("难度")}
        <select aria-label={t("难度")} aria-describedby="difficulty-note" value={game.selectedDifficulty}
          onChange={(event) => game.selectDifficulty(event.target.value === "hard" ? "hard" : "normal")}>
          <option value="normal">{t("普通")}</option>
          <option value="hard" disabled={!game.completedCampaign}>
            {t(game.completedCampaign ? "高难度" : "高难度 · 通关后解锁")}
          </option>
        </select>
      </label>
      <p id="difficulty-note">{t("难度选择在下一次冒险生效。")}</p>
      <label className="setting-row">
        {t("语言")}
        <select
          aria-label={t("语言")}
          value={getLanguagePreference()}
          onChange={(e) => setLanguage(e.target.value as LanguagePreference)}
        >
          <option value="auto">{t("跟随设备语言")}</option>
          {Object.entries(languages).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className="setting-row">
        <span className="setting-label">
          <GameIcon name="sound" />
          {t("总声音")}
        </span>
        <input
          type="checkbox"
          checked={audio.enabled}
          onChange={(e) => updateAudioSettings({ enabled: e.target.checked })}
        />
      </label>
      {(["music", "effects"] as const).map((key) => (
        <label className="setting-volume" key={key}>
          <span>
            {t(key === "music" ? "音乐音量" : "音效音量")}{" "}
            <output>{Math.round(audio[key] * 100)}%</output>
          </span>
          <input
            aria-label={t(key === "music" ? "音乐音量" : "音效音量")}
            type="range"
            min="0"
            max="100"
            step="1"
            value={Math.round(audio[key] * 100)}
            onChange={(e) =>
              updateAudioSettings({ [key]: Number(e.target.value) / 100 })
            }
          />
        </label>
      ))}
      <MusicSettings />
      <CameraSettings />
      <p>{t("所有设置自动保存到本机。")}</p>
    </div>
  );
}
