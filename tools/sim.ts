import { aliveEnemies, startBattle, takeTurn, type BattleState, type Command } from '../src/core/battle'
import { FACES, type Face } from '../src/core/dice'
import { ENCOUNTERS } from '../src/core/enemy'
import { maxTurns } from '../src/core/timer'
import { createRun, maxMp, type Run } from '../src/core/run'
import { SKILLS, skillsOfLine, type SkillId, type SkillLine } from '../src/core/skill'

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

type Archetype = { label: string; skillPlan: (SkillLine | 'stat')[] }

/** 보상 9장을 무엇에 쓰는가. 'stat' 은 능력치 카드. */
const ARCHETYPES: Archetype[] = [
  {
    label: '순수 빌드 (한 계열 3 + 스탯 6)',
    skillPlan: ['fire', 'fire', 'fire', 'stat', 'stat', 'stat', 'stat', 'stat', 'stat'],
  },
  {
    label: '하이브리드 (2+1 + 스탯 6)',
    skillPlan: ['sword', 'sword', 'fire', 'stat', 'stat', 'stat', 'stat', 'stat', 'stat'],
  },
  {
    label: '분산 (1+1+1 + 스탯 6)',
    skillPlan: ['sword', 'fire', 'ice', 'stat', 'stat', 'stat', 'stat', 'stat', 'stat'],
  },
  {
    label: '스탯 몰빵 (스킬 0 + 스탯 9)',
    skillPlan: ['stat', 'stat', 'stat', 'stat', 'stat', 'stat', 'stat', 'stat', 'stat'],
  },
  {
    label: '스킬 과다 (스킬 6 + 스탯 3)',
    skillPlan: ['fire', 'fire', 'fire', 'ice', 'ice', 'ice', 'stat', 'stat', 'stat'],
  },
]

/** 골드 티어 평균값으로 능력치 카드 1장을 반영한다 (기획서 04 §3.2) */
function applyStatCard(run: Run, pick: number): void {
  const table = [
    () => (run.max.hp += 40),
    () => (run.max.atk += 13),
    () => (run.max.mag += 13),
    () => (run.max.spd += 8),
    () => (run.max.luk += 8),
  ]
  table[pick % table.length]()
}

function grantStop(run: Run, plan: (SkillLine | 'stat')[], statCursor: { n: number }): void {
  for (const item of plan) {
    if (item === 'stat') applyStatCard(run, statCursor.n++)
    else run.skills.push(item)
  }
}

/**
 * 스테이지 클리어 보상으로 조금씩 회복한다.
 * 회복을 보상 지점에 묶으면 조합 [1,3,9] 이 6스테이지 연속 무회복이 되어
 * [2,4,8] 보다 훨씬 불리해진다. 클리어마다 주면 조합과 무관해진다.
 */
const STAGE_HEAL_RATIO = 0.25

function healAfterStage(run: Run): void {
  run.hp = Math.min(run.max.hp, run.hp + Math.round(run.max.hp * STAGE_HEAL_RATIO))
}

function ownedSkillIds(run: Run): SkillId[] {
  const lines = [...new Set(run.skills)]
  return lines.flatMap((l) => skillsOfLine(l).filter((s) => s.power).map((s) => s.id))
}

/** 사람이 대충 잘 하는 정도의 판단 */
function chooseCommand(s: BattleState, owned: SkillId[]): Command {
  const hpRatio = s.player.hp / s.player.maxHp
  if (hpRatio < 0.3 && s.potions > 0) return { type: 'item' }

  const affordable = owned.filter((id) => SKILLS[id].mp <= s.mp)
  if (affordable.length > 0) {
    // 적이 둘 이상이면 광역, 아니면 배율 가장 높은 것
    const many = aliveEnemies(s).length > 1
    const best = affordable
      .map((id) => SKILLS[id])
      .sort((a, b) => {
        const aScore = (a.power ?? 0) * (a.target === 'all' && many ? aliveEnemies(s).length : 1)
        const bScore = (b.power ?? 0) * (b.target === 'all' && many ? aliveEnemies(s).length : 1)
        return bScore - aScore
      })[0]
    return { type: 'skill', id: best.id }
  }

  if (hpRatio < 0.45) return { type: 'defend' }
  return { type: 'attack' }
}

type StageResult = { turns: number; won: boolean }

/** 스테이지 제한 시간이 허용하는 턴 수를 넘겼는가 — 넘기면 규칙 1 로 게임 오버 */
let timeouts = 0
const overruns: number[] = Array(11).fill(0)

function playStage(run: Run, stage: number, rng: () => number): StageResult {
  // 마나는 전투 시작 시 채운다. 런 전체 자원이면 20 으로 10스테이지를 버텨야 해 스킬이 죽는다.
  run.mp = maxMp(run.max)
  let s = startBattle(run, stage)
  const owned = ownedSkillIds(run)
  let turns = 0
  const CAP = 60 // 무한 루프 방어
  while (!s.over && turns < CAP) {
    s = takeTurn(s, chooseCommand(s, owned), rng)
    turns++
  }
  run.hp = s.player.hp
  run.mp = s.mp
  run.potions = s.potions

  // 규칙 1: 스테이지 제한 시간을 턴 예산으로 환산해 초과를 잡는다.
  const cap = maxTurns(ENCOUNTERS[stage].kind)
  if (turns > cap) {
    timeouts++
    overruns[stage]++
    return { turns, won: false }
  }
  return { turns, won: s.over === 'win' }
}

const SEC_PER_TURN = 3.2 // ⚠ 입력 + 연출 포함 한 턴 체감 시간 가정

type Row = {
  face: Face
  arch: string
  turns: number
  /** 40회 중 완주 비율 */
  clearRate: number
  /** 죽은 판의 평균 사망 스테이지 */
  avgDeathStage: number | null
  stageTurns: number[]
  /** 스테이지별 사망 횟수 */
  deathsAt: number[]
}

const rows: Row[] = []
const TRIALS = 40

for (const face of FACES) {
  for (const arch of ARCHETYPES) {
    let sumTurns = 0
    let deaths = 0
    let deathStageSum = 0
    const perStage = Array(11).fill(0)
    const perStageN = Array(11).fill(0)
    const deathsAt = Array(11).fill(0)

    for (let t = 0; t < TRIALS; t++) {
      const rng = mulberry32(face * 1000 + t * 7 + arch.label.length)
      const run = createRun('female', '용사', face)
      // 보상 지점을 조합 A [1,3,9] 로 고정해 비교 가능하게 한다
      run.rewardStages = [1, 3, 9]
      const cursor = { n: 0 }
      let died: number | null = null
      let turns = 0

      for (let stage = 1; stage <= 10; stage++) {
        const r = playStage(run, stage, rng)
        turns += r.turns
        perStage[stage] += r.turns
        perStageN[stage]++
        if (!r.won) {
          died = stage
          break
        }
        healAfterStage(run)
        const stopIndex = run.rewardStages.indexOf(stage)
        if (stopIndex >= 0) {
          grantStop(run, arch.skillPlan.slice(stopIndex * 3, stopIndex * 3 + 3), cursor)
        }
      }
      sumTurns += turns
      if (died !== null) {
        deaths++
        deathStageSum += died
        deathsAt[died]++
      }
    }

    rows.push({
      face,
      arch: arch.label,
      turns: sumTurns / TRIALS,
      clearRate: (TRIALS - deaths) / TRIALS,
      avgDeathStage: deaths === 0 ? null : deathStageSum / deaths,
      stageTurns: perStage.map((v, i) => (perStageN[i] ? v / perStageN[i] : 0)),
      deathsAt,
    })
  }
}

console.log(`=== 빌드별 결과 (주사위 6면 × ${TRIALS}회 = 240판) ===\n`)
for (const arch of ARCHETYPES) {
  const mine = rows.filter((r) => r.arch === arch.label)
  const clearRate = mine.reduce((a, r) => a + r.clearRate, 0) / mine.length
  const avgTurns = mine.reduce((a, r) => a + r.turns, 0) / mine.length
  const withDeath = mine.filter((r) => r.avgDeathStage !== null)
  const avgDeath = withDeath.length
    ? withDeath.reduce((a, r) => a + (r.avgDeathStage ?? 0), 0) / withDeath.length
    : null
  console.log(
    `${arch.label.padEnd(30)} 클리어 ${(clearRate * 100).toFixed(0).padStart(3)}%  ` +
      `평균 ${avgTurns.toFixed(1).padStart(5)}턴 ≈ ${((avgTurns * SEC_PER_TURN) / 60).toFixed(1)}분` +
      (avgDeath ? `  평균 사망 1-${avgDeath.toFixed(1)}` : ''),
  )
}

console.log(
  `\n=== 제한 시간 초과 ===\n\n` +
    `일반 스테이지 최대 ${maxTurns('normal')}턴 · 보스 최대 ${maxTurns('boss')}턴\n` +
    `시간 초과로 끝난 스테이지: ${timeouts}건`,
)
for (let stage = 1; stage <= 10; stage++) {
  if (overruns[stage] > 0) console.log(`  1-${stage}  ${overruns[stage]}건`)
}

console.log('\n=== 사망 스테이지 분포 (전체 빌드 합산) ===\n')
const totalDeaths = Array(11).fill(0)
for (const r of rows) for (let i = 1; i <= 10; i++) totalDeaths[i] += r.deathsAt[i]
const maxD = Math.max(...totalDeaths)
for (let stage = 1; stage <= 10; stage++) {
  const n = totalDeaths[stage]
  const bar = '█'.repeat(Math.round((n / (maxD || 1)) * 40))
  console.log(`1-${String(stage).padEnd(2)} ${String(n).padStart(4)}판  ${bar}`)
}

console.log('\n=== 스테이지별 평균 턴 (순수 빌드 기준) ===\n')
const pure = rows.filter((r) => r.arch === ARCHETYPES[0].label)
for (let stage = 1; stage <= 10; stage++) {
  const avg = pure.reduce((a, r) => a + r.stageTurns[stage], 0) / pure.length
  const bar = '█'.repeat(Math.round(avg))
  console.log(`1-${String(stage).padEnd(2)} ${avg.toFixed(1).padStart(5)}턴  ${bar}`)
}

const total = pure.reduce((a, r) => a + r.turns, 0) / pure.length
console.log(
  `\n총합 ${total.toFixed(1)}턴 × ${SEC_PER_TURN}초 = ${((total * SEC_PER_TURN) / 60).toFixed(1)}분`,
)

console.log('\n=== 주사위 눈별 완주 여부 (순수 빌드) ===\n')
for (const r of pure) {
  console.log(
    `눈 ${r.face}  클리어 ${(r.clearRate * 100).toFixed(0).padStart(3)}%  ` +
      `${r.turns.toFixed(1).padStart(5)}턴`,
  )
}
