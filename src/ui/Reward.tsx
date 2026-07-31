import { useEffect, useState } from 'react'
import { applyCard, consumeTopTier, makeOffer, TIER_META, type Card, type Offer } from '../core/reward'
import { PICKS_PER_STOP, type Run } from '../core/run'
import './Reward.css'

const SLOT_LABEL: Record<Card['slot'], string> = {
  skill: '빌드',
  stat: '기반',
  heal: '기반',
  gamble: '도박',
}

/**
 * 보상 지점. 한 화면에서 3택 1 을 PICKS_PER_STOP 번 연속으로 고른다.
 * 시계는 여기서 멈춘다 — 시간 압박은 전투에만 건다. (timer.ts)
 */
export default function Reward({ run, onDone }: { run: Run; onDone: (next: Run) => void }) {
  const [cur, setCur] = useState<Run>(run)
  const [pick, setPick] = useState(0)
  const [offer, setOffer] = useState<Offer>(() => makeOffer(run))

  const take = (card: Card) => {
    let next = applyCard(cur, card)
    if (offer.usedTopTier) next = consumeTopTier(next)

    if (pick + 1 >= PICKS_PER_STOP) {
      onDone(next)
      return
    }
    setCur(next)
    setPick(pick + 1)
    setOffer(makeOffer(next))
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const i = Number(e.key) - 1
      if (offer.cards[i]) {
        e.preventDefault()
        take(offer.cards[i])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="rw">
      <header className="rw__head">
        <h2>보상 선택</h2>
        <p>
          <b>
            {pick + 1} / {PICKS_PER_STOP}
          </b>{' '}
          · 세 장 중 하나만 가져갑니다
        </p>
      </header>

      <div className="rw__cards">
        {offer.cards.map((c, i) => (
          <button key={i} className={`rw__card rw__card--${c.slot}`} onClick={() => take(c)}>
            <span className="rw__tier" style={{ color: TIER_META[c.tier].color }}>
              {TIER_META[c.tier].label}
            </span>
            <span className="rw__slot">{SLOT_LABEL[c.slot]}</span>
            <b className="rw__name">{c.name}</b>
            <span className="rw__desc">{c.desc}</span>
            <span className="rw__key">{i + 1}</span>
          </button>
        ))}
      </div>

      <footer className="rw__foot">
        <span>
          HP {cur.hp}/{cur.max.hp} · 공 {cur.max.atk} · 마 {cur.max.mag} · 속 {cur.max.spd} · 운{' '}
          {cur.max.luk}
        </span>
        <span className="rw__skills">
          스킬 {cur.skills.length === 0 ? '없음' : cur.skills.length}
          {cur.topTierLeft > 0 && ` · 최고 티어 확정 ${cur.topTierLeft}회`}
        </span>
      </footer>
    </div>
  )
}
