import { useEffect, useState } from 'react'
import { loadPieces, PUZZLE_TOTAL } from '../core/save'
import './TitleScreen.css'

export type TitleAction = 'start' | 'puzzle' | 'howto'

const MENU: { id: TitleAction; label: string }[] = [
  { id: 'start', label: '게임 시작' },
  { id: 'puzzle', label: '퍼즐 조각' },
  { id: 'howto', label: '조작 안내' },
]

/** 주사위 눈 1~6 의 점 좌표 (3x3 그리드 인덱스) */
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

function Dice({ face }: { face: number }) {
  return (
    <div className="dice" aria-label={`주사위 ${face}`}>
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={PIPS[face].includes(i) ? 'pip on' : 'pip'} />
      ))}
    </div>
  )
}

export default function TitleScreen({ onSelect }: { onSelect: (a: TitleAction) => void }) {
  const [cursor, setCursor] = useState(0)
  const [face, setFace] = useState(6)
  const pieces = loadPieces()

  // 타이틀 장식용 주사위. 계속 굴러가지만 게임 로직과는 무관하다.
  useEffect(() => {
    const t = setInterval(() => setFace(1 + Math.floor(Math.random() * 6)), 900)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        const delta = e.key === 'ArrowUp' ? -1 : 1
        setCursor((c) => (c + delta + MENU.length) % MENU.length)
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSelect(MENU[cursor].id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cursor, onSelect])

  return (
    <div className="title">
      <div className="title__top">
        <Dice face={face} />
        <h1 className="title__logo">
          주사위 <span>던전</span>
        </h1>
        <p className="title__tag">한 번의 주사위, 열 개의 스테이지</p>
      </div>

      <nav className="title__menu">
        {MENU.map((m, i) => (
          <button
            key={m.id}
            className={i === cursor ? 'menu__item is-on' : 'menu__item'}
            onMouseEnter={() => setCursor(i)}
            onClick={() => onSelect(m.id)}
          >
            <span className="menu__mark">{i === cursor ? '▶' : ''}</span>
            {m.label}
          </button>
        ))}
      </nav>

      <footer className="title__foot">
        <span className="title__pieces">
          퍼즐 조각 <b>{pieces}</b> / {PUZZLE_TOTAL}
        </span>
        <span className="title__hint">↑↓ 선택 · Enter 결정</span>
      </footer>
    </div>
  )
}
