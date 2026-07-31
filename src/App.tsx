import { useCallback, useState } from 'react'
import TitleScreen from './ui/TitleScreen'
import CharacterCreate from './ui/CharacterCreate'
import DiceRoll from './ui/DiceRoll'
import Battle from './ui/Battle'
import Reward from './ui/Reward'
import Result, { type ResultKind } from './ui/Result'
import Recruit from './ui/Recruit'
import type { Gender } from './core/character'
import { DICE, type Face } from './core/dice'
import { BAKE_STAGE } from './core/pizza'
import {
  addTopping,
  bake,
  createRun,
  FINAL_STAGE,
  healAfterStage,
  PICKS_PER_STOP,
  refillMp,
  REWARD_CHOICES,
  type Run,
} from './core/run'
import { rollEncounter, type Encounter, type EnemyDef } from './core/enemy'
import { toppingStats } from './core/topping'
import { loadPieces, PUZZLE_TOTAL, savePieces } from './core/save'
import './App.css'

type Screen =
  | 'title'
  | 'character'
  | 'dice'
  | 'battle'
  | 'recruit'
  | 'reward'
  | 'result'
  | 'puzzle'
  | 'howto'

/** 클리어 시 지급하는 조각 ⚠ */
function piecesFor(run: Run): number {
  return run.pizza?.grade === 'full' ? 2 : 1
}

// ponytail: 화면 수가 적어 라우터 없이 상태 하나로 전환한다.
export default function App() {
  const [screen, setScreen] = useState<Screen>('title')
  const [gender, setGender] = useState<Gender>('female')
  const [name, setName] = useState('')
  // 런은 주사위를 굴린 순간 만들어진다. 그 전에는 캐릭터 정보만 들고 있다.
  const [run, setRun] = useState<Run | null>(null)
  // 라운드마다 새로 뽑는다. 고정 표가 아니다.
  const [enc, setEnc] = useState<Encounter>(() => rollEncounter(1))
  const [result, setResult] = useState<ResultKind>('lose')
  const [gained, setGained] = useState(0)
  const [pieces, setPieces] = useState(() => loadPieces())

  const back = useCallback(() => setScreen('title'), [])

  const toDice = useCallback((g: Gender, n: string) => {
    setGender(g)
    setName(n)
    setScreen('dice')
  }, [])

  const startRun = useCallback(
    (face: Face) => {
      // 1-1 이 보상 지점인 조합도 있으므로 전직 판정은 스테이지 진입 시 건다.
      setRun(refillMp(createRun(gender, name, face)))
      setEnc(rollEncounter(1))
      setScreen('battle')
    },
    [gender, name],
  )

  /** 다음 스테이지로. 1-8 진입 시 전직이 걸린다. */
  const advance = useCallback((cur: Run) => {
    let next: Run = { ...cur, stage: cur.stage + 1 }
    if (next.stage >= BAKE_STAGE) next = bake(next)
    setRun(refillMp(next))
    setEnc(rollEncounter(next.stage))
    setScreen('battle')
  }, [])

  /** 스테이지 승리 — 회복 → 보상 지점이면 보상, 아니면 바로 다음 스테이지 */
  const onWin = useCallback(
    (afterBattle: Run) => {
      const healed = healAfterStage(afterBattle)

      if (healed.stage >= FINAL_STAGE) {
        const got = piecesFor(healed)
        const total = Math.min(PUZZLE_TOTAL, loadPieces() + got)
        savePieces(total)
        setPieces(total)
        setGained(got)
        setRun(healed)
        setResult('clear')
        setScreen('result')
        return
      }

      // 먼저 재료를 올릴지 고르고, 그다음이 보상 지점이다.
      setRun(healed)
      setScreen('recruit')
    },
    [],
  )

  /** 동료로 만들기 / 지나치기 */
  const onRecruit = useCallback(
    (picked: EnemyDef | null) => {
      if (!run) return
      const next = picked ? addTopping(run, picked.topping, toppingStats(picked.topping)) : run
      if (next.rewardStages.includes(next.stage)) {
        setRun(next)
        setScreen('reward')
      } else {
        advance(next)
      }
    },
    [run, advance],
  )

  const onRewardDone = useCallback((next: Run) => advance(next), [advance])

  const onEnd = useCallback(
    (reason: 'lose' | 'timeout') => {
      setGained(0)
      setResult(reason)
      setScreen('result')
    },
    [],
  )

  if (screen === 'title') {
    return <TitleScreen onSelect={(a) => setScreen(a === 'start' ? 'character' : a)} />
  }

  if (screen === 'character') {
    return <CharacterCreate onConfirm={toDice} onBack={back} />
  }

  if (screen === 'dice') {
    return <DiceRoll gender={gender} name={name} onStart={startRun} />
  }

  if (screen === 'battle' && run) {
    // key 를 스테이지에 묶어 스테이지가 바뀌면 전투 상태를 새로 만든다.
    return <Battle key={run.stage} run={run} enc={enc} onWin={onWin} onEnd={onEnd} />
  }

  if (screen === 'recruit' && run) {
    return <Recruit key={run.stage} run={run} defeated={enc.enemies} onDone={onRecruit} />
  }

  if (screen === 'reward' && run) {
    return <Reward key={run.stage} run={run} onDone={onRewardDone} />
  }

  if (screen === 'result' && run) {
    return <Result kind={result} run={run} gained={gained} pieces={pieces} onBack={back} />
  }

  return (
    <div className="stub">
      <div className="stub__panel">
        {screen === 'puzzle' && <PuzzlePanel pieces={pieces} />}
        {screen === 'howto' && <HowToPanel />}
        <button className="stub__back" onClick={back}>
          ← 돌아가기
        </button>
      </div>
    </div>
  )
}

function PuzzlePanel({ pieces }: { pieces: number }) {
  return (
    <>
      <h2>퍼즐 조각</h2>
      <div className="puzzle">
        {Array.from({ length: PUZZLE_TOTAL }, (_, i) => (
          <span key={i} className={i < pieces ? 'cell got' : 'cell'} />
        ))}
      </div>
      <p className="stub__desc">
        스테이지 1-10 클리어 시 조각 획득. 전직 등급이 <b>완성</b>이면 2개.{' '}
        {PUZZLE_TOTAL}개를 모두 모으면 업적 달성.
      </p>
    </>
  )
}

function HowToPanel() {
  return (
    <>
      <h2>조작 안내</h2>
      <ul className="stub__list">
        <li>
          게임 시작 시 주사위를 <b>단 한 번</b> 굴려 시작 능력치를 받습니다. 다시 굴릴 수 없습니다.
        </li>
        <li>
          전투는 턴제입니다. <b>공격 / 방어 / 스킬 / 아이템</b> 중 하나를 고릅니다. 커맨드는{' '}
          <b>10초</b> 안에 골라야 하며, 넘기면 자동으로 공격합니다.
        </li>
        <li>
          스테이지는 <b>100초</b>, 보스는 <b>150초</b> 안에 끝내야 합니다. 시간이 다하면 게임
          오버입니다.
        </li>
        <li>
          보상이 나오는 스테이지는 <b>판마다 달라집니다.</b> 지점은 3곳이며, 각 지점에서{' '}
          <b>{REWARD_CHOICES}개 중 1개</b>를 <b>{PICKS_PER_STOP}번</b> 고릅니다.
        </li>
        <li>
          <b>1-{BAKE_STAGE}</b>에 진입하면 도우가 구워집니다. 그때까지 올린 토핑의 맛이 어떤 피자가
          될지, 또 보너스가 얼마나 강할지를 정합니다.
        </li>
        <li>사망하면 처음부터. 퍼즐 조각만 남습니다.</li>
      </ul>
      <p className="stub__desc">
        주사위 눈: {Object.values(DICE).map((d) => d.desc).join(' · ')}
      </p>
    </>
  )
}
