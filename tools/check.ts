/** 늦게 걸린 방어·기절이 다음 턴에 살아 있는지 확인한다 (일회성 검사) */
import { endTurn, enemyAct, playerAct, playerFirst, startBattle, type BattleState } from '../src/core/battle'
import type { Encounter } from '../src/core/enemy'
import { createRun, type Run } from '../src/core/run'
import { ALL_TOPPINGS } from '../src/core/topping'

const fixed = () => 0.5 // 회피·치명타·변동폭을 모두 고정한다

function setup(playerSpd: number, enemySpd: number): BattleState {
  const base = createRun('도우', 1)
  const run: Run = { ...base, stage: 1, max: { ...base.max, spd: playerSpd, mag: 40 } }
  const t = ALL_TOPPINGS.find((x) => x.taste === 'mild')!
  const enc: Encounter = {
    kind: 'normal',
    enemies: [{ name: '적', hp: 500, atk: 20, spd: enemySpd, taste: 'mild', topping: t }],
  }
  return startBattle(run, enc)
}

/** 내가 느린 턴: 적이 먼저 때리고 내가 방어 → 다음 턴 적의 공격이 반감되는가 */
function defendWhenSlow(cmd: 'defend' | 'attack'): number {
  let s = setup(5, 30)
  if (playerFirst(s)) throw new Error('설정 오류 — 내가 빨라졌다')
  s = enemyAct(s, fixed)
  s = playerAct(s, { type: cmd }, fixed)
  s = endTurn(s)
  const before = s.player.hp
  s = enemyAct(s, fixed) // 다음 턴, 적이 먼저
  return before - s.player.hp
}

const hit = defendWhenSlow('attack')
const guarded = defendWhenSlow('defend')
console.log(`느린 턴에 방어 — 다음 턴 피해 ${hit} → ${guarded} (${((1 - guarded / hit) * 100).toFixed(0)}% 감소)`)
console.log(guarded < hit ? 'PASS — 늦게 고른 방어가 살아남는다' : 'FAIL — 방어가 그냥 사라졌다')

/** 내가 느린 턴에 건 기절이 다음 턴 적의 행동을 막는가 */
function stunWhenSlow(): boolean {
  let s = setup(5, 30)
  s = enemyAct(s, fixed)
  s = playerAct(s, { type: 'skill', id: 'herbSlice' }, fixed)
  if (!s.enemies[0].statuses.some((x) => x.kind === 'stun')) throw new Error('기절이 안 걸렸다')
  s = endTurn(s)
  if (!s.enemies[0].statuses.some((x) => x.kind === 'stun')) return false
  s = enemyAct(s, fixed)
  return s.log.some((l) => l.includes('굳어'))
}
console.log(stunWhenSlow() ? 'PASS — 늦게 건 기절이 다음 턴을 막는다' : 'FAIL — 기절이 헛돌았다')

/** 빠른 턴은 그대로여야 한다 — 방어가 같은 턴에 한 번만 쓰이고 끝나는지 */
function guardNotDoubled(): boolean {
  let s = setup(30, 5)
  if (!playerFirst(s)) throw new Error('설정 오류')
  s = playerAct(s, { type: 'defend' }, fixed)
  s = enemyAct(s, fixed) // 여기서 방어가 쓰인다
  s = endTurn(s)
  return !s.player.statuses.some((x) => x.kind === 'guard') // 다음 턴까지 남으면 안 된다
}
console.log(guardNotDoubled() ? 'PASS — 제때 쓴 방어는 한 턴만 간다' : 'FAIL — 방어가 두 턴 갔다')
