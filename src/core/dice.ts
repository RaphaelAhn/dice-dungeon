import { BASE_STATS, STAT_LABEL, type Stats } from './character'

export type Face = 1 | 2 | 3 | 4 | 5 | 6

export const FACES: Face[] = [1, 2, 3, 4, 5, 6]

/**
 * 주사위 눈 1~5 는 능력치 5종에 하나씩 대응하고, 6 은 보상 티어를 확정한다.
 * 눈이 규칙을 바꾸는 건 6번 하나뿐이며, 그것도 횟수가 정해진 1회성이다.
 */
export type DiceResult = {
  face: Face
  name: string
  /** 결과 화면에 그대로 노출되는 한 줄 */
  desc: string
  /** 이 눈이 유리하게 만들어 주는 방향. "낮은 눈 = 손해"가 아님을 보여주는 라벨 */
  favors: string
  /** 숙성 온도(℃) — 화면에 보여 줄 값이고 계산에는 쓰지 않는다 */
  temp: number
  /** 발효도(%) — 마찬가지로 표시용 */
  ferment: number
  /** 시작 스탯에 더할 값 */
  stats?: Partial<Stats>
  /** 보상 티어를 최고 등급으로 확정해 주는 횟수 */
  topTier?: number
}

/**
 * ⚠ 수치는 시뮬레이션(npm run sim)으로 맞춘 값이다.
 * 눈별 클리어율이 한쪽으로 쏠리면 이 표만 고친다. 다른 파일은 손댈 필요 없다.
 *
 * 이름이 등급 사다리처럼 읽히지만 여섯 결과에 우열은 없다. 클리어율이
 * 45~73% 로 비슷하게 맞춰져 있고, 그래야 '나쁘게 시작해도 선택으로 만회'가
 * 성립한다. 이름은 성격을 부르는 별명이지 등급이 아니다.
 */
export const DICE: Record<Face, DiceResult> = {
  1: {
    face: 1,
    temp: 2,
    ferment: 95,
    name: '응애 도우',
    desc: `${STAT_LABEL.hp} +40`,
    favors: '맞아가며 버티는 도우 · 담백한 재료',
    stats: { hp: 40 },
  },
  2: {
    face: 2,
    temp: 9,
    ferment: 70,
    name: '근본 도우',
    desc: `${STAT_LABEL.atk} +10`,
    favors: '직접 때려잡는 도우 · 매콤한 재료',
    stats: { atk: 10 },
  },
  3: {
    face: 3,
    temp: 5,
    ferment: 88,
    // 이 값은 기술 위력이자 기술을 쓸 밑천을 겸한다. 같은 수치라도 두 몫을 한다.
    name: '좀 치는 도우',
    desc: `${STAT_LABEL.mag} +12`,
    favors: '기술로 풀어 가는 도우 · 진한 재료',
    stats: { mag: 12 },
  },
  4: {
    face: 4,
    temp: 8,
    ferment: 62,
    name: '도우 GOAT',
    desc: `${STAT_LABEL.spd} +8`,
    favors: '선공과 회피 · 향긋한 재료',
    stats: { spd: 8 },
  },
  5: {
    face: 5,
    temp: 6,
    ferment: 78,
    name: '도우의 현자',
    desc: `${STAT_LABEL.luk} +8`,
    favors: '보상 등급과 결정타 · 새콤한 재료',
    stats: { luk: 8 },
  },
  6: {
    face: 6,
    temp: 0,
    ferment: 100,
    // 유일하게 능력치가 아닌 눈. 횟수로 다른 눈과 무게를 맞춘다.
    // 1회일 때 클리어율이 27% 로 혼자 처져 2회로 올렸다 (시뮬레이션 360판).
    // 매 스테이지 확정으로 바꾸려면 이 숫자만 올리면 된다.
    name: '떡잎부터 다른 도우',
    desc: '보상 2회의 티어가 최고 등급으로 확정',
    favors: '어느 방향이든 — 초반에 좋은 카드가 몰려 온다',
    topTier: 2,
  },
}

/** 눈이 적용된 시작 스탯. BASE_STATS 는 건드리지 않는다. */
export function applyFace(face: Face): Stats {
  const add = DICE[face].stats ?? {}
  return {
    hp: BASE_STATS.hp + (add.hp ?? 0),
    atk: BASE_STATS.atk + (add.atk ?? 0),
    mag: BASE_STATS.mag + (add.mag ?? 0),
    spd: BASE_STATS.spd + (add.spd ?? 0),
    luk: BASE_STATS.luk + (add.luk ?? 0),
  }
}

/** 굴림은 여기 한 곳에서만 일어난다. 리롤 불가라 호출부가 늘어나면 안 된다. */
export function rollDice(): Face {
  return (1 + Math.floor(Math.random() * 6)) as Face
}
