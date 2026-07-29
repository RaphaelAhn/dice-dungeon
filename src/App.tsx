import { useCallback, useState } from 'react'
import TitleScreen from './ui/TitleScreen'
import CharacterCreate from './ui/CharacterCreate'
import CharacterSprite from './ui/CharacterSprite'
import { GENDER_LABEL, type Gender } from './core/character'
import { loadPieces, PUZZLE_TOTAL } from './core/save'
import './App.css'

type Screen = 'title' | 'character' | 'dice' | 'puzzle' | 'howto'

// ponytail: 화면 수가 적어 라우터 없이 상태 하나로 전환한다.
export default function App() {
  const [screen, setScreen] = useState<Screen>('title')
  const [gender, setGender] = useState<Gender>('female')
  const [name, setName] = useState('')
  const back = useCallback(() => setScreen('title'), [])

  const startRun = useCallback((g: Gender, n: string) => {
    setGender(g)
    setName(n)
    setScreen('dice')
  }, [])

  if (screen === 'title') {
    return <TitleScreen onSelect={(a) => setScreen(a === 'start' ? 'character' : a)} />
  }

  if (screen === 'character') {
    return <CharacterCreate onConfirm={startRun} onBack={back} />
  }

  return (
    <div className="stub">
      <div className="stub__panel">
        {screen === 'puzzle' && <PuzzlePanel />}
        {screen === 'howto' && <HowToPanel />}
        {screen === 'dice' && <DicePanel gender={gender} name={name} />}
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
        <li>게임 시작 시 주사위를 <b>단 한 번</b> 굴려 시작 축복을 받습니다. 다시 굴릴 수 없습니다.</li>
        <li>전투는 턴제입니다. <b>공격 / 방어 / 스킬 / 아이템</b> 중 하나를 고릅니다.</li>
        <li>스테이지를 클리어하면 보상 <b>3개 중 1개</b>를 선택합니다.</li>
        <li>스킬 3개가 모이면 조합에 따라 자동으로 전직합니다.</li>
        <li>사망하면 처음부터. 퍼즐 조각만 남습니다.</li>
      </ul>
    </>
  )
}

function DicePanel({ gender, name }: { gender: Gender; name: string }) {
  return (
    <>
      <h2>주사위 굴리기</h2>
      <div className="stub__hero">
        <CharacterSprite gender={gender} scale={2} />
        <b className="stub__hero-name">{name}</b>
      </div>
      <p className="stub__desc">
        {GENDER_LABEL[gender]} 캐릭터 <b>{name}</b>(으)로 시작합니다. 주사위 화면은 다음 단계에서
        만듭니다.
      </p>
    </>
  )
}
