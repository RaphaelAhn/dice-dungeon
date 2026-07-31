import { useCallback, useEffect, useRef, useState } from 'react'
import { startBattle, takeTurn, tick, type BattleState, type Command, type Unit } from '../core/battle'
import { ENCOUNTERS } from '../core/enemy'
import { maxMp, type Run } from '../core/run'
import { LINE_LABEL, skillsOfLine } from '../core/skill'
import { formatClock, stageLimitMs, TURN_LIMIT_MS } from '../core/timer'
import CharacterSprite from './CharacterSprite'
import './Battle.css'

const STATUS_LABEL: Record<string, string> = {
  burn: '화상',
  stun: '빙결',
  slow: '둔화',
  atkDown: '약화',
  guard: '방어',
}

export default function Battle({
  run,
  onWin,
  onEnd,
}: {
  run: Run
  /** 승리 — 전투 결과가 반영된 런을 돌려준다 */
  onWin: (next: Run) => void
  /** 규칙 1(시간 초과) 또는 규칙 2(사망) */
  onEnd: (reason: 'lose' | 'timeout') => void
}) {
  const [state, setState] = useState<BattleState>(() => startBattle(run, run.stage))
  const [menu, setMenu] = useState<'root' | 'skill'>('root')
  // 실제 경과 시간으로 재야 탭을 옮겨도 시계가 멈추지 않는다.
  const last = useRef(Date.now())

  const act = useCallback((cmd: Command) => {
    setMenu('root')
    setState((s) => (s.over ? s : takeTurn(s, cmd)))
  }, [])

  // 시계. requestAnimationFrame 은 비활성 탭에서 느려지지만
  // Date.now() 차분으로 계산하므로 흘러간 시간은 그대로 반영된다.
  useEffect(() => {
    if (state.over) return
    let raf = 0
    const loop = () => {
      const now = Date.now()
      const dt = now - last.current
      last.current = now
      setState((s) => {
        if (s.over) return s
        const { state: next, autoAct } = tick(s, dt)
        // 턴 제한을 넘기면 자동으로 공격한다. 아무것도 안 하면 교착이 된다.
        return autoAct && !next.over ? takeTurn(next, { type: 'attack' }) : next
      })
      raf = requestAnimationFrame(loop)
    }
    last.current = Date.now()
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [state.over])

  useEffect(() => {
    if (state.over === 'win') {
      onWin({ ...run, hp: state.player.hp, mp: state.mp, potions: state.potions })
    } else if (state.over === 'lose' || state.over === 'timeout') {
      onEnd(state.over)
    }
  }, [state.over, state.player.hp, state.mp, state.potions, run, onWin, onEnd])

  const ownedSkills = [...new Set(run.skills)].flatMap((l) => skillsOfLine(l))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (state.over) return
      if (e.key === 'Escape') return setMenu('root')
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
  }, [menu, act, ownedSkills, state.over])

  const enc = ENCOUNTERS[run.stage]
  const stageRatio = state.timeLeftMs / stageLimitMs(enc.kind)
  const turnRatio = state.turnLeftMs / TURN_LIMIT_MS
  const mpMax = maxMp(run.max)

  return (
    <div className={`bt bt--${enc.kind}`}>
      <header className="bt__top">
        <span className="bt__stage">
          스테이지 1-{run.stage}
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

      <section className="bt__enemies">
        {state.enemies.map((e) => (
          <EnemyCard key={e.id} unit={e} />
        ))}
      </section>

      <section className="bt__log" aria-live="polite">
        {state.log.length === 0 ? (
          <p className="bt__log-empty">명령을 고르세요</p>
        ) : (
          state.log.slice(-4).map((l, i) => <p key={i}>{l}</p>)
        )}
      </section>

      <section className="bt__player">
        <CharacterSprite gender={run.gender} scale={1} />
        <div className="bt__pinfo">
          <div className="bt__prow">
            <b>{run.name}</b>
            {run.job && <span className="bt__job">{run.job.name}</span>}
            <Statuses unit={state.player} />
          </div>
          <Bar label="HP" now={state.player.hp} max={state.player.maxHp} kind="hp" />
          <Bar label="MP" now={state.mp} max={mpMax} kind="mp" />
        </div>
      </section>

      <div className="bt__turnbar">
        <i className={turnRatio < 0.3 ? 'is-low' : ''} style={{ width: `${turnRatio * 100}%` }} />
        <span>{Math.ceil(state.turnLeftMs / 1000)}</span>
      </div>

      <nav className="bt__cmds">
        {menu === 'root' ? (
          <>
            <button onClick={() => act({ type: 'attack' })}>
              <b>1</b> 공격
            </button>
            <button onClick={() => act({ type: 'defend' })}>
              <b>2</b> 방어
            </button>
            <button onClick={() => setMenu('skill')} disabled={ownedSkills.length === 0}>
              <b>3</b> 스킬
            </button>
            <button onClick={() => act({ type: 'item' })} disabled={state.potions <= 0}>
              <b>4</b> 포션 {state.potions}
            </button>
          </>
        ) : (
          <>
            {ownedSkills.map((sk, i) => (
              <button
                key={sk.id}
                onClick={() => act({ type: 'skill', id: sk.id })}
                disabled={state.mp < sk.mp}
                title={LINE_LABEL[sk.line]}
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

function EnemyCard({ unit }: { unit: Unit }) {
  const dead = unit.hp <= 0
  return (
    <div className={dead ? 'bt__enemy is-dead' : 'bt__enemy'}>
      <div className="bt__enemy-body" />
      <span className="bt__enemy-name">
        {unit.name}
        {unit.line && <i className="bt__line">{LINE_LABEL[unit.line]}</i>}
      </span>
      <Bar label="" now={unit.hp} max={unit.maxHp} kind="enemy" />
      <Statuses unit={unit} />
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
