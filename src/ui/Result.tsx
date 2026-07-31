import { useEffect } from 'react'
import { jobLabel } from '../core/job'
import type { Run } from '../core/run'
import { PUZZLE_TOTAL } from '../core/save'
import './Result.css'

export type ResultKind = 'lose' | 'timeout' | 'clear'

const COPY: Record<ResultKind, { title: string; line: string }> = {
  // 규칙 2 — 시간이 남아 있어도 끝이다
  lose: { title: '쓰러졌다', line: '체력이 다했습니다.' },
  // 규칙 1 — 살아 있어도 끝이다
  timeout: { title: '시간 초과', line: '제한 시간 안에 끝내지 못했습니다.' },
  clear: { title: '클리어', line: '1-10 을 넘어섰습니다.' },
}

export default function Result({
  kind,
  run,
  gained,
  pieces,
  onBack,
}: {
  kind: ResultKind
  run: Run
  /** 이번 판에서 얻은 퍼즐 조각 */
  gained: number
  /** 누적 퍼즐 조각 */
  pieces: number
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
      <h2 className="rs__title">{c.title}</h2>
      <p className="rs__line">{c.line}</p>

      <dl className="rs__stats">
        <div>
          <dt>도달</dt>
          <dd>1-{run.stage}</dd>
        </div>
        <div>
          <dt>직업</dt>
          <dd>{run.job ? jobLabel(run.job) : '전직 전'}</dd>
        </div>
        <div>
          <dt>스킬</dt>
          <dd>{run.skills.length}</dd>
        </div>
      </dl>

      {gained > 0 && (
        <p className="rs__piece">
          퍼즐 조각 <b>+{gained}</b> — 모은 조각 {pieces} / {PUZZLE_TOTAL}
        </p>
      )}

      <button className="rs__btn" onClick={onBack}>
        타이틀로 →
      </button>
      <p className="rs__hint">Enter</p>
    </div>
  )
}
