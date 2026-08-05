import { useCallback, useEffect, useRef, useState } from 'react'
import { PORTIONS, portionOf, type Portion } from '../core/divide'
import { STAT_LABEL, type Shape, type Stats } from '../core/character'
import CharacterSprite from './CharacterSprite'
import { play } from './sound'
import './Divide.css'

/**
 * 분할 — 숙성이 끝난 반죽을 피자 한 판 크기로 떼어낸다. 판의 시작이다.
 *
 * 고르지 않고 돌린다. 실제로도 큰 반죽에서 한 덩이를 떼면 딱 떨어지지 않고,
 * 저울에 올려 봐야 몇 그램인지 안다 — 원판은 그 손맛을 옮긴 것이다.
 *
 * 그래서 네 칸이 서로 값어치가 비슷해야 한다. 고를 수 없는 것에 우열이
 * 있으면 뽑기가 곧 벌칙이 된다. 자리 수는 그 자체로 이득이므로 보정이
 * 작은 쪽을 받치고 큰 쪽을 누른다. (divide.ts)
 */

/** 원판이 도는 시간 ⚠ 짧으면 싱겁고 길면 지루하다 */
const SPIN_MS = 2600
/** 돌기 시작할 때의 속도(초당 바퀴 수) */
const SPIN_TURNS = 4.2

export default function Divide({
  shape,
  name,
  onDone,
}: {
  shape: Shape
  name: string
  onDone: (portion: Portion) => void
}) {
  const [angle, setAngle] = useState(0)
  const [phase, setPhase] = useState<'ready' | 'spinning' | 'done'>('ready')
  const [result, setResult] = useState<Portion | null>(null)
  const raf = useRef(0)
  const spun = useRef(false)
  // 마지막으로 딸깍인 칸. 칸을 지날 때마다 소리를 내되 같은 칸에서 두 번 내지 않는다.
  const lastTick = useRef(-1)

  const spin = useCallback(() => {
    if (spun.current) return
    spun.current = true
    setPhase('spinning')
    play('tick')

    /*
     * 어디에 설지를 먼저 정하고, 거기에 맞춰 각도를 만든다.
     * 각도를 굴린 뒤 어디에 섰는지 읽으면 부동소수 반올림 때문에 경계에서
     * 한 칸씩 어긋난다 — 화면과 결과가 다르면 그건 조작으로 보인다.
     */
    const landed = PORTIONS[Math.floor(Math.random() * PORTIONS.length)]
    const idx = PORTIONS.indexOf(landed)
    const slice = 360 / PORTIONS.length
    // 칸 한가운데를 12시(바늘)에 맞춘다. 조금 흔들어 매번 같은 자리에 안 서게 한다.
    const jitter = (Math.random() - 0.5) * slice * 0.55
    const target = 360 * Math.round(SPIN_TURNS) - (idx * slice + slice / 2) + jitter

    const started = Date.now()
    const loop = () => {
      const t = Math.min(1, (Date.now() - started) / SPIN_MS)
      // 뒤로 갈수록 급히 느려진다. 마지막 한 칸을 남기고 조여드는 맛이 여기서 난다.
      const eased = 1 - Math.pow(1 - t, 3.4)
      const a = target * eased
      setAngle(a)

      const cell = Math.floor((((-a % 360) + 360) % 360) / slice)
      if (cell !== lastTick.current) {
        lastTick.current = cell
        if (t < 0.98) play('tick')
      }

      if (t >= 1) {
        setResult(landed.id)
        setPhase('done')
        play('select')
        return
      }
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)
  }, [])

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      if (phase === 'ready') spin()
      else if (phase === 'done' && result) onDone(result)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, result, spin, onDone])

  const got = result ? portionOf(result) : null
  const slice = 360 / PORTIONS.length

  return (
    <div className="dv">
      <header className="dv__head">
        <h2>반죽 분할</h2>
        <p>
          {got ? (
            <>
              <b>{got.grams}g</b> 을 떼어냈습니다. 지름 {got.cm}cm 짜리 한 판입니다.
            </>
          ) : (
            <>큰 반죽에서 한 판 크기를 떼어냅니다. 뗀 무게가 자리 수를 정합니다.</>
          )}
        </p>
      </header>

      <div className="dv__stage">
        <div className="dv__dough">
          <CharacterSprite shape={shape} scale={0.7} />
          <b className="dv__name">{name}</b>
        </div>

        <div className="dv__wheelbox">
          <span className="dv__needle" aria-hidden="true" />
          <div
            className={`dv__wheel${phase === 'spinning' ? ' is-spinning' : ''}`}
            style={{ rotate: `${angle}deg` }}
            role="img"
            aria-label={got ? `${got.label} ${got.grams}그램` : '반죽 저울판'}
          >
            {PORTIONS.map((p, i) => (
              <span
                key={p.id}
                className={`dv__slice dv__slice--${i}${result === p.id ? ' is-won' : ''}`}
                style={{ rotate: `${i * slice + slice / 2}deg` }}
              >
                {/*
                  글자는 판을 따라 눕지 않는다. 칸 각도와 판이 돈 각도를 함께
                  되돌려 언제나 똑바로 선다 — 아래쪽 두 칸이 거꾸로 서면
                  돌아가는 동안 아무것도 못 읽는다.
                */}
                <b style={{ rotate: `${-(i * slice + slice / 2) - angle}deg` }}>
                  {p.label}
                  <em>{p.grams}g</em>
                </b>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 어느 칸이 무엇을 주는지 돌리기 전부터 보인다. 몰라서 놀라는 것과 알고 기다리는 것은 다르다. */}
      <div className="dv__table">
        {PORTIONS.map((p) => (
          <div key={p.id} className={`dv__row${result === p.id ? ' is-won' : ''}`}>
            <b className="dv__row-label">{p.label}</b>
            <span className="dv__row-g">{p.grams}g</span>
            <span className="dv__row-slot">
              자리 <b>{p.slots}</b>
            </span>
            <Diff gain={p.gain} />
          </div>
        ))}
      </div>

      <p className="dv__desc">{got ? got.desc : ' '}</p>

      <footer className="dv__foot">
        {phase === 'done' && result ? (
          <button className="dv__go" onClick={() => onDone(result)}>
            둥글리기로 →
          </button>
        ) : (
          <button className="dv__go" onClick={spin} disabled={phase === 'spinning'}>
            {phase === 'spinning' ? '떼어내는 중…' : '반죽 떼어내기'}
          </button>
        )}
        <p className="dv__hint">Enter / Space</p>
      </footer>
    </div>
  )
}

function Diff({ gain }: { gain: Partial<Stats> }) {
  const keys = (Object.keys(gain) as (keyof Stats)[]).filter((k) => gain[k])
  return (
    <span className="dv__diff">
      {keys.map((k) => (
        <em key={k} className={(gain[k] ?? 0) > 0 ? 'is-up' : 'is-down'}>
          {STAT_LABEL[k]} {(gain[k] ?? 0) > 0 ? `+${gain[k]}` : gain[k]}
        </em>
      ))}
    </span>
  )
}
