import { getAudioSettings } from "../game/audioSettings";
import { updateAudioSettings } from "../game/audio";
import {
  getLanguage,
  languages,
  setLanguage,
  t,
  type Language,
} from "../game/i18n";
import { CameraSettings } from "./CameraSettings";
import { MusicSettings } from "./MusicSettings";
export function SettingsPanel() {
  const audio = getAudioSettings();
  return (
    <div className="settings-panel">
      <label className="setting-row">
        {t("语言")}
        <select
          aria-label={t("语言")}
          value={getLanguage()}
          onChange={(e) => setLanguage(e.target.value as Language)}
        >
          {Object.entries(languages).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className="setting-row">
        {t("总声音")}
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
