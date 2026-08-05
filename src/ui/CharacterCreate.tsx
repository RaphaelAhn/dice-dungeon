import { useEffect, useState } from 'react'
import {
  BASE_STATS,
  clampName,
  SHAPE_LABEL,
  SHAPES,
  isValidName,
  NAME_MAX,
  STAT_META,
  type Shape,
} from '../core/character'
import CharacterSprite from './CharacterSprite'
import './CharacterCreate.css'

export default function CharacterCreate({
  onConfirm,
  onBack,
}: {
  onConfirm: (g: Shape, name: string) => void
  onBack: () => void
}) {
  const [index, setIndex] = useState(0)
  const [name, setName] = useState('')
  const shape = SHAPES[index]
  const ready = isValidName(name)

  const confirm = () => {
    if (ready) onConfirm(shape, name.trim())
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 이름 입력 중에는 방향키를 글자 이동에 쓴다. 모양이 바뀌면 안 된다.
      const typing = (e.target as HTMLElement)?.tagName === 'INPUT'

      if (!typing && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault()
        const delta = e.key === 'ArrowLeft' ? -1 : 1
        setIndex((i) => (i + delta + SHAPES.length) % SHAPES.length)
      } else if (e.key === 'Enter' || (!typing && e.key === ' ')) {
        e.preventDefault()
        if (ready) onConfirm(SHAPES[index], name.trim())
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onBack()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, name, ready, onConfirm, onBack])

  return (
    <div className="cc">
      <header className="cc__head">
        <h2>도우 빚기</h2>
        <p>모양만 다릅니다. 시작 능력은 같습니다.</p>
      </header>

      {/*
        마우스를 올리는 것만으로 선택이 옮겨 가면 안 된다. 고르고 나서 손을
        움직였을 뿐인데 골라 둔 도우가 어두워졌다. 타이틀 메뉴는 커서라
        마우스를 따라가도 되지만, 여기는 선택이다 — 누른 것이 남아야 한다.
      */}
      <div className="cc__stage">
        {SHAPES.map((g, i) => (
          <button
            key={g}
            className={i === index ? 'cc__card is-on' : 'cc__card'}
            aria-pressed={i === index}
            onClick={() => setIndex(i)}
          >
            <CharacterSprite shape={g} scale={0.72} />
            <span className="cc__name">{SHAPE_LABEL[g]}</span>
          </button>
        ))}
      </div>

      <section className="cc__name-field">
        <label htmlFor="cc-name">이름</label>
        <input
          id="cc-name"
          className="cc__input"
          value={name}
          onChange={(e) => setName(clampName(e.target.value))}
          placeholder="이름을 입력하세요"
          autoComplete="off"
          spellCheck={false}
          autoFocus
        />
        <span className="cc__count">
          {[...name].length} / {NAME_MAX}
        </span>
      </section>

      <section className="cc__stats">
        <h3>시작 능력</h3>
        <ul>
          {STAT_META.map((s) => (
            <li key={s.key}>
              <span className="cc__stat-label">{s.label}</span>
              <span className="cc__stat-value">{BASE_STATS[s.key]}</span>
              <span className="cc__stat-desc">{s.desc}</span>
            </li>
          ))}
        </ul>
        <p className="cc__note">
          시작 차이는 <b>도우 숙성</b>이 만듭니다. 다음 단계에서 단 한 번뿐입니다.
        </p>
      </section>

      <footer className="cc__foot">
        <button className="cc__btn cc__btn--ghost" onClick={onBack}>
          ← 뒤로
        </button>
        <button className="cc__btn cc__btn--go" onClick={confirm} disabled={!ready}>
          {ready ? `${name.trim()}(으)로 시작 →` : '이름을 입력하세요'}
        </button>
      </footer>
      <p className="cc__hint">←→ 모양 · Enter 결정 · Esc 뒤로</p>
    </div>
  )
}
