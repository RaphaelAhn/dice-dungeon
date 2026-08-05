import type { Stats } from './character'

/**
 * 둥글리기와 성형 — 분할과 첫 전투 사이의 두 단계.
 *
 * 둘을 따로 두지 않고 하나로 잇는다. 실제 공정에서 둥글리기는 그 자체가
 * 목적이 아니라 "고르게 늘어나게 하는" 준비이기 때문이다. 표면을 팽팽하게
 * 잡아 두어야 다음에 얇게 펼 수 있고, 대충 잡으면 펴다가 찢어진다.
 *
 * 그래서 게임에서도 이렇게 나눈다.
 *   둥글리기  손기술 — 얼마나 팽팽하게 잡았는가 (장력 0~100)
 *   성형      판단 — 그 장력을 밑천으로 어디까지 얇게 펼 것인가
 *
 * 장력이 낮은데 얇게 펴려 들면 찢어진다. 위험을 아는 상태에서 고르는 것이라
 * 운이 아니라 선택이다.
 */

/* ── 둥글리기 ── */

/**
 * 장력 구간 ⚠
 *
 * 세게 굴릴수록 표면이 팽팽해지지만, 지나치면 반죽이 찢어져 가스가 빠진다.
 * 알맞은 구간을 한가운데가 아니라 위쪽에 둔다 — 멈춰야 할 자리가 끝에서
 * 가까워야 "조금만 더" 하다가 넘기는 긴장이 생긴다.
 */
export const TENSION_GOOD_FROM = 62
export const TENSION_TORN_FROM = 92

export type Ball = 'weak' | 'good' | 'torn'

export function ballOf(tension: number): Ball {
  if (tension >= TENSION_TORN_FROM) return 'torn'
  if (tension >= TENSION_GOOD_FROM) return 'good'
  return 'weak'
}

export const BALL_META: Record<Ball, { label: string; desc: string }> = {
  weak: { label: '느슨함', desc: '표면이 덜 팽팽하다. 펴다가 잘 찢어진다.' },
  good: { label: '팽팽함', desc: '표면이 매끄럽고 가스가 잘 갇혔다.' },
  torn: { label: '찢어짐', desc: '너무 세게 굴려 가스가 빠졌다.' },
}

/**
 * 둥글리기가 몸에 남기는 것.
 * 장력은 반죽 탄력으로, 갇힌 가스는 반죽 두께로 간다.
 */
export function ballGain(tension: number): Partial<Stats> {
  const b = ballOf(tension)
  if (b === 'torn') return { atk: 1, mag: -8 }
  if (b === 'weak') return { atk: Math.round(tension / 34) }
  /*
   * 알맞은 구간 안에서도 팽팽할수록 조금 더 준다.
   * ⚠ 크게 주면 안 된다. 만들기 세 단계가 전부 더하기만 하면 판이 통째로
   *   쉬워진다 — 처음 잡은 값으로는 클리어율이 71% 에서 90% 로 뛰었다.
   */
  const extra = Math.round((tension - TENSION_GOOD_FROM) / 14)
  return { atk: 1 + extra, mag: 1 }
}

/* ── 성형 ── */

export type Stretch = 'thin' | 'even' | 'thick'

export type StretchSpec = {
  id: Stretch
  label: string
  /** 이 정도로 펴려면 필요한 장력. 모자라면 찢어진다. */
  needs: number
  gain: Partial<Stats>
  desc: string
  /** 실패했을 때 */
  failDesc: string
}

/**
 * ⚠ 얇게 펼수록 크게 얻지만 필요한 장력이 높다.
 *
 * 가운데를 얇게 하고 가장자리를 남기는 것이 성형의 핵심이다. 얇으면 넓어져
 * 손이 빨라지고 촉감이 산다. 두꺼우면 크러스트가 살아 잘 버틴다.
 * 가운데를 너무 얇게 밀면 찢어진다 — 그 경계가 둥글리기에서 정해진다.
 */
export const STRETCHES: readonly StretchSpec[] = [
  {
    id: 'thin',
    label: '얇게',
    needs: TENSION_GOOD_FROM,
    gain: { spd: 7, luk: 6, atk: 2, hp: -14 },
    desc: '가운데를 얇게. 넓게 퍼져 손이 빨라진다.',
    failDesc: '가운데가 찢어졌다. 급히 메우느라 도우가 뭉쳤다.',
  },
  {
    id: 'even',
    label: '고르게',
    needs: 30,
    gain: { spd: 2, mag: 2 },
    desc: '전체를 고르게. 무난하다.',
    failDesc: '고르게 펴지지 않고 한쪽으로 몰렸다.',
  },
  {
    id: 'thick',
    label: '두껍게',
    needs: 0,
    gain: { hp: 14, mag: 3, spd: -4 },
    desc: '가장자리를 살려 크러스트를 크게. 잘 버틴다.',
    failDesc: '',
  },
]

export function stretchOf(id: Stretch): StretchSpec {
  return STRETCHES.find((s) => s.id === id) ?? STRETCHES[1]
}

/** 이 장력으로 이 성형이 되는가 */
export function canStretch(tension: number, id: Stretch): boolean {
  // 찢어진 반죽은 가스가 빠져 얇게 펴는 것을 못 견딘다
  if (ballOf(tension) === 'torn' && id === 'thin') return false
  return tension >= stretchOf(id).needs
}

/** 실패하면 얻는 대신 잃는다. 아무 일도 안 일어나면 고를 이유가 없어진다. */
export function stretchGain(tension: number, id: Stretch): Partial<Stats> {
  const s = stretchOf(id)
  if (canStretch(tension, id)) return s.gain
  return { hp: -6, spd: -4 }
}
