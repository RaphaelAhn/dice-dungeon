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

const STATUS_TEXT: Record<StatusKind, string> = {
  burn: '지속 피해',
  stun: '행동 봉쇄',
  slow: '둔화',
  atkDown: '공격 약화',
  guard: '피해 반감',
}

/**
 * 기술이 무슨 일을 하는지 한 줄로 적는다.
 *
 * 설명을 손으로 하나씩 써 두지 않는다 — 위력이나 지속 턴을 고치면 설명이
 * 조용히 어긋나고, 그게 밸런스 조정 때마다 반복된다. 수치에서 만들어 내면
 * 표를 고치는 것만으로 화면 문구가 따라온다.
 */
export function describeSkill(s: Skill): string {
  const parts: string[] = []

  if (s.power) {
    const who = s.target === 'all' ? '적 전체' : '적 하나'
    const how = s.kind === 'physical' ? '탄력' : '두께'
    const pct = Math.round(s.power * 100)
    parts.push(s.hits && s.hits > 1 ? `${who}에 ${how} ${pct}% ${s.hits}회` : `${who}에 ${how} ${pct}%`)
  }
  if (s.healRatio) parts.push(`신선도 ${Math.round(s.healRatio * 100)}% 회복`)
  if (s.drain) parts.push(`준 피해의 ${Math.round(s.drain * 100)}% 흡수`)
  if (s.inflict) {
    const t = `${s.inflict.turns}턴 ${STATUS_TEXT[s.inflict.kind]}`
    // 위력이 있으면 대상은 이미 앞줄에 적혔다. 없으면 여기서 밝힌다.
    parts.push(s.power || s.target === 'self' ? t : `${s.target === 'all' ? '적 전체' : '적 하나'} ${t}`)
  }
  // 맞부딪치는 맛에는 1.5배 — 고를 때 가장 크게 갈리는 정보다
  if (s.power) parts.push(`${TASTE_LABEL_SHORT[TASTE_CLASH[s.taste] ?? s.taste]}에 강함`)

  return parts.join(' · ')
}

/** 설명 줄은 좁다. 맛 이름을 짧게 쓴다. */
const TASTE_LABEL_SHORT: Record<Taste, string> = {
  mild: '담백',
  spicy: '매콤',
  tangy: '새콤',
  herbal: '향긋',
  rich: '진한',
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
