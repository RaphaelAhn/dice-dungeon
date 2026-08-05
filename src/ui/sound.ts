/**
 * 소리. 음원 파일 없이 브라우저가 그때그때 합성한다.
 *
 * 왜 파일을 안 쓰나 — 캐릭터·적·게이지를 전부 CSS 로 그린 것과 같은 이유다.
 * 짧은 효과음 열몇 개도 파일로 두면 수백 KB 가 붙고, 심사자가 링크를 눌렀을
 * 때 첫 소리까지 기다리게 된다. 그리고 제출 서류의 저작권 확인서는 '순수
 * 창작물'을 요구한다 — 무료 음원을 쓰면 출처를 따로 밝혀야 하지만 오실레이터로
 * 만든 소리는 따질 것이 없다. 지금 이 파일이 소리의 전부고 용량은 0 이다.
 *
 * 브라우저는 사용자가 한 번 누르기 전에는 소리를 못 내게 막는다(자동재생 정책).
 * 그래서 AudioContext 를 미리 만들지 않고 첫 play() 때 만든다. 타이틀 화면에서
 * 반드시 한 번은 누르므로 실제로 걸리는 일은 없다.
 */

type Wave = OscillatorType

/** 음 하나. from → to 로 미끄러지며 dur 초 동안 난다. */
type Tone = {
  wave?: Wave
  from: number
  /** 끝 주파수. 없으면 음이 안 움직인다 */
  to?: number
  dur: number
  /** 0~1 */
  vol?: number
  /** 시작 지연(초) */
  at?: number
}

/** 부딪히는 소리. 음정이 없는 잡음을 짧게 끊어 쓴다. */
type Noise = {
  dur: number
  vol?: number
  at?: number
  /** 이 주파수 아래를 깎는다. 높일수록 얇고 날카로워진다 */
  hp?: number
}

type Spec = { tones?: Tone[]; noise?: Noise[] }

const MUTE_KEY = 'dough:mute'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noiseBuf: AudioBuffer | null = null
let muted = readMuted()

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    // 사생활 보호 모드에서 localStorage 가 막힌다. 소리는 켜 두고 넘어간다.
    return false
  }
}

export function isMuted(): boolean {
  return muted
}

export function toggleMute(): boolean {
  muted = !muted
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch {
    /* 저장이 안 돼도 이번 판에서는 꺼진 채로 간다 */
  }
  if (master && ctx) {
    master.gain.setTargetAtTime(muted ? 0 : MASTER_VOL, ctx.currentTime, 0.01)
  }
  return muted
}

/*
 * 전체 크기. 0.22 로 잡았더니 렌더링 최대 진폭이 0.05~0.12 밖에 안 나왔다 —
 * 헤드폰이면 몰라도 노트북 스피커에서는 거의 안 들리는 수준이다.
 * 0.45 면 최대 0.11~0.26 으로, 놀랄 정도는 아니면서 들린다.
 */
const MASTER_VOL = 0.45

function ensure(): boolean {
  if (muted) return false
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return false
    ctx = new Ctor()
    master = ctx.createGain()
    master.gain.value = MASTER_VOL
    master.connect(ctx.destination)

    // 잡음은 한 번만 만들어 두고 돌려 쓴다. 매번 만들면 소리마다 버퍼가 쌓인다.
    const len = Math.floor(ctx.sampleRate * 0.4)
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  }
  /*
   * 탭을 옮겼다 오면 멈춰 있다. 다시 깨운다.
   * resume() 은 거절될 수 있다 — 놓아두면 콘솔에 미처리 거부가 쌓인다.
   * 소리 하나 못 낸 것으로 판이 멈출 이유는 없으니 삼킨다.
   */
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  return true
}

function tone(t: Tone, now: number): void {
  if (!ctx || !master) return
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = t.wave ?? 'square'

  const at = now + (t.at ?? 0)
  const end = at + t.dur
  osc.frequency.setValueAtTime(t.from, at)
  if (t.to !== undefined) {
    // 0 으로 가면 exponential 이 죽는다. 아래를 막아 둔다.
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, t.to), end)
  }

  /*
   * 소리를 갑자기 끊으면 딱 하는 잡음이 난다. 아주 짧게 올렸다가 내린다.
   * 0 에서 exponential 을 시작할 수 없어 아주 작은 값에서 출발한다.
   */
  const vol = t.vol ?? 0.5
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(vol, at + Math.min(0.012, t.dur * 0.3))
  g.gain.exponentialRampToValueAtTime(0.0001, end)

  osc.connect(g).connect(master)
  osc.start(at)
  osc.stop(end + 0.02)
}

function noise(n: Noise, now: number): void {
  if (!ctx || !master || !noiseBuf) return
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  const g = ctx.createGain()
  const at = now + (n.at ?? 0)
  const end = at + n.dur

  const vol = n.vol ?? 0.3
  g.gain.setValueAtTime(vol, at)
  g.gain.exponentialRampToValueAtTime(0.0001, end)

  let node: AudioNode = src
  if (n.hp) {
    const f = ctx.createBiquadFilter()
    f.type = 'highpass'
    f.frequency.value = n.hp
    src.connect(f)
    node = f
  }
  node.connect(g).connect(master)
  src.start(at)
  src.stop(end + 0.02)
}

/*
 * 소리표. 이름이 게임에서 벌어진 일을 가리키고, 값은 그 일이 어떻게 들리는지다.
 * 화면 쪽에서 주파수를 만지지 않게 여기 다 모아 둔다.
 */
const SPECS = {
  /* --- 메뉴 --- */
  move: { tones: [{ from: 620, dur: 0.045, vol: 0.3, wave: 'square' as Wave }] },
  select: {
    tones: [
      { from: 520, to: 790, dur: 0.09, vol: 0.35 },
      { from: 780, dur: 0.07, at: 0.06, vol: 0.22, wave: 'triangle' as Wave },
    ],
  },
  back: { tones: [{ from: 440, to: 280, dur: 0.09, vol: 0.28 }] },

  /* --- 전투 --- */
  /** 통상 공격이 맞았다 */
  hit: {
    noise: [{ dur: 0.09, vol: 0.34, hp: 900 }],
    tones: [{ from: 190, to: 90, dur: 0.09, vol: 0.3, wave: 'square' as Wave }],
  },
  /** 치명타 — 같은 때림인데 더 얇고 길다 */
  crit: {
    noise: [{ dur: 0.14, vol: 0.4, hp: 1500 }],
    tones: [
      { from: 300, to: 120, dur: 0.14, vol: 0.32, wave: 'square' as Wave },
      { from: 980, to: 1560, dur: 0.1, at: 0.03, vol: 0.2, wave: 'triangle' as Wave },
    ],
  },
  /** 기술 — 음이 올라간다. 맞는 소리와 헷갈리면 안 된다 */
  skill: {
    tones: [
      { from: 400, to: 1000, dur: 0.16, vol: 0.28, wave: 'triangle' as Wave },
      { from: 600, to: 1500, dur: 0.14, at: 0.05, vol: 0.18, wave: 'sine' as Wave },
    ],
  },
  /** 방어 — 낮고 짧게. 막았다는 느낌 */
  guard: {
    tones: [{ from: 260, to: 200, dur: 0.13, vol: 0.3, wave: 'triangle' as Wave }],
    noise: [{ dur: 0.06, vol: 0.16, hp: 500 }],
  },
  /** 반죽물 — 올라가는 세 음 */
  heal: {
    tones: [
      { from: 520, dur: 0.08, vol: 0.26, wave: 'sine' as Wave },
      { from: 660, dur: 0.08, at: 0.07, vol: 0.26, wave: 'sine' as Wave },
      { from: 790, dur: 0.14, at: 0.14, vol: 0.26, wave: 'sine' as Wave },
    ],
  },
  /** 내가 맞았다 — 아래로 미끄러진다 */
  hurt: {
    tones: [{ from: 330, to: 110, dur: 0.2, vol: 0.34, wave: 'sawtooth' as Wave }],
    noise: [{ dur: 0.1, vol: 0.2, hp: 400 }],
  },
  /** 적을 쓰러뜨렸다 */
  down: {
    tones: [
      { from: 420, to: 160, dur: 0.18, vol: 0.3, wave: 'square' as Wave },
      { from: 210, to: 80, dur: 0.22, at: 0.1, vol: 0.24, wave: 'triangle' as Wave },
    ],
  },

  /* --- 판의 마디 --- */
  /** 라운드 클리어 — 올라가는 세 음 */
  clear: {
    tones: [
      { from: 523, dur: 0.11, vol: 0.3, wave: 'triangle' as Wave },
      { from: 659, dur: 0.11, at: 0.1, vol: 0.3, wave: 'triangle' as Wave },
      { from: 784, dur: 0.26, at: 0.2, vol: 0.32, wave: 'triangle' as Wave },
    ],
  },
  /** 피자 완성 — 클리어보다 한 음 더 간다 */
  finish: {
    tones: [
      { from: 523, dur: 0.12, vol: 0.3, wave: 'triangle' as Wave },
      { from: 659, dur: 0.12, at: 0.11, vol: 0.3, wave: 'triangle' as Wave },
      { from: 784, dur: 0.12, at: 0.22, vol: 0.3, wave: 'triangle' as Wave },
      { from: 1047, dur: 0.42, at: 0.33, vol: 0.34, wave: 'triangle' as Wave },
      { from: 784, dur: 0.42, at: 0.33, vol: 0.16, wave: 'sine' as Wave },
    ],
  },
  /** 끝났다 — 내려가는 세 음 */
  over: {
    tones: [
      { from: 440, dur: 0.16, vol: 0.3, wave: 'triangle' as Wave },
      { from: 349, dur: 0.16, at: 0.15, vol: 0.3, wave: 'triangle' as Wave },
      { from: 262, to: 220, dur: 0.5, at: 0.3, vol: 0.32, wave: 'triangle' as Wave },
    ],
  },

  /* --- 도우 만들기 --- */
  /** 재료를 올렸다 — 툭 얹히는 소리 */
  place: {
    tones: [{ from: 300, to: 180, dur: 0.09, vol: 0.26, wave: 'triangle' as Wave }],
    noise: [{ dur: 0.05, vol: 0.14, hp: 700 }],
  },
  /** 주사위 한 칸 구를 때 */
  tick: { noise: [{ dur: 0.03, vol: 0.2, hp: 1800 }] },
  /** 굽기 — 화덕에 들어간다 */
  bake: {
    noise: [{ dur: 0.5, vol: 0.2, hp: 300 }],
    tones: [
      { from: 160, to: 620, dur: 0.5, vol: 0.24, wave: 'sawtooth' as Wave },
      { from: 320, to: 1240, dur: 0.45, at: 0.06, vol: 0.14, wave: 'sine' as Wave },
    ],
  },
  /** 보상 카드를 골랐다 */
  card: {
    tones: [
      { from: 700, dur: 0.07, vol: 0.26, wave: 'triangle' as Wave },
      { from: 1050, dur: 0.16, at: 0.06, vol: 0.26, wave: 'triangle' as Wave },
    ],
  },
} satisfies Record<string, Spec>

export type SoundName = keyof typeof SPECS

export function play(name: SoundName): void {
  if (!ensure() || !ctx) return
  const spec: Spec = SPECS[name]
  const now = ctx.currentTime
  for (const t of spec.tones ?? []) tone(t, now)
  for (const n of spec.noise ?? []) noise(n, now)
}
