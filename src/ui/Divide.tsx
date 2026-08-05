import { useEffect, useState } from 'react'
import { PORTIONS, type Portion } from '../core/divide'
import { STAT_LABEL, type Stats } from '../core/character'
import type { Shape } from '../core/character'
import CharacterSprite from './CharacterSprite'
import { play } from './sound'
import './Divide.css'

/**
 * 분할 — 숙성이 끝난 반죽을 피자 한 판 크기로 떼어낸다. 판의 시작이다.
 *
 * 숙성은 주사위가 굴려 준 것을 받기만 했다. 여기서는 처음으로 사람이 고른다.
 * 그리고 되돌릴 수 없다 — 몇 그램을 뗐는지가 자리 수와 몸을 통째로 정한다.
 */
export default function Divide({
  shape,
  name,
  onDone,
}: {
  shape: Shape
  name: string
  onDone: (portion: Portion) => void
}) {
  const [cursor, setCursor] = useState(1)
  const picked = PORTIONS[cursor]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        const d = e.key === 'ArrowLeft' ? -1 : 1
        setCursor((c) => (c + d + PORTIONS.length) % PORTIONS.length)
        play('move')
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        play('select')
        onDone(PORTIONS[cursor].id)
      } else if (e.key >= '1' && e.key <= String(PORTIONS.length)) {
        e.preventDefault()
        play('select')
        onDone(PORTIONS[Number(e.key) - 1].id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cursor, onDone])

  return (
    <div className="dv">
      <header className="dv__head">
        <h2>반죽 분할</h2>
        <p>
          숙성이 끝난 반죽을 <b>한 판 크기</b>로 떼어냅니다. 뗀 무게가 자리 수를 정합니다.
        </p>
      </header>

      <div className="dv__dough">
        <CharacterSprite shape={shape} scale={0.85} />
        <b className="dv__name">{name}</b>
      </div>

      <div className="dv__cards">
        {PORTIONS.map((p, i) => (
          <button
            key={p.id}
            className={i === cursor ? 'dv__card is-on' : 'dv__card'}
            aria-pressed={i === cursor}
            onClick={() => {
              // 고른 것이 커서와 다르면 먼저 옮겨 보여 주고, 같으면 확정한다.
              if (i !== cursor) {
                setCursor(i)
                play('move')
              } else {
                play('select')
                onDone(p.id)
              }
            }}
          >
            <span className="dv__no">{i + 1}</span>
            <span className="dv__label">{p.label}</span>
            <b className="dv__grams">{p.grams}g</b>
            <span className="dv__cm">지름 {p.cm}cm</span>
            <span className="dv__slots">
              재료 자리 <b>{p.slots}</b>
            </span>
            <Diff gain={p.gain} />
          </button>
        ))}
      </div>

      <p className="dv__desc">{picked.desc}</p>

      <footer className="dv__foot">
        <button className="dv__go" onClick={() => { play('select'); onDone(picked.id) }}>
          {picked.grams}g 으로 떼어내기 →
        </button>
        <p className="dv__hint">← → 고르기 · Enter 결정 · 숫자키 바로 고르기</p>
      </footer>
    </div>
  )
}

/** 분할이 몸을 어떻게 바꾸는지. 고르기 전에 보여야 고를 수 있다. */
function Diff({ gain }: { gain: Partial<Stats> }) {
  const rows = (Object.keys(gain) as (keyof Stats)[]).filter((k) => gain[k])
  if (rows.length === 0) return null
  return (
    <span className="dv__diff">
      {rows.map((k) => (
        <em key={k} className={(gain[k] ?? 0) > 0 ? 'is-up' : 'is-down'}>
          {STAT_LABEL[k]} {(gain[k] ?? 0) > 0 ? `+${gain[k]}` : gain[k]}
        </em>
      ))}
    </span>
  )
}
