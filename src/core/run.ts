import type { Shape, Stats } from './character'
import { applyFace, DICE, type Face } from './dice'
import { countClashes, decidePizza, pizzaBonus, type Pizza } from './pizza'
import { MAX_TOPPINGS, totalWeight, type Topping } from './topping'

export const FINAL_STAGE = 10

/** 보상 선택지는 항상 3개다. 주사위도 이 수를 바꾸지 않는다. */
export const REWARD_CHOICES = 3

/**
 * 보상이 나오는 라운드 조합. 판이 시작될 때 하나를 랜덤으로 뽑는다.
 * 매 판 같은 자리에서 나오면 순서를 외워 최적해를 굳힐 수 있다.
 */
export const REWARD_SCHEDULES: readonly (readonly number[])[] = [
  [1, 3, 9],
  [2, 4, 8],
]

/** 한 지점에서 고르는 카드 수. 1장을 고르면 바로 다음 라운드로 넘어간다. */
export const PICKS_PER_STOP = 1

export function rollSchedule(): readonly number[] {
  return REWARD_SCHEDULES[Math.floor(Math.random() * REWARD_SCHEDULES.length)]
}

export function stagesToNextReward(run: Run): number | null {
  const next = run.rewardStages.find((s) => s >= run.stage)
  return next === undefined ? null : next - run.stage
}

/**
 * 한 판(런)의 전부. 실패하면 통째로 버려진다.
 * 남는 건 도감에 기록된 피자뿐이다. (save.ts)
 */
export type Run = {
  shape: Shape
  name: string
  face: Face
  /** 주사위와 토핑까지 반영된 최대치 */
  max: Stats
  hp: number
  mp: number
  stage: number
  rewardStages: readonly number[]
  topTierLeft: number
  /** 도우에 올린 토핑. 이 목록이 곧 빌드이자 도감 항목이 된다. */
  toppings: Topping[]
  potions: number
  /** 1-8 진입 전에는 null. 구워진 뒤에는 바뀌지 않는다. */
  pizza: Pizza | null
}

/** ⚠ 시작 포션(반죽 물) 개수 */
export const START_POTIONS = 2

/**
 * ⚠ 라운드 클리어 시 회복량. 시뮬레이션 360판으로 뽑은 값.
 * 회복을 보상 지점에 묶으면 조합 [1,3,9] 이 크게 불리해진다.
 */
export const STAGE_HEAL_RATIO = 0.35

export function healAfterStage(run: Run): Run {
  return {
    ...run,
    hp: Math.min(run.max.hp, run.hp + Math.round(run.max.hp * STAGE_HEAL_RATIO)),
  }
}

/** 반죽 탄력(마나)은 전투 시작 시 채운다. 런 전체 자원이면 기술이 죽는다. */
export function refillMp(run: Run): Run {
  return { ...run, mp: maxMp(run.max) }
}

/** 탄력 최대치는 마법력과 같다 */
export function maxMp(stats: Stats): number {
  return stats.mag
}

/** 토핑을 더 올릴 수 있는가 */
export function canAddTopping(run: Run): boolean {
  return run.toppings.length < MAX_TOPPINGS
}

/**
 * 토핑을 도우에 올린다.
 * 능력치는 오르지만 무게만큼 속도가 깎인다 — 그래서 '지나치기'가 살아 있다.
 */
export function addTopping(run: Run, topping: Topping, gain: Partial<Stats>): Run {
  const toppings = [...run.toppings, topping]
  const max: Stats = {
    hp: run.max.hp + (gain.hp ?? 0),
    atk: run.max.atk + (gain.atk ?? 0),
    mag: run.max.mag + (gain.mag ?? 0),
    spd: run.max.spd + (gain.spd ?? 0),
    luk: run.max.luk + (gain.luk ?? 0),
  }
  // 무게는 총합으로 다시 계산한다. 매번 빼면 반올림 오차가 쌓인다.
  const base = run.max.spd + (gain.spd ?? 0) + totalWeight(run.toppings)
  max.spd = Math.max(1, base - totalWeight(toppings))

  return {
    ...run,
    toppings,
    max,
    hp: run.hp + (gain.hp ?? 0),
    mp: Math.min(maxMp(max), run.mp + (gain.mag ?? 0)),
  }
}

/**
 * 1-8 진입 시 도우가 굳는다. 올린 토핑과 무관하게 무조건 일어난다.
 * 보너스만큼 현재 체력도 같이 올린다 — 안 그러면 강해진 느낌이 안 난다.
 */
/**
 * ⚠ 충돌 하나당 굽고 난 능력치가 이만큼 깎인다.
 *
 * 보너스 배율만 깎아서는 부족했다. 토핑이 주는 생짜 능력치가 완성도 보너스보다
 * 훨씬 커서, 충돌을 감수하고 여섯 개를 다 올리는 쪽이 여전히 이겼다
 * (시뮬레이션 99% 대 77%). 능력치 자체를 깎아야 판단이 생긴다.
 */
const CLASH_STAT_PENALTY = 0.14

export function bake(run: Run): Run {
  if (run.pizza) return run
  const pizza = decidePizza(run.toppings, run.max)
  const b = pizzaBonus(pizza)
  const keep = Math.max(0.4, 1 - CLASH_STAT_PENALTY * countClashes(run.toppings))
  const cut = (n: number) => Math.max(1, Math.round(n * keep))
  const max: Stats = {
    hp: Math.max(30, cut(run.max.hp + (b.stats.hp ?? 0))),
    atk: cut(run.max.atk + (b.stats.atk ?? 0)),
    mag: cut(run.max.mag + (b.stats.mag ?? 0)),
    spd: cut(run.max.spd + (b.stats.spd ?? 0)),
    luk: cut(run.max.luk + (b.stats.luk ?? 0)),
  }
  return {
    ...run,
    pizza,
    max,
    hp: Math.min(max.hp, run.hp + (b.stats.hp ?? 0)),
    mp: Math.min(maxMp(max), run.mp + (b.stats.mag ?? 0)),
  }
}

export function createRun(shape: Shape, name: string, face: Face): Run {
  const max = applyFace(face)
  return {
    shape,
    name,
    face,
    max,
    hp: max.hp,
    mp: maxMp(max),
    stage: 1,
    rewardStages: rollSchedule(),
    topTierLeft: DICE[face].topTier ?? 0,
    toppings: [],
    potions: START_POTIONS,
    pizza: null,
  }
}
