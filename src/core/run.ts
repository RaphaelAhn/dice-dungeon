import { applyBlessing, BLESSINGS, DEFAULT_REWARD_CHOICES, type BlessingId } from './blessing'
import type { Gender, Stats } from './character'

export const FINAL_STAGE = 10

/**
 * 한 판(런)의 전부. 사망하면 통째로 버려진다.
 * 저장되는 건 퍼즐 조각뿐이므로 여기 있는 값은 전부 휘발성이다. (save.ts 참고)
 */
export type Run = {
  gender: Gender
  name: string
  blessing: BlessingId
  /** 축복까지 적용된 최대치. 전투 중 보상으로 늘어날 수 있다. */
  max: Stats
  hp: number
  mp: number
  /** 1 ~ FINAL_STAGE. 표시할 때는 `1-${stage}` 형태 */
  stage: number
  /** 축복 5번. 사용하면 false 로 내려간다. */
  extraLife: boolean
  /** 축복 6번이면 4 */
  rewardChoices: number
  /** 축복 2번. 보상 티어 추첨에서 상위 확률표를 쓴다. */
  tierUp: boolean
  /** 사망권을 한 번이라도 썼는지 — 퍼즐 조각 차등 지급 판정에 쓴다. (기획서 §8) */
  usedExtraLife: boolean
}

/** 마나 최대치는 마법력과 같다. (기획서 v0.2 §2 — 마법력 = 스킬 데미지·최대 마나) */
export function maxMp(stats: Stats): number {
  return stats.mag
}

export function createRun(gender: Gender, name: string, blessing: BlessingId): Run {
  const max = applyBlessing(blessing)
  const e = BLESSINGS[blessing].effect
  return {
    gender,
    name,
    blessing,
    max,
    hp: max.hp,
    mp: maxMp(max),
    stage: 1,
    extraLife: e.extraLife ?? false,
    rewardChoices: e.rewardChoices ?? DEFAULT_REWARD_CHOICES,
    tierUp: e.tierUp ?? false,
    usedExtraLife: false,
  }
}
