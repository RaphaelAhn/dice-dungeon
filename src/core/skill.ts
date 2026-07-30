import type { Stats } from './character'

/** 스킬 계열 5종. 전직 판정과 속성 상성이 모두 이 축을 쓴다. */
export type SkillLine = 'sword' | 'fire' | 'ice' | 'holy' | 'dark'

export const LINES: SkillLine[] = ['sword', 'fire', 'ice', 'holy', 'dark']

export const LINE_LABEL: Record<SkillLine, string> = {
  sword: '검술',
  fire: '화염',
  ice: '얼음',
  holy: '신성',
  dark: '암흑',
}

/** 역속성 상성. 해당 계열 공격이 이 계열에게 1.5배로 들어간다. (기획서 04 §6.2) */
export const WEAK_TO: Partial<Record<SkillLine, SkillLine>> = {
  fire: 'ice',
  ice: 'fire',
  holy: 'dark',
  dark: 'holy',
}

export type SkillId =
  | 'strike'
  | 'combo'
  | 'guardStance'
  | 'fireball'
  | 'blaze'
  | 'freeze'
  | 'frostMist'
  | 'holyRay'
  | 'heal'
  | 'drain'
  | 'curse'

/** 스킬이 남기는 상태. 지속 턴이 0이 되면 사라진다. */
export type StatusKind = 'burn' | 'stun' | 'slow' | 'atkDown' | 'guard'

export type Skill = {
  id: SkillId
  line: SkillLine
  name: string
  /** 마나 소모. 최대 마나는 마법력과 같아서 초반엔 2~3회가 한계다. */
  mp: number
  /** 공격 배율. 없으면 피해를 주지 않는 스킬 */
  power?: number
  /** 물리는 공격력, 마법은 마법력을 쓴다 */
  kind: 'physical' | 'magic' | 'support'
  /** 배율을 이 횟수만큼 나눠 때린다 (연격) */
  hits?: number
  target: 'one' | 'all' | 'self'
  /** 명중 시 대상에게 남기는 상태 */
  inflict?: { kind: StatusKind; turns: number; value?: number }
  /** 준 피해의 이 비율만큼 체력을 회복 */
  drain?: number
  /** 최대 체력의 이 비율을 회복 */
  healRatio?: number
}

export const SKILLS: Record<SkillId, Skill> = {
  strike: { id: 'strike', line: 'sword', name: '강타', mp: 6, kind: 'physical', power: 1.8, target: 'one' },
  combo: { id: 'combo', line: 'sword', name: '연격', mp: 6, kind: 'physical', power: 1.4, hits: 2, target: 'one' },
  guardStance: {
    id: 'guardStance',
    line: 'sword',
    name: '반격 태세',
    mp: 6,
    kind: 'support',
    target: 'self',
    inflict: { kind: 'guard', turns: 1 },
  },
  fireball: {
    id: 'fireball',
    line: 'fire',
    name: '화염구',
    mp: 6,
    kind: 'magic',
    power: 1.5,
    target: 'one',
    inflict: { kind: 'burn', turns: 3, value: 6 },
  },
  blaze: { id: 'blaze', line: 'fire', name: '폭염', mp: 9, kind: 'magic', power: 1, target: 'all' },
  freeze: {
    id: 'freeze',
    line: 'ice',
    name: '빙결',
    mp: 9,
    kind: 'magic',
    power: 1.3,
    target: 'one',
    inflict: { kind: 'stun', turns: 1 },
  },
  frostMist: {
    id: 'frostMist',
    line: 'ice',
    name: '서리 안개',
    mp: 6,
    kind: 'support',
    target: 'all',
    inflict: { kind: 'slow', turns: 3 },
  },
  holyRay: { id: 'holyRay', line: 'holy', name: '성광', mp: 6, kind: 'magic', power: 1.4, target: 'one' },
  heal: { id: 'heal', line: 'holy', name: '치유', mp: 9, kind: 'support', target: 'self', healRatio: 0.35 },
  drain: {
    id: 'drain',
    line: 'dark',
    name: '흡혈',
    mp: 6,
    kind: 'magic',
    power: 1.2,
    target: 'one',
    drain: 0.5,
  },
  curse: {
    id: 'curse',
    line: 'dark',
    name: '저주',
    mp: 6,
    kind: 'support',
    target: 'all',
    inflict: { kind: 'atkDown', turns: 3, value: 0.3 },
  },
}

export const SKILL_IDS = Object.keys(SKILLS) as SkillId[]

export function skillsOfLine(line: SkillLine): Skill[] {
  return SKILL_IDS.map((id) => SKILLS[id]).filter((s) => s.line === line)
}

/**
 * 능력치 → 계열 친화도.
 * 주사위로 받은 능력치가 어느 방향에 유리한지를 정하는 고리다. (기획서 04 §3.1)
 * 보상에 등장하는 스킬 계열의 가중치와, 전직 시 동수 판정의 우선순위에 쓴다.
 *
 * 체력은 어느 계열도 밀어주지 않는다 — 체력형(주사위 1번 눈)은 자유 빌드다.
 */
export function affinity(stats: Stats, line: SkillLine): number {
  switch (line) {
    case 'sword':
      return stats.atk
    case 'fire':
    case 'ice':
      return stats.mag
    case 'holy':
      return stats.luk
    case 'dark':
      return stats.spd
  }
}
