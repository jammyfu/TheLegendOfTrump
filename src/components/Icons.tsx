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
export function Heart({ empty = false }: { empty?: boolean }) {
  return (
    <svg viewBox="0 0 24 22" aria-hidden="true">
      <path
        d="M12 20 2 11V4L6 1h4l2 3 2-3h4l4 3v7Z"
        fill={empty ? "#344748" : "#dc272b"}
        stroke={empty ? "#7d8980" : "#642020"}
        strokeWidth="1.5"
      />
      <path d="M5 5h4v3H5Z" fill={empty ? "transparent" : "#ff8c75"} />
    </svg>
  );
}
export function Crest() {
  return (
    <svg className="crest" viewBox="0 0 100 110" fill="none" aria-hidden="true">
      <path
        d="m13 12 37-9 37 9v42c-1 22-20 42-37 51C31 94 14 74 13 54Z"
        fill="#263e42"
        stroke="#c3a56a"
        strokeWidth="2"
      />
      <path
        d="m20 18 30-7 30 7v35c-1 18-15 35-30 44-16-10-30-28-30-44Z"
        stroke="#728875"
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
