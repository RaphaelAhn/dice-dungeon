import { ENCOUNTERS, type Encounter } from './enemy'
import { maxMp, type Run } from './run'
import { SKILLS, WEAK_TO, type SkillId, type SkillLine, type StatusKind } from './skill'

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
  line?: SkillLine
  statuses: Status[]
}

export type Command =
  | { type: 'attack' }
  | { type: 'defend' }
  | { type: 'skill'; id: SkillId }
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
  /** null 이면 진행 중 */
  over: 'win' | 'lose' | null
}

export type Rng = () => number

function unitFromRun(run: Run): Unit {
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
  }
}

export function startBattle(run: Run, stage: number): BattleState {
  const enc = ENCOUNTERS[stage]
  return {
    stage,
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
      line: e.line,
      statuses: [],
    })),
    mp: run.mp,
    turn: 1,
    defending: false,
    potions: run.potions,
    log: [],
    over: null,
  }
}

const alive = (u: Unit) => u.hp > 0
export const aliveEnemies = (s: BattleState) => s.enemies.filter(alive)

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
  return rng() < attacker.luk * CRIT_PER_LUK
}

function elementMul(skillLine: SkillLine | undefined, target: Unit): number {
  if (!skillLine || !target.line) return 1
  return WEAK_TO[skillLine] === target.line ? WEAK_MUL : 1
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
      log.push(`${u.name}이(가) 화상으로 ${s.value} 피해`)
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

/**
 * 플레이어 한 턴 + 적 전원 한 턴을 처리한 새 상태를 돌려준다.
 * 원본을 건드리지 않는 이유는 UI 가 이전 상태와 비교해 연출을 뽑기 때문이다.
 */
export function takeTurn(prev: BattleState, cmd: Command, rng: Rng = Math.random): BattleState {
  if (prev.over) return prev

  const s: BattleState = structuredClone(prev)
  s.log = []
  s.defending = cmd.type === 'defend'

  const first = playerFirst(s)
  if (first) {
    resolvePlayer(s, cmd, rng)
    if (!checkOver(s)) resolveEnemies(s, rng)
  } else {
    resolveEnemies(s, rng)
    if (!checkOver(s)) resolvePlayer(s, cmd, rng)
  }

  if (!s.over) {
    tickStatuses(s.player, s.log)
    for (const e of s.enemies) if (alive(e)) tickStatuses(e, s.log)
    checkOver(s)
    s.turn += 1
  }

  return s
}

function checkOver(s: BattleState): boolean {
  if (s.player.hp <= 0) {
    s.player.hp = 0
    s.over = 'lose'
    s.log.push(`${s.player.name}이(가) 쓰러졌다`)
    return true
  }
  if (aliveEnemies(s).length === 0) {
    s.over = 'win'
    s.log.push('전투 승리')
    return true
  }
  return false
}

function resolvePlayer(s: BattleState, cmd: Command, rng: Rng): void {
  const p = s.player

  if (has(p, 'stun')) {
    s.log.push(`${p.name}은(는) 얼어붙어 움직일 수 없다`)
    return
  }

  if (cmd.type === 'defend') {
    const cap = maxMp({ hp: 0, atk: 0, mag: p.mag, spd: 0, luk: 0 })
    const gain = Math.min(cap - s.mp, Math.round(cap * DEFEND_MP_RATIO))
    s.mp += gain
    applyStatus(p, 'guard', 1)
    s.log.push(`${p.name}이(가) 방어 태세 — 마나 ${gain} 회복`)
    return
  }

  if (cmd.type === 'item') {
    if (s.potions <= 0) {
      s.log.push('포션이 없다')
      return
    }
    s.potions -= 1
    const heal = Math.round(p.maxHp * POTION_RATIO)
    p.hp = Math.min(p.maxHp, p.hp + heal)
    s.log.push(`포션 사용 — 체력 ${heal} 회복`)
    return
  }

  if (cmd.type === 'attack') {
    const target = aliveEnemies(s)[0]
    if (!target) return
    strike(s, p, target, effAtk(p), 1, undefined, rng)
    return
  }

  // 스킬
  const sk = SKILLS[cmd.id]
  if (s.mp < sk.mp) {
    s.log.push(`마나가 부족하다 (${sk.name} — ${sk.mp} 필요)`)
    return
  }
  s.mp -= sk.mp

  if (sk.healRatio) {
    const heal = Math.round(p.maxHp * sk.healRatio)
    p.hp = Math.min(p.maxHp, p.hp + heal)
    s.log.push(`${sk.name} — 체력 ${heal} 회복`)
  }

  if (sk.target === 'self' && sk.inflict) {
    applyStatus(p, sk.inflict.kind, sk.inflict.turns, sk.inflict.value ?? 0)
    s.log.push(`${sk.name} 발동`)
  }

  const targets = sk.target === 'all' ? aliveEnemies(s) : aliveEnemies(s).slice(0, 1)
  const base = sk.kind === 'physical' ? effAtk(p) : p.mag
  const hits = sk.hits ?? 1

  for (const t of targets) {
    if (sk.power) {
      for (let i = 0; i < hits; i++) {
        if (!alive(t)) break
        const dealt = strike(s, p, t, base, sk.power / hits, sk.line, rng, sk.name)
        if (sk.drain && dealt > 0) {
          const back = Math.round(dealt * sk.drain)
          p.hp = Math.min(p.maxHp, p.hp + back)
          s.log.push(`체력 ${back} 흡수`)
        }
      }
    }
    if (sk.inflict && sk.target !== 'self' && alive(t)) {
      applyStatus(t, sk.inflict.kind, sk.inflict.turns, sk.inflict.value ?? 0)
      s.log.push(`${t.name}에게 ${sk.name} 효과`)
    }
  }
}

function strike(
  s: BattleState,
  from: Unit,
  to: Unit,
  base: number,
  mult: number,
  line: SkillLine | undefined,
  rng: Rng,
  label = '공격',
): number {
  if (dodged(from, to, rng)) {
    s.log.push(`${to.name}이(가) ${label}을 회피`)
    return 0
  }
  const crit = critical(from, rng)
  let amount = base * mult * variance(rng) * elementMul(line, to)
  if (crit) amount *= CRIT_MUL
  if (to.id === 'p' && has(to, 'guard')) amount *= DEFEND_TAKE

  const dealt = damage(to, amount)
  s.log.push(
    `${label} → ${to.name} ${dealt} 피해${crit ? ' (치명타)' : ''}${
      elementMul(line, to) > 1 ? ' (약점)' : ''
    }`,
  )
  if (!alive(to)) s.log.push(`${to.name} 격파`)
  return dealt
}

function resolveEnemies(s: BattleState, rng: Rng): void {
  for (const e of s.enemies) {
    if (!alive(e) || s.over) continue
    if (has(e, 'stun')) {
      s.log.push(`${e.name}은(는) 얼어붙어 움직일 수 없다`)
      continue
    }
    strike(s, e, s.player, effAtk(e), 1, e.line, rng, `${e.name}의 공격`)
    if (s.player.hp <= 0) break
  }
}

/** 전투가 끝난 뒤 런에 되돌릴 값 */
export function drainToRun(run: Run, s: BattleState): Run {
  return { ...run, hp: s.player.hp, mp: s.mp, potions: s.potions }
}
