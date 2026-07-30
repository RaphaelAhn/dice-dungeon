import type { Gender, Stats } from './character'
import { applyFace, DICE, type Face } from './dice'

export const FINAL_STAGE = 10

/** 보상 선택지는 항상 3개다. 주사위도 이 수를 바꾸지 않는다. */
export const REWARD_CHOICES = 3

/**
 * 보상은 매 스테이지가 아니라 3라운드마다 나온다. (기획서 04 §1)
 * 1-10 은 보스라 클리어하면 보상 대신 게임이 끝나므로 목록에 없다.
 */
export const REWARD_STAGES: readonly number[] = [3, 6, 9]

/** 한 지점에서 3택 1 을 이 횟수만큼 연속으로 고른다. 총 선택은 3 × 3 = 9회. */
export const PICKS_PER_STOP = 3

/** 이 스테이지를 클리어하면 보상 지점인가 */
export function isRewardStage(stage: number): boolean {
  return REWARD_STAGES.includes(stage)
}

/**
 * 한 판(런)의 전부. 사망하면 통째로 버려진다.
 * 저장되는 건 퍼즐 조각 수 하나뿐이므로 여기 있는 값은 전부 휘발성이다. (save.ts 참고)
 */
export type Run = {
  gender: Gender
  name: string
  face: Face
  /** 주사위까지 적용된 최대치. 보상으로 늘어날 수 있다. */
  max: Stats
  hp: number
  mp: number
  /** 1 ~ FINAL_STAGE. 표시할 때는 `1-${stage}` 형태 */
  stage: number
  /** 남은 '최고 티어 확정' 횟수. 주사위 6번 눈이 1을 준다. */
  topTierLeft: number
}

/** 마나 최대치는 마법력과 같다. (기획서 v0.2 §2 — 마법력 = 스킬 데미지·최대 마나) */
export function maxMp(stats: Stats): number {
  return stats.mag
}

export function createRun(gender: Gender, name: string, face: Face): Run {
  const max = applyFace(face)
  return {
    gender,
    name,
    face,
    max,
    hp: max.hp,
    mp: maxMp(max),
    stage: 1,
    topTierLeft: DICE[face].topTier ?? 0,
  }
}
