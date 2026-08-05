import { useEffect, useRef, useState } from 'react'
import { BASE_STATS, STAT_META, type Shape, type Stats } from '../core/character'
import { applyFace, DICE, rollDice, type Face } from '../core/dice'
import CharacterSprite from './CharacterSprite'
import { play } from './sound'
import Ferment from './Ferment'
import './DiceRoll.css'

/** 굴러가는 연출 길이. 짧으면 싱겁고 길면 지루하다. */
const ROLL_MS = 1400
/** 굴리는 동안 눈이 바뀌는 간격 */
const TICK_MS = 70

type Phase = 'ready' | 'rolling' | 'done'

export default function DiceRoll({
  shape,
  name,
  onStart,
}: {
  shape: Shape
  name: string
  onStart: (face: Face) => void
}) {
  const [phase, setPhase] = useState<Phase>('ready')
  // 숙성 중 흔들릴 계기 값. 멈추면 결과의 조건으로 고정된다.
  const [gauge, setGauge] = useState({ temp: 4, ferment: 0 })
  const [result, setResult] = useState<Face | null>(null)
  // 리롤 불가가 이 게임의 규칙이다. 연타나 키 중복 입력으로도 두 번 굴러선 안 된다.
  const rolled = useRef(false)
  const timers = useRef<number[]>([])

  // 굴리는 도중 화면을 벗어나도 타이머가 남지 않게 정리한다.
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const roll = () => {
    if (rolled.current) return
    rolled.current = true
    setPhase('rolling')

    const settled = rollDice()
    const started = Date.now()
    // 발효도는 0 에서 결과값까지 차오르고, 온도는 끝까지 흔들린다.
    /*
     * 게이지가 움직일 때마다 딸깍인다. 매 틱마다 내면 너무 촘촘해
     * 지글거리는 소리가 되므로 두 번에 한 번만 낸다.
     */
    let tick = 0
    const spin = setInterval(() => {
      if (tick++ % 2 === 0) play('tick')
      const t = Math.min(1, (Date.now() - started) / ROLL_MS)
      setGauge({
        temp: Math.round(-1 + Math.random() * 12),
        ferment: Math.round(t * DICE[settled].ferment),
      })
    }, TICK_MS)
    const stop = setTimeout(() => {
      clearInterval(spin)
      setGauge({ temp: DICE[settled].temp, ferment: DICE[settled].ferment })
      setResult(settled)
      setPhase('done')
      play('select')
    }, ROLL_MS)
    timers.current.push(spin, stop)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      if (phase === 'ready') roll()
      else if (phase === 'done' && result) onStart(result)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, result, onStart])

  const rolledFace = result ? DICE[result] : null
  const stats = result ? applyFace(result) : BASE_STATS

  return (
    <div className={`dr dr--${phase}`}>
      <header className="dr__head">
        <h2>{phase === 'done' ? '도우 숙성 완료' : '도우 숙성'}</h2>
        <p>
          {phase === 'done' ? (
            <>
              이 반죽으로 <b>1 라운드</b>에 들어갑니다.
            </>
          ) : (
            <>
              숙성은 <b>단 한 번</b>뿐입니다. 다시 할 수 없습니다.
            </>
          )}
        </p>
      </header>

      <div className="dr__stage">
        <div className="dr__char">
          <CharacterSprite shape={shape} scale={0.8} />
          <b className="dr__char-name">{name}</b>
        </div>

        <Ferment temp={gauge.temp} ferment={gauge.ferment} rolling={phase === 'rolling'} />
      </div>

      <section className="dr__result" aria-live="polite">
        {phase === 'ready' && (
          <p className="dr__wait">숙성을 시작해 이 도우의 시작 능력을 정하세요.</p>
        )}
        {phase === 'rolling' && <p className="dr__wait">숙성 중…</p>}
        {phase === 'done' && rolledFace && (
          <>
            <div className="dr__card">
              <span className="dr__style">{rolledFace.favors}</span>
              <h3 className="dr__name">{rolledFace.name}</h3>
              <p className="dr__desc">{rolledFace.desc}</p>
            </div>
            <StatDiff before={BASE_STATS} after={stats} />
          </>
        )}
      </section>

      <footer className="dr__foot">
        {phase !== 'done' ? (
          <button className="dr__btn" onClick={roll} disabled={phase === 'rolling'}>
            {phase === 'rolling' ? '숙성 중…' : '도우 숙성 시작'}
          </button>
        ) : (
          <button className="dr__btn dr__btn--go" onClick={() => result && onStart(result)}>
            1 라운드 시작 →
          </button>
        )}
        <p className="dr__hint">Enter / Space</p>
      </footer>
    </div>
  )
}

/** 주사위가 실제로 무엇을 바꿨는지 눈으로 보여준다. 6번 눈은 증감이 전부 0이다. */
function StatDiff({ before, after }: { before: Stats; after: Stats }) {
  return (
    <ul className="dr__stats">
      {STAT_META.map((s) => {
        const diff = after[s.key] - before[s.key]
        return (
          <li key={s.key} className={diff > 0 ? 'is-up' : ''}>
            <span className="dr__stat-label">{s.label}</span>
            <span className="dr__stat-value">{after[s.key]}</span>
            <span className="dr__stat-diff">{diff > 0 ? `+${diff}` : ''}</span>
          </li>
        )
      })}
    </ul>
  )
}
