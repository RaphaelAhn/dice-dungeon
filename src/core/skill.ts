import { TASTE_CLASH, type Taste } from './topping'

/**
 * 스킬은 토핑에서 나온다. 도우에 올린 토핑의 맛이 곧 쓸 수 있는 기술이다.
 * 그래서 계열 축이 따로 있지 않고 Taste 하나만 쓴다.
 */
export type SkillId =
  | 'guardStance'
  | 'warmth'
  | 'fieryBlow'
  | 'spiceCombo'
  | 'zestBolt'
  | 'sourMist'
  | 'herbSlice'
  | 'aroma'
  | 'deepFlavor'
  | 'richBurst'
  | 'creamyDrain'

/** 스킬이 남기는 상태 */
export type StatusKind = 'burn' | 'stun' | 'slow' | 'atkDown' | 'guard'

export type Skill = {
  id: SkillId
  taste: Taste
  name: string
  /** 마나(반죽 탄력) 소모 */
  mp: number
  power?: number
  kind: 'physical' | 'magic' | 'support'
  hits?: number
  target: 'one' | 'all' | 'self'
  inflict?: { kind: StatusKind; turns: number; value?: number }
  drain?: number
  healRatio?: number
}

export const SKILLS: Record<SkillId, Skill> = {
  // 담백 — 버티고 회복한다
  guardStance: {
    id: 'guardStance',
    taste: 'mild',
    name: '든든한 반죽',
    mp: 6,
    kind: 'support',
    target: 'self',
    inflict: { kind: 'guard', turns: 1 },
  },
  warmth: {
    id: 'warmth',
    taste: 'mild',
    name: '포근한 온기',
    mp: 9,
    kind: 'support',
    target: 'self',
    healRatio: 0.35,
  },

  // 매콤 — 물리 화력
  fieryBlow: {
    id: 'fieryBlow',
    taste: 'spicy',
    name: '화끈한 일격',
    mp: 6,
    kind: 'physical',
    power: 1.8,
    target: 'one',
  },
  spiceCombo: {
    id: 'spiceCombo',
    taste: 'spicy',
    name: '매운맛 연타',
    mp: 6,
    kind: 'physical',
    power: 1.4,
    hits: 2,
    target: 'one',
  },

  // 새콤 — 견제와 광역 둔화
  zestBolt: {
    id: 'zestBolt',
    taste: 'tangy',
    name: '상큼한 한 방',
    mp: 6,
    kind: 'magic',
    power: 1.4,
    target: 'one',
  },
  sourMist: {
    id: 'sourMist',
    taste: 'tangy',
    name: '새콤한 안개',
    mp: 6,
    kind: 'support',
    target: 'all',
    inflict: { kind: 'slow', turns: 3 },
  },

  // 향긋 — 행동 봉쇄와 약화
  herbSlice: {
    id: 'herbSlice',
    taste: 'herbal',
    name: '향긋한 베기',
    mp: 9,
    kind: 'magic',
    power: 1.3,
    target: 'one',
    inflict: { kind: 'stun', turns: 1 },
  },
  aroma: {
    id: 'aroma',
    taste: 'herbal',
    name: '허브 향',
    mp: 6,
    kind: 'support',
    target: 'all',
    inflict: { kind: 'atkDown', turns: 3, value: 0.3 },
  },

  // 진한 — 마법 화력과 흡수
  deepFlavor: {
    id: 'deepFlavor',
    taste: 'rich',
    name: '진한 풍미',
    mp: 6,
    kind: 'magic',
    power: 1.5,
    target: 'one',
    inflict: { kind: 'burn', turns: 3, value: 6 },
  },
  richBurst: {
    id: 'richBurst',
    taste: 'rich',
    name: '농후한 폭발',
    mp: 9,
    kind: 'magic',
    power: 1,
    target: 'all',
  },
  creamyDrain: {
    id: 'creamyDrain',
    taste: 'rich',
    name: '크리미 흡수',
    mp: 6,
    kind: 'magic',
    power: 1.2,
    target: 'one',
    drain: 0.5,
  },
}

export const SKILL_IDS = Object.keys(SKILLS) as SkillId[]

export function skillsOfTaste(taste: Taste): Skill[] {
  return SKILL_IDS.map((id) => SKILLS[id]).filter((s) => s.taste === taste)
}

/** 맞부딪치는 맛은 1.5배로 들어간다 (매콤↔새콤, 진한↔향긋) */
export const CLASH = TASTE_CLASH
