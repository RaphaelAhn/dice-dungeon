import { MEATS, SAUCES, VEGGIES, type Taste, type Topping } from './topping'

export type EnemyDef = {
  name: string
  hp: number
  atk: number
  spd: number
  taste: Taste
  /** 쓰러뜨리면 이 토핑을 동료로 삼을 수 있다 */
  topping: Topping
}

export type Encounter = {
  kind: 'normal' | 'midboss' | 'boss'
  enemies: EnemyDef[]
}

/**
 * 스테이지별 적 규격. ⚠ 시뮬레이션 360판으로 맞춘 값이다.
 *
 * 토핑 50종에 체력·공격력을 각각 적어 두지 않는다. 그러면 같은 재료가
 * 몇 라운드에 나오냐에 따라 난이도가 널뛴다. 규격은 스테이지가 정하고,
 * 토핑은 이름과 맛만 준다.
 */
const SPEC: Record<number, { kind: Encounter['kind']; count: number; hp: number[]; atk: number; spd: number[] }> = {
  1: { kind: 'normal', count: 1, hp: [70], atk: 6, spd: [9] },
  2: { kind: 'normal', count: 1, hp: [85], atk: 7, spd: [10] },
  3: { kind: 'normal', count: 2, hp: [50, 50], atk: 5, spd: [9, 9] },
  4: { kind: 'normal', count: 2, hp: [60, 60], atk: 6, spd: [11, 11] },
  5: { kind: 'midboss', count: 1, hp: [170], atk: 10, spd: [12] },
  6: { kind: 'normal', count: 2, hp: [62, 58], atk: 6, spd: [12, 14] },
  7: { kind: 'normal', count: 2, hp: [74, 72], atk: 7, spd: [10, 12] },
  8: { kind: 'normal', count: 2, hp: [90, 82], atk: 8, spd: [13, 13] },
  9: { kind: 'normal', count: 2, hp: [104, 90], atk: 9, spd: [15, 16] },
  10: { kind: 'boss', count: 1, hp: [350], atk: 14, spd: [16] },
}

function poolFor(kind: Encounter['kind']): Topping[] {
  if (kind === 'midboss') return MEATS
  if (kind === 'boss') return SAUCES
  return VEGGIES
}

/**
 * 라운드마다 적을 새로 뽑는다. 고정 표가 아니라 매 판 달라진다.
 * 같은 라운드에 같은 재료가 둘 나오지 않게 막는다.
 */
export function rollEncounter(stage: number, rng: () => number = Math.random): Encounter {
  const spec = SPEC[stage] ?? SPEC[10]
  const pool = [...poolFor(spec.kind)]
  const enemies: EnemyDef[] = []

  for (let i = 0; i < spec.count; i++) {
    const idx = Math.floor(rng() * pool.length)
    const topping = pool.splice(idx, 1)[0]
    enemies.push({
      name: topping.name,
      hp: spec.hp[i] ?? spec.hp[0],
      atk: spec.atk,
      spd: spec.spd[i] ?? spec.spd[0],
      taste: topping.taste,
      topping,
    })
  }
  return { kind: spec.kind, enemies }
}

export function encounterKind(stage: number): Encounter['kind'] {
  return (SPEC[stage] ?? SPEC[10]).kind
}
