import { useEffect, useState } from 'react'
import './PizzaMark.css'

/** 토핑이 놓이는 자리 — 도우 중심 기준 극좌표(각도, 반지름 비율) */
const SPOTS: [number, number][] = [
  [20, 0.44],
  [95, 0.5],
  [160, 0.38],
  [225, 0.48],
  [290, 0.42],
  [340, 0.2],
]

/**
 * 타이틀 장식. 도우에 토핑이 하나씩 올라갔다가 처음부터 다시 시작한다.
 * 게임의 한 줄 요약을 그림으로 보여 준다 — 모아서 올린다.
 */
export default function PizzaMark({ size = 96 }: { size?: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setCount((c) => (c + 1) % (SPOTS.length + 2)), 700)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="pm" style={{ width: size, height: size }} role="img" aria-label="피자 도우">
      <div className="pm__crust" />
      <div className="pm__sauce" />
      {SPOTS.slice(0, count).map(([deg, r], i) => {
        const rad = (deg * Math.PI) / 180
        return (
          <i
            key={i}
            className={`pm__top pm__top--${i % 3}`}
            style={{
              left: `${50 + Math.cos(rad) * r * 100}%`,
              top: `${50 + Math.sin(rad) * r * 100}%`,
            }}
          />
        )
      })}
    </div>
  )
}
