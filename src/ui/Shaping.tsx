import { useCallback, useEffect, useRef, useState } from 'react'
import { STAT_LABEL, type Stats } from '../core/character'
import {
  BALL_META,
  ballOf,
  HAND_COUNT,
  stretchFromHits,
  stretchOf,
  type Stretch,
} from '../core/forming'
import CharacterSprite from './CharacterSprite'
import HandArt from './HandArt'
import { play } from './sound'
import './Shaping.css'

/** 손 하나가 나와 있는 시간 ⚠ 짧으면 반사신경 시험, 길면 안 놓친다 */
const WINDOW_MS = 700
/** 손과 손 사이 쉬는 틈 */
const GAP_MS = 190

type Side = 'left' | 'right'
type Beat = { side: Side; hit: boolean | null }

/**
 * 성형 — 양손으로 도우를 번갈아 밀어 넓힌다.
 *
 * 고르는 게 아니라 치는 단계다. 왼손·오른손이 번갈아 나오고 제때 눌러야
 * 그쪽으로 도우가 고르게 늘어난다. 놓치면 그 자리가 얇아지고, 많이 놓치면
 * 가운데가 찢어진다 — 실제로도 한쪽만 밀거나 급히 밀면 그렇게 된다.
 *
 * 장력이 낮으면 한 번 더 쳐야 같은 결과가 나온다. 둥글리기를 대충 하면
 * 반죽이 뻣뻣해 잘 안 늘어난다는 것을 여기서 갚는다.
 */
export default function Shaping({
  name,
  tension,
  onDone,
}: {
  name: string
  tension: number
  onDone: (stretch: Stretch) => void
}) {
  const [beats, setBeats] = useState<Beat[]>([])
  const [at, setAt] = useState(-1)
  const [phase, setPhase] = useState<'ready' | 'playing' | 'done'>('ready')
  const [width, setWidth] = useState(0)
  const timers = useRef<number[]>([])
  // 한 박에 두 번 치는 것을 막는다. 키와 클릭이 같이 들어올 수 있다.
  const answered = useRef(false)

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const start = useCallback(() => {
    if (phase !== 'ready') return
    /*
     * 손 순서를 미리 뽑아 둔다. 그때그때 뽑으면 이미 지나간 박이 리렌더될 때
     * 손이 바뀌어 보인다 — 놓친 게 왼손이었는지 오른손이었는지가 흔들린다.
     */
    const seq: Beat[] = Array.from({ length: HAND_COUNT }, (_, i) => ({
      // 번갈아 나오되 가끔 같은 손이 두 번 — 그래야 손만 보고 누르게 된다
      side: (Math.random() < 0.28 ? i % 2 === 1 : i % 2 === 0) ? 'left' : 'right',
      hit: null,
    }))
    setBeats(seq)
    setPhase('playing')

    seq.forEach((_, i) => {
      timers.current.push(
        setTimeout(() => {
          answered.current = false
          setAt(i)
          play('move')
        }, i * (WINDOW_MS + GAP_MS)),
      )
      // 창이 닫히는 순간. 안 쳤으면 놓친 것으로 굳힌다.
      timers.current.push(
        setTimeout(
          () => {
            setBeats((b) => b.map((x, k) => (k === i && x.hit === null ? { ...x, hit: false } : x)))
            if (i === seq.length - 1) {
              setAt(-1)
              setPhase('done')
            }
          },
          i * (WINDOW_MS + GAP_MS) + WINDOW_MS,
        ),
      )
    })
  }, [phase])

  const strike = useCallback(
    (side: Side) => {
      if (phase !== 'playing' || at < 0 || answered.current) return
      answered.current = true
      const ok = beats[at]?.side === side
      setBeats((b) => b.map((x, k) => (k === at ? { ...x, hit: ok } : x)))
      if (ok) {
        // 제대로 칠 때마다 도우가 조금씩 넓어진다. 눈으로 보이는 보상이다.
        setWidth((w) => w + 1)
        play('guard')
      } else {
        play('back')
      }
    },
    [phase, at, beats],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === 'ready' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        start()
      } else if (phase === 'playing' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault()
        strike(e.key === 'ArrowLeft' ? 'left' : 'right')
      } else if (phase === 'done' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        onDone(result)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const hits = beats.filter((b) => b.hit === true).length
  const result = stretchFromHits(hits, tension)
  const spec = stretchOf(result)
  const ball = ballOf(tension)

  return (
    <div className={`sh sh--${phase}`}>
      <header className="sh__head">
        <h2>도우 성형</h2>
        <p>
          {phase === 'done' ? (
            <>
              {HAND_COUNT}번 중 <b>{hits}번</b> 제대로 밀었습니다.
            </>
          ) : (
            <>
              나오는 손을 <b>제때</b> 누르세요. 놓칠수록 얇아지고, 많이 놓치면 찢어집니다.
            </>
          )}
        </p>
      </header>

      <span className={`sh__tension sh__tension--${ball}`}>
        장력 <b>{Math.round(tension)}</b> · {BALL_META[ball].label}
        {ball !== 'good' && <em> — 뻣뻣해서 한 번 더 밀어야 합니다</em>}
      </span>

      {/* 양손이 도우를 사이에 두고 마주 본다. 누르면 안쪽으로 밀고 들어간다. */}
      <div className="sh__table">
        <button
          className={`sh__hand sh__hand--l${at >= 0 && beats[at]?.side === 'left' ? ' is-on' : ''}`}
          onClick={() => strike('left')}
          disabled={phase !== 'playing'}
          aria-label="왼손"
        >
          <HandArt side="left" />
          <b>←</b>
        </button>

        <div className="sh__dough" style={{ scale: `${1 + width * 0.045} ${1 - width * 0.018}` }}>
          <CharacterSprite scale={0.8} />
        </div>

        <button
          className={`sh__hand sh__hand--r${at >= 0 && beats[at]?.side === 'right' ? ' is-on' : ''}`}
          onClick={() => strike('right')}
          disabled={phase !== 'playing'}
          aria-label="오른손"
        >
          <HandArt side="right" />
          <b>→</b>
        </button>
      </div>
      <b className="sh__name">{name}</b>

      {/* 몇 번째 박인지, 무엇을 놓쳤는지 남는다 */}
      <div className="sh__beats">
        {(beats.length ? beats : Array.from({ length: HAND_COUNT }, () => null)).map((b, i) => (
          <span
            key={i}
            className={`sh__beat${b?.hit === true ? ' is-hit' : ''}${
              b?.hit === false ? ' is-miss' : ''
            }${i === at ? ' is-now' : ''}`}
          />
        ))}
      </div>

      <p className="sh__desc">{phase === 'done' ? spec.desc : ' '}</p>

      <footer className="sh__foot">
        {phase === 'ready' && (
          <button className="sh__go" onClick={start}>
            펴기 시작
          </button>
        )}
        {phase === 'playing' && <button className="sh__go" disabled>펴는 중…</button>}
        {phase === 'done' && (
          <button className="sh__go" onClick={() => onDone(result)}>
            <span className={`sh__result sh__result--${result}`}>{spec.label}</span>
            <Diff gain={spec.gain} />
            <em>1 라운드로 →</em>
          </button>
        )}
        <p className="sh__hint">← → 또는 손 클릭</p>
      </footer>
    </div>
  )
}

function Diff({ gain }: { gain: Partial<Stats> }) {
  const keys = (Object.keys(gain) as (keyof Stats)[]).filter((k) => gain[k])
  return (
    <span className="sh__diff">
      {keys.map((k) => (
        <em key={k} className={(gain[k] ?? 0) > 0 ? 'is-up' : 'is-down'}>
          {STAT_LABEL[k]} {(gain[k] ?? 0) > 0 ? `+${gain[k]}` : gain[k]}
        </em>
      ))}
    </span>
  )
}
