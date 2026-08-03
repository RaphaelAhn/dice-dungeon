import { useCallback, useEffect, useRef, useState, type HTMLAttributes } from 'react'
import {
  enemyAct,
  endTurn,
  playerAct,
  playerFirst,
  startBattle,
  tick,
  type BattleState,
  type Command,
  type Unit,
} from '../core/battle'
import type { Encounter } from '../core/enemy'
import { STAT_SHORT } from '../core/character'
import { maxMp, type Run } from '../core/run'
import { skillsOfTaste } from '../core/skill'
import { TASTE_LABEL } from '../core/topping'
import { formatClock, stageLimitMs, TURN_LIMIT_MS } from '../core/timer'
import CharacterSprite from './CharacterSprite'
import './Battle.css'

/** 한 조각을 보여 주는 시간 ⚠ 짧으면 못 읽고 길면 답답하다 */
const STEP_MS = 750

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const STATUS_LABEL: Record<string, string> = {
  burn: '눌음',
  stun: '굳음',
  slow: '처짐',
  atkDown: '식음',
  guard: '방어',
}

export default function Battle({
  run,
  enc,
  onWin,
  onEnd,
}: {
  run: Run
  enc: Encounter
  /** 승리 — 전투 결과가 반영된 런을 돌려준다 */
  onWin: (next: Run) => void
  /** 규칙 1(시간 초과) 또는 규칙 2(사망) */
  onEnd: (reason: 'lose' | 'timeout') => void
}) {
  const [state, setState] = useState<BattleState>(() => startBattle(run, enc))
  const [menu, setMenu] = useState<'root' | 'skill'>('root')
  /**
   * 'choose'  — 내가 명령을 고르는 중. 이때만 시계가 돈다.
   * 'mine'    — 내 행동이 화면에 나오는 중
   * 'theirs'  — 상대 행동이 화면에 나오는 중
   *
   * 한 번에 다 처리하면 로그가 동시에 쏟아져 주고받는 느낌이 사라진다.
   */
  const [phase, setPhase] = useState<'choose' | 'mine' | 'theirs'>('choose')
  /**
   * 공격이 향할 적. 적이 둘 이상일 때만 의미가 있다.
   *
   * 고르는 단계를 따로 두지 않고 커서를 상시 둔다 — 명령 시간이 10초라
   * 단계를 하나 더 끼우면 그것만으로 시간이 간다.
   */
  const [target, setTarget] = useState(0)
  // 실제 경과 시간으로 재야 탭을 옮겨도 시계가 멈추지 않는다.
  const last = useRef(Date.now())
  const busy = useRef(false)

  /*
   * 최신 상태를 ref 로 따로 들고 있는다.
   *
   * setState 업데이터 안에서 연출을 시작했더니 StrictMode 가 업데이터를 두 번
   * 호출해 한 턴이 겹쳐 돌았다. 업데이터는 순수해야 한다.
   */
  const stateRef = useRef(state)
  stateRef.current = state

  const targetRef = useRef(target)
  targetRef.current = target

  const act = useCallback((cmd: Command) => {
    const cur = stateRef.current
    if (busy.current || cur.over) return
    busy.current = true
    setMenu('root')
    // 대상은 커서가 정한다. defend/item 은 대상이 없다.
    const aimed: Command =
      cmd.type === 'attack' || cmd.type === 'skill' ? { ...cmd, target: targetRef.current } : cmd
    // 순서는 손놀림이 정한다
    void runTurn(cur, aimed, playerFirst(cur))
  }, [])

  /** 조각을 하나씩 보여 준다. 사이의 틈이 '주고받는' 느낌을 만든다. */
  const runTurn = useCallback(async (from: BattleState, cmd: Command, iGoFirst: boolean) => {
    const step = async (next: BattleState, who: 'mine' | 'theirs') => {
      setPhase(who)
      setState(next)
      stateRef.current = next
      await sleep(next.over ? 500 : STEP_MS)
      return next
    }

    let s = from
    if (iGoFirst) {
      s = await step(playerAct(s, cmd), 'mine')
      if (!s.over) s = await step(enemyAct(s), 'theirs')
    } else {
      s = await step(enemyAct(s), 'theirs')
      if (!s.over) s = await step(playerAct(s, cmd), 'mine')
    }

    if (!s.over) {
      const ended = endTurn(s)
      // 상태이상 피해 같은 마무리 로그가 있을 때만 한 박자 더 보여 준다
      setState(ended)
      stateRef.current = ended
      // 상태이상 피해 같은 마무리 로그가 있을 때만 한 박자 더 보여 준다
      if (ended.log.length > 0) await sleep(STEP_MS)
      s = ended
    }

    if (!s.over) setPhase('choose')
    // 시계는 고르는 동안만 도는데, 연출 중 흐른 시간이 한꺼번에 깎이면 안 된다.
    last.current = Date.now()
    busy.current = false
  }, [])

  // 시계. requestAnimationFrame 은 비활성 탭에서 느려지지만
  // Date.now() 차분으로 계산하므로 흘러간 시간은 그대로 반영된다.
  // 시계는 내가 고르는 동안에만 돈다. 연출 시간은 내 시간이 아니다.
  useEffect(() => {
    if (state.over || phase !== 'choose') return
    let raf = 0
    let timedOut = false
    const loop = () => {
      const now = Date.now()
      const dt = now - last.current
      last.current = now
      setState((s) => {
        if (s.over) return s
        const { state: next, autoAct } = tick(s, dt)
        // 명령 시간을 넘기면 자동으로 공격한다. 아무것도 안 하면 교착이 된다.
        if (autoAct && !next.over && !timedOut) {
          timedOut = true
          setTimeout(() => act({ type: 'attack' }), 0)
        }
        return next
      })
      raf = requestAnimationFrame(loop)
    }
    last.current = Date.now()
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [state.over, phase, act])

  useEffect(() => {
    if (state.over === 'win') {
      onWin({ ...run, hp: state.player.hp, mp: state.mp, potions: state.potions })
    } else if (state.over === 'lose' || state.over === 'timeout') {
      onEnd(state.over)
    }
  }, [state.over, state.player.hp, state.mp, state.potions, run, onWin, onEnd])

  // 고른 적이 먼저 쓰러지는 경우가 있다. 그때는 살아 있는 쪽으로 옮긴다.
  useEffect(() => {
    if (state.enemies[target]?.hp > 0) return
    const next = state.enemies.findIndex((e) => e.hp > 0)
    if (next >= 0) setTarget(next)
  }, [state.enemies, target])

  // 도우에 올린 토핑의 맛이 곧 쓸 수 있는 기술이다
  const ownedSkills = [...new Set(run.toppings.map((t) => t.taste))].flatMap(skillsOfTaste)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (state.over || phase !== 'choose') return
      if (e.key === 'Escape') return setMenu('root')

      // 적이 둘 이상일 때만 대상을 옮긴다
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        const living = state.enemies.map((en, i) => (en.hp > 0 ? i : -1)).filter((i) => i >= 0)
        if (living.length < 2) return
        const at = Math.max(0, living.indexOf(target))
        const step = e.key === 'ArrowLeft' ? -1 : 1
        setTarget(living[(at + step + living.length) % living.length])
        return
      }
      if (menu === 'root') {
        if (e.key === '1') act({ type: 'attack' })
        else if (e.key === '2') act({ type: 'defend' })
        else if (e.key === '3' && ownedSkills.length > 0) setMenu('skill')
        else if (e.key === '4') act({ type: 'item' })
      } else {
        const i = Number(e.key) - 1
        if (ownedSkills[i]) act({ type: 'skill', id: ownedSkills[i].id })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menu, act, ownedSkills, state.over, phase, state.enemies, target])

  const aliveCount = state.enemies.filter((e) => e.hp > 0).length
  const stageRatio = state.timeLeftMs / stageLimitMs(enc.kind)
  const turnRatio = state.turnLeftMs / TURN_LIMIT_MS
  const mpMax = maxMp(run.max)

  return (
    <div className={`bt bt--${enc.kind}`}>
      <header className="bt__top">
        <span className="bt__stage">
          {run.stage} 라운드
          {enc.kind !== 'normal' && <b className="bt__badge">{enc.kind === 'boss' ? 'BOSS' : '중간보스'}</b>}
        </span>
        <span className={stageRatio < 0.25 ? 'bt__clock is-low' : 'bt__clock'}>
          {formatClock(state.timeLeftMs)}
        </span>
        <span className="bt__turn">{state.turn}턴</span>
      </header>
      <div className="bt__stagebar">
        <i style={{ width: `${Math.max(0, stageRatio) * 100}%` }} />
      </div>

      {/*
        고전 JRPG 구도. 상대는 위 오른쪽, 상대 정보는 위 왼쪽.
        나는 아래 왼쪽, 내 정보는 아래 오른쪽. 시선이 대각선으로 오간다.
      */}
      <section className="bt__field">
        <div className="bt__side bt__side--foe">
          <div className="bt__info-col">
            {state.enemies.map((e, i) => (
              <FoeInfo
                key={e.id}
                unit={e}
                selected={i === target && aliveCount > 1}
                pickable={e.hp > 0 && aliveCount > 1 && phase === 'choose'}
                onPick={() => setTarget(i)}
              />
            ))}
          </div>
          <div className="bt__art-col">
            {state.enemies.map((e, i) => (
              <FoeArt
                key={e.id}
                unit={e}
                selected={i === target && aliveCount > 1}
                pickable={e.hp > 0 && aliveCount > 1 && phase === 'choose'}
                onPick={() => setTarget(i)}
              />
            ))}
          </div>
        </div>

        <div className="bt__side bt__side--mine">
          <div className="bt__art-col">
            <CharacterSprite shape={run.shape} scale={0.72} toppings={run.toppings} />
          </div>
          <div className="bt__info-col">
            <div className="bt__box bt__box--mine">
              <div className="bt__box-top">
                <b className="bt__who">{run.name}</b>
                {run.pizza && <span className="bt__job">{run.pizza.name}</span>}
                <Statuses unit={state.player} />
              </div>
              <Bar label={STAT_SHORT.hp} now={state.player.hp} max={state.player.maxHp} kind="hp" />
              <Bar label={STAT_SHORT.mag} now={state.mp} max={mpMax} kind="mp" />
            </div>
          </div>
        </div>
      </section>

      <section className={`bt__log bt__log--${phase}`} aria-live="polite">
        <span className="bt__phase">
          {phase === 'theirs' ? '상대 차례' : phase === 'mine' ? '내 차례' : '명령을 고르세요'}
        </span>
        {state.log.length === 0 ? (
          <p className="bt__log-empty">
            공격 · 방어 · 기술 · 반죽물{aliveCount > 1 ? ' — ←→ 로 대상 변경' : ''}
          </p>
        ) : (
          state.log.slice(-4).map((l, i) => <p key={i}>{l}</p>)
        )}
      </section>

      <div className="bt__turnbar">
        <i className={turnRatio < 0.3 ? 'is-low' : ''} style={{ width: `${turnRatio * 100}%` }} />
        <span>{Math.ceil(state.turnLeftMs / 1000)}</span>
      </div>

      <nav className={phase === 'choose' ? 'bt__cmds' : 'bt__cmds is-locked'}>
        {menu === 'root' ? (
          <>
            <button onClick={() => act({ type: 'attack' })} disabled={phase !== 'choose'}>
              <b>1</b> 공격
            </button>
            <button onClick={() => act({ type: 'defend' })} disabled={phase !== 'choose'}>
              <b>2</b> 방어
            </button>
            <button onClick={() => setMenu('skill')} disabled={ownedSkills.length === 0 || phase !== 'choose'}>
              <b>3</b> 기술
            </button>
            <button onClick={() => act({ type: 'item' })} disabled={state.potions <= 0 || phase !== 'choose'}>
              <b>4</b> 반죽물 {state.potions}
            </button>
          </>
        ) : (
          <>
            {ownedSkills.map((sk, i) => (
              <button
                key={sk.id}
                onClick={() => act({ type: 'skill', id: sk.id })}
                disabled={state.mp < sk.mp || phase !== 'choose'}
                title={TASTE_LABEL[sk.taste]}
              >
                <b>{i + 1}</b> {sk.name} <span className="bt__mp">{sk.mp}</span>
              </button>
            ))}
            <button className="bt__back" onClick={() => setMenu('root')}>
              Esc 뒤로
            </button>
          </>
        )}
      </nav>
    </div>
  )
}

type FoeProps = { unit: Unit; selected: boolean; pickable: boolean; onPick: () => void }

/** 클릭·키보드로 대상을 고를 수 있게 감싼다 */
function pickProps(p: FoeProps): HTMLAttributes<HTMLDivElement> {
  if (!p.pickable) return {}
  return {
    onClick: p.onPick,
    role: 'button',
    tabIndex: 0,
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        p.onPick()
      }
    },
    'aria-pressed': p.selected,
    style: { cursor: 'pointer' },
  }
}

/** 위 왼쪽 — 상대 정보 */
function FoeInfo(p: FoeProps) {
  const cls = ['bt__box', 'bt__box--foe', p.unit.hp <= 0 && 'is-dead', p.selected && 'is-target']
    .filter(Boolean)
    .join(' ')
  return (
    <div className={cls} {...pickProps(p)}>
      <div className="bt__box-top">
        <span className="bt__aim">{p.selected ? '▶' : ''}</span>
        <b className="bt__who">{p.unit.name}</b>
        {p.unit.taste && <i className="bt__line">{TASTE_LABEL[p.unit.taste]}</i>}
      </div>
      <Bar label="" now={p.unit.hp} max={p.unit.maxHp} kind="enemy" />
      <Statuses unit={p.unit} />
    </div>
  )
}

/** 위 오른쪽 — 상대 그림 */
function FoeArt(p: FoeProps) {
  const cls = ['bt__foe', p.unit.hp <= 0 && 'is-dead', p.selected && 'is-target']
    .filter(Boolean)
    .join(' ')
  return (
    <div className={cls} {...pickProps(p)}>
      <div
        className={`bt__foe-body bt__foe-body--${p.unit.taste ?? 'plain'} form form--${p.unit.form ?? 'round'}`}
      >
        <i className="form__a" />
        <i className="form__b" />
      </div>
    </div>
  )
}

function Statuses({ unit }: { unit: Unit }) {
  if (unit.statuses.length === 0) return null
  return (
    <span className="bt__statuses">
      {unit.statuses.map((s) => (
        <i key={s.kind} className={`bt__st bt__st--${s.kind}`}>
          {STATUS_LABEL[s.kind] ?? s.kind}
          {s.turns > 1 && s.turns}
        </i>
      ))}
    </span>
  )
}

function Bar({
  label,
  now,
  max,
  kind,
}: {
  label: string
  now: number
  max: number
  kind: 'hp' | 'mp' | 'enemy'
}) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, now / max)) : 0
  return (
    <div className={`bar bar--${kind}`}>
      {label && <span className="bar__label">{label}</span>}
      <span className="bar__track">
        <i style={{ width: `${ratio * 100}%` }} />
      </span>
      <span className="bar__num">
        {Math.max(0, now)}
        <em>/{max}</em>
      </span>
    </div>
  )
}
