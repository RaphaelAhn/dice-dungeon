import { useEffect, useState } from 'react'
import { CODEX_TOTAL, discoveredCount, loadCodex } from '../core/codex'
import PizzaMark from './PizzaMark'
import './TitleScreen.css'

export type TitleAction = 'start' | 'codex' | 'howto'

const MENU: { id: TitleAction; label: string }[] = [
  { id: 'start', label: '게임 시작' },
  { id: 'codex', label: '피자 도감' },
  { id: 'howto', label: '조작 안내' },
]

export default function TitleScreen({ onSelect }: { onSelect: (a: TitleAction) => void }) {
  const [cursor, setCursor] = useState(0)
  const found = discoveredCount(loadCodex())

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
        <PizzaMark size={104} />
        <h1 className="title__logo">
          도우 <span>던전</span>
        </h1>
        <p className="title__tag">숙성하고, 모으고, 구워라</p>
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
          도감 <b>{found}</b> / {CODEX_TOTAL}
        </span>
        <span className="title__hint">↑↓ 선택 · Enter 결정</span>
      </footer>
    </div>
  )
}
