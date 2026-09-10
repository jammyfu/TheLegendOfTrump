export function GemIcon() {
  return (
    <svg viewBox="0 0 24 32" fill="none" aria-hidden="true">
      <path
        d="M12 1 23 10 17 29 7 31 1 20 6 5Z"
        fill="#88d886"
        stroke="#d4efad"
        strokeWidth="1.5"
      />
      <path d="m12 1 3 11-8 19L1 20 6 5Z" fill="#477e4c" />
      <path d="m12 1 3 11 8-2-6 19-10 2 8-19Z" fill="#9cdd84" />
      <path d="m6 5 6-4 3 11-7 8-7 0Z" fill="#c5eb91" />
    </svg>
  );
}
export function Heart({
  empty = false,
  half = false,
}: {
  empty?: boolean;
  half?: boolean;
}) {
  const filled = !empty && !half;
  return (
    <svg viewBox="0 0 24 22" aria-hidden="true">
      <path
        d="M12 20 2 11V4L6 1h4l2 3 2-3h4l4 3v7Z"
        fill={filled ? "#dc272b" : "#302924"}
        stroke={filled ? "#642020" : "#967343"}
        strokeWidth="1.5"
      />
      {half && (
        <g style={{ clipPath: "inset(0 50% 0 0)" }}>
          <path
            d="M12 20 2 11V4L6 1h4l2 3 2-3h4l4 3v7Z"
            fill="#dc272b"
            stroke="#642020"
            strokeWidth="1.5"
          />
          <path d="M5 5h4v3H5Z" fill="#ff8c75" />
        </g>
      )}
      {filled && <path d="M5 5h4v3H5Z" fill="#ff8c75" />}
    </svg>
  );
}
export function Crest() {
  return (
    <svg className="crest" viewBox="0 0 100 110" fill="none" aria-hidden="true">
      <path
        d="m13 12 37-9 37 9v42c-1 22-20 42-37 51C31 94 14 74 13 54Z"
        fill="var(--ui-navy, #263e42)"
        stroke="#c3a56a"
        strokeWidth="2"
      />
      <path
        d="m20 18 30-7 30 7v35c-1 18-15 35-30 44-16-10-30-28-30-44Z"
        stroke="var(--ui-gold-dim, #967343)"
      />
      <path
        d="m50 21 6 14 15 2-12 10 4 15-13-8-13 8 4-15-12-10 15-2Z"
        fill="#d0b273"
      />
      <path d="M30 73h40M37 80h26" stroke="#c3a56a" strokeWidth="2" />
      <path d="m82 6-7 11M18 6l7 11" stroke="#c3a56a" />
    </svg>
  );
}
import type { ReactNode } from "react";

const glyphs = {
  sword: (
    <>
      <path
        d="m9 15 2-6L20 2l2 2-7 9-6 2Z"
        fill="currentColor"
        fillOpacity=".3"
      />
      <path d="m6 12 6 6M4 20l5-5M3 18l3 3M11 13l9-9" />
    </>
  ),
  bow: (
    <>
      <path
        d="M5 3q20 9 0 18L11 12 5 3Z"
        fill="currentColor"
        fillOpacity=".18"
      />
      <path d="M3 12h19m-4-4 4 4-4 4" />
    </>
  ),
  shield: (
    <>
      <path
        d="m4 4 8-2 8 2v9l-3 5-5 4-5-4-3-5V4Z"
        fill="currentColor"
        fillOpacity=".22"
      />
      <path
        d="m12 6 1.5 3.5 4 .5-3 2.5 1 4-3.5-2-3.5 2 1-4-3-2.5 4-.5Z"
        fill="currentColor"
        stroke="none"
      />
    </>
  ),
  lock: (
    <>
      <path d="M3 8V3h5m8 0h5v5m0 8v5h-5m-8 0H3v-5" />
      <path d="m12 7 5 5-5 5-5-5Z" fill="currentColor" fillOpacity=".22" />
    </>
  ),
  camera: (
    <>
      <path d="M5 4h14l2 4v12H3V8l2-4Z" fill="currentColor" fillOpacity=".14" />
      <path d="M12 4v6m-3-3h6M8 14h8m-4-4v8" />
    </>
  ),
  map: (
    <>
      <path
        d="m2 5 6-3 8 3 6-3v17l-6 3-8-3-6 3V5Z"
        fill="currentColor"
        fillOpacity=".18"
      />
      <path d="M8 2v17m8-14v17m-5-12 2-2 2 2-2 2Z" />
    </>
  ),
  pause: (
    <>
      <path
        d="M5 3h4v18H5zm10 0h4v18h-4Z"
        fill="currentColor"
        fillOpacity=".7"
      />
    </>
  ),
  settings: (
    <>
      <path
        d="m9 2 6 0 1 4 4 1 2 5-2 5-4 1-1 4H9l-1-4-4-1-2-5 2-5 4-1Z"
        fill="currentColor"
        fillOpacity=".16"
      />
      <path d="m12 8 4 4-4 4-4-4Z" />
    </>
  ),
  sound: (
    <>
      <path d="M3 9h4l6-5v16l-6-5H3V9Z" fill="currentColor" fillOpacity=".3" />
      <path d="m16 8 2 4-2 4m4-11 3 7-3 7" />
    </>
  ),
  mute: (
    <>
      <path d="M3 9h4l6-5v16l-6-5H3V9Z" fill="currentColor" fillOpacity=".18" />
      <path d="m17 9 5 6m0-6-5 6" />
    </>
  ),
  jump: (
    <>
      <path d="m5 10 7-7 7 7M12 3v14M4 21h16" />
      <path d="m9 16 3 3 3-3" />
    </>
  ),
  roll: (
    <>
      <path d="m4 8 4-5h10l4 6-3 9-9 3-7-5V9m0 0 5 3m-5-3 1-5" />
      <path
        d="m10 9 5-2 3 5-3 5-6-1-1-4Z"
        fill="currentColor"
        fillOpacity=".25"
      />
    </>
  ),
  fist: (
    <>
      <path d="M5 11V8l2-1 1 2V6l2-1 1 3V5l2-1 1 4V6l2-1 1 5 2 2-1 6-4 3H8l-4-4v-6Z" fill="currentColor" fillOpacity=".22" />
      <path d="M5 11V8l2-1 1 2V6l2-1 1 3V5l2-1 1 4V6l2-1 1 5 2 2-1 6-4 3H8l-4-4v-6ZM8 12h8M8 15h7" />
    </>
  ),
  compass: (
    <>
      <path
        d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"
        fill="currentColor"
        fillOpacity=".24"
      />
      <path d="m12 6 3 6-3 6-3-6Z" fill="currentColor" />
    </>
  ),
  switch: (
    <>
      <path d="M3 7h17m-5-5 5 5-5 5M21 17H4m5-5-5 5 5 5" />
    </>
  ),
  arrow: <path d="M3 12h17m-7-7 7 7-7 7" />,
  close: <path d="m5 5 14 14m0-14L5 19" />,
  book: (
    <>
      <path
        d="M12 5 8 3H2v16h6l4 2 4-2h6V3h-6l-4 2Z"
        fill="currentColor"
        fillOpacity=".16"
      />
      <path d="M12 5v16M5 7h3m-3 4h3m8-4h3m-3 4h3" />
    </>
  ),
  quiver: (
    <>
      <path d="m6 8 11 3-4 11-8-2L6 8Z" fill="currentColor" fillOpacity=".2" />
      <path d="m9 9 2-7 2 3m0 5 3-8 2 3M6 13l9 2" />
    </>
  ),
  spark: (
    <path
      d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"
      fill="currentColor"
      fillOpacity=".65"
    />
  ),
} satisfies Record<string, ReactNode>;

export type GameIconName = keyof typeof glyphs;
/** One angular, engraved icon set for HUD, menus and touch controls. */
export function GameIcon({
  name,
  className = "",
}: {
  name: GameIconName;
  className?: string;
}) {
  return (
    <svg
      className={`game-icon ${className}`}
      data-icon={name}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="miter"
      strokeLinecap="square"
      aria-hidden="true"
      focusable="false"
    >
      {glyphs[name]}
    </svg>
  );
}
