/**
 * 스테이지별 소요 턴 측정. 밸런스 조정의 근거를 만든다.
 *
 * sim.ts 는 "클리어했나"만 본다. 그래서 '보스가 오래 걸린다' 같은 체감은
 * 잡히지 않았다 — 이기기만 하면 30턴이 걸려도 성공으로 셌다.
 * 여기서는 이긴 판만 모아 스테이지마다 몇 턴이 걸렸는지 센다.
 */
import { aliveEnemies, startBattle, takeTurn, type BattleState, type Command } from '../src/core/battle'
import { FACES, type Face } from '../src/core/dice'
import { encounterKind } from '../src/core/enemy'
import { BAKE_STAGE } from '../src/core/pizza'
import { applyCard, consumeTopTier, makeOffer } from '../src/core/reward'
import {
  addTopping,
  canAddTopping,
  bake,
  createRun,
  drawEncounter,
  healAfterStage,
  PICKS_PER_STOP,
  refillMp,
  type Run,
} from '../src/core/run'
import { SKILLS, skillsOfTaste, type SkillId } from '../src/core/skill'
import { maxTurns, stageLimitMs } from '../src/core/timer'
import { TASTE_CLASH, TASTE_LABEL, toppingStats, type Taste } from '../src/core/topping'

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * sim.ts 의 최적 정책 — 맛이 부딪치지 않는 재료만 받는다.
 *
 * ⚠ canAddTopping 을 반드시 먼저 본다. 이걸 빠뜨렸더니 상한 6 을 넘겨 9개까지
 * 담겼고, 사람은 도달할 수 없는 신선도(+54)로 보스를 재고 있었다.
 * addTopping 은 스스로 상한을 막지 않는다 — 막는 건 화면의 버튼뿐이다.
 */
function pickNoClash(enemies: { taste: Taste; topping: any }[], run: Run) {
  if (!canAddTopping(run)) return null
  return enemies.find((e) => !run.toppings.some((t) => TASTE_CLASH[t.taste] === e.taste)) ?? null
}

function ownedSkillIds(run: Run): SkillId[] {
  const tastes = [...new Set(run.toppings.map((t) => t.taste))] as Taste[]
  return tastes.flatMap((t) => skillsOfTaste(t).filter((s) => s.power).map((s) => s.id))
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

type StageRec = { stage: number; turns: number; taste: Taste | undefined; won: boolean }

function playRun(face: Face, seed: number): { cleared: boolean; stages: StageRec[] } {
  const rng = mulberry32(seed)
  let run = createRun('round', '도우', face)
  const stages: StageRec[] = []

  for (let stage = 1; stage <= 10; stage++) {
    run = { ...run, stage }
    if (stage >= BAKE_STAGE) run = bake(run)
    run = refillMp(run)

    const drawn = drawEncounter(run, rng)
    run = drawn.run
    const enc = drawn.enc
    let s = startBattle(run, enc)
    const owned = ownedSkillIds(run)
    let t = 0
    const cap = maxTurns(encounterKind(stage))
    while (!s.over && t < cap) {
      s = takeTurn(s, chooseCommand(s, owned), rng)
      t++
    }
    stages.push({ stage, turns: t, taste: enc.enemies[0]?.taste, won: s.over === 'win' })
    run = { ...run, hp: s.player.hp, mp: s.mp, potions: s.potions }
    if (s.over !== 'win') return { cleared: false, stages }

    run = healAfterStage(run)
    const picked = pickNoClash(enc.enemies as any, run)
    if (picked) run = addTopping(run, picked.topping, toppingStats(picked.topping))
    if (run.rewardStages.includes(stage)) {
      for (let i = 0; i < PICKS_PER_STOP; i++) {
        const offer = makeOffer(run, rng)
        if (offer.usedTopTier) run = consumeTopTier(run)
        // 가장 높은 등급 카드를 받는다
        run = applyCard(run, offer.cards[0])
      }
    }
  }
  return { cleared: true, stages }
}

// ---------- 측정 ----------
const TRIALS = 60
const perStage = new Map<number, number[]>()
const bossByTaste = new Map<Taste, number[]>()
let cleared = 0
let runs = 0

for (const face of FACES) {
  for (let i = 0; i < TRIALS; i++) {
    runs++
    const r = playRun(face, face * 10000 + i)
    if (r.cleared) cleared++
    for (const st of r.stages) {
      if (!st.won) continue
      if (!perStage.has(st.stage)) perStage.set(st.stage, [])
      perStage.get(st.stage)!.push(st.turns)
      if (st.stage === 10 && st.taste) {
        if (!bossByTaste.has(st.taste)) bossByTaste.set(st.taste, [])
        bossByTaste.get(st.taste)!.push(st.turns)
      }
    }
  }
}

const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length
const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]
const max = (a: number[]) => Math.max(...a)

console.log(`판 ${runs} · 클리어 ${((cleared / runs) * 100).toFixed(0)}%\n`)
console.log('라운드   종류        이긴판  평균턴  중앙  최대  제한턴  초 (턴당 3.2s)')
for (const stage of [...perStage.keys()].sort((a, b) => a - b)) {
  const a = perStage.get(stage)!
  const kind = encounterKind(stage)
  const cap = maxTurns(kind)
  const secs = (avg(a) * 3.2).toFixed(0)
  const limit = (stageLimitMs(kind) / 1000).toFixed(0)
  const warn = avg(a) > cap * 0.7 ? '  ⚠' : ''
  console.log(
    `${String(stage).padStart(4)}   ${kind.padEnd(10)} ${String(a.length).padStart(5)} ` +
      `${avg(a).toFixed(1).padStart(7)} ${String(med(a)).padStart(5)} ${String(max(a)).padStart(5)} ` +
      `${String(cap).padStart(6)} ${secs.padStart(5)}s/${limit}s${warn}`,
  )
}

console.log('\n보스 맛별 소요 턴')
for (const [taste, a] of [...bossByTaste.entries()].sort((x, y) => avg(y[1]) - avg(x[1]))) {
  console.log(
    `  ${TASTE_LABEL[taste].padEnd(4)} 이긴판 ${String(a.length).padStart(3)} ` +
      `평균 ${avg(a).toFixed(1).padStart(5)}턴  최대 ${String(max(a)).padStart(3)}턴`,
  )
}

console.log('\n보스 턴 분포 (제한 15턴)')
{
  const a = perStage.get(10) ?? []
  for (const [lo, hi] of [[1,4],[5,7],[8,10],[11,14],[15,99]]) {
    const n = a.filter((x) => x >= lo && x <= hi).length
    const label = hi === 99 ? '15턴(제한 도달)' : `${lo}-${hi}턴`
    console.log(`  ${label.padEnd(16)} ${String(n).padStart(3)}판 ${((n/a.length)*100).toFixed(0).padStart(3)}%  ${'#'.repeat(Math.round(n/a.length*40))}`)
  }
  console.log(`\n  8턴 이상: ${((a.filter(x=>x>=8).length/a.length)*100).toFixed(0)}%`)
  const normals = [1,2,3,4,6,7,8,9].flatMap(s=>perStage.get(s)??[])
  console.log(`  일반 라운드 평균 ${avg(normals).toFixed(1)}턴 → 보스는 ${(avg(a)/avg(normals)).toFixed(2)}배`)
}
