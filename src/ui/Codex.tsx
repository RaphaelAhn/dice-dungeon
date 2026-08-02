import { useEffect, useState } from 'react'
import {
  CODEX_TOTAL,
  discoveredCount,
  entryKey,
  loadCodex,
  type CodexEntry,
} from '../core/codex'
import { GRADE_META, PIZZA_NAMES } from '../core/pizza'
import { TASTE_LABEL, TASTES, type Taste } from '../core/topping'
import './Codex.css'

/**
 * 도감. 주 맛 × 부 맛 25칸을 채운다.
 * 대각선(주=부)은 한 가지 맛으로만 채운 피자다.
 */
export default function Codex({ onBack }: { onBack: () => void }) {
  const [codex] = useState(loadCodex)
  const [sel, setSel] = useState<CodexEntry | null>(null)
  const found = discoveredCount(codex)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (sel) setSel(null)
        else onBack()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sel, onBack])

  return (
    <div className="cx">
      <header className="cx__head">
        <h2>피자 도감</h2>
        <p>
          <b>{found}</b> / {CODEX_TOTAL} 종
        </p>
      </header>

      <div className="cx__grid" role="grid">
        {/* 열 머리 — 부 맛 */}
        <span className="cx__corner" aria-hidden="true" />
        {TASTES.map((t) => (
          <span key={`col-${t}`} className="cx__axis">
            {TASTE_LABEL[t]}
          </span>
        ))}

        {TASTES.map((main) => (
          <Row key={main} main={main} codex={codex} onPick={setSel} />
        ))}
      </div>

      <p className="cx__legend">세로 = 주 풍미 · 가로 = 부 풍미 · 대각선은 한 맛으로만 채운 피자</p>

      {sel ? (
        <div className="cx__detail">
          <b className="cx__detail-name">{sel.lastName}</b>
          <span className="cx__detail-meta">
            {sel.title} · {GRADE_META[sel.bestGrade].label} · {sel.count}회 제작
          </span>
          <span className="cx__detail-tops">
            마지막 재료 — {sel.lastToppings.length > 0 ? sel.lastToppings.join(', ') : '없음'}
          </span>
        </div>
      ) : (
        <div className="cx__detail cx__detail--empty">칸을 고르면 자세히 보입니다</div>
      )}

      <button className="cx__back" onClick={onBack}>
        ← 돌아가기
      </button>
    </div>
  )
}

function Row({
  main,
  codex,
  onPick,
}: {
  main: Taste
  codex: Record<string, CodexEntry>
  onPick: (e: CodexEntry | null) => void
}) {
  return (
    <>
      <span className="cx__axis cx__axis--row">{TASTE_LABEL[main]}</span>
      {TASTES.map((sub) => {
        const e = codex[entryKey(main, sub)]
        const pure = main === sub
        if (!e) {
          return (
            <span
              key={sub}
              className={pure ? 'cx__cell is-empty is-pure' : 'cx__cell is-empty'}
              title={`${TASTE_LABEL[main]} + ${TASTE_LABEL[sub]} — 아직 만들지 않음`}
            >
              ?
            </span>
          )
        }
        return (
          <button
            key={sub}
            className={`cx__cell is-found cx__cell--${e.bestGrade}${pure ? ' is-pure' : ''}`}
            onClick={() => onPick(e)}
            title={PIZZA_NAMES[main][sub]}
          >
            <b>{PIZZA_NAMES[main][sub]}</b>
            <i>{GRADE_META[e.bestGrade].label}</i>
          </button>
        )
      })}
    </>
  )
}
