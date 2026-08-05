/*
 * 임시 데모. 상함·타 버림 두 끝을 눌러서 바로 보고 듣기 위한 페이지다.
 * 실제 게임이 쓰는 Result 컴포넌트와 실제 소리를 그대로 부른다 —
 * 따로 흉내 내면 진짜와 다른 것을 보게 된다.
 *
 * 확인이 끝나면 이 파일과 _demo.html, vite.config 의 입력 항목을 지운다.
 */
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import Result, { type ResultKind } from './src/ui/Result'
import { addTopping, bake, createRun, type Run } from './src/core/run'
import { toppingStats, VEGGIES } from './src/core/topping'
import { play } from './src/ui/sound'
import './src/index.css'

/** 5라운드쯤 진행하다 끝난 도우를 흉내낸다 */
function sampleRun(): Run {
  let run = createRun('round', '검사도우', 3)
  const picks = [
    VEGGIES.find((v) => v.taste === 'spicy')!,
    VEGGIES.find((v) => v.taste === 'rich')!,
    VEGGIES.find((v) => v.taste === 'mild')!,
  ]
  for (const t of picks) run = addTopping(run, t, toppingStats(t))
  return { ...run, stage: 6, hp: 0 }
}

function App() {
  const [kind, setKind] = useState<ResultKind | null>(null)
  const run = sampleRun()

  const show = (k: ResultKind) => {
    // 전투가 끝나는 순간 Battle 이 내는 소리와 같은 것을 같은 규칙으로 고른다
    play(k === 'clear' ? 'finish' : k === 'timeout' ? 'burnt' : 'spoil')
    setKind(k)
  }

  if (kind) {
    return (
      <div style={{ height: '100vh', position: 'relative' }}>
        <Result
          kind={kind}
          run={kind === 'clear' ? bake({ ...run, stage: 10, hp: 120 }) : run}
          madeName={kind === 'clear' ? '핫칠리 인페르노 피자' : ''}
          found={3}
          onBack={() => setKind(null)}
        />
        <button
          onClick={() => setKind(null)}
          style={{
            position: 'fixed',
            top: 12,
            right: 12,
            zIndex: 20,
            padding: '6px 14px',
            border: '1px solid #c9ae82',
            background: '#fffdf7',
            borderRadius: 4,
            font: 'inherit',
            fontSize: 13,
          }}
        >
          ← 데모로
        </button>
      </div>
    )
  }

  const btn: React.CSSProperties = {
    padding: '18px 26px',
    fontSize: 16,
    fontWeight: 700,
    border: '2px solid #c9ae82',
    background: '#fffdf7',
    borderRadius: 6,
    cursor: 'pointer',
    font: 'inherit',
    textAlign: 'left',
    lineHeight: 1.5,
  }

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        background: '#fdf5e6',
        color: '#3b2a1a',
        padding: 20,
      }}
    >
      <h1 style={{ fontSize: 22 }}>끝나는 두 가지 — 데모</h1>
      <p style={{ fontSize: 13, color: '#6f5940', maxWidth: 440, textAlign: 'center' }}>
        실제 게임이 쓰는 화면과 소리 그대로입니다. 소리가 안 나면 화면을 한 번 누른 뒤
        다시 눌러 주세요 — 브라우저가 첫 클릭 전에는 소리를 막습니다.
      </p>

      <button style={btn} onClick={() => show('lose')}>
        🥀 상했다 <span style={{ fontWeight: 400, color: '#6f5940' }}>— 신선도가 다함 (규칙 2)</span>
        <br />
        <small style={{ fontWeight: 400, color: '#6f5940' }}>
          톱니파가 1초에 걸쳐 가라앉고 바닥에 둔탁하게 떨어진다
        </small>
      </button>

      <button style={btn} onClick={() => show('timeout')}>
        🔥 타 버렸다 <span style={{ fontWeight: 400, color: '#6f5940' }}>— 시간 초과 (규칙 1)</span>
        <br />
        <small style={{ fontWeight: 400, color: '#6f5940' }}>
          잡음이 지글거리고 위에서 눌러 끈다
        </small>
      </button>

      <button style={btn} onClick={() => show('clear')}>
        🍕 완성 <span style={{ fontWeight: 400, color: '#6f5940' }}>— 견주어 보기</span>
        <br />
        <small style={{ fontWeight: 400, color: '#6f5940' }}>폭죽이 함께 터진다</small>
      </button>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button style={{ ...btn, padding: '8px 14px', fontSize: 13 }} onClick={() => play('spoil')}>
          소리만 — 상함
        </button>
        <button style={{ ...btn, padding: '8px 14px', fontSize: 13 }} onClick={() => play('burnt')}>
          소리만 — 타 버림
        </button>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
