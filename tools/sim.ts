import { aliveEnemies, startBattle, takeTurn, type BattleState, type Command } from '../src/core/battle'
import { FACES, type Face } from '../src/core/dice'
import { ENCOUNTERS } from '../src/core/enemy'
import { JOB_STAGE } from '../src/core/job'
import { applyCard, consumeTopTier, makeOffer, type Card } from '../src/core/reward'
import { createRun, healAfterStage, PICKS_PER_STOP, promote, refillMp, type Run } from '../src/core/run'
import { SKILLS, skillsOfLine, type SkillId } from '../src/core/skill'
import { maxTurns } from '../src/core/timer'

/**
 * 밸런스 시뮬레이터.
 *
 * 실제 코어(전투·보상·전직)를 그대로 불러 쓴다. 수치를 따로 베껴 두면
 * 코드를 고칠 때마다 어긋나서 측정값이 거짓말을 한다.
 *
 * 실행: npm run sim
 */

/** 재현 가능한 난수 — 같은 시드면 같은 결과가 나온다 */
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

/** 보상 3택에서 무엇을 고르는 사람인가 */
type Policy = { label: string; choose: (cards: Card[], run: Run) => number }

const POLICIES: Policy[] = [
  {
    // 스킬을 최우선으로, 이미 가진 계열을 이어 붙인다 — 전직 '완성' 등급을 노린다
    label: '집중 (같은 계열 스킬 우선)',
    choose: (cards, run) => {
      const skill = cards.findIndex(
        (c) => c.slot === 'skill' && (run.skills.length === 0 || run.skills.includes(c.line)),
      )
      if (skill >= 0 && run.skills.length < 3) return skill
      const stat = cards.findIndex((c) => c.slot === 'stat' || c.slot === 'heal')
      return stat >= 0 ? stat : 0
    },
  },
  {
    // 계열을 안 보고 스킬이면 무조건 집는다 — '빈약' 등급으로 떨어지는 경로
    label: '분산 (계열 안 보고 스킬)',
    choose: (cards, run) => {
      const skill = cards.findIndex((c) => c.slot === 'skill')
      if (skill >= 0 && run.skills.length < 3) return skill
      const stat = cards.findIndex((c) => c.slot === 'stat' || c.slot === 'heal')
      return stat >= 0 ? stat : 0
    },
  },
  {
    label: '스탯만 (스킬 안 집음)',
    choose: (cards) => {
      const stat = cards.findIndex((c) => c.slot === 'stat' || c.slot === 'heal')
      return stat >= 0 ? stat : 0
    },
  },
  {
    label: '도박 위주 (항상 도박)',
    choose: (cards) => {
      const g = cards.findIndex((c) => c.slot === 'gamble')
      return g >= 0 ? g : 0
    },
  },
  {
    // 체력이 낮으면 회복, 아니면 집중과 같게
    label: '균형 (체력 낮으면 회복)',
    choose: (cards, run) => {
      if (run.hp < run.max.hp * 0.45) {
        const h = cards.findIndex((c) => c.slot === 'heal')
        if (h >= 0) return h
      }
      const skill = cards.findIndex(
        (c) => c.slot === 'skill' && (run.skills.length === 0 || run.skills.includes(c.line)),
      )
      if (skill >= 0 && run.skills.length < 3) return skill
      const stat = cards.findIndex((c) => c.slot === 'stat')
      return stat >= 0 ? stat : 0
    },
  },
]

function ownedSkillIds(run: Run): SkillId[] {
  return [...new Set(run.skills)].flatMap((l) =>
    skillsOfLine(l)
      .filter((s) => s.power)
      .map((s) => s.id),
  )
}

/** 사람이 대충 잘 하는 정도의 전투 판단 */
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

const SEC_PER_TURN = 3.2 // ⚠ 입력 + 연출 포함 한 턴 체감 시간 가정

type Outcome = { cleared: boolean; turns: number; deadAt: number | null; timedOutAt: number | null }

function playRun(face: Face, policy: Policy, seed: number): Outcome {
  const rng = mulberry32(seed)
  let run = createRun('female', '용사', face)
  let turns = 0

  for (let stage = 1; stage <= 10; stage++) {
    if (stage === JOB_STAGE) run = promote(run)

    run = refillMp(run)
    let s = startBattle(run, stage)
    const owned = ownedSkillIds(run)
    let stageTurns = 0
    const cap = maxTurns(ENCOUNTERS[stage].kind)

    while (!s.over && stageTurns < cap) {
      s = takeTurn(s, chooseCommand(s, owned), rng)
      stageTurns++
    }
    turns += stageTurns
    run = { ...run, hp: s.player.hp, mp: s.mp, potions: s.potions }

    // 규칙 2: 사망
    if (s.over === 'lose') return { cleared: false, turns, deadAt: stage, timedOutAt: null }
    // 규칙 1: 제한 시간 (턴 예산으로 환산)
    if (s.over !== 'win') return { cleared: false, turns, deadAt: null, timedOutAt: stage }

    run = healAfterStage(run)

    if (run.rewardStages.includes(stage)) {
      for (let pick = 0; pick < PICKS_PER_STOP; pick++) {
        const offer = makeOffer(run, rng)
        if (offer.usedTopTier) run = consumeTopTier(run)
        run = applyCard(run, offer.cards[policy.choose(offer.cards, run)])
      }
    }
  }
  return { cleared: true, turns, deadAt: null, timedOutAt: null }
}

const TRIALS = 60
type Cell = { cleared: number; turns: number; deaths: number[]; timeouts: number[] }

const table = new Map<string, Cell>()
for (const policy of POLICIES) {
  for (const face of FACES) {
    const cell: Cell = { cleared: 0, turns: 0, deaths: Array(11).fill(0), timeouts: Array(11).fill(0) }
    for (let t = 0; t < TRIALS; t++) {
      const o = playRun(face, policy, face * 7919 + t * 104729 + policy.label.length)
      cell.turns += o.turns
      if (o.cleared) cell.cleared++
      if (o.deadAt) cell.deaths[o.deadAt]++
      if (o.timedOutAt) cell.timeouts[o.timedOutAt]++
    }
    table.set(`${policy.label}|${face}`, cell)
  }
}

const pct = (n: number) => `${(n * 100).toFixed(0).padStart(3)}%`

console.log(`=== 보상 정책별 클리어율 (주사위 6면 × ${TRIALS}회 = ${TRIALS * 6}판) ===\n`)
console.log(`${''.padEnd(26)}${FACES.map((f) => `눈${f}`.padStart(6)).join('')}${'전체'.padStart(8)}${'평균턴'.padStart(8)}`)
for (const policy of POLICIES) {
  const cells = FACES.map((f) => table.get(`${policy.label}|${f}`)!)
  const per = cells.map((c) => pct(c.cleared / TRIALS).padStart(6)).join('')
  const all = cells.reduce((a, c) => a + c.cleared, 0) / (TRIALS * FACES.length)
  const turns = cells.reduce((a, c) => a + c.turns, 0) / (TRIALS * FACES.length)
  console.log(`${policy.label.padEnd(26)}${per}${pct(all).padStart(8)}${turns.toFixed(1).padStart(8)}`)
}

console.log('\n=== 실패 원인 분포 (전체 합산) ===\n')
const deaths = Array(11).fill(0)
const timeouts = Array(11).fill(0)
for (const c of table.values()) {
  for (let i = 1; i <= 10; i++) {
    deaths[i] += c.deaths[i]
    timeouts[i] += c.timeouts[i]
  }
}
const total = deaths.reduce((a, b) => a + b, 0) + timeouts.reduce((a, b) => a + b, 0)
console.log(`${'스테이지'.padEnd(10)}${'사망'.padStart(8)}${'시간초과'.padStart(10)}`)
for (let stage = 1; stage <= 10; stage++) {
  if (deaths[stage] === 0 && timeouts[stage] === 0) continue
  console.log(`1-${String(stage).padEnd(8)}${String(deaths[stage]).padStart(8)}${String(timeouts[stage]).padStart(10)}`)
}
console.log(
  `\n총 실패 ${total}판 — 사망 ${deaths.reduce((a, b) => a + b, 0)} / 시간 초과 ${timeouts.reduce((a, b) => a + b, 0)}`,
)

const bestTurns =
  [...table.values()].reduce((a, c) => a + c.turns, 0) / (TRIALS * FACES.length * POLICIES.length)
console.log(
  `평균 ${bestTurns.toFixed(1)}턴 × ${SEC_PER_TURN}초 ≈ ${((bestTurns * SEC_PER_TURN) / 60).toFixed(1)}분 (전투만)`,
)
