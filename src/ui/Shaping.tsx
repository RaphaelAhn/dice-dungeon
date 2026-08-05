import { useEffect, useState } from 'react'
import { STAT_LABEL, type Shape, type Stats } from '../core/character'
import { BALL_META, ballOf, canStretch, STRETCHES, type Stretch } from '../core/forming'
import CharacterSprite from './CharacterSprite'
import { play } from './sound'
import './Shaping.css'

/**
 * 성형 — 둥근 도우볼을 피자 크기만큼 넓게 편다.
 *
 * 여기서 둥글리기가 값을 한다. 장력이 모자란 반죽을 얇게 밀면 가운데가
 * 찢어진다 — 고르기 전에 무엇이 막혀 있는지 보여 주므로 운이 아니라 판단이다.
 */
export default function Shaping({
  shape,
  name,
  tension,
  onDone,
}: {
  shape: Shape
  name: string
  tension: number
  onDone: (stretch: Stretch) => void
}) {
  const [cursor, setCursor] = useState(1)
  const picked = STRETCHES[cursor]
  const ok = canStretch(tension, picked.id)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        const d = e.key === 'ArrowLeft' ? -1 : 1
        setCursor((c) => (c + d + STRETCHES.length) % STRETCHES.length)
        play('move')
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        const s = STRETCHES[cursor]
        play(canStretch(tension, s.id) ? 'select' : 'hurt')
        onDone(s.id)
      } else if (e.key >= '1' && e.key <= String(STRETCHES.length)) {
        e.preventDefault()
        const s = STRETCHES[Number(e.key) - 1]
        play(canStretch(tension, s.id) ? 'select' : 'hurt')
        onDone(s.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cursor, tension, onDone])

  const ball = ballOf(tension)

  return (
    <div className="sh">
      <header className="sh__head">
        <h2>도우 성형</h2>
        <p>
          가운데는 얇게, 가장자리는 남깁니다. 얇게 펴려면 <b>장력</b>이 받쳐 줘야 합니다.
        </p>
      </header>

      <div className="sh__dough">
        <CharacterSprite shape={shape} scale={0.8} />
        <b className="sh__name">{name}</b>
        <span className={`sh__tension sh__tension--${ball}`}>
          장력 <b>{Math.round(tension)}</b> · {BALL_META[ball].label}
        </span>
      </div>

      <div className="sh__cards">
        {STRETCHES.map((s, i) => {
          const able = canStretch(tension, s.id)
          return (
            <button
              key={s.id}
              className={`sh__card${i === cursor ? ' is-on' : ''}${able ? '' : ' is-risky'}`}
              aria-pressed={i === cursor}
              onClick={() => {
                if (i !== cursor) {
                  setCursor(i)
                  play('move')
                } else {
                  play(able ? 'select' : 'hurt')
                  onDone(s.id)
                }
              }}
            >
              <span className="sh__no">{i + 1}</span>
              <span className="sh__label">{s.label}</span>
              {/* 막혀 있으면 왜 막혔는지 숫자로 보여 준다. 그래야 판단이 된다. */}
              {able ? (
                <Diff gain={s.gain} />
              ) : (
                <span className="sh__warn">
                  장력 {s.needs} 필요 — 찢어집니다
                </span>
              )}
            </button>
          )
        })}
      </div>

      <p className="sh__desc">{ok ? picked.desc : picked.failDesc || picked.desc}</p>

      <footer className="sh__foot">
        <button
          className={`sh__go${ok ? '' : ' is-risky'}`}
          onClick={() => {
            play(ok ? 'select' : 'hurt')
            onDone(picked.id)
          }}
        >
          {ok ? `${picked.label} 펴기 →` : `${picked.label} 펴기 (찢어짐) →`}
        </button>
        <p className="sh__hint">← → 고르기 · Enter 결정 · 숫자키 바로 고르기</p>
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
