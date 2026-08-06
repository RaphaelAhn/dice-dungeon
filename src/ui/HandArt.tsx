import './HandArt.css'

/**
 * 손. 이미지 없이 인라인 SVG 로 그린다.
 *
 * 전에는 둥근 덩어리에 선을 하나 그어 손바닥이라 했는데, 그러면 손이 아니라
 * 손가락 하나로 보였다. 손이라는 것을 알리려면 손가락이 여러 개 보여야 하고,
 * 무엇보다 엄지가 따로 나와 있어야 한다 — 엄지가 손을 손으로 만든다.
 *
 * 손등을 위에서 본 모습이고 손가락은 오른쪽을 향한다. 왼손은 그대로,
 * 오른손은 좌우로 뒤집어 쓴다(CSS scale).
 */
export default function HandArt({ side }: { side: 'left' | 'right' }) {
  return (
    <svg
      className={`hand hand--${side}`}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
    >
      {/*
        ⚠ 그리는 순서가 곧 겹치는 순서다. 손등을 먼저 깔고 그 위에 손가락과
          엄지를 올린다. 반대로 두면 손등이 엄지를 덮어 손이 벙어리장갑이 된다.
      */}

      {/* 손등 */}
      <rect className="hand__palm" x="10" y="16" width="42" height="54" rx="14" />

      {/*
        손가락 넷. 길이를 서로 다르게 둔다 — 같은 길이로 맞추면 빗처럼 보인다.
        가운데가 제일 길고 새끼가 제일 짧다.
      */}
      <g className="hand__fingers">
        <rect x="44" y="17" width="36" height="12" rx="6" />
        <rect x="44" y="30" width="43" height="12" rx="6" />
        <rect x="44" y="43" width="40" height="12" rx="6" />
        <rect x="44" y="56" width="32" height="11" rx="5.5" />
      </g>

      {/* 엄지 — 손등 아래로 벌어져 나온다. 이것이 있어야 손으로 읽힌다. */}
      <rect className="hand__thumb" x="20" y="66" width="38" height="15" rx="7.5" />

      {/* 관절 그늘. 손등이 밋밋하면 판자처럼 보인다. */}
      <path className="hand__knuckle" d="M46 23v6M46 36v6M46 49v6" />
    </svg>
  )
}
