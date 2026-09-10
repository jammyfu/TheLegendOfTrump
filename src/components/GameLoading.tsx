import { useSyncExternalStore } from "react";
import { getLoadingState, subscribeLoading } from "../game/loading";
import { t } from "../game/i18n";
import "./GameLoading.css";
import { getZoneLoading, subscribeZoneLoading } from "../game/zoneLoading";

export function GameLoading() {
  const loading = useSyncExternalStore(subscribeLoading, getLoadingState);
  const destination = useSyncExternalStore(subscribeZoneLoading, getZoneLoading);
  if (!loading.active && !destination) return null;
  const label = t(
    {
      resources: "正在读取游戏资源",
      scene: "正在准备场景首帧",
      interface: "正在准备标题画面",
      ready: "准备就绪",
      error: "加载失败，请检查网络后重试",
    }[loading.stage],
  );
  return (
    <aside
      className="game-loading"
      aria-label={t("正在加载游戏")}
      data-stage={loading.stage}
    >
      {/* Static vector architecture: no image request, decode or full-screen filter. */}
      <svg className="loading-estate" viewBox="0 0 1000 360" aria-hidden="true">
        <g fill="currentColor">
          <path
            d="M65 315V190H320V130L500 55L680 130V190H935V315ZM305 322H695V334H305ZM270 341H730V352H270Z"
            opacity=".2"
          />
          <path d="M325 140L500 68L675 140ZM340 150H660V166H340ZM330 304H670V316H330Z" />
          {[355, 410, 465, 520, 575, 630].map((x) => (
            <path key={x} d={`M${x} 174h16v120h-16z`} />
          ))}
          {[100, 155, 210, 265, 710, 765, 820, 875].map((x) => (
            <path
              key={x}
              d={`M${x} 215h25v34h-25zm0 53h25v34h-25z`}
              opacity=".6"
            />
          ))}
          <path d="M498 55V12H502V55ZM504 13H551L536 26L551 39H504Z" />
        </g>
      </svg>
      <div className="loading-content">
        <span className="loading-kicker">THE LEGEND AWAKENS</span>
        <div className="loading-crest" aria-hidden="true">
          ✦
        </div>
        <strong>THE LEGEND OF TRUMP</strong>
        <div className="loading-status" role="status" aria-live="polite">
          <span>{destination ? t(destination === "office" ? "正在进入白宫" : "正在返回南草坪") : label}</span>
          {!loading.error && !destination && (
            <small>{t(`已完成 ${loading.loaded} 项加载任务`)}</small>
          )}
        </div>
        {!loading.error ? (
          <div
            className="loading-track"
            role="progressbar"
            aria-label={label}
            aria-valuetext={label}
          >
            <i />
          </div>
        ) : (
          <button onClick={() => location.reload()}>{t("重新加载")}</button>
        )}
      </div>
    </aside>
  );
}
