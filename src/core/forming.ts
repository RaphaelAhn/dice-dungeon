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

/**
 * 성형은 이제 고르는 게 아니라 치는 것이다.
 *
 * 왼손·오른손이 번갈아 나오고, 제때 치면 도우가 고르게 넓어진다. 놓치면
 * 그 자리가 얇아지고, 많이 놓치면 가운데가 찢어진다 — 실제로도 한쪽만
 * 밀거나 급히 밀면 그렇게 된다.
 *
 * 그래서 결과가 뒤집힌다. 전에는 '얇게'가 욕심내는 선택이었지만, 이제는
 * 얇은 것이 잘못 편 결과다. 잘 칠수록 두껍고 크러스트가 산다.
 */
export type Stretch = 'torn' | 'thin' | 'even' | 'thick'

export const HAND_COUNT = 8

export type StretchSpec = {
  id: Stretch
  label: string
  gain: Partial<Stats>
  desc: string
}

/**
 * ⚠ 잘 칠수록 좋아지되, 못 쳐도 아주 망하지는 않게 둔다.
 *
 * 손기술이 그대로 보상이 되면 처음 잡은 사람은 계속 바닥을 맞는다.
 * 얇게는 얇은 대로 쓸모(빠름)를 주고, 찢어짐만 확실한 벌로 남긴다.
 */
export const STRETCHES: readonly StretchSpec[] = [
  {
    id: 'torn',
    label: '찢어짐',
    gain: { hp: -10, mag: -6, spd: 2 },
    desc: '가운데가 찢어졌다. 급히 메우느라 반죽이 뭉쳤다.',
  },
  {
    id: 'thin',
    label: '얇게',
    gain: { spd: 7, luk: 5, hp: -10 },
    desc: '한쪽으로 몰려 얇게 폈다. 가볍고 빠르지만 잘 버티지 못한다.',
  },
  {
    id: 'even',
    label: '고르게',
    gain: { spd: 3, mag: 3, hp: 4 },
    desc: '전체를 고르게 폈다. 어느 쪽으로도 치우치지 않는다.',
  },
  {
    id: 'thick',
    label: '두껍게',
    gain: { hp: 20, mag: 5, atk: 4, spd: -3 },
    desc: '가장자리를 살려 크러스트가 크다. 잘 버틴다.',
  },
]

export function stretchOf(id: Stretch): StretchSpec {
  return STRETCHES.find((s) => s.id === id) ?? STRETCHES[2]
}

/**
 * 몇 번 제대로 쳤는지로 결과가 갈린다.
 *
 * 장력이 낮으면 한 번 더 쳐야 같은 결과가 나온다 — 둥글리기를 대충 하면
 * 반죽이 뻣뻣해 잘 안 늘어난다는 것을 여기서 갚는다.
 */
export function stretchFromHits(hits: number, tension: number): Stretch {
  const need = ballOf(tension) === 'good' ? 0 : 1
  if (hits >= HAND_COUNT - 1 - need) return 'thick'
  if (hits >= HAND_COUNT - 3 - need) return 'even'
  if (hits >= HAND_COUNT - 5 - need) return 'thin'
  return 'torn'
}

export function stretchGain(_tension: number, id: Stretch): Partial<Stats> {
  return stretchOf(id).gain
}
