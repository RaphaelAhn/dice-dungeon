import { STAT_SHORT } from './character'
import type { Encounter } from './enemy'
import { ga, reul } from './josa'
import { pizzaBonus } from './pizza'
import { maxMp, type Run } from './run'
import { SKILLS, type SkillId, type StatusKind } from './skill'
import { stageLimitMs, TURN_LIMIT_MS } from './timer'
import { TASTE_CLASH, type Taste } from './topping'

/** 방어 시 받는 피해 배율 (기획서 03 §4) */
const DEFEND_TAKE = 0.5
/** 방어 시 회복하는 마나 = 최대 마나의 이 비율 ⚠ */
const DEFEND_MP_RATIO = 0.15
/** 역속성 피해 배율 ⚠ */
const WEAK_MUL = 1.5
/** 크리티컬 배율, 그리고 행운 1당 확률 ⚠ */
const CRIT_MUL = 1.5
const CRIT_PER_LUK = 0.005
/** 회피는 속도 차이로만 생기고 이 값을 넘지 않는다 ⚠ */
const DODGE_PER_SPD = 0.01
const DODGE_CAP = 0.25
/** 포션 회복량 = 최대 체력의 이 비율 ⚠ */
const POTION_RATIO = 0.4

export type Status = { kind: StatusKind; turns: number; value: number }

export type Side = 'player' | 'enemy'

export type Unit = {
  id: string
  name: string
  hp: number
  maxHp: number
  atk: number
  mag: number
  spd: number
  luk: number
  taste?: Taste
  statuses: Status[]
  /** 전직 주계열 보너스 — 주는 피해 배율 가산 */
  damageMul: number
  /** 전직 주계열 보너스 — 치명타 확률 가산 */
  critAdd: number
  /** 전직 주계열 보너스 — 회복량 배율 가산 */
  healMul: number
  /** 부 풍미 특성. 없으면 null */
  trait: Taste | null
}

/**
 * target 은 s.enemies 의 인덱스다.
 * 지정이 없거나 이미 쓰러진 대상이면 살아 있는 첫 적으로 되돌린다 —
 * 고른 적이 먼저 죽는 경우가 실제로 나온다.
 */
export type Command =
  | { type: 'attack'; target?: number }
  | { type: 'defend' }
  | { type: 'skill'; id: SkillId; target?: number }
  | { type: 'item' }

export type BattleState = {
  stage: number
  kind: Encounter['kind']
  player: Unit
  enemies: Unit[]
  /** 남은 마나. 최대치는 플레이어 마법력과 같다. */
  mp: number
  /** 1부터 시작. 한 턴 = 플레이어 행동 + 적 전원 행동 */
  turn: number
  /** 이번 턴에 플레이어가 방어를 골랐는가 — 적 공격 계산에 쓴다 */
  defending: boolean
  potions: number
  log: string[]
  /** 이 스테이지에 남은 시간(ms). 0 이 되면 timeout. */
  timeLeftMs: number
  /** 이번 턴에 커맨드를 고를 남은 시간(ms). 0 이 되면 자동 공격. */
  turnLeftMs: number
  /**
   * null 이면 진행 중.
   * 'timeout' 은 규칙 1, 'lose' 는 규칙 2 — 둘 다 게임 오버지만 원인이 다르다.
   */
  over: 'win' | 'lose' | 'timeout' | null
}

export type Rng = () => number

function unitFromRun(run: Run): Unit {
  const b = run.pizza ? pizzaBonus(run.pizza) : null
  return {
    id: 'p',
    name: run.name,
    hp: run.hp,
    maxHp: run.max.hp,
    atk: run.max.atk,
    mag: run.max.mag,
    spd: run.max.spd,
    luk: run.max.luk,
    statuses: [],
    // 스탯 보너스는 promote() 가 이미 run.max 에 더해 뒀다. 여기서는 배율만 받는다.
    damageMul: b?.damageMul ?? 0,
    critAdd: b?.critAdd ?? 0,
    healMul: b?.healMul ?? 0,
    trait: b?.trait ?? null,
  }
}

export function startBattle(run: Run, enc: Encounter): BattleState {
  return {
    stage: run.stage,
    kind: enc.kind,
    player: unitFromRun(run),
    enemies: enc.enemies.map((e, i) => ({
      id: `e${i}`,
      name: enc.enemies.filter((x) => x.name === e.name).length > 1 ? `${e.name} ${i + 1}` : e.name,
      hp: e.hp,
      maxHp: e.hp,
      atk: e.atk,
      mag: e.atk,
      spd: e.spd,
      luk: 10,
      taste: e.taste,
      statuses: [],
      damageMul: 0,
      critAdd: 0,
      healMul: 0,
      trait: null,
    })),
    mp: run.mp,
    turn: 1,
    defending: false,
    potions: run.potions,
    log: [],
    timeLeftMs: stageLimitMs(enc.kind),
    turnLeftMs: TURN_LIMIT_MS,
    over: null,
  }
}

/**
 * 시간을 흘린다. UI 가 매 프레임 호출한다.
 * 스테이지 시간이 다하면 게임 오버(규칙 1). 턴 시간이 다하면 자동 공격을 알린다.
 */
export function tick(prev: BattleState, elapsedMs: number): { state: BattleState; autoAct: boolean } {
  if (prev.over) return { state: prev, autoAct: false }

  const timeLeftMs = Math.max(0, prev.timeLeftMs - elapsedMs)
  const turnLeftMs = Math.max(0, prev.turnLeftMs - elapsedMs)

  if (timeLeftMs === 0) {
    return {
      state: { ...prev, timeLeftMs, turnLeftMs, over: 'timeout', log: ['시간 초과'] },
      autoAct: false,
    }
  }
  return { state: { ...prev, timeLeftMs, turnLeftMs }, autoAct: turnLeftMs === 0 }
}

const alive = (u: Unit) => u.hp > 0
export const aliveEnemies = (s: BattleState) => s.enemies.filter(alive)

/** 지정한 적. 없거나 쓰러졌으면 살아 있는 첫 적. */
export function pickTarget(s: BattleState, index?: number): Unit | undefined {
  const chosen = index === undefined ? undefined : s.enemies[index]
  return chosen && alive(chosen) ? chosen : aliveEnemies(s)[0]
}

function has(u: Unit, kind: StatusKind): Status | undefined {
  return u.statuses.find((s) => s.kind === kind)
}

function effSpd(u: Unit): number {
  return has(u, 'slow') ? Math.floor(u.spd / 2) : u.spd
}

function effAtk(u: Unit): number {
  const down = has(u, 'atkDown')
  return down ? Math.round(u.atk * (1 - down.value)) : u.atk
}

/** 선공 판정. 속도가 같으면 플레이어가 먼저 움직인다. */
export function playerFirst(s: BattleState): boolean {
  const fastest = Math.max(...aliveEnemies(s).map(effSpd), 0)
  return effSpd(s.player) >= fastest
}

function variance(rng: Rng): number {
  return 0.9 + rng() * 0.2
}

function dodged(attacker: Unit, target: Unit, rng: Rng): boolean {
  const chance = Math.min(Math.max((effSpd(target) - effSpd(attacker)) * DODGE_PER_SPD, 0), DODGE_CAP)
  return rng() < chance
}

function critical(attacker: Unit, rng: Rng): boolean {
  return rng() < attacker.luk * CRIT_PER_LUK + attacker.critAdd
}

/** 맞부딪치는 맛끼리는 더 아프다 (매콤↔새콤, 진한↔향긋) */
function elementMul(taste: Taste | undefined, target: Unit): number {
  if (!taste || !target.taste) return 1
  return TASTE_CLASH[taste] === target.taste ? WEAK_MUL : 1
}

function applyStatus(u: Unit, kind: StatusKind, turns: number, value = 0): void {
  const found = has(u, kind)
  if (found) {
    // 같은 상태를 다시 걸면 지속 시간만 갱신한다. 중첩은 없다 — 계산이 폭주한다.
    found.turns = Math.max(found.turns, turns)
    found.value = Math.max(found.value, value)
  } else {
    u.statuses.push({ kind, turns, value })
  }
}

function tickStatuses(u: Unit, log: string[]): void {
  for (const s of u.statuses) {
    if (s.kind === 'burn') {
      u.hp = Math.max(0, u.hp - s.value)
      log.push(`${ga(u.name)} 눌어 ${s.value} 피해`)
    }
    s.turns -= 1
  }
  u.statuses = u.statuses.filter((s) => s.turns > 0)
}

function damage(target: Unit, amount: number): number {
  const dealt = Math.min(target.hp, Math.max(1, Math.round(amount)))
  target.hp -= dealt
  return dealt
}

/*
 * 한 턴은 세 조각으로 나뉜다 — 내 행동 / 상대 행동 / 턴 마무리.
 *
 * 한 번에 다 처리하면 로그가 동시에 쏟아져서 주고받는 느낌이 사라진다.
 * UI 는 조각을 하나씩 보여 주며 사이에 틈을 둔다.
 * 시뮬레이터처럼 연출이 필요 없는 곳은 takeTurn 으로 한 번에 돌린다.
 */

/** 내 차례 */
export function playerAct(prev: BattleState, cmd: Command, rng: Rng = Math.random): BattleState {
  if (prev.over) return prev
  const s: BattleState = structuredClone(prev)
  s.log = []
  s.defending = cmd.type === 'defend'
  resolvePlayer(s, cmd, rng)
  checkOver(s)
  return s
}

/** 상대 차례 */
export function enemyAct(prev: BattleState, rng: Rng = Math.random): BattleState {
  if (prev.over) return prev
  const s: BattleState = structuredClone(prev)
  s.log = []
  resolveEnemies(s, rng)
  checkOver(s)
  return s
}

/** 턴 마무리 — 상태 진행, 턴 수 증가, 명령 시간 초기화 */
export function endTurn(prev: BattleState): BattleState {
  if (prev.over) return prev
  const s: BattleState = structuredClone(prev)
  s.log = []

  tickStatuses(s.player, s.log)
  for (const e of s.enemies) if (alive(e)) tickStatuses(e, s.log)

  // 담백 부 풍미 특성 — 턴 종료 회복
  if (s.player.trait === 'mild' && s.player.hp > 0) {
    const heal = Math.round(s.player.maxHp * 0.05)
    const before = s.player.hp
    s.player.hp = Math.min(s.player.maxHp, s.player.hp + heal)
    if (s.player.hp > before) s.log.push(`담백 특성 — ${STAT_SHORT.hp} ${s.player.hp - before} 회복`)
  }

  checkOver(s)
  if (!s.over) {
    s.turn += 1
    s.turnLeftMs = TURN_LIMIT_MS
  }
  return s
}

/** 세 조각을 한 번에. 연출이 필요 없는 곳(시뮬레이터)에서 쓴다. */
export function takeTurn(prev: BattleState, cmd: Command, rng: Rng = Math.random): BattleState {
  if (prev.over) return prev
  const first = playerFirst(prev)
  let s = first ? playerAct(prev, cmd, rng) : enemyAct(prev, rng)
  s = first ? enemyAct(s, rng) : playerAct(s, cmd, rng)
  return endTurn(s)
}

function checkOver(s: BattleState): boolean {
  if (s.player.hp <= 0) {
    s.player.hp = 0
    s.over = 'lose'
    s.log.push(`${ga(s.player.name)} 쓰러졌다`)
    return true
  }
  if (aliveEnemies(s).length === 0) {
    s.over = 'win'
    s.log.push('라운드 클리어')
    return true
  }
  return false
}

function resolvePlayer(s: BattleState, cmd: Command, rng: Rng): void {
  const p = s.player

  if (has(p, 'stun')) {
    s.log.push(`${ga(p.name)} 굳어 움직일 수 없다`)
    return
  }

  if (cmd.type === 'defend') {
    const cap = maxMp({ hp: 0, atk: 0, mag: p.mag, spd: 0, luk: 0 })
    const gain = Math.min(cap - s.mp, Math.round(cap * DEFEND_MP_RATIO))
    s.mp += gain
    applyStatus(p, 'guard', 1)
    s.log.push(`${p.name} 방어 태세 — ${STAT_SHORT.mag} ${gain} 회복`)
    return
  }

  if (cmd.type === 'item') {
    if (s.potions <= 0) {
      s.log.push('반죽물이 없다')
      return
    }
    s.potions -= 1
    const heal = Math.round(p.maxHp * POTION_RATIO)
    p.hp = Math.min(p.maxHp, p.hp + heal)
    s.log.push(`반죽물 — ${STAT_SHORT.hp} ${heal} 회복`)
    return
  }

  if (cmd.type === 'attack') {
    const target = pickTarget(s, cmd.target)
    if (!target) return
    const dealt = strike(s, p, target, effAtk(p), 1, undefined, rng)
    applyTraitOnHit(s, p, target, dealt, 'attack')
    return
  }

  // 스킬
  const sk = SKILLS[cmd.id]
  if (s.mp < sk.mp) {
    s.log.push(`${STAT_SHORT.mag}가 부족하다 (${sk.name} — ${sk.mp} 필요)`)
    return
  }
  s.mp -= sk.mp

  if (sk.healRatio) {
    const heal = Math.round(p.maxHp * sk.healRatio * (1 + p.healMul))
    p.hp = Math.min(p.maxHp, p.hp + heal)
    s.log.push(`${sk.name} — ${STAT_SHORT.hp} ${heal} 회복`)
  }

  if (sk.target === 'self' && sk.inflict) {
    applyStatus(p, sk.inflict.kind, sk.inflict.turns, sk.inflict.value ?? 0)
    s.log.push(`${sk.name} 발동`)
  }

  const one = pickTarget(s, cmd.target)
  const targets = sk.target === 'all' ? aliveEnemies(s) : one ? [one] : []
  const base = sk.kind === 'physical' ? effAtk(p) : p.mag
  const hits = sk.hits ?? 1

  for (const t of targets) {
    if (sk.power) {
      for (let i = 0; i < hits; i++) {
        if (!alive(t)) break
        const dealt = strike(s, p, t, base, sk.power / hits, sk.taste, rng, sk.name)
        if (sk.drain && dealt > 0) {
          const back = Math.round(dealt * sk.drain)
          p.hp = Math.min(p.maxHp, p.hp + back)
          s.log.push(`${STAT_SHORT.hp} ${back} 흡수`)
        }
        applyTraitOnHit(s, p, t, dealt, 'skill')
      }
    }
    if (sk.inflict && sk.target !== 'self' && alive(t)) {
      applyStatus(t, sk.inflict.kind, sk.inflict.turns, sk.inflict.value ?? 0)
      s.log.push(`${t.name}에게 ${sk.name} 효과`)
    }
  }
}

/**
 * 전직 부계열 특성. 계열마다 발동 조건이 다르다.
 * 검술은 통상 공격에만, 화염·얼음은 스킬에만 붙는다 — 계열 성격을 드러내는 차이다.
 */
function applyTraitOnHit(
  s: BattleState,
  p: Unit,
  target: Unit,
  dealt: number,
  via: 'attack' | 'skill',
): void {
  if (!p.trait || dealt <= 0) return

  switch (p.trait) {
    case 'spicy':
      if (via === 'attack') {
        const cap = p.mag
        const gain = Math.min(cap - s.mp, 5)
        if (gain > 0) {
          s.mp += gain
          s.log.push(`매콤 특성 — ${STAT_SHORT.mag} ${gain} 회복`)
        }
      }
      break
    case 'herbal':
      if (via === 'skill' && alive(target)) {
        applyStatus(target, 'burn', 3, 6)
        s.log.push(`향긋 특성 — ${target.name} 지속 피해`)
      }
      break
    case 'tangy':
      if (via === 'skill' && alive(target)) {
        applyStatus(target, 'slow', 1)
        s.log.push(`새콤 특성 — ${target.name} 둔화`)
      }
      break
    case 'rich': {
      const back = Math.round(dealt * 0.15)
      if (back > 0) {
        p.hp = Math.min(p.maxHp, p.hp + back)
        s.log.push(`진한 특성 — ${STAT_SHORT.hp} ${back} 흡수`)
      }
      break
    }
    case 'mild':
      // 담백은 명중이 아니라 턴 종료에 발동한다. takeTurn 에서 처리한다.
      break
  }
}

function strike(
  s: BattleState,
  from: Unit,
  to: Unit,
  base: number,
  mult: number,
  line: Taste | undefined,
  rng: Rng,
  label = '공격',
): number {
  if (dodged(from, to, rng)) {
    s.log.push(`${ga(to.name)} ${reul(label)} 회피`)
    return 0
  }
  const crit = critical(from, rng)
  let amount = base * mult * variance(rng) * elementMul(line, to) * (1 + from.damageMul)
  if (crit) amount *= CRIT_MUL
  if (has(to, 'guard')) amount *= DEFEND_TAKE

  const dealt = damage(to, amount)
  s.log.push(
    `${label} → ${to.name} ${dealt} 피해${crit ? ' (치명타)' : ''}${
      elementMul(line, to) > 1 ? ' (약점)' : ''
    }`,
  )
  if (!alive(to)) s.log.push(`${to.name} 처치`)
  return dealt
}

/**
 * 적이 맛에 맞는 한 수를 쓸 확률 ⚠
 * 보스는 더 자주 쓴다 — 통상 공격만 하는 보스는 큰 체력 덩어리에 불과하다.
 */
const ENEMY_SKILL_CHANCE = 0.25
const BOSS_SKILL_CHANCE = 0.45

/**
 * 적의 특기. 맛마다 하나씩이고 플레이어의 기술과 짝을 이룬다.
 * 무엇이 오는지 이름으로 예고되므로 방어할지 밀어붙일지 판단할 수 있다.
 */
function enemySpecial(s: BattleState, e: Unit, rng: Rng): boolean {
  const p = s.player
  switch (e.taste) {
    case 'spicy': {
      // 크게 한 방 — 방어로 받아내면 손해가 반이다
      strike(s, e, p, effAtk(e), 1.6, e.taste, rng, `${e.name}의 매운 일격`)
      return true
    }
    case 'tangy': {
      applyStatus(p, 'slow', 2)
      s.log.push(`${ga(e.name)} 새콤한 즙을 뿌렸다 — ${STAT_SHORT.spd} 저하`)
      return true
    }
    case 'herbal': {
      applyStatus(p, 'burn', 3, Math.max(3, Math.round(e.atk * 0.35)))
      s.log.push(`${e.name}의 진한 향 — 3턴 지속 피해`)
      return true
    }
    case 'rich': {
      const dealt = strike(s, e, p, effAtk(e), 0.9, e.taste, rng, `${e.name}의 기름진 공격`)
      if (dealt > 0) {
        const back = Math.round(dealt * 0.5)
        e.hp = Math.min(e.maxHp, e.hp + back)
        s.log.push(`${ga(e.name)} ${back} 흡수`)
      }
      return true
    }
    case 'mild': {
      // 담백은 버틴다 — 오래 끌면 시간 제한이 조여 온다
      applyStatus(e, 'guard', 1)
      const heal = Math.round(e.maxHp * 0.08)
      const before = e.hp
      e.hp = Math.min(e.maxHp, e.hp + heal)
      s.log.push(`${ga(e.name)} 자세를 낮췄다 — ${e.hp - before} 회복`)
      return true
    }
    default:
      return false
  }
}

function resolveEnemies(s: BattleState, rng: Rng): void {
  const chance = s.kind === 'normal' ? ENEMY_SKILL_CHANCE : BOSS_SKILL_CHANCE

  for (const e of s.enemies) {
    if (!alive(e) || s.over) continue
    if (has(e, 'stun')) {
      s.log.push(`${ga(e.name)} 굳어 움직일 수 없다`)
      continue
    }
    if (rng() < chance && enemySpecial(s, e, rng)) {
      if (s.player.hp <= 0) break
      continue
    }
    strike(s, e, s.player, effAtk(e), 1, e.taste, rng, `${e.name}의 공격`)
    if (s.player.hp <= 0) break
  }
}

/** 전투가 끝난 뒤 런에 되돌릴 값 */
export function drainToRun(run: Run, s: BattleState): Run {
  return { ...run, hp: s.player.hp, mp: s.mp, potions: s.potions }
}
