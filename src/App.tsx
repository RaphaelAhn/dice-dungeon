import { useCallback, useState } from 'react'
import TitleScreen from './ui/TitleScreen'
import CharacterCreate from './ui/CharacterCreate'
import DiceRoll from './ui/DiceRoll'
import type { Gender } from './core/character'
import { DICE, type Face } from './core/dice'
import { createRun, PICKS_PER_STOP, REWARD_CHOICES, stagesToNextReward, type Run } from './core/run'
import { loadPieces, PUZZLE_TOTAL } from './core/save'
import './App.css'

type Screen = 'title' | 'character' | 'dice' | 'stage' | 'puzzle' | 'howto'

// ponytail: 화면 수가 적어 라우터 없이 상태 하나로 전환한다.
export default function App() {
  const [screen, setScreen] = useState<Screen>('title')
  const [gender, setGender] = useState<Gender>('female')
  const [name, setName] = useState('')
  // 런은 주사위를 굴린 순간 만들어진다. 그 전에는 캐릭터 정보만 들고 있다.
  const [run, setRun] = useState<Run | null>(null)
  const back = useCallback(() => setScreen('title'), [])

  const toDice = useCallback((g: Gender, n: string) => {
    setGender(g)
    setName(n)
    setScreen('dice')
  }, [])

  const startRun = useCallback(
    (face: Face) => {
      setRun(createRun(gender, name, face))
      setScreen('stage')
    },
    [gender, name],
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

  return (
    <div className="stub">
      <div className="stub__panel">
        {screen === 'puzzle' && <PuzzlePanel />}
        {screen === 'howto' && <HowToPanel />}
        {screen === 'stage' && run && <StagePanel run={run} />}
        <button className="stub__back" onClick={back}>
          ← 돌아가기
        </button>
      </div>
    </div>
  )
}

function PuzzlePanel() {
  const pieces = loadPieces()
  return (
    <>
      <h2>퍼즐 조각</h2>
      <div className="puzzle">
        {Array.from({ length: PUZZLE_TOTAL }, (_, i) => (
          <span key={i} className={i < pieces ? 'cell got' : 'cell'} />
        ))}
      </div>
      <p className="stub__desc">
        스테이지 1-10 클리어 시 조각 획득. {PUZZLE_TOTAL}개를 모두 모으면 업적 달성.
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
          <b>3개 중 1개</b>를 <b>3번</b> 고릅니다.
        </li>
        <li>
          <b>1-8</b>에 진입하면 무조건 전직합니다. 그때까지 모은 스킬 계열이 어떤 직업이 될지, 또
          보너스가 얼마나 강할지를 정합니다.
        </li>
        <li>사망하면 처음부터. 퍼즐 조각만 남습니다.</li>
      </ul>
    </>
  )
}

function StagePanel({ run }: { run: Run }) {
  const d = DICE[run.face]
  const left = stagesToNextReward(run)
  return (
    <>
      <h2>스테이지 1-{run.stage}</h2>
      <p className="stub__desc">
        <b>{run.name}</b> · 주사위 {run.face} <b>{d.name}</b>({d.desc}) · 보상 {REWARD_CHOICES}택
        {run.topTierLeft > 0 && ` · 최고 티어 확정 ${run.topTierLeft}회`}
      </p>
      {/* 보상 지점은 판마다 달라진다. 숨기면 계획을 세울 수 없으니 그대로 보여준다. */}
      <p className="stub__desc">
        보상 지점 <b>{run.rewardStages.map((s) => `1-${s}`).join(' · ')}</b> · 지점당{' '}
        {PICKS_PER_STOP}장
        {left === null
          ? ' · 남은 보상 없음'
          : left === 0
            ? ' · 이번 스테이지 클리어 시 보상'
            : ` · 다음 보상까지 ${left}스테이지`}
      </p>
      <p className="stub__desc">
        HP {run.hp}/{run.max.hp} · MP {run.mp} · 공 {run.max.atk} · 마 {run.max.mag} · 속{' '}
        {run.max.spd} · 운 {run.max.luk}
      </p>
      <p className="stub__desc">턴제 전투는 다음 단계에서 만듭니다.</p>
    </>
  )
}
