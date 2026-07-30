import type { SkillLine } from './skill'

export type EnemyDef = {
  name: string
  hp: number
  atk: number
  spd: number
  /** 속성. 역속성 스킬에 1.5배로 맞는다. 없으면 무속성 */
  line?: SkillLine
}

export type Encounter = {
  /** 이 스테이지의 성격. 보스는 연출과 보상 판정이 다르다. */
  kind: 'normal' | 'midboss' | 'boss'
  enemies: EnemyDef[]
}

/**
 * ⚠ 수치는 잠정값이다. 시뮬레이션으로 클리어율과 소요 턴을 측정해 조정한다.
 *
 * 설계 의도:
 * - 1-1·1-2 는 보상 전 구간이라 주사위 능력치만으로 이긴다. 약하게 잡았다.
 * - 1-5 중간보스는 첫 고비. 전직 전(1-8 전직)이라 스킬과 스탯만으로 넘어야 한다.
 * - 1-8 부터는 전직 보너스가 들어오므로 난이도를 올릴 여지가 있다.
 * - 1-10 보스는 전직 직업으로 상대하는 것을 전제로 잡았다.
 */
export const ENCOUNTERS: Record<number, Encounter> = {
  1: { kind: 'normal', enemies: [{ name: '동굴 박쥐', hp: 70, atk: 6, spd: 9 }] },
  2: { kind: 'normal', enemies: [{ name: '굴뚝 쥐', hp: 85, atk: 7, spd: 10 }] },
  3: {
    kind: 'normal',
    enemies: [
      { name: '해골 병사', hp: 55, atk: 5, spd: 9, line: 'dark' },
      { name: '해골 병사', hp: 55, atk: 5, spd: 9, line: 'dark' },
    ],
  },
  4: {
    kind: 'normal',
    enemies: [
      { name: '불씨 정령', hp: 65, atk: 6, spd: 11, line: 'fire' },
      { name: '서리 정령', hp: 65, atk: 6, spd: 11, line: 'ice' },
    ],
  },
  5: {
    kind: 'midboss',
    enemies: [{ name: '지하 감시자', hp: 260, atk: 12, spd: 12, line: 'dark' }],
  },
  6: {
    kind: 'normal',
    enemies: [
      { name: '타락 사제', hp: 80, atk: 7, spd: 12, line: 'holy' },
      { name: '망령', hp: 75, atk: 7, spd: 14, line: 'dark' },
    ],
  },
  7: {
    kind: 'normal',
    enemies: [
      { name: '화염 골렘', hp: 95, atk: 8, spd: 10, line: 'fire' },
      { name: '불씨 정령', hp: 85, atk: 8, spd: 12, line: 'fire' },
    ],
  },
  8: {
    kind: 'normal',
    enemies: [
      { name: '빙하 기사', hp: 105, atk: 9, spd: 13, line: 'ice' },
      { name: '서리 정령', hp: 95, atk: 9, spd: 13, line: 'ice' },
    ],
  },
  9: {
    kind: 'normal',
    enemies: [
      { name: '심연 술사', hp: 120, atk: 10, spd: 15, line: 'dark' },
      { name: '망령', hp: 105, atk: 10, spd: 16, line: 'dark' },
    ],
  },
  10: {
    kind: 'boss',
    enemies: [{ name: '주사위의 주인', hp: 420, atk: 16, spd: 16 }],
  },
}
