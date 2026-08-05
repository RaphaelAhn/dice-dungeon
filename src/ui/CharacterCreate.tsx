import { useEffect, useState } from 'react'
import { BASE_STATS, clampName, isValidName, NAME_MAX, STAT_META } from '../core/character'
import CharacterSprite from './CharacterSprite'
import './CharacterCreate.css'

export default function CharacterCreate({
  onConfirm,
  onBack,
}: {
  onConfirm: (name: string) => void
  onBack: () => void
}) {
  const [name, setName] = useState('')
  const ready = isValidName(name)

  const confirm = () => {
    if (ready) onConfirm(name.trim())
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.tagName === 'INPUT'

      if (e.key === 'Enter' || (!typing && e.key === ' ')) {
        e.preventDefault()
        if (ready) onConfirm(name.trim())
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onBack()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [name, ready, onConfirm, onBack])

  return (
    <div className="cc">
      <header className="cc__head">
        <h2>도우 빚기</h2>
        <p>모양만 다릅니다. 시작 능력은 같습니다.</p>
      </header>

      <div className="cc__stage">
        {/*
          도우는 한 가지다. 둥근·네모로 나눠 두었지만 성능 차이가 없어 고르는
          의미가 없었고, 이제 도우의 성격은 만들기 단계(분할·둥글리기·성형)가
          정한다. 여기서는 이름만 짓는다.
        */}
        <div className="cc__card is-on">
          <CharacterSprite scale={0.8} />
          <span className="cc__name">흰 도우</span>
        </div>
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
