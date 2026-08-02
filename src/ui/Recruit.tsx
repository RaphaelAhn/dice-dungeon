import { useEffect } from 'react'
import { STAT_LABEL } from '../core/character'
import type { EnemyDef } from '../core/enemy'
import { canAddTopping, type Run } from '../core/run'
import { KIND_LABEL, MAX_TOPPINGS, TASTE_LABEL, toppingStats } from '../core/topping'
import './Recruit.css'

/**
 * 라운드를 이긴 뒤 나오는 화면.
 * 쓰러뜨린 재료를 도우에 올릴지 지나칠지 고른다.
 *
 * 올리면 능력치가 오르지만 무게만큼 손놀림이 깎이고 자리도 하나 줄어든다.
 * 그 대가가 없으면 '지나치기'를 누를 이유가 사라진다.
 */
export default function Recruit({
  run,
  defeated,
  onDone,
}: {
  run: Run
  defeated: EnemyDef[]
  onDone: (picked: EnemyDef | null) => void
}) {
  const full = !canAddTopping(run)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const i = Number(e.key) - 1
      if (!full && defeated[i]) {
        e.preventDefault()
        onDone(defeated[i])
      } else if (e.key === 'Escape' || e.key === '0') {
        e.preventDefault()
        onDone(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [defeated, full, onDone])

  return (
    <div className="rc">
      <header className="rc__head">
        <h2>재료를 얻었다</h2>
        <p>
          도우에 올리면 힘이 되지만 무거워집니다. 자리는{' '}
          <b>
            {run.toppings.length} / {MAX_TOPPINGS}
          </b>
        </p>
      </header>

      <div className="rc__cards">
        {defeated.map((e, i) => {
          const t = e.topping
          const gain = toppingStats(t)
          const [key, value] = Object.entries(gain)[0]
          return (
            <button
              key={t.id}
              className="rc__card"
              onClick={() => onDone(e)}
              disabled={full}
              title={full ? '도우가 가득 찼습니다' : undefined}
            >
              <span className="rc__kind">{KIND_LABEL[t.kind]}</span>
              <b className="rc__name">{t.name}</b>
              <span className="rc__taste">{TASTE_LABEL[t.taste]}</span>
              <span className="rc__gain">
                {STAT_LABEL[key as keyof typeof STAT_LABEL]} +{value}
              </span>
              <span className="rc__weight">무게 {t.weight} — 손놀림 −{t.weight}</span>
              <span className="rc__key">{i + 1}</span>
            </button>
          )
        })}
      </div>

      {full && <p className="rc__full">도우가 가득 찼습니다. 더 올릴 수 없습니다.</p>}

      <footer className="rc__foot">
        <button className="rc__skip" onClick={() => onDone(null)}>
          지나치기 →
        </button>
        <p className="rc__hint">숫자키 동료로 만들기 · Esc 지나치기</p>
      </footer>
    </div>
  )
}
