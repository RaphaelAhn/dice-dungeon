import type { Gender, Stats } from './character'
import { applyFace, DICE, type Face } from './dice'
import type { SkillLine } from './skill'
import { initialBudget } from './timer'

export const FINAL_STAGE = 10

/** 보상 선택지는 항상 3개다. 주사위도 이 수를 바꾸지 않는다. */
export const REWARD_CHOICES = 3

/**
 * 보상이 나오는 스테이지 조합. 판이 시작될 때 이 중 하나를 랜덤으로 뽑는다.
 * 매 판 같은 자리에서 보상이 나오면 순서를 외워 최적해를 굳힐 수 있다.
 * 조합을 굴려 "언제 받을지"를 판마다 흔든다. (기획서 04 §1)
 *
 * 1-10 은 보스라 클리어하면 보상 대신 게임이 끝나므로 어느 조합에도 없다.
 * 두 조합 모두 지점 3곳이고, 1-5 중간보스 시점과 1-10 보스 시점의
 * 누적 카드 수가 같다 — §1.4 참고.
 */
export const REWARD_SCHEDULES: readonly (readonly number[])[] = [
  [1, 3, 9],
  [2, 4, 8],
]

/** 한 지점에서 3택 1 을 이 횟수만큼 연속으로 고른다. 총 선택은 3 × 3 = 9회. */
export const PICKS_PER_STOP = 3

export function rollSchedule(): readonly number[] {
  return REWARD_SCHEDULES[Math.floor(Math.random() * REWARD_SCHEDULES.length)]
}

/** 이 스테이지를 클리어하면 보상 지점인가 */
export function isRewardStage(run: Run, stage: number): boolean {
  return run.rewardStages.includes(stage)
}

/** 다음 보상까지 남은 스테이지 수. 없으면 null (마지막 지점을 지났다) */
export function stagesToNextReward(run: Run): number | null {
  const next = run.rewardStages.find((s) => s >= run.stage)
  return next === undefined ? null : next - run.stage
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
  /** 이 판에서 뽑힌 보상 지점. 판이 끝날 때까지 바뀌지 않는다. */
  rewardStages: readonly number[]
  /** 남은 '최고 티어 확정' 횟수. 주사위 6번 눈이 1을 준다. */
  topTierLeft: number
  /** 보유 스킬. 1-8 전직 판정의 입력이 된다. */
  skills: SkillLine[]
  potions: number
  /** 남은 제한 시간(ms). 0 이 되면 게임 오버. (timer.ts) */
  timeLeft: number
}

/** ⚠ 시작 포션 개수 */
export const START_POTIONS = 2

/**
 * ⚠ 스테이지 클리어 시 회복량 (최대 체력 비율). 시뮬레이션 240판으로 뽑은 값.
 *
 * 회복을 보상 지점에 묶으면 안 된다. 조합 [1,3,9] 은 4~9 여섯 스테이지를
 * 연속 무회복으로 통과해야 해서 [2,4,8] 보다 크게 불리해진다.
 * 클리어마다 조금씩 주면 조합과 무관해진다.
 */
export const STAGE_HEAL_RATIO = 0.25

export function healAfterStage(run: Run): Run {
  return {
    ...run,
    hp: Math.min(run.max.hp, run.hp + Math.round(run.max.hp * STAGE_HEAL_RATIO)),
  }
}

/** 마나는 전투 시작 시 채운다. 런 전체 자원이면 스킬이 죽는다. */
export function refillMp(run: Run): Run {
  return { ...run, mp: maxMp(run.max) }
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
    rewardStages: rollSchedule(),
    topTierLeft: DICE[face].topTier ?? 0,
    skills: [],
    potions: START_POTIONS,
    timeLeft: initialBudget(),
  }
}
