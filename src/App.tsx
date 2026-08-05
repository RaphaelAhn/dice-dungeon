import { useCallback, useState } from 'react'
import TitleScreen from './ui/TitleScreen'
import CharacterCreate from './ui/CharacterCreate'
import DiceRoll from './ui/DiceRoll'
import Divide from './ui/Divide'
import Balling from './ui/Balling'
import Shaping from './ui/Shaping'
import Battle from './ui/Battle'
import Reward from './ui/Reward'
import Result, { type ResultKind } from './ui/Result'
import Recruit from './ui/Recruit'
import Codex from './ui/Codex'
import { play } from './ui/sound'
import { DICE, type Face } from './core/dice'
import type { Portion } from './core/divide'
import type { Stretch } from './core/forming'
import { BAKE_STAGE } from './core/pizza'
import {
  addTopping,
  bake,
  createRun,
  drawEncounter,
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
  | 'divide'
  | 'balling'
  | 'shaping'
  | 'battle'
  | 'recruit'
  | 'reward'
  | 'result'
  | 'codex'
  | 'howto'


// ponytail: 화면 수가 적어 라우터 없이 상태 하나로 전환한다.
export default function App() {
  const [screen, setScreen] = useState<Screen>('title')
  const [name, setName] = useState('')
  // 숙성 결과. 분할을 거쳐 런을 만들 때까지 들고 있는다.
  const [face, setFace] = useState<Face>(1)
  // 만들기 단계의 결과. 런이 만들어질 때 한꺼번에 반영된다.
  const [portion, setPortion] = useState<Portion>('medium')
  const [tension, setTension] = useState(70)
  // 런은 주사위를 굴린 순간 만들어진다. 그 전에는 캐릭터 정보만 들고 있다.
  const [run, setRun] = useState<Run | null>(null)
  // 라운드마다 새로 뽑는다. 고정 표가 아니다.
  const [enc, setEnc] = useState<Encounter>(() => rollEncounter(1))
  const [result, setResult] = useState<ResultKind>('lose')
  // 결과 화면에 보여 줄 완성작 이름과 도감 진행도
  const [madeName, setMadeName] = useState('')
  const [found, setFound] = useState(() => discoveredCount(loadCodex()))

  const back = useCallback(() => setScreen('title'), [])

  const toDice = useCallback((n: string) => {
    setName(n)
    setScreen('dice')
  }, [])

  /* 숙성이 끝나면 곧바로 싸우지 않는다. 반죽을 한 판 크기로 떼어내는 게 먼저다. */
  const toDivide = useCallback((f: Face) => {
    setFace(f)
    setScreen('divide')
  }, [])

  /* 분할 → 둥글리기 → 성형. 앞 단계의 결과를 들고 다음으로 넘긴다. */
  const toBalling = useCallback((p: Portion) => {
    setPortion(p)
    setScreen('balling')
  }, [])

  const toShaping = useCallback((t: number) => {
    setTension(t)
    setScreen('shaping')
  }, [])

  const startRun = useCallback(
    (stretch: Stretch) => {
      const started = drawEncounter(
        refillMp(createRun(name, face, portion, tension, stretch)),
      )
      setRun(started.run)
      setEnc(started.enc)
      setScreen('battle')
    },
    [name, face, portion, tension],
  )

  /** 다음 라운드로. 8라운드 진입 시 굽기가 걸린다. */
  const advance = useCallback((cur: Run) => {
    let next: Run = { ...cur, stage: cur.stage + 1 }
    if (next.stage >= BAKE_STAGE) next = bake(next)
    // 굽기는 판에 한 번뿐이다. 없던 피자가 생긴 그 순간에만 소리를 낸다.
    if (!cur.pizza && next.pizza) play('bake')
    const drawn = drawEncounter(refillMp(next))
    setRun(drawn.run)
    setEnc(drawn.enc)
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
    return <DiceRoll name={name} onStart={toDivide} />
  }

  if (screen === 'divide') {
    return <Divide name={name} onDone={toBalling} />
  }

  if (screen === 'balling') {
    return <Balling name={name} onDone={toShaping} />
  }

  if (screen === 'shaping') {
    return <Shaping name={name} tension={tension} onDone={startRun} />
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
          시작할 때 <b>도우 숙성</b>을 한 번 합니다. 그때 나온 주사위 눈이 시작 능력을 정하며,
          다시 할 수 없습니다.
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
