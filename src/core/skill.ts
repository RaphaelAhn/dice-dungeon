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
