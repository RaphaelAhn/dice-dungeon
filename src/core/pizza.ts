import type { Stats } from './character'
import { tasteAffinity, TASTE_LABEL, TASTES, type Taste, type Topping } from './topping'

/* 피자의 정체성이 정해지는 시점·판정·보너스를 한곳에 모은다. */

/**
 * 1-8 진입 시 도우가 굳고 피자의 성격이 정해진다.
 * 올린 토핑 수나 보상과 무관하게 무조건 일어난다.
 */
export const BAKE_STAGE = 8

/** 맛이 얼마나 모였는지에 따라 완성도가 갈린다 */
export type Grade = 'full' | 'partial' | 'thin'

export const GRADE_META: Record<Grade, { label: string; ratio: number; desc: string }> = {
  full: { label: '완성', ratio: 1, desc: '주 풍미 전량 + 부 풍미 특성' },
  partial: { label: '미완', ratio: 0.7, desc: '주 풍미 70% + 부 풍미 특성' },
  thin: { label: '밋밋', ratio: 0.4, desc: '주 풍미 40%, 부 풍미 특성 없음' },
}

/** 주 풍미 보너스 ⚠ */
export const MAIN_BONUS: Record<
  Taste,
  { stats: Partial<Stats>; damageMul?: number; critAdd?: number; healMul?: number }
> = {
  mild: { stats: { hp: 30 }, healMul: 0.3 },
  spicy: { stats: { atk: 15 }, damageMul: 0.15 },
  tangy: { stats: { luk: 8 }, critAdd: 0.1 },
  herbal: { stats: { spd: 8 }, damageMul: 0.1 },
  rich: { stats: { mag: 15 }, damageMul: 0.15 },
}

/** 부 풍미 특성 — 수치가 아니라 규칙을 하나 더한다 */
export const SUB_TRAIT: Record<Taste, string> = {
  mild: '턴 종료 시 최대 체력의 5% 회복',
  spicy: '통상 공격이 반죽 탄력을 5 회복시킨다',
  tangy: '기술 명중 시 1턴 상대 둔화',
  herbal: '기술 명중 시 3턴 지속 피해',
  rich: '준 피해의 15%를 체력으로 흡수',
}

export type PizzaBonus = {
  stats: Partial<Stats>
  damageMul: number
  critAdd: number
  healMul: number
  trait: Taste | null
}

/** 주 풍미 × 부 풍미 = 25종. 대각선(주=부)은 한 가지 맛으로만 채운 피자다. */
export const PIZZA_NAMES: Record<Taste, Record<Taste, string>> = {
  mild: {
    mild: '클래식 마르게리타',
    spicy: '순한 디아볼라',
    tangy: '상큼한 카프레제',
    herbal: '허브 비앙카',
    rich: '크리미 콰트로',
  },
  spicy: {
    mild: '마일드 페퍼로니',
    spicy: '인페르노',
    tangy: '스파이시 하와이안',
    herbal: '허브 디아볼라',
    rich: '핫 바베큐',
  },
  tangy: {
    mild: '레몬 비앙카',
    spicy: '칠리 토마토',
    tangy: '트리플 토마토',
    herbal: '루꼴라 프로슈토',
    rich: '선드라이 트러플',
  },
  herbal: {
    mild: '바질 마르게리타',
    spicy: '페스토 디아볼라',
    tangy: '허브 카프레제',
    herbal: '가든 페스토',
    rich: '트러플 페스토',
  },
  rich: {
    mild: '콰트로 포르마지',
    spicy: '고르곤졸라 칠리',
    tangy: '트러플 토마토',
    herbal: '트러플 가든',
    rich: '블랙 트러플',
  },
}

export type Pizza = {
  main: Taste
  sub: Taste | null
  grade: Grade
  name: string
}

/**
 * 1-8 시점의 피자 판정.
 *
 * 주 풍미는 가장 많이 올린 맛이다. 동수면 능력치 친화도가 높은 쪽이 이긴다 —
 * 주사위로 받은 능력치가 여기서 한 번 더 방향을 잡아 준다.
 * 토핑이 하나도 없어도 친화도만으로 정해진다. 굽기는 무조건 일어나니까.
 */
export function decidePizza(toppings: Topping[], stats: Stats): Pizza {
  const count = (t: Taste) => toppings.filter((x) => x.taste === t).length

  // 보유 수 → 친화도 → TASTES 순서. 마지막 기준이 없으면 같은 입력에 다른 결과가 나온다.
  const ranked = [...TASTES].sort((a, b) => {
    const byCount = count(b) - count(a)
    if (byCount !== 0) return byCount
    const byAffinity = tasteAffinity(stats, b) - tasteAffinity(stats, a)
    if (byAffinity !== 0) return byAffinity
    return TASTES.indexOf(a) - TASTES.indexOf(b)
  })

  const main = ranked[0]
  const sub = ranked.find((t) => t !== main && count(t) > 0) ?? null
  const mainCount = count(main)

  // 한 맛 3개(순수)와 주2+부1(조합) 둘을 완성형으로 본다.
  const grade: Grade =
    mainCount >= 3 || (mainCount === 2 && sub !== null)
      ? 'full'
      : mainCount === 2
        ? 'partial'
        : 'thin'

  // 토핑이 없거나 하나뿐인데 그럴듯한 이름이 붙으면 어색하다.
  const prefix = toppings.length <= 1 ? '맨 ' : ''

  return { main, sub, grade, name: prefix + PIZZA_NAMES[main][sub ?? main] }
}

export function pizzaBonus(pizza: Pizza): PizzaBonus {
  const ratio = GRADE_META[pizza.grade].ratio
  const b = MAIN_BONUS[pizza.main]
  const scale = (n: number | undefined) => Math.round((n ?? 0) * ratio)
  return {
    stats: {
      hp: scale(b.stats.hp),
      atk: scale(b.stats.atk),
      mag: scale(b.stats.mag),
      spd: scale(b.stats.spd),
      luk: scale(b.stats.luk),
    },
    damageMul: (b.damageMul ?? 0) * ratio,
    critAdd: (b.critAdd ?? 0) * ratio,
    healMul: (b.healMul ?? 0) * ratio,
    // 부 풍미가 없으면 주 풍미가 특성을 대신 준다. 안 그러면 순수 피자가 손해다.
    trait: pizza.grade === 'thin' ? null : (pizza.sub ?? pizza.main),
  }
}

export function pizzaLabel(pizza: Pizza): string {
  return `${pizza.name} (${GRADE_META[pizza.grade].label})`
}

/** "진한 2 · 매콤 1" 형태로 풍미 구성을 보여준다 */
export function tasteSummary(toppings: Topping[]): string {
  return TASTES.filter((t) => toppings.some((x) => x.taste === t))
    .map((t) => `${TASTE_LABEL[t]} ${toppings.filter((x) => x.taste === t).length}`)
    .join(' · ')
}
