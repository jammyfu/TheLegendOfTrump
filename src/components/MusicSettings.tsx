import { getMusicSettings, setMusicSource, soundtrackAlbum } from "../game/music";
export function MusicSettings() {
  const { source, notice } = getMusicSettings();
  return <div className="music-settings">
    <div className="music-options" role="group" aria-label="配乐来源">
      <button className="secondary" aria-pressed={source === "suno"} onClick={() => setMusicSource("suno")}>Suno 原创</button>
      <button className="secondary" aria-pressed={source === "ocarina"} onClick={() => setMusicSource("ocarina")}>时之笛原版</button>
    </div>
    <dl>{(source === "ocarina" ? [
      ["标题", "Title Theme"], ["探索", "Hyrule Field Main Theme"],
      ["交战", "Boss Battle"], ["直升机开场", "Battle · 15 秒"]
    ] : [["标题", "Dawn Arrival"], ["探索", "Fields of Wonder"], ["交战", "Iron Tempest"], ["直升机开场", "Iron Tempest · 15 秒"]]).map(([scene, name]) => <div key={scene}><dt>{scene}</dt><dd>{name}</dd></div>)}</dl>
    <p>选择自动保存。交战时切换战斗配乐，脱战后恢复探索；跳过片头会结束开场音乐。</p>
    {source === "ocarina" && <p>原版配乐已保存在本地。<a href={soundtrackAlbum} target="_blank" rel="noreferrer">查看原声专辑 ↗</a></p>}
    {notice && <p role="status">{notice}</p>}
  </div>;
}
