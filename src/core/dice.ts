import { BASE_STATS, type Stats } from './character'

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
  /** 시작 스탯에 더할 값 */
  stats?: Partial<Stats>
  /** 보상 티어를 최고 등급으로 확정해 주는 횟수 */
  topTier?: number
}

/**
 * ⚠ 수치는 잠정값이다. 전투 공식이 없는 상태에서는
 * "체력 +40 과 공격력 +10 중 뭐가 센가"를 판단할 근거가 없다.
 * 전투 구현 후 실측으로 이 표만 고친다. 다른 파일은 손댈 필요 없다.
 */
export const DICE: Record<Face, DiceResult> = {
  1: {
    face: 1,
    name: '단단한 몸',
    desc: '체력 +40',
    favors: '맞아가며 버티는 지속전',
    stats: { hp: 40 },
  },
  2: {
    face: 2,
    name: '벼려진 칼날',
    desc: '공격력 +10',
    favors: '검술 계열',
    stats: { atk: 10 },
  },
  3: {
    face: 3,
    // 마법력은 스킬 데미지와 최대 마나를 겸한다. 같은 수치라도 두 몫을 한다.
    name: '마력의 각성',
    desc: '마법력 +15',
    favors: '화염·얼음 계열',
    stats: { mag: 15 },
  },
  4: {
    face: 4,
    name: '가벼운 발',
    desc: '속도 +8',
    favors: '선공과 회피, 암흑 계열',
    stats: { spd: 8 },
  },
  5: {
    face: 5,
    name: '행운의 손',
    desc: '행운 +8',
    favors: '보상 티어와 크리티컬, 신성 계열',
    stats: { luk: 8 },
  },
  6: {
    face: 6,
    // 유일하게 능력치가 아닌 눈. 대신 횟수를 묶어 다른 눈과 무게를 맞춘다.
    // 매 스테이지 확정으로 바꾸려면 이 숫자만 올리면 된다.
    name: '정해진 운명',
    desc: '첫 보상의 티어가 최고 등급으로 확정',
    favors: '어느 방향이든 — 시작부터 강한 카드 하나',
    topTier: 1,
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
