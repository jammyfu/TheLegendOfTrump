import { GameIcon } from "./Icons";
import { t } from "../game/i18n";
import { useState } from "react";
import { game } from "../game/simulation";
import {
  DEFAULT_CAMERA,
  type CameraSettings as Settings,
} from "../game/camera";
export function CameraSettings() {
  const [settings, setSettings] = useState(game.cameraSettings);
  const update = (patch: Partial<Settings>) => {
    game.setCamera(patch);
    setSettings({ ...game.cameraSettings });
  };
  return (
    <details className="camera-settings">
      <summary>
        <GameIcon name="camera" />
        {t("视角与鼠标设置")}
      </summary>
      <label>
        {t("镜头距离")}
        <output>{settings.distance.toFixed(1)}</output>
        <input
          aria-label={t("镜头距离")}
          type="range"
          min="5"
          max="14"
          step="0.5"
          value={settings.distance}
          onChange={(e) => update({ distance: Number(e.target.value) })}
        />
      </label>
      <label>
        {t("视野角度")}
        <output>{settings.fov}°</output>
        <input
          aria-label={t("视野角度")}
          type="range"
          min="55"
          max="80"
          step="1"
          value={settings.fov}
          onChange={(e) => update({ fov: Number(e.target.value) })}
        />
      </label>
      <label>
        {t("视角灵敏度")}
        <output>{settings.sensitivity.toFixed(1)}×</output>
        <input
          aria-label={t("视角灵敏度")}
          type="range"
          min="0.4"
          max="2"
          step="0.1"
          value={settings.sensitivity}
          onChange={(e) => update({ sensitivity: Number(e.target.value) })}
        />
      </label>
      <label className="camera-checkbox">
        <input
          type="checkbox"
          checked={settings.invertY}
          onChange={(e) => update({ invertY: e.target.checked })}
        />
        {t("反转垂直视角")}
      </label>
      <label className="camera-checkbox">
        <input
          type="checkbox"
          checked={settings.shake}
          onChange={(e) => update({ shake: e.target.checked })}
        />
        {t("命中镜头反馈")}
      </label>
      <p>{t("滚轮可调整距离。手机竖屏自动扩大视野，设置保存在本机。")}</p>
      <button className="secondary" onClick={() => update(DEFAULT_CAMERA)}>
        {t("恢复默认视角")}
      </button>
    </details>
  );
}
