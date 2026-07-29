import './Dice.css'

/** 주사위 눈 1~6 의 점 위치 (3x3 그리드 인덱스) */
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

export default function Dice({
  face,
  size = 72,
  /** 타이틀 장식용 좌우 흔들림. 실제로 굴릴 때는 끈다. */
  idle = false,
  /** 굴러가는 중 — 흔들림을 빠르게 바꾼다 */
  rolling = false,
}: {
  face: number
  size?: number
  idle?: boolean
  rolling?: boolean
}) {
  const cls = ['dice', idle && 'dice--idle', rolling && 'dice--rolling'].filter(Boolean).join(' ')
  return (
    <div
      className={cls}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`주사위 ${face}`}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={PIPS[face].includes(i) ? 'pip on' : 'pip'} />
      ))}
    </div>
  )
}
