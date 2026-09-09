import { useEffect, useState } from "react";
import "./EndingReward.css";

export function EndingReward() {
  const [continued, setContinued] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setContinued(true), 2200);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div className="ending-reward" aria-live="polite">
      <p className="ending-reward-label">获得收藏 · FC 游戏机</p>
      <svg
        className="ending-console"
        viewBox="0 0 300 140"
        role="img"
        aria-label="获得红白 FC 游戏机及手柄"
      >
        <ellipse cx="150" cy="126" rx="115" ry="8" fill="#000" opacity=".25" />
        <path
          d="M45 52 64 24h170l20 28v56H45Z"
          fill="#eee2bf"
          stroke="#674e32"
          strokeWidth="3"
        />
        <path d="M45 83h209v25H45Z" fill="#8d2436" />
        <path d="M96 32h113v33H96Z" fill="#992e40" />
        <path d="M109 40h86v12h-86Z" fill="#272730" />
        <path
          d="M122 18h62v27h-62Z"
          fill="#b69250"
          stroke="#694e2f"
          strokeWidth="2"
        />
        <path d="M132 23h42v14h-42Z" fill="#ece0ab" />
        <rect x="57" y="68" width="26" height="10" rx="2" fill="#b63b43" />
        <rect x="216" y="68" width="23" height="10" rx="2" fill="#b63b43" />
        <path
          d="M90 111q-24 22-45-5m158 3q31 20 53-3"
          fill="none"
          stroke="#2e2730"
          strokeWidth="3"
        />
        {[15, 205].map((x) => (
          <g key={x} transform={`translate(${x} 90)`}>
            <rect
              width="80"
              height="35"
              rx="5"
              fill="#8d2436"
              stroke="#542430"
              strokeWidth="2"
            />
            <rect x="5" y="4" width="70" height="26" rx="2" fill="#c6aa6b" />
            <path d="M14 10h8v6h6v7h-6v6h-8v-6H8v-7h6Z" fill="#302b2b" />
            <circle cx="58" cy="20" r="5" fill="#8e2536" />
            <circle cx="70" cy="16" r="5" fill="#8e2536" />
            <rect x="34" y="22" width="7" height="3" fill="#38312d" />
          </g>
        ))}
      </svg>
      <div className="ending-continued" data-visible={continued}>
        {continued ? "To Be Comtinued…" : "收藏已收入冒险行囊"}
      </div>
    </div>
  );
}
