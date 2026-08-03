import { aliveEnemies, startBattle, takeTurn, type BattleState, type Command } from '../src/core/battle'
import { FACES, type Face } from '../src/core/dice'
import { encounterKind, rollEncounter, type EnemyDef } from '../src/core/enemy'
import { BAKE_STAGE } from '../src/core/pizza'
import { applyCard, consumeTopTier, makeOffer, type Card } from '../src/core/reward'
import {
  addTopping,
  bake,
  canAddTopping,
  createRun,
  healAfterStage,
  PICKS_PER_STOP,
  refillMp,
  type Run,
} from '../src/core/run'
import { SKILLS, skillsOfTaste, type SkillId } from '../src/core/skill'
import { maxTurns } from '../src/core/timer'
import { TASTE_CLASH, toppingStats, type Taste } from '../src/core/topping'

/**
 * 밸런스 시뮬레이터.
 *
 * 실제 코어(전투·토핑·보상·굽기)를 그대로 불러 쓴다. 수치를 따로 베껴 두면
 * 코드를 고칠 때마다 어긋나서 측정값이 거짓말을 한다.
 *
 * 실행: npm run sim
 */

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 재료를 도우에 올릴지 고르는 방식.
 * 피자 테마로 오면서 새로 생긴 판단 축이라 여기를 집중적으로 잰다.
 */
type RecruitPolicy = { label: string; pick: (opts: EnemyDef[], run: Run) => EnemyDef | null }

const RECRUITS: RecruitPolicy[] = [
  {
    // 첫 재료의 맛을 따라간다 — '완성' 등급을 노리는 정석
    label: '한 맛 집중',
    pick: (opts, run) => {
      if (!canAddTopping(run)) return null
      if (run.toppings.length === 0) return opts[0]
      const target = run.toppings[0].taste
      return opts.find((o) => o.topping.taste === target) ?? null
    },
  },
  {
    label: '무조건 올림',
    pick: (opts, run) => (canAddTopping(run) ? opts[0] : null),
  },
  {
    // 무게가 가벼운 것만 — 손놀림을 지킨다
    label: '가벼운 것만',
    pick: (opts, run) => {
      if (!canAddTopping(run)) return null
      return [...opts].sort((a, b) => a.topping.weight - b.topping.weight)[0]
    },
  },
  {
    /*
     * 충돌 쌍은 매콤↔새콤, 진한↔향긋 둘뿐이고 담백은 어느 것과도 안 부딪친다.
     * "한 맛만 고집"과 "아무거나" 사이에 이 전략이 있는데 재고 있지 않았다.
     */
    label: '안 부딪치는 것만',
    pick: (opts, run) => {
      if (!canAddTopping(run)) return null
      const have = new Set(run.toppings.map((t) => t.taste))
      return (
        opts.find((o) => {
          const other = TASTE_CLASH[o.topping.taste]
          return !other || !have.has(other)
        }) ?? null
      )
    },
  },
  {
    label: '전부 지나치기',
    pick: () => null,
  },
]

/** 보상 3택에서 무엇을 고르는가 */
type RewardPolicy = { label: string; choose: (cards: Card[], run: Run) => number }

const REWARDS: RewardPolicy[] = [
  {
    label: '장인 우선',
    choose: (cards) => Math.max(0, cards.findIndex((c) => c.slot === 'craft')),
  },
  {
    label: '숙성 우선',
    choose: (cards) => Math.max(0, cards.findIndex((c) => c.slot === 'age')),
  },
  {
    label: '도박 우선',
    choose: (cards) => Math.max(0, cards.findIndex((c) => c.slot === 'gamble')),
  },
  {
    label: '상황 판단',
    choose: (cards, run) => {
      if (run.hp < run.max.hp * 0.5) {
        const h = cards.findIndex((c) => c.slot === 'age')
        if (h >= 0) return h
      }
      return Math.max(0, cards.findIndex((c) => c.slot === 'craft'))
    },
  },
]

function ownedSkillIds(run: Run): SkillId[] {
  const tastes = [...new Set(run.toppings.map((t) => t.taste))] as Taste[]
  return tastes.flatMap((t) =>
    skillsOfTaste(t)
      .filter((s) => s.power)
      .map((s) => s.id),
  )
}

function chooseCommand(s: BattleState, owned: SkillId[]): Command {
  const hpRatio = s.player.hp / s.player.maxHp
  if (hpRatio < 0.3 && s.potions > 0) return { type: 'item' }

  const many = aliveEnemies(s).length > 1
  const affordable = owned.filter((id) => SKILLS[id].mp <= s.mp)
  if (affordable.length > 0) {
    const best = affordable
      .map((id) => SKILLS[id])
      .sort((a, b) => {
        const score = (sk: (typeof SKILLS)[SkillId]) =>
          (sk.power ?? 0) * (sk.target === 'all' && many ? aliveEnemies(s).length : 1)
        return score(b) - score(a)
      })[0]
    return { type: 'skill', id: best.id }
  }
  if (hpRatio < 0.45) return { type: 'defend' }
  return { type: 'attack' }
}

const SEC_PER_TURN = 3.2

type Outcome = {
  cleared: boolean
  turns: number
  deadAt: number | null
  timedOutAt: number | null
  toppings: number
  grade: string
}

function playRun(face: Face, rec: RecruitPolicy, rw: RewardPolicy, seed: number): Outcome {
  const rng = mulberry32(seed)
  let run = createRun('round', '도우', face)
  let turns = 0

  for (let stage = 1; stage <= 10; stage++) {
    run = { ...run, stage }
    if (stage >= BAKE_STAGE) run = bake(run)
    run = refillMp(run)

    const enc = rollEncounter(stage, rng)
    let s = startBattle(run, enc)
    const owned = ownedSkillIds(run)
    let stageTurns = 0
    const cap = maxTurns(encounterKind(stage))

    while (!s.over && stageTurns < cap) {
      s = takeTurn(s, chooseCommand(s, owned), rng)
      stageTurns++
    }
    turns += stageTurns
    run = { ...run, hp: s.player.hp, mp: s.mp, potions: s.potions }

    const done = (ok: boolean, dead: number | null, out: number | null): Outcome => ({
      cleared: ok,
      turns,
      deadAt: dead,
      timedOutAt: out,
      toppings: run.toppings.length,
      grade: run.pizza?.grade ?? '-',
    })

    if (s.over === 'lose') return done(false, stage, null)
    if (s.over !== 'win') return done(false, null, stage)

    run = healAfterStage(run)

    // 동료로 만들기 / 지나치기
    const picked = rec.pick(enc.enemies, run)
    if (picked) run = addTopping(run, picked.topping, toppingStats(picked.topping))

    if (run.rewardStages.includes(stage)) {
      for (let i = 0; i < PICKS_PER_STOP; i++) {
        const offer = makeOffer(run, rng)
        if (offer.usedTopTier) run = consumeTopTier(run)
        run = applyCard(run, offer.cards[rw.choose(offer.cards, run)])
      }
    }
  }
  return {
    cleared: true,
    turns,
    deadAt: null,
    timedOutAt: null,
    toppings: run.toppings.length,
    grade: run.pizza?.grade ?? '-',
  }
}

const TRIALS = 40
const pct = (n: number) => `${(n * 100).toFixed(0).padStart(3)}%`

console.log(`=== 재료 정책별 클리어율 (보상: 상황 판단 고정 · 주사위 6면 × ${TRIALS}회) ===\n`)
console.log(`${''.padEnd(16)}${FACES.map((f) => `눈${f}`.padStart(6)).join('')}${'전체'.padStart(8)}${'평균턴'.padStart(8)}${'토핑'.padStart(7)}`)

const situational = REWARDS[3]
for (const rec of RECRUITS) {
  let cleared = 0
  let turns = 0
  let tops = 0
  const per: number[] = []
  for (const face of FACES) {
    let c = 0
    for (let t = 0; t < TRIALS; t++) {
      const o = playRun(face, rec, situational, face * 7919 + t * 104729 + rec.label.length)
      if (o.cleared) {
        c++
        cleared++
      }
      turns += o.turns
      tops += o.toppings
    }
    per.push(c / TRIALS)
  }
  const n = TRIALS * FACES.length
  console.log(
    `${rec.label.padEnd(16)}${per.map((v) => pct(v).padStart(6)).join('')}` +
      `${pct(cleared / n).padStart(8)}${(turns / n).toFixed(1).padStart(8)}${(tops / n).toFixed(1).padStart(7)}`,
  )
}

console.log(`\n=== 보상 정책별 (재료: 한 맛 집중 고정) ===\n`)
const focus = RECRUITS[0]
for (const rw of REWARDS) {
  let cleared = 0
  let turns = 0
  const grades: Record<string, number> = {}
  for (const face of FACES) {
    for (let t = 0; t < TRIALS; t++) {
      const o = playRun(face, focus, rw, face * 31337 + t * 65537 + rw.label.length)
      if (o.cleared) cleared++
      turns += o.turns
      grades[o.grade] = (grades[o.grade] ?? 0) + 1
    }
  }
  const n = TRIALS * FACES.length
  const g = Object.entries(grades)
    .map(([k, v]) => `${k} ${Math.round((v / n) * 100)}%`)
    .join(' · ')
  console.log(`${rw.label.padEnd(12)} 클리어 ${pct(cleared / n)}  ${(turns / n).toFixed(1)}턴  [${g}]`)
}

const one = playRun(3, focus, situational, 1)
console.log(
  `\n한 판 예시 — ${one.turns}턴 ≈ ${((one.turns * SEC_PER_TURN) / 60).toFixed(1)}분 (전투만), 토핑 ${one.toppings}개, 완성도 ${one.grade}`,
)
