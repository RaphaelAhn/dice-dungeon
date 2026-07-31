import type { Stats } from './character'
import { maxMp, type Run } from './run'
import { affinity, LINES, LINE_LABEL, skillsOfLine, type SkillLine } from './skill'

export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum'

export const TIERS: Tier[] = ['bronze', 'silver', 'gold', 'platinum']

export const TIER_META: Record<Tier, { label: string; color: string }> = {
  bronze: { label: '브론즈', color: '#b08050' },
  silver: { label: '실버', color: '#b9c0cf' },
  gold: { label: '골드', color: '#e8b04b' },
  platinum: { label: '플래티넘', color: '#7dd3fc' },
}

/** 기본 티어 확률 ⚠ (기획서 04 §2) */
const BASE_ODDS: Record<Tier, number> = { bronze: 0.4, silver: 0.35, gold: 0.2, platinum: 0.05 }

/**
 * 행운이 티어를 끌어올린다. 기준 행운 10 을 넘는 만큼 하위 티어 확률이
 * 상위로 옮겨간다. ⚠ 행운 1당 이동 비율.
 */
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

/* ── 슬롯 B: 능력치 카드 ⚠ (기획서 04 §3.2) ── */

const STAT_CARD: Record<keyof Stats, Record<Tier, number>> = {
  hp: { bronze: 15, silver: 25, gold: 40, platinum: 60 },
  atk: { bronze: 5, silver: 8, gold: 13, platinum: 20 },
  mag: { bronze: 5, silver: 8, gold: 13, platinum: 20 },
  spd: { bronze: 3, silver: 5, gold: 8, platinum: 12 },
  luk: { bronze: 3, silver: 5, gold: 8, platinum: 12 },
}

const STAT_LABEL: Record<keyof Stats, string> = {
  hp: '체력',
  atk: '공격력',
  mag: '마법력',
  spd: '속도',
  luk: '행운',
}

/* ── 슬롯 C: 도박 카드 ⚠ (기획서 04 §3.3) ── */

type GambleDef = {
  name: string
  desc: (n: number, m: number) => string
  gain: Partial<Stats>
  cost: Partial<Stats>
}

const GAMBLES: GambleDef[] = [
  {
    name: '피의 계약',
    desc: (n, m) => `공격력 +${n}, 최대 체력 -${m}`,
    gain: { atk: 1 },
    cost: { hp: 1 },
  },
  {
    name: '광기의 지혜',
    desc: (n, m) => `마법력 +${n}, 최대 체력 -${m}`,
    gain: { mag: 1 },
    cost: { hp: 1 },
  },
  {
    name: '무모한 질주',
    desc: (n, m) => `속도 +${n}, 공격력 -${m}`,
    gain: { spd: 1 },
    cost: { atk: 1 },
  },
  {
    name: '도박꾼의 눈',
    desc: (n, m) => `행운 +${n}, 마법력 -${m}`,
    gain: { luk: 1 },
    cost: { mag: 1 },
  },
  {
    name: '거인의 껍질',
    desc: (n, m) => `최대 체력 +${n}, 속도 -${m}`,
    gain: { hp: 1 },
    cost: { spd: 1 },
  },
]

/** 도박은 같은 티어 능력치 카드보다 크게 주고, 대가를 명시한다 ⚠ */
const GAMBLE_GAIN: Record<Tier, number> = { bronze: 1.8, silver: 1.8, gold: 1.8, platinum: 1.8 }
const GAMBLE_COST: Record<Tier, number> = { bronze: 0.7, silver: 0.7, gold: 0.7, platinum: 0.7 }

/* ── 카드 ── */

export type Card =
  | { slot: 'skill'; tier: Tier; line: SkillLine; name: string; desc: string }
  | { slot: 'stat'; tier: Tier; name: string; desc: string; stats: Partial<Stats> }
  | { slot: 'heal'; tier: Tier; name: string; desc: string }
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

/**
 * 슬롯 A — 스킬.
 * 계열은 능력치 친화도로 가중된다. 이것이 "주사위 능력치가 직업 선택에
 * 유리하게 작용한다"를 성립시키는 고리다. 강제가 아니라 편향이다.
 */
function skillCard(run: Run, tier: Tier, rng: () => number): Card {
  const weights = LINES.map((l) => 1 + affinity(run.max, l) / 20)
  const total = weights.reduce((a, b) => a + b, 0)
  let r = rng() * total
  let line: SkillLine = LINES[0]
  for (let i = 0; i < LINES.length; i++) {
    r -= weights[i]
    if (r <= 0) {
      line = LINES[i]
      break
    }
  }
  const sk = pick(skillsOfLine(line), rng)
  return {
    slot: 'skill',
    tier,
    line,
    name: `${LINE_LABEL[line]} — ${sk.name}`,
    desc: `${LINE_LABEL[line]} 계열 스킬을 익힌다 (마나 ${sk.mp})`,
  }
}

/** 슬롯 B — 능력치. 체력이 낮으면 회복 카드가 대신 나온다. */
function statCard(run: Run, tier: Tier, rng: () => number): Card {
  if (run.hp < run.max.hp * 0.5 && rng() < 0.4) {
    return { slot: 'heal', tier, name: '휴식', desc: '체력과 마나를 전부 회복한다' }
  }
  const key = pick(Object.keys(STAT_CARD) as (keyof Stats)[], rng)
  const n = STAT_CARD[key][tier]
  return {
    slot: 'stat',
    tier,
    name: `${STAT_LABEL[key]} 상승`,
    desc: `${STAT_LABEL[key]} +${n}`,
    stats: { [key]: n },
  }
}

/** 슬롯 C — 도박. 이득이 크고 대가가 눈에 보인다. */
function gambleCard(tier: Tier, rng: () => number): Card {
  const g = pick(GAMBLES, rng)
  const gainKey = Object.keys(g.gain)[0] as keyof Stats
  const costKey = Object.keys(g.cost)[0] as keyof Stats
  const gain = Math.round(STAT_CARD[gainKey][tier] * GAMBLE_GAIN[tier])
  const cost = Math.round(STAT_CARD[costKey][tier] * GAMBLE_COST[tier])
  return {
    slot: 'gamble',
    tier,
    name: g.name,
    desc: g.desc(gain, cost),
    gain: { [gainKey]: gain },
    cost: { [costKey]: cost },
  }
}

/**
 * 3택 한 벌을 만든다. 세 슬롯은 고정이고 티어는 장마다 따로 굴린다.
 * 한 지점의 세 장을 같은 티어로 묶으면 '브론즈 지점'이 생겨 편차가 커진다.
 */
export function makeOffer(run: Run, rng: () => number = Math.random): Offer {
  // 주사위 6번 눈. 이 한 벌의 세 장 전부가 아니라 각 장의 티어를 최고로 올린다.
  // 한 장만 올리면 그 슬롯을 안 고르는 순간 축복이 통째로 증발한다.
  const useTop = run.topTierLeft > 0
  const tier = (): Tier => (useTop ? 'platinum' : rollTier(run.max.luk, rng))

  return {
    cards: [skillCard(run, tier(), rng), statCard(run, tier(), rng), gambleCard(tier(), rng)],
    usedTopTier: useTop,
  }
}

/** 최고 티어 확정을 한 번 쓴 뒤의 런 */
export function consumeTopTier(run: Run): Run {
  return { ...run, topTierLeft: Math.max(0, run.topTierLeft - 1) }
}

/** 고른 카드를 런에 반영한다 */
export function applyCard(run: Run, card: Card): Run {
  const next: Run = { ...run, max: { ...run.max }, skills: [...run.skills] }

  switch (card.slot) {
    case 'skill':
      next.skills.push(card.line)
      break
    case 'heal':
      next.hp = next.max.hp
      next.mp = maxMp(next.max)
      break
    case 'stat':
      addStats(next, card.stats, 1)
      break
    case 'gamble':
      addStats(next, card.gain, 1)
      addStats(next, card.cost, -1)
      break
  }

  // 최대 체력이 줄면 현재 체력도 따라 내려가야 한다. 안 그러면 hp > maxHp 가 된다.
  next.hp = Math.min(next.hp, next.max.hp)
  next.mp = Math.min(next.mp, maxMp(next.max))
  return next
}

function addStats(run: Run, delta: Partial<Stats>, sign: number): void {
  for (const [k, v] of Object.entries(delta)) {
    const key = k as keyof Stats
    // 스탯이 0 이하로 내려가면 계산이 무너진다. 도박 대가에 바닥을 둔다.
    const floor = key === 'hp' ? 30 : 1
    run.max[key] = Math.max(floor, run.max[key] + v * sign)
    if (key === 'hp' && sign > 0) run.hp += v
  }
}
