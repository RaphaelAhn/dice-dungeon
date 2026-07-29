import { BASE_STATS, type Stats } from './character'

export type BlessingId = 1 | 2 | 3 | 4 | 5 | 6

export const BLESSING_IDS: BlessingId[] = [1, 2, 3, 4, 5, 6]

/**
 * 축복이 건드리는 건 스탯만이 아니다. 규칙 자체를 바꾸는 것도 있다(5·6번).
 * 그래서 '스탯 보정'과 '규칙 플래그'를 한 타입에 같이 담는다.
 */
export type BlessingEffect = {
  /** 시작 스탯에 더할 값 */
  stats?: Partial<Stats>
  /** 보상 티어 추첨 시 상위 티어 확률표를 쓴다 (기획서 v0.2 §6) */
  tierUp?: boolean
  /** 사망 시 종료 대신 이전 스테이지로 1회 복귀 */
  extraLife?: boolean
  /** 보상 선택지 수. 미지정 시 기본 3 */
  rewardChoices?: number
}

export type Blessing = {
  id: BlessingId
  name: string
  /** 한 줄 설명 — 주사위 결과 화면에 그대로 노출된다 */
  desc: string
  /** 플레이 방향. "낮은 눈 = 손해"가 아니라 "다른 스타일"임을 보여주는 라벨 */
  style: string
  effect: BlessingEffect
}

export const BLESSINGS: Record<BlessingId, Blessing> = {
  1: {
    id: 1,
    name: '단단한 몸',
    desc: '체력 +30',
    style: '안정형',
    effect: { stats: { hp: 30 } },
  },
  2: {
    id: 2,
    name: '탐욕의 눈',
    desc: '보상 상위 티어 출현 확률 증가',
    style: '성장형',
    effect: { tierUp: true },
  },
  3: {
    // 기획서 v0.2 §3 이 직접 "기본 마법력의 5배라 튄다"고 표시한 값이다.
    // 전투 구현 후 실측으로 조정한다. 지금 임의로 낮추면 기획 의도와 어긋난다.
    id: 3,
    name: '마력의 각성',
    desc: '마법력 +80',
    style: '화력형',
    effect: { stats: { mag: 80 } },
  },
  4: {
    id: 4,
    name: '균형의 축복',
    desc: '모든 스탯 상승 (체력 +20, 공격 +10, 마법 +10, 속도 +5, 행운 +5)',
    style: '밸런스형',
    effect: { stats: { hp: 20, atk: 10, mag: 10, spd: 5, luk: 5 } },
  },
  5: {
    id: 5,
    name: '두 번째 삶',
    desc: '사망 1회 추가권 — 쓰러져도 이전 스테이지에서 다시 시작',
    style: '보험형',
    effect: { extraLife: true },
  },
  6: {
    id: 6,
    name: '가능성의 문',
    desc: '스테이지 보상이 3택 → 4택',
    style: '선택형',
    effect: { rewardChoices: 4 },
  },
}

export const DEFAULT_REWARD_CHOICES = 3

/** 축복을 적용한 시작 스탯. BASE_STATS 는 건드리지 않는다. */
export function applyBlessing(id: BlessingId): Stats {
  const add = BLESSINGS[id].effect.stats ?? {}
  return {
    hp: BASE_STATS.hp + (add.hp ?? 0),
    atk: BASE_STATS.atk + (add.atk ?? 0),
    mag: BASE_STATS.mag + (add.mag ?? 0),
    spd: BASE_STATS.spd + (add.spd ?? 0),
    luk: BASE_STATS.luk + (add.luk ?? 0),
  }
}

/** 굴림은 여기 한 곳에서만 일어난다. 리롤 불가라 호출부가 늘어나면 안 된다. */
export function rollBlessing(): BlessingId {
  return (1 + Math.floor(Math.random() * 6)) as BlessingId
}
