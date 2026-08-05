import type { Stats } from './character'

/**
 * 분할 — 숙성이 끝난 반죽을 피자 한 판 크기로 떼어내는 단계.
 *
 * 실제 피자는 큰 반죽을 저울에 달아 나눈다. 몇 그램을 떼느냐가 피자 지름을
 * 정하고, 지름이 두께와 굽는 시간을 정한다. 그래서 이 한 번의 선택이
 * 판 전체의 성격을 정한다 — 이 게임에서 되돌릴 수 없는 두 번째 선택이다.
 *
 * 게임 규칙으로 옮기면 이렇다.
 *   많이 떼면  자리가 늘고 두꺼워 잘 버틴다. 대신 무거워 손이 늦다.
 *   적게 떼면  자리가 줄지만 얇고 가벼워 손이 빠르다.
 *
 * 무게가 손놀림을 깎는다는 규칙은 토핑에 이미 있다(topping.ts totalWeight).
 * 분할은 그 규칙을 판 시작 시점으로 끌어온 것이고, 그래서 새 규칙을 배울
 * 필요가 없다 — 이미 아는 저울이 하나 더 놓일 뿐이다.
 */
export type Portion = 'small' | 'medium' | 'large'

export type PortionSpec = {
  id: Portion
  /** 떼어낸 반죽 무게(g). 화면에 그대로 보여 준다 */
  grams: number
  /** 다 폈을 때의 지름(cm) */
  cm: number
  label: string
  /** 이 크기가 감당하는 재료 자리 */
  slots: number
  /** 시작 능력치 보정 */
  gain: Partial<Stats>
  desc: string
}

/**
 * ⚠ 자리는 4·5·6 이다. 여섯을 넘기지 않는다.
 *
 * 도우 그림의 재료 자리는 얼굴(눈·입)을 피해 가장자리를 도는 여섯 곳뿐이고,
 * 그 여섯도 조건을 걸어 겨우 찾아낸 배치다. 일곱 번째를 넣으려면 얼굴을
 * 더 줄이거나 재료를 더 작게 만들어야 하는데, 둘 다 지금 그림을 망친다.
 * 그림이 감당하는 만큼만 규칙으로 약속한다.
 *
 * 무게는 실제 피자 규격을 따랐다 — 25cm 200~250g, 30cm 250~320g, 35cm 350~450g.
 */
export const PORTIONS: readonly PortionSpec[] = [
  {
    id: 'small',
    grams: 220,
    cm: 25,
    label: '작게',
    slots: 4,
    // 얇으니 가볍고 빠르다. 대신 담을 자리가 적다.
    gain: { spd: 4, luk: 2, atk: 1 },
    desc: '얇고 가볍다. 손이 빠르지만 자리가 적다.',
  },
  {
    id: 'medium',
    grams: 290,
    cm: 30,
    label: '보통',
    slots: 5,
    gain: { hp: 8, spd: 1 },
    desc: '무난하다. 어느 쪽으로도 치우치지 않는다.',
  },
  {
    id: 'large',
    grams: 400,
    cm: 35,
    label: '크게',
    slots: 6,
    // 두꺼우니 잘 버틴다. 대신 무거워 손이 늦다.
    gain: { hp: 15, atk: 1, spd: -5 },
    desc: '두껍고 무겁다. 잘 버티지만 손이 늦다.',
  },
]

export function portionOf(id: Portion): PortionSpec {
  return PORTIONS.find((p) => p.id === id) ?? PORTIONS[1]
}
