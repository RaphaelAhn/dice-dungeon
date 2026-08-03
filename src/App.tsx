import { useCallback, useState } from 'react'
import TitleScreen from './ui/TitleScreen'
import CharacterCreate from './ui/CharacterCreate'
import DiceRoll from './ui/DiceRoll'
import Battle from './ui/Battle'
import Reward from './ui/Reward'
import Result, { type ResultKind } from './ui/Result'
import Recruit from './ui/Recruit'
import Codex from './ui/Codex'
import type { Shape } from './core/character'
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
import { CODEX_TOTAL, discoveredCount, fullName, loadCodex, recordPizza } from './core/codex'
import './App.css'

type Screen =
  | 'title'
  | 'character'
  | 'dice'
  | 'battle'
  | 'recruit'
  | 'reward'
  | 'result'
  | 'codex'
  | 'howto'


// ponytail: 화면 수가 적어 라우터 없이 상태 하나로 전환한다.
export default function App() {
  const [screen, setScreen] = useState<Screen>('title')
  const [shape, setShape] = useState<Shape>('round')
  const [name, setName] = useState('')
  // 런은 주사위를 굴린 순간 만들어진다. 그 전에는 캐릭터 정보만 들고 있다.
  const [run, setRun] = useState<Run | null>(null)
  // 라운드마다 새로 뽑는다. 고정 표가 아니다.
  const [enc, setEnc] = useState<Encounter>(() => rollEncounter(1))
  const [result, setResult] = useState<ResultKind>('lose')
  // 결과 화면에 보여 줄 완성작 이름과 도감 진행도
  const [madeName, setMadeName] = useState('')
  const [found, setFound] = useState(() => discoveredCount(loadCodex()))

  const back = useCallback(() => setScreen('title'), [])

  const toDice = useCallback((g: Shape, n: string) => {
    setShape(g)
    setName(n)
    setScreen('dice')
  }, [])

  const startRun = useCallback(
    (face: Face) => {
      setRun(refillMp(createRun(shape, name, face)))
      setEnc(rollEncounter(1))
      setScreen('battle')
    },
    [shape, name],
  )

  /** 다음 라운드로. 8라운드 진입 시 굽기가 걸린다. */
  const advance = useCallback((cur: Run) => {
    let next: Run = { ...cur, stage: cur.stage + 1 }
    if (next.stage >= BAKE_STAGE) next = bake(next)
    setRun(refillMp(next))
    setEnc(rollEncounter(next.stage))
    setScreen('battle')
  }, [])

  /** 라운드 승리 — 회복 → 재료 선택 → (보상 지점이면) 보상 */
  const onWin = useCallback(
    (afterBattle: Run) => {
      const healed = healAfterStage(afterBattle)

      if (healed.stage >= FINAL_STAGE) {
        // 보스를 잡으면 그 소스가 발려 피자가 완성된다. 소스는 보스에서만 나온다.
        const sauce = enc.enemies.find((e) => e.topping.kind === 'sauce')?.topping
        const done: Run = sauce ? { ...healed, toppings: [...healed.toppings, sauce] } : healed

        if (done.pizza) {
          setMadeName(fullName(done.pizza, done.toppings))
          setFound(discoveredCount(recordPizza(done.pizza, done.toppings)))
        }
        setRun(done)
        setResult('clear')
        setScreen('result')
        return
      }

      // 먼저 재료를 올릴지 고르고, 그다음이 보상 지점이다.
      setRun(healed)
      setScreen('recruit')
    },
    [enc],
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

  const onEnd = useCallback((reason: 'lose' | 'timeout') => {
    setMadeName('')
    setResult(reason)
    setScreen('result')
  }, [])

  if (screen === 'title') {
    return <TitleScreen onSelect={(a) => setScreen(a === 'start' ? 'character' : a)} />
  }

  if (screen === 'character') {
    return <CharacterCreate onConfirm={toDice} onBack={back} />
  }

  if (screen === 'dice') {
    return <DiceRoll shape={shape} name={name} onStart={startRun} />
  }

  if (screen === 'battle' && run) {
    // key 를 라운드에 묶어 라운드가 바뀌면 전투 상태를 새로 만든다.
    return <Battle key={run.stage} run={run} enc={enc} onWin={onWin} onEnd={onEnd} />
  }

  if (screen === 'recruit' && run) {
    return <Recruit key={run.stage} run={run} defeated={enc.enemies} onDone={onRecruit} />
  }

  if (screen === 'reward' && run) {
    return <Reward key={run.stage} run={run} onDone={onRewardDone} />
  }

  if (screen === 'result' && run) {
    return <Result kind={result} run={run} madeName={madeName} found={found} onBack={back} />
  }

  if (screen === 'codex') {
    return <Codex onBack={back} />
  }

  return (
    <div className="stub">
      <div className="stub__panel">
        {screen === 'howto' && <HowToPanel />}
        <button className="stub__back" onClick={back}>
          ← 돌아가기
        </button>
      </div>
    </div>
  )
}

function HowToPanel() {
  return (
    <>
      <h2>조작 안내</h2>
      <ul className="stub__list">
        <li>
          시작할 때 주사위를 <b>단 한 번</b> 굴려 도우의 시작 능력을 받습니다. 다시 굴릴 수 없습니다.
        </li>
        <li>
          전투는 턴제입니다. <b>공격 / 방어 / 기술 / 반죽물</b> 중 하나를 고릅니다. 명령은{' '}
          <b>10초</b> 안에 골라야 하며, 넘기면 자동으로 공격합니다.
        </li>
        <li>
          한 라운드는 <b>100초</b>, 보스는 <b>150초</b> 안에 끝내야 합니다. 시간이 다하면 반죽이
          타 버립니다.
        </li>
        <li>
          보상이 나오는 라운드는 <b>판마다 달라집니다.</b> 지점은 3곳이며, 각 지점에서{' '}
          <b>{REWARD_CHOICES}개 중 1개</b>를 <b>{PICKS_PER_STOP}번</b> 고릅니다.
        </li>
        <li>
          <b>{BAKE_STAGE} 라운드</b>에 들어서면 도우가 구워집니다. 그때까지 올린 토핑의 맛이 어떤
          피자가 될지, 보너스가 얼마나 강할지를 정합니다.
        </li>
        <li>
          실패하면 처음부터. 완성한 피자만 <b>도감</b>에 남습니다 (총 {CODEX_TOTAL}종).
        </li>
      </ul>
      <p className="stub__desc">
        주사위 눈: {Object.values(DICE).map((d) => d.desc).join(' · ')}
      </p>
    </>
  )
}
