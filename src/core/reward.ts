import type { Stats } from './character'
import { maxMp, type Run } from './run'

export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum'

export const TIERS: Tier[] = ['bronze', 'silver', 'gold', 'platinum']

export const TIER_META: Record<Tier, { label: string; color: string }> = {
  bronze: { label: '수련', color: '#b08050' },
  silver: { label: '숙련', color: '#b9c0cf' },
  gold: { label: '장인', color: '#e8b04b' },
  platinum: { label: '명장', color: '#7dd3fc' },
}

const BASE_ODDS: Record<Tier, number> = { bronze: 0.4, silver: 0.35, gold: 0.2, platinum: 0.05 }

const LUCK_SHIFT_PER_POINT = 0.012
const BASE_LUK = 10

export function tierOdds(luk: number): Record<Tier, number> {
  const shift = Math.max(0, (luk - BASE_LUK) * LUCK_SHIFT_PER_POINT)
  const moveB = Math.min(BASE_ODDS.bronze, shift)
  const moveS = Math.min(BASE_ODDS.silver, shift * 0.5)
  return {
    bronze: BASE_ODDS.bronze - moveB,
    silver: BASE_ODDS.silver - moveS + moveB,
    gold: BASE_ODDS.gold + moveS,
    platinum: BASE_ODDS.platinum,
  }
}

export function rollTier(luk: number, rng: () => number): Tier {
  const odds = tierOdds(luk)
  let r = rng()
  for (const t of TIERS) {
    r -= odds[t]
    if (r <= 0) return t
  }
  return 'platinum'
}

/**
 * ⚠ 한 판에 고르는 카드는 3장뿐이다 (지점 3곳 × 1장).
 * 그래서 한 장의 무게가 크다.
 */
const STAT_CARD: Record<keyof Stats, Record<Tier, number>> = {
  hp: { bronze: 45, silver: 75, gold: 120, platinum: 180 },
  atk: { bronze: 15, silver: 24, gold: 39, platinum: 60 },
  mag: { bronze: 15, silver: 24, gold: 39, platinum: 60 },
  spd: { bronze: 9, silver: 15, gold: 24, platinum: 36 },
  luk: { bronze: 9, silver: 15, gold: 24, platinum: 36 },
}

const STAT_LABEL: Record<keyof Stats, string> = {
  hp: '반죽 두께',
  atk: '불의 세기',
  mag: '반죽 탄력',
  spd: '손놀림',
  luk: '감각',
}

/**
 * 슬롯 A — 장인의 손길. 한 가지를 크게 끌어올린다.
 * 토핑에서 얻는 스킬과 달리, 이쪽은 순수하게 도우의 기본기다.
 */
const CRAFT_NAMES = ['장인의 손길', '불꽃 조절', '반죽 치대기', '화덕 예열']

/** 슬롯 B — 완벽한 숙성. 고르게 오르거나 회복한다. */
const AGE_NAMES = ['완벽한 숙성', '저온 발효', '하룻밤 휴지']

/** 슬롯 C — 무리한 반죽. 크게 얻고 확실히 잃는다. */
type GambleDef = {
  name: string
  desc: (n: number, m: number) => string
  gain: keyof Stats
  cost: keyof Stats
}

const GAMBLES: GambleDef[] = [
  { name: '과한 불길', desc: (n, m) => `불의 세기 +${n}, 반죽 두께 -${m}`, gain: 'atk', cost: 'hp' },
  { name: '과발효', desc: (n, m) => `반죽 탄력 +${n}, 반죽 두께 -${m}`, gain: 'mag', cost: 'hp' },
  { name: '얇게 밀기', desc: (n, m) => `손놀림 +${n}, 불의 세기 -${m}`, gain: 'spd', cost: 'atk' },
  { name: '즉흥 배합', desc: (n, m) => `감각 +${n}, 반죽 탄력 -${m}`, gain: 'luk', cost: 'mag' },
  { name: '두툼한 도우', desc: (n, m) => `반죽 두께 +${n}, 손놀림 -${m}`, gain: 'hp', cost: 'spd' },
]

const GAMBLE_GAIN = 1.8
const GAMBLE_COST = 0.7

export type Card =
  | { slot: 'craft'; tier: Tier; name: string; desc: string; stats: Partial<Stats> }
  | { slot: 'age'; tier: Tier; name: string; desc: string; stats: Partial<Stats>; heal: boolean }
  | {
      slot: 'gamble'
      tier: Tier
      name: string
      desc: string
      gain: Partial<Stats>
      cost: Partial<Stats>
    }

export type Offer = { cards: Card[]; usedTopTier: boolean }

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]
}

const STAT_KEYS = Object.keys(STAT_CARD) as (keyof Stats)[]

function craftCard(tier: Tier, rng: () => number): Card {
  const key = pick(STAT_KEYS, rng)
  const n = STAT_CARD[key][tier]
  return {
    slot: 'craft',
    tier,
    name: pick(CRAFT_NAMES, rng),
    desc: `${STAT_LABEL[key]} +${n}`,
    stats: { [key]: n },
  }
}

/** 체력이 낮으면 회복이 섞여 나온다 */
function ageCard(run: Run, tier: Tier, rng: () => number): Card {
  const hurt = run.hp < run.max.hp * 0.6
  if (hurt && rng() < 0.5) {
    return {
      slot: 'age',
      tier,
      name: '하룻밤 휴지',
      desc: '체력과 반죽 탄력을 전부 회복한다',
      stats: {},
      heal: true,
    }
  }
  // 고르게 조금씩 — 한 가지를 크게 올리는 A 와 성격이 갈린다
  // ⚠ 0.4 였을 때 '숙성 우선'이 100% 로 다른 정책을 압도했다.
  const share = (k: keyof Stats) => Math.round(STAT_CARD[k][tier] * 0.22)
  return {
    slot: 'age',
    tier,
    name: pick(AGE_NAMES, rng),
    desc: `모든 능력 소폭 상승 (두께 +${share('hp')}, 불 +${share('atk')}, 탄력 +${share('mag')})`,
    stats: {
      hp: share('hp'),
      atk: share('atk'),
      mag: share('mag'),
      spd: share('spd'),
      luk: share('luk'),
    },
    heal: false,
  }
}

function gambleCard(tier: Tier, rng: () => number): Card {
  const g = pick(GAMBLES, rng)
  const gain = Math.round(STAT_CARD[g.gain][tier] * GAMBLE_GAIN)
  const cost = Math.round(STAT_CARD[g.cost][tier] * GAMBLE_COST)
  return {
    slot: 'gamble',
    tier,
    name: g.name,
    desc: g.desc(gain, cost),
    gain: { [g.gain]: gain },
    cost: { [g.cost]: cost },
  }
}

/** 3택 한 벌. 티어는 장마다 따로 굴린다. */
export function makeOffer(run: Run, rng: () => number = Math.random): Offer {
  const useTop = run.topTierLeft > 0
  const tier = (): Tier => (useTop ? 'platinum' : rollTier(run.max.luk, rng))
  return {
    cards: [craftCard(tier(), rng), ageCard(run, tier(), rng), gambleCard(tier(), rng)],
    usedTopTier: useTop,
  }
}

export function consumeTopTier(run: Run): Run {
  return { ...run, topTierLeft: Math.max(0, run.topTierLeft - 1) }
}

export function applyCard(run: Run, card: Card): Run {
  const next: Run = { ...run, max: { ...run.max } }

  switch (card.slot) {
    case 'craft':
      addStats(next, card.stats, 1)
      break
    case 'age':
      if (card.heal) {
        next.hp = next.max.hp
        next.mp = maxMp(next.max)
      } else {
        addStats(next, card.stats, 1)
      }
      break
    case 'gamble':
      addStats(next, card.gain, 1)
      addStats(next, card.cost, -1)
      break
  }

  next.hp = Math.min(next.hp, next.max.hp)
  next.mp = Math.min(next.mp, maxMp(next.max))
  return next
}

function addStats(run: Run, delta: Partial<Stats>, sign: number): void {
  for (const [k, v] of Object.entries(delta)) {
    const key = k as keyof Stats
    // 0 이하로 내려가면 계산이 무너진다. 대가에 바닥을 둔다.
    const floor = key === 'hp' ? 30 : 1
    run.max[key] = Math.max(floor, run.max[key] + v * sign)
    if (key === 'hp' && sign > 0) run.hp += v
  }
}
