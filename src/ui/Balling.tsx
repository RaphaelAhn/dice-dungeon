import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BALL_META,
  ballOf,
  TENSION_GOOD_FROM,
  TENSION_TORN_FROM,
} from '../core/forming'
import CharacterSprite from './CharacterSprite'
import { play } from './sound'
import './Balling.css'

/** 장력이 0 에서 100 까지 차는 데 걸리는 시간 ⚠ 짧으면 운, 길면 지루하다 */
const FILL_MS = 1700

/**
 * 둥글리기 — 잘린 면을 아래로 모으고 표면이 팽팽해질 때까지 굴린다.
 *
 * 고르는 게 아니라 멈추는 단계다. 분할에서 이미 카드를 골랐으니 여기서도
 * 카드를 고르면 같은 동작이 두 번이 된다. 손으로 멈추는 일을 하나 두어야
 * '만들고 있다'는 감각이 생긴다.
 *
 * 알맞은 구간을 끝 가까이 둔다 — "조금만 더" 하다가 넘기는 것이 이 단계의
 * 긴장이고, 실제로도 너무 세게 굴리면 찢어진다.
 */
export default function Balling({
  name,
  onDone,
}: {
  name: string
  onDone: (tension: number) => void
}) {
  const [tension, setTension] = useState(0)
  const [stopped, setStopped] = useState(false)
  const started = useRef(0)
  const raf = useRef(0)
  // 두 번 멈추는 일이 없게 막는다. 키와 클릭이 같이 들어올 수 있다.
  const done = useRef(false)

  const stop = useCallback((at: number) => {
    if (done.current) return
    done.current = true
    cancelAnimationFrame(raf.current)
    setTension(at)
    setStopped(true)
    const b = ballOf(at)
    play(b === 'good' ? 'select' : b === 'torn' ? 'hurt' : 'back')
  }, [])

  useEffect(() => {
    started.current = Date.now()
    const loop = () => {
      const t = Math.min(100, ((Date.now() - started.current) / FILL_MS) * 100)
      setTension(t)
      // 끝까지 두면 찢어진다. 아무것도 안 하는 것도 선택이고 대가가 있다.
      if (t >= 100) {
        stop(100)
        return
      }
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf.current)
  }, [stop])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      if (done.current) onDone(tension)
      else stop(tension)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tension, stop, onDone])

  const ball = ballOf(tension)
  const meta = BALL_META[ball]

  return (
    <div className={`bl bl--${ball}`}>
      <header className="bl__head">
        <h2>둥글리기</h2>
        <p>
          {stopped ? (
            <>표면이 이만큼 잡혔습니다.</>
          ) : (
            <>
              표면이 <b>팽팽해질 때</b> 멈추세요. 너무 굴리면 찢어집니다.
            </>
          )}
        </p>
      </header>

      {/*
        굴리는 동작. 손이 도우를 원을 그리듯 밀고, 도우는 그 아래에서 함께 돈다.
        장력이 오를수록 빨라진다 — 표면이 잡혀 갈수록 손이 바빠지는 그림이다.
      */}
      <div className={`bl__dough${stopped ? ' is-stopped' : ''}`}>
        <span className="bl__palm" aria-hidden="true" />
        <span
          className="bl__roller"
          style={{ animationDuration: `${Math.max(0.34, 1.15 - tension / 130)}s` }}
        >
          <CharacterSprite scale={0.85} mood={stopped && ball === 'torn' ? 'hurt' : 'idle'} />
        </span>
        <b className="bl__name">{name}</b>
      </div>

      {/* 장력 막대. 매 프레임 값이 오므로 transition 을 걸지 않는다 — 걸면 안 따라온다. */}
      <div className="bl__gauge" role="img" aria-label={`장력 ${Math.round(tension)}`}>
        <i className="bl__fill" style={{ width: `${tension}%` }} />
        <span className="bl__zone" style={{ left: `${TENSION_GOOD_FROM}%`, width: `${TENSION_TORN_FROM - TENSION_GOOD_FROM}%` }} />
        <b className="bl__num">{Math.round(tension)}</b>
      </div>
      <p className="bl__legend">
        <em className="bl__legend-good">팽팽함</em> 구간에서 멈추면 가스가 갇힙니다
      </p>

      <p className={`bl__verdict${stopped ? ' is-on' : ''}`}>
        {stopped ? (
          <>
            <b>{meta.label}</b> — {meta.desc}
          </>
        ) : (
          ' '
        )}
      </p>

      <footer className="bl__foot">
        {stopped ? (
          <button className="bl__btn bl__btn--go" onClick={() => onDone(tension)}>
            성형으로 →
          </button>
        ) : (
          <button className="bl__btn" onClick={() => stop(tension)}>
            여기서 멈추기
          </button>
        )}
        <p className="bl__hint">Enter / Space · 클릭</p>
      </footer>
    </div>
  )
}
