import { useEffect } from 'react'
import { CODEX_TOTAL } from '../core/codex'
import CharacterSprite from './CharacterSprite'
import { GRADE_META } from '../core/pizza'
import type { Run } from '../core/run'
import './Result.css'

export type ResultKind = 'lose' | 'timeout' | 'clear'

const COPY: Record<ResultKind, { title: string; line: string }> = {
  // 규칙 2 — 시간이 남아 있어도 끝이다
  lose: { title: '반죽이 무너졌다', line: '도우가 버티지 못했습니다.' },
  // 규칙 1 — 살아 있어도 끝이다
  timeout: { title: '타 버렸다', line: '제한 시간 안에 끝내지 못했습니다.' },
  clear: { title: '완성', line: '피자가 구워졌습니다.' },
}

/*
 * 완성했을 때 터지는 조각들. 이미지 없이 색 네모를 뿌린다.
 *
 * 자리·색·기울기·속도를 미리 정해 두고 배열로 들고 있는다 — 그릴 때마다
 * 난수를 새로 뽑으면 리렌더될 때 조각이 순간이동한다.
 * 화면 위쪽에서 시작해 아래로 떨어지며 돈다.
 */
const PIECES = Array.from({ length: 40 }, (_, i) => {
  // 고정 시드로 흩는다. 매번 같아도 한 판에 한 번 보는 연출이라 티가 안 난다.
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1
  return {
    left: r(1) * 100,
    hue: ['var(--accent)', 'var(--cheese)', 'var(--sky)', '#e08a72', '#f0cb72'][i % 5],
    delay: r(2) * 2.2,
    dur: 2.4 + r(3) * 1.8,
    drift: (r(4) - 0.5) * 140,
    spin: 360 + r(5) * 720,
    w: 6 + r(6) * 6,
    h: 9 + r(7) * 8,
  }
})

function Confetti() {
  return (
    <div className="rs__party" aria-hidden="true">
      {PIECES.map((p, i) => (
        <i
          key={i}
          style={{
            left: `${p.left}%`,
            background: p.hue,
            width: p.w,
            height: p.h,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            ['--drift' as string]: `${p.drift}px`,
            ['--spin' as string]: `${p.spin}deg`,
          }}
        />
      ))}
    </div>
  )
}

export default function Result({
  kind,
  run,
  madeName,
  found,
  onBack,
}: {
  kind: ResultKind
  run: Run
  /** 완성한 피자의 전체 이름. 실패하면 빈 문자열 */
  madeName: string
  /** 도감에 모은 종 수 */
  found: number
  onBack: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault()
        onBack()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBack])

  const c = COPY[kind]
  return (
    <div className={`rs rs--${kind}`}>
      {kind === 'clear' && <Confetti />}
      <div className="rs__dough">
        <CharacterSprite
          shape={run.shape}
          scale={1.1}
          toppings={run.toppings}
          mood={kind === 'clear' ? 'win' : 'lose'}
        />
      </div>

      <h2 className="rs__title">{c.title}</h2>
      <p className="rs__line">{c.line}</p>

      <dl className="rs__stats">
        <div>
          <dt>도달</dt>
          <dd>1-{run.stage}</dd>
        </div>
        <div>
          <dt>완성도</dt>
          <dd>{run.pizza ? GRADE_META[run.pizza.grade].label : '굽기 전'}</dd>
        </div>
        <div>
          <dt>토핑</dt>
          <dd>{run.toppings.length}</dd>
        </div>
      </dl>

      {madeName && (
        <p className="rs__piece">
          <b className="rs__made">{madeName}</b>
          <span className="rs__codex">
            도감 {found} / {CODEX_TOTAL} 종
          </span>
        </p>
      )}

      <button className="rs__btn" onClick={onBack}>
        타이틀로 →
      </button>
      <p className="rs__hint">Enter</p>
    </div>
  )
}
