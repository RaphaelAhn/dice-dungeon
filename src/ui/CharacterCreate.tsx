import { useEffect, useState } from 'react'
import {
  BASE_STATS,
  clampName,
  GENDER_LABEL,
  GENDERS,
  isValidName,
  NAME_MAX,
  STAT_META,
  type Gender,
} from '../core/character'
import CharacterSprite from './CharacterSprite'
import './CharacterCreate.css'

export default function CharacterCreate({
  onConfirm,
  onBack,
}: {
  onConfirm: (g: Gender, name: string) => void
  onBack: () => void
}) {
  const [index, setIndex] = useState(0)
  const [name, setName] = useState('')
  const gender = GENDERS[index]
  const ready = isValidName(name)

  const confirm = () => {
    if (ready) onConfirm(gender, name.trim())
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 이름 입력 중에는 방향키를 글자 이동에 쓴다. 성별이 바뀌면 안 된다.
      const typing = (e.target as HTMLElement)?.tagName === 'INPUT'

      if (!typing && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault()
        const delta = e.key === 'ArrowLeft' ? -1 : 1
        setIndex((i) => (i + delta + GENDERS.length) % GENDERS.length)
      } else if (e.key === 'Enter' || (!typing && e.key === ' ')) {
        e.preventDefault()
        if (ready) onConfirm(GENDERS[index], name.trim())
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
        <h2>캐릭터 생성</h2>
        <p>외형만 다릅니다. 시작 스탯은 동일합니다.</p>
      </header>

      <div className="cc__stage">
        {GENDERS.map((g, i) => (
          <button
            key={g}
            className={i === index ? 'cc__card is-on' : 'cc__card'}
            onMouseEnter={() => setIndex(i)}
            onClick={() => setIndex(i)}
          >
            <CharacterSprite gender={g} scale={2} />
            <span className="cc__name">{GENDER_LABEL[g]}</span>
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
        <h3>시작 스탯</h3>
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
          시작 차이는 스탯이 아니라 <b>주사위 축복</b>이 만듭니다. 다음 단계에서 단 한 번 굴립니다.
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
      <p className="cc__hint">←→ 성별 · Enter 결정 · Esc 뒤로</p>
    </div>
  )
}
