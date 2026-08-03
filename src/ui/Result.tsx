import { useEffect } from 'react'
import { CODEX_TOTAL } from '../core/codex'
import CharacterSprite from './CharacterSprite'
import { GRADE_META } from '../core/pizza'
import type { Run } from '../core/run'
import './Result.css'

export type ResultKind = 'lose' | 'timeout' | 'clear'

const COPY: Record<ResultKind, { title: string; line: string }> = {
  // 규칙 2 — 시간이 남아 있어도 끝이다
  lose: { title: '반죽이 무너졌다', line: '도우가 버티지 못했습니다.' },
  // 규칙 1 — 살아 있어도 끝이다
  timeout: { title: '타 버렸다', line: '제한 시간 안에 끝내지 못했습니다.' },
  clear: { title: '완성', line: '피자가 구워졌습니다.' },
}

export default function Result({
  kind,
  run,
  madeName,
  found,
  onBack,
}: {
  kind: ResultKind
  run: Run
  /** 완성한 피자의 전체 이름. 실패하면 빈 문자열 */
  madeName: string
  /** 도감에 모은 종 수 */
  found: number
  onBack: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault()
        onBack()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBack])

  const c = COPY[kind]
  return (
    <div className={`rs rs--${kind}`}>
      <div className="rs__dough">
        <CharacterSprite shape={run.shape} scale={1.1} toppings={run.toppings} />
      </div>

      <h2 className="rs__title">{c.title}</h2>
      <p className="rs__line">{c.line}</p>

      <dl className="rs__stats">
        <div>
          <dt>도달</dt>
          <dd>1-{run.stage}</dd>
        </div>
        <div>
          <dt>완성도</dt>
          <dd>{run.pizza ? GRADE_META[run.pizza.grade].label : '굽기 전'}</dd>
        </div>
        <div>
          <dt>토핑</dt>
          <dd>{run.toppings.length}</dd>
        </div>
      </dl>

      {madeName && (
        <p className="rs__piece">
          <b className="rs__made">{madeName}</b>
          <span className="rs__codex">
            도감 {found} / {CODEX_TOTAL} 종
          </span>
        </p>
      )}

      <button className="rs__btn" onClick={onBack}>
        타이틀로 →
      </button>
      <p className="rs__hint">Enter</p>
    </div>
  )
}
